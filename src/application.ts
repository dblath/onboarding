import {
  activityDefinitions,
  emptyState,
  id,
  isReady,
  latestEvidence,
  reviewEvidence,
  skillCatalog,
  type Activity,
  type BusinessEvent,
  type Decision,
  type EvidenceFixture,
  type Role,
  type State,
  type WorkItem,
} from "./domain";
import {
  envelope,
  LocalOrchestrator,
  log,
  updateWaits,
  type OrchestrationPort,
} from "./orchestration";
import { migrateState } from "./migration";
import { project, safelyCaptureVisuals, startRecording } from "./viz/recorder";
import { createWorkspaceFile, validateWorkspace } from "./workspace/format";
import {
  UnavailableCoordinator,
  type CommandCoordinator,
} from "./coordination";
export { LocalOrchestrator } from "./orchestration";
export interface Repository {
  load(): Promise<State>;
  save(state: State): Promise<void>;
}
export interface IntegrationPort {
  execute(state: State, task: WorkItem, fail: boolean): BusinessEvent;
}
/** No network calls: fictional outcomes are derived deterministically from the selected fixture. */
export class SimulatedIntegrations implements IntegrationPort {
  execute(s: State, t: WorkItem, fail: boolean): BusinessEvent {
    if (fail)
      throw new Error(
        "Simulated integration timeout. No business outcome was recorded. Retry this activity to continue.",
      );
    const w = s.workflows.find((w) => w.id === t.workflowId)!;
    if (t.activity === "CreateVendor")
      return envelope(
        s,
        w,
        "CompanyVendorCreated",
        {
          workItemId: t.id,
          vendorReference: `DEMO-${t.companyId.slice(0, 8).toUpperCase()}`,
        },
        "Simulated vendor adapter",
      );
    if (t.activity === "PublishActivation")
      return envelope(
        s,
        w,
        "ContractorActivated",
        { workItemId: t.id },
        "Simulated contractor management",
      );
    const evidence = latestEvidence(s, t);
    if (!evidence) throw new Error("Evidence is missing.");
    const result = reviewEvidence(evidence);
    const payload = {
      workItemId: t.id,
      evidenceId: evidence.id,
      outcome:
        result === "Valid"
          ? ("Verified" as const)
          : ("Correction required" as const),
      reason:
        result === "Valid"
          ? "Demo verification passed."
          : result === "Expired"
            ? "The demo document is expired. Submit a current replacement."
            : "The demo pack is incomplete. Submit a complete replacement.",
    };
    if (t.activity === "VerifyLicense")
      return envelope(
        s,
        w,
        "LicenseReviewCompleted",
        { ...payload, outcome: result },
        "Simulated license verifier",
      );
    if (t.activity === "ReviewInsurance")
      return envelope(
        s,
        w,
        "InsuranceReviewCompleted",
        payload,
        "Simulated insurance verifier",
      );
    if (t.activity === "ReviewFinancial")
      return envelope(
        s,
        w,
        "FinancialReviewCompleted",
        payload,
        "Simulated financial verifier",
      );
    if (t.activity === "ExecuteAgreement")
      return envelope(
        s,
        w,
        "AgreementExecuted",
        payload,
        "Simulated agreement service",
      );
    throw new Error("This is not a supported integration activity.");
  }
}
export class OnboardingService {
  private queue: Promise<unknown> = Promise.resolve();
  private observedRevision = -1;
  private observedEpoch: string | undefined;
  private observe(s: State) {
    if (s.revision >= this.observedRevision) {
      this.observedRevision = s.revision;
      this.observedEpoch = s.workspaceEpoch;
    }
  }
  private enqueue<T>(run: () => Promise<T>): Promise<T> {
    const next = this.queue.then(run);
    this.queue = next.catch(() => {});
    return next;
  }
  constructor(
    private repository: Repository,
    private orchestration: OrchestrationPort = new LocalOrchestrator(),
    private integrations: IntegrationPort = new SimulatedIntegrations(),
    private coordinator: CommandCoordinator = new UnavailableCoordinator(),
  ) {}
  get unavailableReason() {
    return this.coordinator.unavailableReason;
  }
  subscribe(listener: (revision: number) => void) {
    return this.coordinator.subscribe(listener);
  }
  private change<T>(action: (s: State) => T, forceSave = false): Promise<T> {
    const expectedEpoch = this.observedEpoch,
      observed = this.observedRevision >= 0;
    const run = async () => {
      let committedRevision: number | undefined;
      const result = await this.coordinator.exclusive(async () => {
        const raw = await this.repository.load();
        if (observed && raw.workspaceEpoch !== expectedEpoch)
          throw new Error(
            "The workspace was replaced in another tab. Review the restored workspace before trying this action again.",
          );
        const before = JSON.stringify(raw);
        const s = migrateState(raw);
        const value = action(s);
        safelyCaptureVisuals(s);
        if (forceSave || JSON.stringify(s) !== before) {
          s.revision += 1;
          await this.repository.save(s);
          committedRevision = s.revision;
        }
        this.observe(s);
        return value;
      });
      // Publishing is deliberately outside the lock and after transaction completion.
      if (committedRevision !== undefined)
        this.coordinator.publish(committedRevision);
      return result;
    };
    return this.enqueue(run);
  }
  /** Persist migrations on first open, not just on the next business command. */
  initialize() {
    return this.change((s) => s, true);
  }
  async getState() {
    const s = await this.repository.load();
    this.observe(s);
    return s;
  }
  saveWorkspace(name: string, description = "") {
    return this.enqueue(() =>
      this.coordinator.exclusive(async () =>
        createWorkspaceFile(await this.repository.load(), name, description),
      ),
    );
  }
  /** Replaces one snapshot atomically; no migration, event replay or Viz capture. */
  restoreWorkspace(input: unknown, expectedRevision: number) {
    const file = structuredClone(validateWorkspace(input));
    const active = file.state.viz?.recordings.find(
      (r) => r.id === file.state.viz?.activeRecordingId,
    );
    if (active && !active.captureError && !file.state.viz?.captureError) {
      // JSON object keys have no semantic order. Values were validated equal;
      // preserve all recorded content while aligning the live comparison order
      // for the existing recorder. No frame is added or business command replayed.
      const projected = project(file.state, active),
        last = active.frames.at(-1)!;
      if (
        JSON.stringify(projected) !==
        JSON.stringify({ nodes: last.nodes, edges: last.edges })
      ) {
        last.nodes = projected.nodes;
        last.edges = projected.edges;
      }
    }
    return this.replaceWorkspace(file.state, expectedRevision);
  }
  resetWorkspace(expectedRevision: number) {
    return this.replaceWorkspace(emptyState(), expectedRevision);
  }
  private replaceWorkspace(snapshot: State, expectedRevision: number) {
    return this.enqueue(async () => {
      const revision = await this.coordinator.exclusive(async () => {
        const current = await this.repository.load();
        if (current.revision !== expectedRevision)
          throw new Error(
            "The workspace changed while you were reviewing. Preview the replacement again before confirming.",
          );
        const next = structuredClone(snapshot);
        next.revision = Math.max(current.revision, next.revision) + 1;
        if (!Number.isSafeInteger(next.revision))
          throw new Error(
            "Workspace revision limit reached. No state was replaced.",
          );
        next.workspaceEpoch = id();
        await this.repository.save(next);
        this.observe(next);
        return next.revision;
      });
      this.coordinator.publish(revision);
    });
  }
  startVizRecording(originEventId: string) {
    return this.change((s) => startRecording(s, originEventId));
  }
  async getApplication(applicationId: string) {
    return (await this.getState()).applications.find(
      (a) => a.id === applicationId,
    );
  }
  async getWorkQueue(owner: Role) {
    return (await this.getState()).workItems.filter(
      (w) => w.owner === owner && w.status === "Open",
    );
  }
  async getWorkflowInstance(applicationId: string) {
    return (await this.getState()).workflows.find(
      (w) =>
        w.applicationId === applicationId &&
        w.definitionId === "CompanyOnboarding",
    );
  }
  submitApplication(input: {
    name: string;
    contact: string;
    email: string;
    skill: string;
  }) {
    return this.change((s) => {
      if (Object.values(input).some((v) => !v.trim()))
        throw new Error("Complete all application fields.");
      if (!/^\S+@\S+\.\S+$/.test(input.email))
        throw new Error("Enter a valid demo email.");
      const companyId = id(),
        applicationId = id();
      s.companies.push({
        id: companyId,
        name: input.name.trim(),
        contact: input.contact.trim(),
        email: input.email.trim(),
        adminComplete: false,
        portalSetupComplete: false,
        initialTrainingComplete: false,
        readinessPublished: false,
        activationStatus: "Pending",
      });
      s.applications.push({
        id: applicationId,
        companyId,
        source: "Contractor portal",
        skill: input.skill.trim(),
        submittedAt: s.clock,
        status: "Screening",
        responses: [],
        screeningDecisions: [],
      });
      this.emit(s, {
        eventId: id(),
        eventType: "ApplicationSubmitted",
        eventVersion: 1,
        occurredAt: s.clock,
        companyId,
        applicationId,
        correlationId: id(),
        actor: "Contractor",
        payload: { skill: input.skill.trim() },
      });
      return applicationId;
    });
  }
  private root(s: State, applicationId: string) {
    const w = s.workflows.find(
      (w) =>
        w.applicationId === applicationId &&
        w.definitionId === "CompanyOnboarding",
    );
    if (!w) throw new Error("Application not found.");
    return w;
  }
  private emit(s: State, e: BusinessEvent) {
    if (!this.orchestration.deliver(s, e))
      throw new Error(
        "This action has already been handled or is no longer expected. Check the updated work queue.",
      );
  }
  private task(s: State, workItemId: string, activities?: Activity[]) {
    const t = s.workItems.find(
      (t) => t.id === workItemId && t.status === "Open",
    );
    if (!t || (activities && !activities.includes(t.activity)))
      throw new Error("This work item is no longer available for this action.");
    if (s.workflows.find((w) => w.id === t.workflowId)?.status === "Completed")
      throw new Error("Completed workflow execution cannot accept work.");
    return t;
  }
  recordScreeningDecision(
    applicationId: string,
    decision: Decision,
    reason: string,
  ) {
    return this.change((s) => {
      if (!["Proceed", "RequestInformation", "Decline"].includes(decision))
        throw new Error("Invalid decision.");
      if (decision !== "Proceed" && !reason.trim())
        throw new Error("Add a reason or describe the information needed.");
      this.emit(
        s,
        envelope(
          s,
          this.root(s, applicationId),
          "ScreeningDecisionRecorded",
          { decision, reason: reason.trim() },
          "Recruitment",
        ),
      );
    });
  }
  submitAdditionalInformation(applicationId: string, text: string) {
    return this.change((s) => {
      if (!text.trim()) throw new Error("Enter your response.");
      this.emit(
        s,
        envelope(
          s,
          this.root(s, applicationId),
          "AdditionalInformationSubmitted",
          { text: text.trim() },
          "Contractor",
        ),
      );
    });
  }
  submitEvidence(workItemId: string, fixture: EvidenceFixture) {
    return this.change((s) => {
      const t = this.task(s, workItemId, [
          "SubmitLicense",
          "SubmitInsurance",
          "SubmitFinancial",
          "SubmitAgreement",
        ]),
        w = s.workflows.find((w) => w.id === t.workflowId)!;
      this.emit(
        s,
        envelope(
          s,
          w,
          "EvidenceSubmitted",
          {
            workItemId,
            evidenceId: id(),
            fixture,
            description: `${fixture} — ${activityDefinitions[t.activity].label}. Fictional test data only.`,
          },
          "Contractor",
        ),
      );
    });
  }
  executeActivity(workItemId: string, fail = false) {
    return this.change((s) => {
      const t = this.task(s, workItemId, [
          "ReviewInsurance",
          "ReviewFinancial",
          "ExecuteAgreement",
          "VerifyLicense",
          "CreateVendor",
          "PublishActivation",
        ]),
        w = s.workflows.find((w) => w.id === t.workflowId)!;
      if (
        t.activity === "PublishActivation" &&
        !isReady(
          s.companies.find((c) => c.id === t.companyId)!,
          s.qualifications,
        )
      )
        throw new Error("Readiness prerequisites are incomplete.");
      const attempt =
        s.attempts.filter((a) => a.workItemId === t.id).length + 1;
      let event: BusinessEvent;
      try {
        event = this.integrations.execute(s, t, fail);
      } catch (error) {
        const technicalError =
          error instanceof Error ? error.message : String(error);
        s.attempts.push({
          id: id(),
          workItemId: t.id,
          workflowId: w.id,
          activity: t.activity,
          attempt,
          at: s.clock,
          status: "Failed",
          technicalError,
        });
        log(s, w, "Activity", `Attempt ${attempt} failed: ${technicalError}`);
        return false;
      }
      this.emit(s, event);
      s.attempts.push({
        id: id(),
        workItemId: t.id,
        workflowId: w.id,
        activity: t.activity,
        attempt,
        at: s.clock,
        status: "Succeeded",
        businessOutcome:
          "outcome" in event.payload ? event.payload.outcome : event.eventType,
      });
      log(
        s,
        w,
        "Activity",
        `Attempt ${attempt} succeeded. Business outcome delivered as ${event.eventType}.`,
        event.eventId,
      );
      return true;
    });
  }
  retryActivity(workItemId: string) {
    return this.executeActivity(workItemId, false);
  }
  decideSkill(workItemId: string, approve: boolean, reason: string) {
    return this.change((s) => {
      const t = this.task(s, workItemId, ["ApproveSkill"]);
      if (!approve && !reason.trim())
        throw new Error("Explain why this skill is rejected.");
      const w = s.workflows.find((w) => w.id === t.workflowId)!;
      this.emit(
        s,
        envelope(
          s,
          w,
          approve ? "SkillApproved" : "SkillRejected",
          {
            workItemId,
            qualificationId: t.qualificationId!,
            reason: reason.trim(),
          },
          "Field Manager",
        ),
      );
    });
  }
  completeParticipantTask(workItemId: string) {
    return this.change((s) => {
      const t = this.task(s, workItemId, [
          "SetupPortal",
          "CompleteTraining",
          "ConfirmTraining",
        ]),
        w = s.workflows.find((w) => w.id === t.workflowId)!;
      const eventType =
        t.activity === "SetupPortal"
          ? "PortalSetupCompleted"
          : t.activity === "CompleteTraining"
            ? "InitialTrainingCompleted"
            : "TrainingConfirmed";
      this.emit(s, envelope(s, w, eventType, { workItemId }, t.owner));
    });
  }
  requestSkill(companyId: string, skill: string) {
    return this.change((s) => {
      const c = s.companies.find((c) => c.id === companyId);
      if (
        !c ||
        !isReady(c, s.qualifications) ||
        c.activationStatus !== "Active"
      )
        throw new Error("Additional skills can be requested after activation.");
      if (!skillCatalog.includes(skill as (typeof skillCatalog)[number]))
        throw new Error("Choose HVAC or Plumbing.");
      if (
        s.qualifications.some(
          (q) =>
            q.companyId === companyId &&
            q.skill === skill &&
            q.status !== "Rejected" &&
            q.status !== "Invalidated",
        )
      )
        throw new Error("This skill is already approved or in progress.");
      // Workflow creation remains behind event ingress; qualifications belong directly to the company.
      const qualificationId = id();
      s.qualifications.push({
        id: qualificationId,
        companyId,
        skill,
        status: "Awaiting evidence",
        evidenceIds: [],
      });
      this.emit(s, {
        eventId: id(),
        eventType: "SkillRequested",
        eventVersion: 1,
        occurredAt: s.clock,
        companyId,
        qualificationId,
        correlationId: id(),
        actor: "Contractor",
        payload: { qualificationId, skill },
      });
      return qualificationId;
    });
  }
  invalidateSkill(qualificationId: string, reason: string) {
    return this.change((s) => {
      if (!reason.trim())
        throw new Error("Record a reason for invalidating this approval.");
      const w = s.workflows.find((w) => w.qualificationId === qualificationId);
      if (!w) throw new Error("Qualification workflow not found.");
      this.emit(
        s,
        envelope(
          s,
          w,
          "SkillInvalidated",
          { qualificationId, reason: reason.trim() },
          "Compliance",
        ),
      );
    });
  }
  advanceTime(days: number) {
    return this.change((s) => {
      if (!Number.isInteger(days) || days < 1 || days > 30)
        throw new Error("Advance between 1 and 30 whole demo days.");
      s.clock = new Date(Date.parse(s.clock) + days * 86400000).toISOString();
      for (const t of s.workItems.filter(
        (t) => t.status === "Open" && t.owner !== "Simulation",
      )) {
        const overdue = Date.parse(s.clock) - Date.parse(t.dueAt),
          w = s.workflows.find((w) => w.id === t.workflowId)!;
        if (overdue >= 0 && !t.remindedAt) {
          t.remindedAt = s.clock;
          s.outbox.push({
            id: id(),
            companyId: t.companyId,
            at: s.clock,
            recipient: t.owner,
            kind: "Reminder",
            workItemId: t.id,
            message: `Reminder: ${activityDefinitions[t.activity].label} is overdue.`,
          });
          log(
            s,
            w,
            "Timer",
            `Reminder sent in-app to ${t.owner}: ${activityDefinitions[t.activity].label}`,
          );
        }
        if (overdue >= 2 * 86400000 && !t.escalatedAt) {
          t.escalatedAt = s.clock;
          s.outbox.push({
            id: id(),
            companyId: t.companyId,
            at: s.clock,
            recipient: "Contractor Relations",
            kind: "Escalation",
            workItemId: t.id,
            message: `Escalation: ${t.owner} has overdue work — ${activityDefinitions[t.activity].label}.`,
          });
          log(
            s,
            w,
            "Timer",
            `Escalated overdue ${activityDefinitions[t.activity].label} to Contractor Relations`,
          );
        }
      }
    });
  }
  deliverEvent(event: BusinessEvent) {
    return this.change((s) => this.orchestration.deliver(s, event));
  }
}
export class IndexedDbRepository implements Repository {
  private db: Promise<IDBDatabase>;
  constructor(name = "fieldwork-onboarding") {
    this.db = new Promise((resolve, reject) => {
      const r = indexedDB.open(name, 1);
      r.onupgradeneeded = () => r.result.createObjectStore("state");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.onblocked = () =>
        reject(new Error("Storage is blocked by another browser tab."));
    });
  }
  async load(): Promise<State> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const r = db.transaction("state").objectStore("state").get("current");
      // Migration can schedule workflow work, so it runs only inside a locked command.
      r.onsuccess = () => resolve(r.result ?? emptyState());
      r.onerror = () => reject(r.error);
    });
  }
  async save(s: State): Promise<void> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const tx = db.transaction("state", "readwrite");
      tx.objectStore("state").put(s, "current");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error ?? new Error("Storage transaction aborted."));
    });
  }
}
