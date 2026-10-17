import {
  id,
  type BusinessEvent,
  type State,
  type WorkflowInstance,
} from "../domain";
import { activityLabel, simulationMessage } from "../presentation";
import { mapDefinition } from "./definition";
import type {
  FrameCause,
  VisualFrame,
  VisualNode,
  VisualStatus,
  VizRecording,
} from "./types";

export function originatingEvents(s: State) {
  return s.events.filter(
    (e) =>
      e.eventType === "ApplicationSubmitted" ||
      e.eventType === "SkillRequested",
  );
}
export function originWorkflow(s: State, e: BusinessEvent) {
  return s.workflows.find(
    (w) =>
      w.companyId === e.companyId &&
      w.correlationId === e.correlationId &&
      w.applicationId === e.applicationId &&
      w.qualificationId === e.qualificationId,
  );
}
/** Explicit parent/child identity, never company-wide event correlation. */
export function lineage(s: State, root: WorkflowInstance) {
  return [
    root,
    ...s.workflows.filter(
      (w) =>
        root.definitionId === "CompanyOnboarding" &&
        w.definitionId === "SkillQualification" &&
        w.companyId === root.companyId &&
        w.applicationId === root.applicationId &&
        s.qualifications.some(
          (q) =>
            q.id === w.qualificationId &&
            q.originatingApplicationId === root.applicationId,
        ),
    ),
  ];
}
function context(s: State, r: VizRecording) {
  const root = s.workflows.find((w) => w.id === r.workflowId);
  if (!root)
    throw new Error(
      "Tracked workflow is unavailable; previous frames are preserved.",
    );
  const workflows = lineage(s, root);
  const correlations = new Set(workflows.map((w) => w.correlationId));
  const events: BusinessEvent[] = [];
  const accepted = new Set<string>();
  // Persisted array order is authoritative; the simulation clock can be identical on many events.
  for (const e of s.events) {
    const parent =
      "causedByEventId" in e.payload ? e.payload.causedByEventId : undefined;
    const direct =
      correlations.has(e.correlationId) &&
      workflows.some(
        (w) =>
          w.correlationId === e.correlationId &&
          w.processedEventIds.includes(e.eventId),
      );
    if (
      (direct && (!parent || accepted.has(parent))) ||
      (parent && accepted.has(parent) && e.companyId === root.companyId)
    ) {
      events.push(e);
      accepted.add(e.eventId);
    }
  }
  const tasks = s.workItems.filter((t) =>
    workflows.some((w) => w.id === t.workflowId),
  );
  const attempts = s.attempts.filter((a) =>
    workflows.some((w) => w.id === a.workflowId),
  );
  return { root, workflows, events, tasks, attempts };
}
export function causes(s: State, r: VizRecording): FrameCause[] {
  const c = context(s, r);
  return [
    ...c.events.map((e) => ({
      id: e.eventId,
      label: e.eventType.replace(/([a-z])([A-Z])/g, "$1 $2"),
      kind: "event" as const,
      actor: e.actor,
      causedByEventId:
        "causedByEventId" in e.payload ? e.payload.causedByEventId : undefined,
    })),
    ...c.attempts.map((a) => ({
      id: a.id,
      label: `${activityLabel(a.activity)} · attempt ${a.attempt} ${a.status.toLowerCase()}`,
      kind: "attempt" as const,
    })),
    ...c.workflows.flatMap((w) =>
      w.history.flatMap((h, index) =>
        !h.eventId && h.kind === "Timer"
          ? [
              {
                id: `${w.id}:history:${index}`,
                label: h.message,
                kind: "transition" as const,
              },
            ]
          : [],
      ),
    ),
  ];
}
export function project(
  s: State,
  r: VizRecording,
): Pick<VisualFrame, "nodes" | "edges"> {
  const c = context(s, r),
    root = c.root;
  const skillWorkflow =
    root.definitionId === "SkillQualification"
      ? root
      : c.workflows.find((w) => w.definitionId === "SkillQualification");
  const q = s.qualifications.find(
    (q) => q.id === skillWorkflow?.qualificationId,
  );
  const app = s.applications.find((a) => a.id === root.applicationId);
  const company = s.companies.find((c) => c.id === root.companyId)!;
  const nodes: Record<string, VisualNode> = {};
  const eventsFor = (ids: string[]) =>
    c.events
      .filter(
        (e) => "workItemId" in e.payload && ids.includes(e.payload.workItemId),
      )
      .map((e) => e.eventId);
  const visual = (
    status: VisualStatus = "neutral",
    explanation = "Not yet reached",
  ): VisualNode => ({ status, explanation, eventIds: [] });
  const set = (
    nodeId: string,
    status: VisualStatus,
    explanation: string,
    eventIds: string[] = [],
  ) => {
    nodes[nodeId] = { ...visual(status, explanation), eventIds };
  };
  for (const n of r.definition.nodes) {
    nodes[n.id] = visual();
    if (!n.activity) continue;
    const workflow = n.scope === "skill" ? skillWorkflow : root;
    const items = c.tasks.filter(
      (t) => t.workflowId === workflow?.id && t.activity === n.activity,
    );
    const task = items.at(-1);
    if (!task) continue;
    const latest = c.attempts.filter((a) => a.workItemId === task.id).at(-1);
    const status: VisualStatus =
      task.status === "Cancelled"
        ? "neutral"
        : task.status === "Open"
          ? latest?.status === "Failed"
            ? "error"
            : "waiting"
          : "complete";
    nodes[n.id] = {
      status,
      workItemId: task.id,
      eventIds: eventsFor(items.map((t) => t.id)),
      explanation:
        task.status === "Open"
          ? latest?.status === "Failed"
            ? latest.technicalError!
            : `Waiting for ${n.owner}${task.escalatedAt ? " · overdue and escalated" : task.remindedAt ? " · reminder issued" : ""}. ${simulationMessage(task.instructions).replace(/\bdemo\b/g, "simulated")}`
          : simulationMessage(task.outcome ?? task.status),
    };
    if (n.activity === "ScreenApplication")
      nodes[n.id].eventIds = c.events
        .filter(
          (e) =>
            e.correlationId === root.correlationId &&
            e.eventType === "ScreeningDecisionRecorded",
        )
        .map((e) => e.eventId);
  }
  set(
    "origin",
    "complete",
    "Originating event accepted. Frame 0 starts when tracking was selected, not when this event occurred.",
    [r.originEventId],
  );
  function decision(
    node: string,
    reached: boolean,
    explanation: string,
    status: VisualStatus = "complete",
  ) {
    if (reached) set(node, status, explanation);
  }
  function join(
    node: string,
    prerequisites: { complete: boolean; label: string }[],
    started: boolean,
    historical = false,
  ) {
    const outstanding = prerequisites
        .filter((p) => !p.complete)
        .map((p) => p.label),
      count = historical
        ? prerequisites.length
        : prerequisites.length - outstanding.length;
    nodes[node] = {
      status:
        historical || count === prerequisites.length
          ? "complete"
          : started
            ? "waiting"
            : "neutral",
      explanation: historical
        ? "Satisfied at onboarding completion; historical completion is retained."
        : outstanding.length
          ? `Waiting for ${outstanding.join("; ")}.`
          : "All prerequisites satisfied",
      eventIds: [],
      satisfied: count,
      total: prerequisites.length,
      outstanding: historical ? [] : outstanding,
    };
  }
  if (root.definitionId === "CompanyOnboarding") {
    const screen = c.events
      .filter((e) => e.eventType === "ScreeningDecisionRecorded")
      .at(-1);
    decision(
      "screening-decision",
      Boolean(screen),
      screen?.eventType === "ScreeningDecisionRecorded"
        ? screen.payload.decision
        : "Awaiting Recruitment",
      app?.status === "Information requested" ? "waiting" : "complete",
    );
    decision(
      "declined",
      app?.status === "Declined",
      "Application declined with a recorded reason",
      "error",
    );
    const proceeded = c.events.some(
      (e) =>
        e.eventType === "ScreeningDecisionRecorded" &&
        e.payload.decision === "Proceed",
    );
    decision(
      "parallel",
      proceeded,
      "Administration and initial skill qualification progress independently",
    );
    for (const [name, type, event] of [
      ["Insurance", "Insurance", "InsuranceReviewCompleted"],
      ["Finance", "Financial", "FinancialReviewCompleted"],
      ["Agreement", "Agreement", "AgreementExecuted"],
    ] as const) {
      const requirement = s.requirements.find(
        (v) => v.companyId === root.companyId && v.type === type,
      );
      const reviews = c.events.filter((e) => e.eventType === event);
      const correction = requirement?.status === "Correction required";
      decision(
        `${name}-decision`,
        Boolean(reviews.length),
        correction ? "Replacement evidence required" : "Evidence accepted",
        correction ? "waiting" : "complete",
      );
      decision(
        `${name}-correction`,
        reviews.some(
          (e) =>
            "outcome" in e.payload &&
            e.payload.outcome === "Correction required",
        ),
        correction
          ? "Waiting for Contractor replacement evidence"
          : "Correction route was used; latest evidence has progressed",
        correction ? "waiting" : "complete",
      );
      decision(
        `${name}-accepted`,
        requirement?.status === "Verified",
        "Verified by the responsible participant",
      );
    }
    join(
      "admin-join",
      ["Insurance", "Financial", "Agreement"].map((type) => ({
        complete: s.requirements.some(
          (v) =>
            v.companyId === root.companyId &&
            v.type === type &&
            v.status === "Verified",
        ),
        label: `${type} verification — ${type === "Insurance" ? "Compliance" : type === "Financial" ? "Finance" : "Contractor Relations"}`,
      })),
      proceeded,
    );
    const approved = s.qualifications.some(
      (v) => v.companyId === root.companyId && v.status === "Approved",
    );
    join(
      "readiness-join",
      [
        {
          complete: company.adminComplete,
          label:
            "administrative approvals — Compliance, Finance and Contractor Relations",
        },
        {
          complete: company.portalSetupComplete,
          label: "portal setup — Contractor",
        },
        {
          complete: company.initialTrainingComplete,
          label: "Training confirmation — Training",
        },
        {
          complete: approved,
          label: "an approved company skill — Field Manager",
        },
      ],
      proceeded,
      root.status === "Completed" && root.stage !== "Declined",
    );
    decision(
      "complete",
      root.status === "Completed" && root.stage !== "Declined",
      "Initial onboarding is historically completed",
    );
  }
  const licenseReviews = c.events.filter(
    (e) => e.eventType === "LicenseReviewCompleted",
  );
  const invalid = q?.status === "Correction required";
  decision(
    "license-decision",
    Boolean(licenseReviews.length),
    invalid ? "License needs replacement" : "License verified",
    invalid ? "waiting" : "complete",
  );
  decision(
    "license-correction",
    licenseReviews.some(
      (e) =>
        e.eventType === "LicenseReviewCompleted" &&
        e.payload.outcome !== "Valid",
    ),
    invalid
      ? "Waiting for Contractor replacement license"
      : "Correction route used; replacement progressed",
    invalid ? "waiting" : "complete",
  );
  decision(
    "skill-decision",
    Boolean(q && ["Approved", "Rejected", "Invalidated"].includes(q.status)),
    q?.status ?? "Awaiting decision",
    q?.status === "Approved" ? "complete" : "error",
  );
  decision(
    "skill-approved",
    q?.status === "Approved" || q?.status === "Invalidated",
    q?.status === "Invalidated"
      ? "Approval subsequently invalidated; recovery requires administration"
      : "Company skill qualification approved",
    q?.status === "Invalidated" ? "error" : "complete",
  );
  decision(
    "skill-rejected",
    q?.status === "Rejected",
    "Not approved; no recovery shortcut is available",
    "error",
  );
  // Every special node carries actual scoped event references rather than inferred company-wide activity.
  for (const n of r.definition.nodes.filter(
    (n) => !n.activity && nodes[n.id].status !== "neutral",
  )) {
    if (n.scope === "skill")
      nodes[n.id].eventIds = c.events
        .filter((e) => e.correlationId === skillWorkflow?.correlationId)
        .map((e) => e.eventId);
    else if (n.id !== "origin") {
      const types: BusinessEvent["eventType"][] =
        n.id === "readiness-join"
          ? ["ContractorReadinessChanged", "TrainingConfirmed", "SkillApproved"]
          : n.id === "complete"
            ? ["ContractorActivated"]
            : n.id === "admin-join"
              ? [
                  "InsuranceReviewCompleted",
                  "FinancialReviewCompleted",
                  "AgreementExecuted",
                ]
              : n.id.startsWith("Insurance-")
                ? ["InsuranceReviewCompleted"]
                : n.id.startsWith("Finance-")
                  ? ["FinancialReviewCompleted"]
                  : n.id.startsWith("Agreement-")
                    ? ["AgreementExecuted"]
                    : ["ScreeningDecisionRecorded"];
      nodes[n.id].eventIds = c.events
        .filter((e) => types.includes(e.eventType))
        .map((e) => e.eventId);
    }
  }
  const edges = Object.fromEntries(
    r.definition.edges.map((e) => {
      const a = nodes[e.source],
        b = nodes[e.target];
      return [
        e.id,
        a.status === "neutral" || b.status === "neutral"
          ? "neutral"
          : b.status === "error"
            ? "error"
            : b.status === "waiting"
              ? "waiting"
              : "complete",
      ];
    }),
  ) as Record<string, VisualStatus>;
  return { nodes, edges };
}

export function startRecording(s: State, originEventId: string) {
  const origin = originatingEvents(s).find((e) => e.eventId === originEventId);
  if (!origin)
    throw new Error("Choose an accepted application or skill-request event.");
  const workflow = originWorkflow(s, origin);
  if (!workflow)
    throw new Error(
      "No actual workflow is correlated with this originating event.",
    );
  const definition = mapDefinition(workflow);
  definition.nodes.find((n) => n.id === "origin")!.owner =
    origin.actor === "Workflow" ? "Onboarding process" : origin.actor;
  const previous = s.viz?.recordings.find(
    (r) => r.id === s.viz?.activeRecordingId,
  );
  if (previous) previous.stoppedAtRevision = s.revision + 1;
  const recording: VizRecording = {
    id: id(),
    originEventId,
    companyId: origin.companyId,
    companyName: s.companies.find((c) => c.id === origin.companyId)!.name,
    originLabel:
      origin.eventType === "ApplicationSubmitted"
        ? "Company application"
        : "Skill qualification request",
    workflowId: workflow.id,
    startedAt: new Date().toISOString(),
    definition,
    workflowIds: lineage(s, workflow).map((w) => w.id),
    seen: [],
    frames: [],
  };
  recording.seen = causes(s, recording).map((c) => c.id);
  recording.frames.push({
    number: 0,
    revision: s.revision + 1,
    capturedAt: recording.startedAt,
    causes: [
      {
        id: originEventId,
        kind: "transition",
        label: "Tracking started · current state only",
      },
    ],
    ...project(s, recording),
  });
  s.viz = {
    version: 1,
    activeRecordingId: recording.id,
    recordings: [...(s.viz?.recordings ?? []), recording],
  };
  return recording.id;
}

/** Called inside the existing command lock before the single atomic save, never from React or notifications. */
export function captureCommittedVisuals(s: State) {
  const r = s.viz?.recordings.find((r) => r.id === s.viz?.activeRecordingId);
  if (!r) return;
  const all = causes(s, r),
    seen = new Set(r.seen),
    next = all.filter((c) => !seen.has(c.id));
  if (!next.length) return;
  const projection = project(s, r),
    previous = r.frames.at(-1)!;
  r.seen = all.map((c) => c.id);
  r.workflowIds = context(s, r).workflows.map((w) => w.id);
  if (
    JSON.stringify(projection) !==
    JSON.stringify({ nodes: previous.nodes, edges: previous.edges })
  ) {
    r.frames.push({
      number: r.frames.length,
      revision: s.revision + 1,
      capturedAt: new Date().toISOString(),
      causes: next,
      ...projection,
    });
  }
}

/** Projection failure is reported without rejecting or undoing a valid business command. */
export function safelyCaptureVisuals(s: State) {
  if (!s.viz?.activeRecordingId) return;
  try {
    captureCommittedVisuals(s);
  } catch (error) {
    s.viz.captureError = `Viz capture gap: ${error instanceof Error ? error.message : String(error)} Business processing continued. Missing intermediate frames are not reconstructed.`;
    const recording = s.viz.recordings.find(
      (r) => r.id === s.viz!.activeRecordingId,
    );
    if (recording) recording.captureError = s.viz.captureError;
  }
}
