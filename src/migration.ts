import {
  emptyState,
  isReady,
  type State,
  type WorkflowInstance,
  type WorkItem,
} from "./domain";
import { LocalOrchestrator, updateWaits } from "./orchestration";
interface LegacyState {
  companies: { id: string; name: string; contact: string; email: string }[];
  applications: {
    id: string;
    companyId: string;
    source: "Contractor portal";
    skill: string;
    submittedAt: string;
    status: string;
    responses: { text: string; at: string }[];
    reason?: string;
    adminComplete?: boolean;
    portalSetupComplete?: boolean;
    initialTrainingComplete?: boolean;
    qualifications?: { id: string; skill: string; status: string }[];
  }[];
  workItems: {
    id: string;
    applicationId: string;
    activity: string;
    owner: string;
    dueAt: string | null;
    status: string;
    outcome?: string;
  }[];
  workflows: {
    id: string;
    applicationId: string;
    correlationId: string;
    definitionVersion: 1;
    status: "Running" | "Completed";
    stage: string;
    waitingFor: string | null;
    processedEventIds: string[];
    history: { at: string; message: string; eventId: string }[];
  }[];
  events: State["events"];
}
/** Versioned storage boundary. Leaves the original IDs, events and history intact. */
export function migrateState(raw: unknown): State {
  if (!raw) return emptyState();
  if ((raw as State).schemaVersion === 4) return raw as State;
  if ([2, 3].includes((raw as { schemaVersion: number }).schemaVersion)) {
    return correctLegacyLifecycle({
      ...(raw as State),
      schemaVersion: 4,
      revision: (raw as State).revision ?? 0,
    });
  }
  const old = raw as LegacyState,
    s = emptyState();
  s.companies = old.companies.map((c) => ({
    ...c,
    adminComplete: false,
    portalSetupComplete: false,
    initialTrainingComplete: false,
    readinessPublished: false,
    activationStatus: "Pending",
  }));
  s.applications = old.applications.map((a) => ({
    id: a.id,
    companyId: a.companyId,
    source: a.source,
    skill: a.skill,
    submittedAt: a.submittedAt,
    status:
      a.status === "Next stage"
        ? "Onboarding"
        : (a.status as State["applications"][number]["status"]),
    responses: a.responses,
    reason: a.reason,
    screeningDecisions: [],
  }));
  for (const a of old.applications)
    for (const q of a.qualifications ?? []) {
      s.qualifications.push({
        id: q.id,
        companyId: a.companyId,
        originatingApplicationId: a.id,
        skill: q.skill,
        status: q.status === "Approved" ? "Approved" : "Awaiting evidence",
        evidenceIds: [],
      });
    }
  s.events = old.events;
  s.workflows = old.workflows.map(
    (w) =>
      ({
        ...w,
        companyId: s.applications.find((a) => a.id === w.applicationId)!
          .companyId,
        definitionId: "CompanyOnboarding",
        definitionVersion: w.status === "Completed" ? 1 : 2,
        awaitedEvents: [],
        history: [
          ...w.history.map((h) => ({ ...h, kind: "Event" as const })),
          {
            at: s.clock,
            kind: "Migration",
            message:
              "Restored Iteration 1 state; running instance upgraded to definition v2. Legacy planned placeholders replaced by actionable work.",
          },
        ],
      }) as WorkflowInstance,
  );
  for (const t of old.workItems) {
    const w = s.workflows.find((w) => w.applicationId === t.applicationId)!;
    if (t.status === "Planned") continue;
    s.workItems.push({
      ...t,
      activity: t.activity as WorkItem["activity"],
      owner: t.owner as WorkItem["owner"],
      status: t.status as WorkItem["status"],
      companyId: w.companyId,
      workflowId: w.id,
      dueAt:
        t.dueAt ?? new Date(Date.parse(s.clock) + 2 * 86400000).toISOString(),
      createdAt: s.clock,
      expectedOutcome:
        t.activity === "ScreenApplication"
          ? "ScreeningDecisionRecorded"
          : "AdditionalInformationSubmitted",
      instructions:
        t.activity === "ProvideInformation"
          ? (s.applications.find((a) => a.id === t.applicationId)?.reason ??
            "Provide requested details.")
          : "Review the application.",
      completionHistory: [],
    } as WorkItem);
  }
  const orchestrator = new LocalOrchestrator();
  for (const w of [...s.workflows]) {
    if (w.stage === "Next stage planned" && w.status === "Running")
      orchestrator.beginRequirements(s, w);
    updateWaits(s, w);
  }
  // These facts were not completable in Iteration 1; approval is established through v2 participant actions.
  return correctLegacyLifecycle(s);
}

/** Repair current projections and invalid pending work, without rewriting execution history/events. */
function correctLegacyLifecycle(s: State): State {
  s.applications = s.applications.map((a) => {
    if ((a.status as string) !== "Ready") return a;
    const completion = s.events.find(
      (e) =>
        e.companyId === a.companyId && e.eventType === "ContractorActivated",
    );
    return { ...a, status: "Completed", completedAt: completion?.occurredAt };
  });
  s.companies = s.companies.map((company) => {
    let activated = false,
      wasSuspended = company.activationStatus === "Suspended";
    for (const event of s.events.filter((e) => e.companyId === company.id)) {
      if (event.eventType === "ContractorActivated") activated = true;
      if (
        activated &&
        event.eventType === "ContractorReadinessChanged" &&
        !event.payload.ready
      )
        wasSuspended = true;
    }
    const ready = isReady(company, s.qualifications);
    return {
      ...company,
      readinessPublished: ready,
      activationStatus:
        wasSuspended || (company.activationStatus === "Active" && !ready)
          ? "Suspended"
          : company.activationStatus,
    };
  });
  const completed = new Set(
    s.workflows
      .filter(
        (w) =>
          w.definitionId === "CompanyOnboarding" && w.status === "Completed",
      )
      .map((w) => w.id),
  );
  s.workItems = s.workItems.map((t) =>
    completed.has(t.workflowId) && t.status === "Open"
      ? {
          ...t,
          status: "Cancelled",
          cancelledAt: s.clock,
          outcome:
            "Retired by Iteration 3.1: completed onboarding cannot accept new work. Suspension removal requires a future administrative approval.",
        }
      : t,
  );
  s.workflows = s.workflows.map((w) =>
    completed.has(w.id)
      ? {
          ...w,
          stage:
            w.stage === "Reactivation pending"
              ? "Onboarding complete"
              : w.stage,
          waitingFor: null,
          awaitedEvents: [],
        }
      : w,
  );
  return s;
}
