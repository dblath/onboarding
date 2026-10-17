import {
  activityDefinitions,
  administrativeComplete,
  isReady,
  type State,
} from "../domain";
import { causes, lineage, originWorkflow, project } from "../viz/recorder";
import { mapDefinition } from "../viz/definition";

export const workspaceFormat = "unity-fieldwork-workspace";
export const maxWorkspaceBytes = 50 * 1024 * 1024;
export interface WorkspaceFile {
  format: typeof workspaceFormat;
  formatVersion: 1;
  exportedAt: string;
  scenario: { name: string; description: string };
  state: State;
}
type Check = (v: unknown, p: string) => void;
const fail = (p: string, why: string): never => {
  throw new Error(`Invalid workspace: ${p} ${why}.`);
};
const text: Check = (v, p) => {
  if (typeof v !== "string") fail(p, "must be text");
};
const nonempty: Check = (v, p) => {
  text(v, p);
  if (!(v as string).length) fail(p, "must not be empty");
};
const key: Check = (v, p) => {
  text(v, p);
  if (!v || ["__proto__", "constructor", "prototype"].includes(v as string))
    fail(p, "has an invalid identity");
};
const number: Check = (v, p) => {
  if (
    !Number.isSafeInteger(v) ||
    Number(v) < 0 ||
    Number(v) >= Number.MAX_SAFE_INTEGER
  )
    fail(p, "must be a safe non-negative integer");
};
const positive: Check = (v, p) => {
  number(v, p);
  if (v === 0) fail(p, "must be positive");
};
const bool: Check = (v, p) => {
  if (typeof v !== "boolean") fail(p, "must be true or false");
};
const date: Check = (v, p) => {
  text(v, p);
  if (
    !/^\d{4}-\d\d-\d\dT/.test(v as string) ||
    !Number.isFinite(Date.parse(v as string))
  )
    fail(p, "must be an ISO date/time");
};
const optional =
  (check: Check): Check =>
  (v, p) => {
    if (v !== undefined) check(v, p);
  };
const one =
  (...values: unknown[]): Check =>
  (v, p) => {
    if (!values.includes(v))
      fail(p, `has an unsupported value (${String(v).slice(0, 60)})`);
  };
const list =
  (check: Check): Check =>
  (v, p) => {
    if (!Array.isArray(v)) fail(p, "must be a list");
    (v as unknown[]).forEach((x, i) => check(x, `${p}[${i}]`));
  };
const object =
  (shape: Record<string, Check>): Check =>
  (v, p) => {
    if (!v || typeof v !== "object" || Array.isArray(v))
      fail(p, "must be an object");
    for (const k of Object.keys(v as object))
      if (!Object.hasOwn(shape, k))
        fail(`${p}.${k}`, "is not supported by this format");
    for (const [k, check] of Object.entries(shape))
      check((v as Record<string, unknown>)[k], `${p}.${k}`);
  };
const dict =
  (check: Check): Check =>
  (v, p) => {
    if (!v || typeof v !== "object" || Array.isArray(v))
      fail(p, "must be an object");
    for (const [k, x] of Object.entries(v as object)) {
      key(k, p);
      check(x, `${p}.${k}`);
    }
  };
const ids = list(key),
  activity = one(...Object.keys(activityDefinitions));
const role = one(
  "Contractor",
  "Recruitment",
  "Compliance",
  "Finance",
  "Contractor Relations",
  "Field Manager",
  "Training",
  "Simulation",
);
const fixture = one(
  "Valid demo document",
  "Expired demo document",
  "Incomplete demo document",
);
const decision = one("Proceed", "RequestInformation", "Decline");
const outcome = one("Verified", "Correction required");
const visualStatus = one("neutral", "waiting", "complete", "error");
const payloads: Record<string, Check> = {
  ApplicationSubmitted: object({ skill: nonempty }),
  ScreeningDecisionRecorded: object({ decision, reason: text }),
  AdditionalInformationSubmitted: object({ text }),
  EvidenceSubmitted: object({
    workItemId: key,
    evidenceId: key,
    description: text,
    fixture,
  }),
  InsuranceReviewCompleted: object({
    workItemId: key,
    evidenceId: key,
    outcome,
    reason: text,
  }),
  FinancialReviewCompleted: object({
    workItemId: key,
    evidenceId: key,
    outcome,
    reason: text,
  }),
  AgreementExecuted: object({
    workItemId: key,
    evidenceId: key,
    outcome,
    reason: text,
  }),
  LicenseReviewCompleted: object({
    workItemId: key,
    evidenceId: key,
    outcome: one("Valid", "Expired", "Invalid"),
    reason: text,
  }),
  CompanyVendorCreated: object({ workItemId: key, vendorReference: nonempty }),
  PortalSetupCompleted: object({ workItemId: key }),
  InitialTrainingCompleted: object({ workItemId: key }),
  TrainingConfirmed: object({ workItemId: key }),
  SkillRequested: object({ qualificationId: key, skill: nonempty }),
  SkillApproved: object({
    workItemId: key,
    qualificationId: key,
    reason: text,
  }),
  SkillRejected: object({
    workItemId: key,
    qualificationId: key,
    reason: text,
  }),
  SkillInvalidated: object({ qualificationId: key, reason: text }),
  ContractorReadinessChanged: object({
    ready: bool,
    approvedSkillCount: number,
    causedByEventId: optional(key),
  }),
  ContractorSuspended: object({ reason: text, causedByEventId: key }),
  ContractorActivated: object({ workItemId: key }),
};
const event: Check = (v, p) => {
  object({
    eventId: key,
    eventType: one(...Object.keys(payloads)),
    eventVersion: one(1),
    occurredAt: date,
    companyId: key,
    applicationId: optional(key),
    qualificationId: optional(key),
    correlationId: key,
    actor: text,
    payload: () => {},
  })(v, p);
  const e = v as { eventType: string; payload: unknown };
  payloads[e.eventType](e.payload, `${p}.payload`);
};
const visual = object({
  status: visualStatus,
  explanation: text,
  workItemId: optional(key),
  eventIds: ids,
  satisfied: optional(number),
  total: optional(positive),
  outstanding: optional(list(text)),
});
const recording = object({
  id: key,
  originEventId: key,
  companyId: key,
  companyName: text,
  workflowId: key,
  originLabel: text,
  startedAt: date,
  stoppedAtRevision: optional(number),
  captureError: optional(text),
  workflowIds: ids,
  seen: ids,
  definition: object({
    adapterVersion: one(1),
    workflowName: one("CompanyOnboarding", "SkillQualification"),
    workflowVersion: one(2),
    nodes: list(
      object({
        id: key,
        label: nonempty,
        owner: text,
        group: key,
        kind: one("event", "activity", "decision", "join", "end"),
        activity: optional(activity),
        scope: optional(one("company", "skill")),
      }),
    ),
    edges: list(
      object({
        id: key,
        source: key,
        target: key,
        label: optional(text),
        route: optional(text),
      }),
    ),
  }),
  frames: list(
    object({
      number,
      revision: number,
      capturedAt: date,
      causes: list(
        object({
          id: key,
          label: text,
          kind: one("event", "attempt", "transition"),
          actor: optional(text),
          causedByEventId: optional(key),
        }),
      ),
      nodes: dict(visual),
      edges: dict(visualStatus),
    }),
  ),
});
const stateShape = object({
  schemaVersion: one(4),
  revision: number,
  clock: date,
  companies: list(
    object({
      id: key,
      name: nonempty,
      contact: text,
      email: nonempty,
      vendorReference: optional(nonempty),
      adminComplete: bool,
      portalSetupComplete: bool,
      initialTrainingComplete: bool,
      readinessPublished: bool,
      activationStatus: one("Pending", "Active", "Suspended"),
    }),
  ),
  applications: list(
    object({
      id: key,
      companyId: key,
      source: one("Contractor portal"),
      skill: nonempty,
      submittedAt: date,
      status: one(
        "Screening",
        "Information requested",
        "Onboarding",
        "Completed",
        "Declined",
      ),
      completedAt: optional(date),
      responses: list(object({ text, at: date })),
      reason: optional(text),
      screeningDecisions: list(object({ decision, reason: text, at: date })),
    }),
  ),
  requirements: list(
    object({
      id: key,
      companyId: key,
      type: one("Insurance", "Financial", "Agreement"),
      applicable: bool,
      status: one(
        "Awaiting evidence",
        "Under review",
        "Correction required",
        "Verified",
      ),
      evidenceIds: ids,
      outcome: optional(text),
    }),
  ),
  qualifications: list(
    object({
      id: key,
      companyId: key,
      originatingApplicationId: optional(key),
      skill: nonempty,
      status: one(
        "Awaiting evidence",
        "Under review",
        "Correction required",
        "Awaiting approval",
        "Approved",
        "Rejected",
        "Invalidated",
      ),
      evidenceIds: ids,
      reason: optional(text),
    }),
  ),
  evidence: list(
    object({
      id: key,
      companyId: key,
      requirementId: optional(key),
      qualificationId: optional(key),
      version: positive,
      submittedAt: date,
      description: text,
      fixture,
      verificationState: one("Submitted", "Verified", "Correction required"),
    }),
  ),
  workItems: list(
    object({
      id: key,
      workflowId: key,
      applicationId: optional(key),
      companyId: key,
      qualificationId: optional(key),
      requirementId: optional(key),
      activity,
      owner: role,
      dueAt: date,
      status: one("Open", "Completed", "Cancelled"),
      outcome: optional(text),
      expectedOutcome: text,
      instructions: text,
      createdAt: date,
      completedAt: optional(date),
      cancelledAt: optional(date),
      remindedAt: optional(date),
      escalatedAt: optional(date),
      completionHistory: list(
        object({ at: date, outcome: text, eventId: key }),
      ),
    }),
  ),
  workflows: list(
    object({
      id: key,
      companyId: key,
      applicationId: optional(key),
      qualificationId: optional(key),
      definitionId: one("CompanyOnboarding", "SkillQualification"),
      correlationId: key,
      definitionVersion: one(1, 2),
      status: one("Running", "Completed"),
      stage: text,
      waitingFor: oneOrText,
      awaitedEvents: list(
        object({
          eventType: text,
          workItemId: optional(key),
          subjectId: optional(key),
        }),
      ),
      processedEventIds: ids,
      history: list(
        object({
          at: date,
          kind: one(
            "Event",
            "Activity",
            "Rule",
            "Wait",
            "Lifecycle",
            "Timer",
            "Migration",
          ),
          message: text,
          eventId: optional(key),
        }),
      ),
    }),
  ),
  events: list(event),
  attempts: list(
    object({
      id: key,
      workItemId: key,
      workflowId: key,
      activity,
      attempt: positive,
      at: date,
      status: one("Failed", "Succeeded"),
      technicalError: optional(text),
      businessOutcome: optional(text),
    }),
  ),
  outbox: list(
    object({
      id: key,
      companyId: key,
      at: date,
      recipient: role,
      kind: one("Task", "Reminder", "Escalation", "Readiness", "Operational"),
      message: text,
      workItemId: optional(key),
    }),
  ),
  viz: optional(
    object({
      version: one(1),
      activeRecordingId: text,
      recordings: list(recording),
      captureError: optional(text),
    }),
  ),
});
function oneOrText(v: unknown, p: string) {
  if (v !== null) text(v, p);
}
function unique(values: string[], p: string) {
  if (new Set(values).size !== values.length)
    fail(p, "contains duplicate identities");
}
const canonical = (value: unknown) =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  );

/** Structural/reference validation, not event replay or a repair/migration pass. */
export function validateWorkspace(value: unknown): WorkspaceFile {
  object({
    format: one(workspaceFormat),
    formatVersion: one(1),
    exportedAt: date,
    scenario: object({ name: nonempty, description: text }),
    state: stateShape,
  })(value, "file");
  const file = value as WorkspaceFile,
    s = file.state;
  if (
    file.scenario.name.trim().length < 1 ||
    file.scenario.name.length > 120 ||
    file.scenario.description.length > 2000
  )
    fail(
      "scenario",
      "needs a name of 1-120 characters and description of at most 2000",
    );
  const indexes = {
    company: new Map(s.companies.map((x) => [x.id, x])),
    application: new Map(s.applications.map((x) => [x.id, x])),
    qualification: new Map(s.qualifications.map((x) => [x.id, x])),
    requirement: new Map(s.requirements.map((x) => [x.id, x])),
    evidence: new Map(s.evidence.map((x) => [x.id, x])),
    work: new Map(s.workItems.map((x) => [x.id, x])),
    workflow: new Map(s.workflows.map((x) => [x.id, x])),
    event: new Map(s.events.map((x) => [x.eventId, x])),
    attempt: new Map(s.attempts.map((x) => [x.id, x])),
  };
  for (const collection of [
    s.companies,
    s.applications,
    s.qualifications,
    s.requirements,
    s.evidence,
    s.workItems,
    s.workflows,
    s.attempts,
    s.outbox,
  ])
    unique(
      collection.map((x) => x.id),
      "record IDs",
    );
  unique(
    s.events.map((x) => x.eventId),
    "event IDs",
  );
  const ref = <K extends keyof typeof indexes>(
    kind: K,
    id: string,
    company?: string,
  ): (typeof indexes)[K] extends Map<string, infer T> ? T : never => {
    const item = indexes[kind].get(id);
    if (!item || (company && "companyId" in item && item.companyId !== company))
      fail(`${kind} ${id}`, "has a missing or cross-company reference");
    return item as never;
  };
  for (const a of s.applications) {
    ref("company", a.companyId);
    if (
      s.workflows.filter(
        (w) =>
          w.applicationId === a.id && w.definitionId === "CompanyOnboarding",
      ).length !== 1
    )
      fail(a.id, "needs exactly one company process");
  }
  for (const q of s.qualifications) {
    if (
      s.workflows.filter(
        (w) =>
          w.qualificationId === q.id && w.definitionId === "SkillQualification",
      ).length !== 1
    )
      fail(q.id, "needs exactly one skill process");
    ref("company", q.companyId);
    if (q.originatingApplicationId)
      ref("application", q.originatingApplicationId, q.companyId);
  }
  for (const r of [...s.requirements, ...s.qualifications]) {
    ref("company", r.companyId);
    unique(r.evidenceIds, r.id);
    for (const id of r.evidenceIds) {
      const e = ref("evidence", id, r.companyId);
      if (e.requirementId !== r.id && e.qualificationId !== r.id)
        fail(r.id, "has inconsistent evidence ownership");
    }
  }
  for (const e of s.evidence) {
    ref("company", e.companyId);
    if (Boolean(e.requirementId) === Boolean(e.qualificationId))
      fail(e.id, "must belong to exactly one requirement or skill");
    const parent = e.requirementId
      ? ref("requirement", e.requirementId, e.companyId)
      : ref("qualification", e.qualificationId!, e.companyId);
    if (!parent.evidenceIds.includes(e.id))
      fail(e.id, "is not linked by its evidence owner");
  }
  for (const w of s.workflows) {
    ref("company", w.companyId);
    if (w.applicationId) ref("application", w.applicationId, w.companyId);
    if (w.qualificationId) ref("qualification", w.qualificationId, w.companyId);
    if (
      w.definitionId === "CompanyOnboarding"
        ? !w.applicationId || !!w.qualificationId
        : !w.qualificationId
    )
      fail(w.id, "has invalid workflow subject");
    unique(w.processedEventIds, w.id);
    for (const id of w.processedEventIds) {
      const e = ref("event", id, w.companyId);
      if (e.correlationId !== w.correlationId)
        fail(w.id, "has an unrelated processed event");
    }
    for (const h of w.history)
      if (h.eventId) ref("event", h.eventId, w.companyId);
    for (const wait of w.awaitedEvents) {
      if (wait.workItemId) {
        const t = ref("work", wait.workItemId, w.companyId);
        if (t.workflowId !== w.id || t.status !== "Open")
          fail(w.id, "waits on unavailable work");
      }
      if (
        wait.subjectId &&
        !indexes.qualification.has(wait.subjectId) &&
        !indexes.requirement.has(wait.subjectId)
      )
        fail(w.id, "waits on a missing subject");
    }
    if (
      w.status === "Completed" &&
      (w.awaitedEvents.length || w.waitingFor !== null)
    )
      fail(w.id, "is completed but still waiting");
  }
  for (const t of s.workItems) {
    const w = ref("workflow", t.workflowId, t.companyId);
    ref("company", t.companyId);
    if (t.applicationId) ref("application", t.applicationId, t.companyId);
    if (t.qualificationId) ref("qualification", t.qualificationId, t.companyId);
    if (t.requirementId) ref("requirement", t.requirementId, t.companyId);
    if (
      t.applicationId !== w.applicationId ||
      t.qualificationId !== w.qualificationId ||
      t.owner !== activityDefinitions[t.activity].owner
    )
      fail(t.id, "has inconsistent workflow ownership");
    if (t.status === "Open" && w.status === "Completed")
      fail(t.id, "is open on a completed workflow");
    if (
      t.status === "Open" &&
      t.activity === "PublishActivation" &&
      !isReady(ref("company", t.companyId), s.qualifications)
    )
      fail(t.id, "publishes activation without readiness");
    for (const h of t.completionHistory) ref("event", h.eventId, t.companyId);
  }
  unique(
    s.workItems
      .filter((t) => t.status === "Open")
      .map((t) => `${t.workflowId}:${t.activity}:${t.requirementId ?? ""}`),
    "open work",
  );
  for (const a of s.attempts) {
    const t = ref("work", a.workItemId);
    if (a.workflowId !== t.workflowId || a.activity !== t.activity)
      fail(a.id, "has inconsistent attempt ownership");
  }
  for (const m of s.outbox) {
    ref("company", m.companyId);
    if (m.workItemId) ref("work", m.workItemId, m.companyId);
  }
  for (const e of s.events) {
    ref("company", e.companyId);
    if (e.applicationId) ref("application", e.applicationId, e.companyId);
    if (e.qualificationId) ref("qualification", e.qualificationId, e.companyId);
    if ("workItemId" in e.payload)
      ref("work", e.payload.workItemId, e.companyId);
    if ("evidenceId" in e.payload)
      ref("evidence", e.payload.evidenceId, e.companyId);
    if ("qualificationId" in e.payload)
      ref("qualification", e.payload.qualificationId, e.companyId);
    if ("causedByEventId" in e.payload && e.payload.causedByEventId)
      ref("event", e.payload.causedByEventId, e.companyId);
  }
  for (const c of s.companies) {
    if (
      c.readinessPublished !== isReady(c, s.qualifications) ||
      (c.activationStatus === "Active" && !isReady(c, s.qualifications))
    )
      fail(c.id, "has inconsistent current readiness/activation");
    if (
      c.adminComplete !==
      administrativeComplete(s.requirements.filter((r) => r.companyId === c.id))
    )
      fail(c.id, "has inconsistent administrative approval");
  }
  if (s.viz) {
    unique(
      s.viz.recordings.map((r) => r.id),
      "recording IDs",
    );
    if (
      s.viz.activeRecordingId &&
      !s.viz.recordings.some((r) => r.id === s.viz!.activeRecordingId)
    )
      fail("active recording", "is missing");
    for (const r of s.viz.recordings) {
      ref("company", r.companyId);
      const root = ref("workflow", r.workflowId, r.companyId),
        origin = ref("event", r.originEventId, r.companyId);
      if (
        !["ApplicationSubmitted", "SkillRequested"].includes(
          origin.eventType,
        ) ||
        originWorkflow(s, origin)?.id !== root.id
      )
        fail(r.id, "has an invalid originating event");
      const expected = mapDefinition(root),
        shape = (d: typeof expected) => ({
          workflowName: d.workflowName,
          workflowVersion: d.workflowVersion,
          nodes: d.nodes.map(({ id, kind, group, activity, scope }) => ({
            id,
            kind,
            group,
            activity,
            scope,
          })),
          edges: d.edges,
        });
      if (canonical(shape(r.definition)) !== canonical(shape(expected)))
        fail(r.id, "has an unsupported pinned map definition");
      const known = causes(s, r),
        knownIds = new Set(known.map((c) => c.id));
      unique(r.workflowIds, r.id);
      if (!r.workflowIds.includes(root.id))
        fail(r.id, "omits its root workflow");
      for (const id of r.workflowIds) ref("workflow", id, r.companyId);
      if (
        r.workflowIds.some((id) => !lineage(s, root).some((w) => w.id === id))
      )
        fail(r.id, "has unrelated recording lineage");
      unique(r.seen, r.id);
      if (r.seen.some((id) => !knownIds.has(id)))
        fail(r.id, "has damaged processed identities");
      if (!r.frames.length) fail(r.id, "has no starting frame");
      const nodeIds = r.definition.nodes.map((n) => n.id),
        edgeIds = r.definition.edges.map((e) => e.id);
      for (const [i, f] of r.frames.entries()) {
        if (
          f.number !== i ||
          f.revision > s.revision ||
          (i > 0 && f.revision <= r.frames[i - 1].revision)
        )
          fail(r.id, "has invalid frame ordering");
        if (
          Object.keys(f.nodes).length !== nodeIds.length ||
          nodeIds.some((id) => !Object.hasOwn(f.nodes, id)) ||
          Object.keys(f.edges).length !== edgeIds.length ||
          edgeIds.some((id) => !Object.hasOwn(f.edges, id))
        )
          fail(r.id, "has incomplete frame topology");
        for (const v of Object.values(f.nodes)) {
          if (
            v.workItemId &&
            !r.workflowIds.includes(
              ref("work", v.workItemId, r.companyId).workflowId,
            )
          )
            fail(r.id, "has unrelated frame work");
          for (const id of v.eventIds) {
            ref("event", id, r.companyId);
            if (!knownIds.has(id)) fail(r.id, "has unrelated frame events");
          }
          if (
            v.satisfied !== undefined &&
            (v.total === undefined || v.satisfied > v.total)
          )
            fail(r.id, "has invalid join counts");
        }
        for (const c of f.causes) {
          if (!knownIds.has(c.id)) fail(r.id, "has a missing frame cause");
          if (c.causedByEventId) ref("event", c.causedByEventId, r.companyId);
        }
      }
      if (r.id === s.viz.activeRecordingId) {
        if (r.stoppedAtRevision !== undefined)
          fail(r.id, "is both active and archived");
        if (!r.captureError && !s.viz.captureError) {
          if (
            JSON.stringify(r.workflowIds) !==
              JSON.stringify(lineage(s, root).map((w) => w.id)) ||
            JSON.stringify(r.seen) !== JSON.stringify(known.map((c) => c.id))
          )
            fail(
              r.id,
              "has incomplete recording lineage or processed identities",
            );
          const last = r.frames.at(-1)!;
          if (
            canonical(project(s, r)) !==
            canonical({ nodes: last.nodes, edges: last.edges })
          )
            fail(r.id, "does not match its live recorded state");
        }
      } else if (
        r.stoppedAtRevision === undefined ||
        r.stoppedAtRevision > s.revision
      )
        fail(r.id, "has invalid archive metadata");
    }
  }
  return file;
}
export function createWorkspaceFile(
  state: State,
  name: string,
  description = "",
): WorkspaceFile {
  const { workspaceEpoch: _local, ...portable } = structuredClone(state);
  return validateWorkspace({
    format: workspaceFormat,
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    scenario: { name: name.trim(), description: description.trim() },
    state: portable,
  });
}
export function parseWorkspaceFile(json: string) {
  if (new TextEncoder().encode(json).length > maxWorkspaceBytes)
    throw new Error("Workspace file exceeds the supported 50 MiB limit.");
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error("This file is not valid workspace JSON.");
  }
  return validateWorkspace(value);
}
export const workspaceFilename = (name: string) =>
  `unity-fieldwork-${
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "workspace"
  }.json`;
export const workspaceSummary = (file: WorkspaceFile) => ({
  companies: file.state.companies.length,
  openWork: file.state.workItems.filter((t) => t.status === "Open").length,
  events: file.state.events.length,
  failedAttempts: file.state.attempts.filter((a) => a.status === "Failed")
    .length,
  recordings: file.state.viz?.recordings.length ?? 0,
  frames:
    file.state.viz?.recordings.reduce((n, r) => n + r.frames.length, 0) ?? 0,
});
