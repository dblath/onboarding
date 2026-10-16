import { testService } from "./testing";
import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  IndexedDbRepository,
  OnboardingService,
  type Repository,
} from "./application";
import {
  activityDefinitions,
  emptyState,
  id,
  isReady,
  type Activity,
  type BusinessEvent,
  type State,
} from "./domain";
import { migrateState } from "./migration";
class Memory implements Repository {
  state = emptyState();
  async load() {
    return structuredClone(this.state);
  }
  async save(s: State) {
    this.state = structuredClone(s);
  }
}
const input = {
  name: "Summit Demo Services",
  contact: "Alex Demo",
  email: "alex@example.com",
  skill: "HVAC",
};
async function setup(repository: Repository = new Memory()) {
  const service = testService(repository),
    applicationId = await service.submitApplication(input);
  await service.recordScreeningDecision(
    applicationId,
    "Proceed",
    "Demo experience accepted",
  );
  return {
    service,
    applicationId,
    companyId: (await service.getState()).companies[0].id,
  };
}
async function task(
  service: OnboardingService,
  activity: Activity,
  qualificationId?: string,
) {
  const t = (await service.getState()).workItems.find(
    (t) =>
      t.status === "Open" &&
      t.activity === activity &&
      (!qualificationId || t.qualificationId === qualificationId),
  );
  expect(t, `Missing open ${activity}`).toBeDefined();
  return t!;
}
async function evidence(
  service: OnboardingService,
  activity: Activity,
  fixture:
    | "Valid demo document"
    | "Expired demo document"
    | "Incomplete demo document" = "Valid demo document",
  qualificationId?: string,
) {
  await service.submitEvidence(
    (await task(service, activity, qualificationId)).id,
    fixture,
  );
}
async function execute(
  service: OnboardingService,
  activity: Activity,
  qualificationId?: string,
) {
  expect(
    await service.executeActivity(
      (await task(service, activity, qualificationId)).id,
    ),
  ).toBe(true);
}
async function administrative(service: OnboardingService) {
  for (const [submit, review] of [
    ["SubmitInsurance", "ReviewInsurance"],
    ["SubmitFinancial", "ReviewFinancial"],
    ["SubmitAgreement", "ExecuteAgreement"],
  ] as [Activity, Activity][]) {
    await evidence(service, submit);
    await execute(service, review);
  }
}
async function qualify(
  service: OnboardingService,
  qualificationId?: string,
  approve = true,
) {
  await evidence(
    service,
    "SubmitLicense",
    "Valid demo document",
    qualificationId,
  );
  await execute(service, "VerifyLicense", qualificationId);
  await service.decideSkill(
    (await task(service, "ApproveSkill", qualificationId)).id,
    approve,
    approve ? "Approved demo competency" : "Demo practical assessment failed",
  );
}
async function portalTraining(service: OnboardingService) {
  await execute(service, "CreateVendor");
  for (const activity of [
    "SetupPortal",
    "CompleteTraining",
    "ConfirmTraining",
  ] as Activity[])
    await service.completeParticipantTask((await task(service, activity)).id);
}
async function happy() {
  const setupResult = await setup();
  await administrative(setupResult.service);
  await qualify(setupResult.service);
  await portalTraining(setupResult.service);
  await execute(setupResult.service, "PublishActivation");
  return setupResult;
}
describe("Iteration 2 end-to-end workflows", () => {
  it("reaches Ready and completes onboarding only through participant actions and simulated integrations", async () => {
    const { service } = await happy(),
      s = await service.getState(),
      c = s.companies[0];
    expect(isReady(c, s.qualifications)).toBe(true);
    expect(c.activationStatus).toBe("Active");
    expect(c.vendorReference).toMatch(/^DEMO-/);
    expect(s.applications[0].status).toBe("Completed");
    expect(s.workflows).toHaveLength(2);
    expect(s.workflows.every((w) => w.status === "Completed")).toBe(true);
    expect(s.workItems.every((t) => t.status === "Completed")).toBe(true);
    for (const type of [
      "ApplicationSubmitted",
      "ScreeningDecisionRecorded",
      "EvidenceSubmitted",
      "InsuranceReviewCompleted",
      "FinancialReviewCompleted",
      "AgreementExecuted",
      "CompanyVendorCreated",
      "PortalSetupCompleted",
      "InitialTrainingCompleted",
      "TrainingConfirmed",
      "SkillApproved",
      "ContractorReadinessChanged",
      "ContractorActivated",
    ])
      expect(
        s.events.some((e) => e.eventType === type),
        type,
      ).toBe(true);
    expect(s.attempts.every((a) => a.status === "Succeeded")).toBe(true);
    expect(s.outbox.some((m) => m.kind === "Readiness")).toBe(true);
  });
  it("runs admin and skills independently; vendor and an approved skill are not readiness", async () => {
    const { service } = await setup();
    await qualify(service);
    let s = await service.getState();
    expect(s.qualifications[0].status).toBe("Approved");
    expect(s.companies[0].adminComplete).toBe(false);
    expect(isReady(s.companies[0], s.qualifications)).toBe(false);
    await administrative(service);
    await execute(service, "CreateVendor");
    s = await service.getState();
    expect(s.companies[0].vendorReference).toBeTruthy();
    expect(isReady(s.companies[0], s.qualifications)).toBe(false);
    expect(s.workItems.some((t) => t.activity === "PublishActivation")).toBe(
      false,
    );
  });
  it("withholds vendor and readiness while one mandatory admin approval is missing", async () => {
    const { service } = await setup();
    await evidence(service, "SubmitInsurance");
    await execute(service, "ReviewInsurance");
    await evidence(service, "SubmitAgreement");
    await execute(service, "ExecuteAgreement");
    await qualify(service);
    const s = await service.getState();
    expect(s.companies[0].adminComplete).toBe(false);
    expect(s.workItems.some((t) => t.activity === "CreateVendor")).toBe(false);
    expect(isReady(s.companies[0], s.qualifications)).toBe(false);
  });
  it("waits for first skill even after portal and training finish", async () => {
    const { service } = await setup();
    await administrative(service);
    await portalTraining(service);
    let s = await service.getState();
    expect(isReady(s.companies[0], s.qualifications)).toBe(false);
    expect(
      s.workflows[0].awaitedEvents.some(
        (e) => e.eventType === "ContractorReadinessChanged",
      ),
    ).toBe(true);
    await qualify(service);
    s = await service.getState();
    expect(isReady(s.companies[0], s.qualifications)).toBe(true);
    expect((await task(service, "PublishActivation")).owner).toBe("Simulation");
  });
  it("requires Training confirmation, not only contractor self completion", async () => {
    const { service } = await setup();
    await administrative(service);
    await qualify(service);
    await execute(service, "CreateVendor");
    await service.completeParticipantTask(
      (await task(service, "SetupPortal")).id,
    );
    await service.completeParticipantTask(
      (await task(service, "CompleteTraining")).id,
    );
    let s = await service.getState();
    expect(s.companies[0].initialTrainingComplete).toBe(false);
    expect(isReady(s.companies[0], s.qualifications)).toBe(false);
    await service.completeParticipantTask(
      (await task(service, "ConfirmTraining")).id,
    );
    s = await service.getState();
    expect(isReady(s.companies[0], s.qualifications)).toBe(true);
  });
  it("expired license creates specific correction, retains versions and resumes the same qualification", async () => {
    const { service } = await setup();
    const before = await service.getState(),
      q = before.qualifications[0],
      w = before.workflows.find((w) => w.qualificationId === q.id)!;
    await evidence(service, "SubmitLicense", "Expired demo document");
    await execute(service, "VerifyLicense");
    let s = await service.getState();
    expect(s.qualifications[0].status).toBe("Correction required");
    expect((await task(service, "SubmitLicense")).instructions).toContain(
      "expired",
    );
    expect(s.attempts[0].status).toBe("Succeeded");
    expect(s.attempts[0].businessOutcome).toBe("Expired");
    await qualify(service);
    s = await service.getState();
    expect(s.workflows.find((x) => x.qualificationId === q.id)!.id).toBe(w.id);
    expect(s.qualifications[0].status).toBe("Approved");
    expect(s.evidence.map((e) => e.version)).toEqual([1, 2]);
    expect(s.evidence[0].verificationState).toBe("Correction required");
    expect(s.evidence[1].verificationState).toBe("Verified");
  });
  it.each([
    ["SubmitInsurance", "ReviewInsurance"],
    ["SubmitFinancial", "ReviewFinancial"],
    ["SubmitAgreement", "ExecuteAgreement"],
  ] as [Activity, Activity][])(
    "corrects %s without discarding other approvals",
    async (submit, review) => {
      const { service } = await setup();
      await evidence(service, submit, "Incomplete demo document");
      await execute(service, review);
      expect((await task(service, submit)).instructions).toContain(
        "incomplete",
      );
      await evidence(service, submit);
      await execute(service, review);
      const s = await service.getState();
      expect(
        s.requirements.find((r) => r.evidenceIds.length === 2)!.status,
      ).toBe("Verified");
      expect(s.evidence).toHaveLength(2);
    },
  );
  it("adds a company-owned second skill after activation without another onboarding instance", async () => {
    const { service, companyId } = await happy(),
      before = await service.getState(),
      qId = await service.requestSkill(companyId, "Plumbing");
    let s = await service.getState();
    const q = s.qualifications.find((q) => q.id === qId)!;
    expect(q.companyId).toBe(companyId);
    expect(q.originatingApplicationId).toBeUndefined();
    expect(isReady(s.companies[0], s.qualifications)).toBe(true);
    await qualify(service, qId);
    s = await service.getState();
    expect(
      s.workflows.filter((w) => w.definitionId === "CompanyOnboarding"),
    ).toHaveLength(1);
    expect(s.workflows[0].id).toBe(before.workflows[0].id);
    expect(
      s.qualifications.filter((q) => q.status === "Approved"),
    ).toHaveLength(2);
    expect(
      s.workItems.filter((t) => t.activity === "SetupPortal"),
    ).toHaveLength(1);
  });
  it("a rejected second skill does not remove readiness or reject the company", async () => {
    const { service, companyId } = await happy(),
      qId = await service.requestSkill(companyId, "Plumbing");
    await qualify(service, qId, false);
    const s = await service.getState();
    expect(s.qualifications.find((q) => q.id === qId)!.status).toBe("Rejected");
    expect(isReady(s.companies[0], s.qualifications)).toBe(true);
    expect(s.companies[0].activationStatus).toBe("Active");
    expect(s.applications[0].status).toBe("Completed");
  });
  it("a rejected first skill leaves company onboarding waiting, rather than declining it", async () => {
    const { service } = await setup();
    await qualify(service, undefined, false);
    const s = await service.getState();
    expect(s.applications[0].status).toBe("Onboarding");
    expect(s.workflows[0].status).toBe("Running");
    expect(s.qualifications[0].status).toBe("Rejected");
    expect(
      s.workItems.filter(
        (t) => t.status === "Open" && t.activity.startsWith("Submit"),
      ),
    ).toHaveLength(3);
  });
  it("invalidating the only approved skill removes eligibility and publishes readiness change", async () => {
    const { service } = await happy();
    let s = await service.getState();
    await service.invalidateSkill(
      s.qualifications[0].id,
      "Demo license approval withdrawn",
    );
    s = await service.getState();
    expect(isReady(s.companies[0], s.qualifications)).toBe(false);
    expect(s.companies[0].activationStatus).toBe("Suspended");
    expect(s.companies[0].readinessPublished).toBe(false);
    expect(
      s.events
        .filter((e) => e.eventType === "ContractorReadinessChanged")
        .map((e) => e.payload.ready),
    ).toEqual([true, false]);
    expect(s.workflows[0].status).toBe("Completed");
  });
  it("another approved skill preserves readiness when one skill is invalidated", async () => {
    const { service, companyId } = await happy(),
      qId = await service.requestSkill(companyId, "Plumbing");
    await qualify(service, qId);
    let s = await service.getState();
    await service.invalidateSkill(
      s.qualifications[0].id,
      "Demo approval withdrawn",
    );
    s = await service.getState();
    expect(isReady(s.companies[0], s.qualifications)).toBe(true);
    expect(s.companies[0].activationStatus).toBe("Active");
    expect(
      s.events.filter((e) => e.eventType === "ContractorReadinessChanged"),
    ).toHaveLength(1);
  });
  it("timeout has no business result; retry succeeds without restarting or duplicating work", async () => {
    const { service } = await setup();
    await administrative(service);
    const t = await task(service, "CreateVendor"),
      before = await service.getState();
    expect(await service.executeActivity(t.id, true)).toBe(false);
    let s = await service.getState();
    expect(s.events).toEqual(before.events);
    expect(s.workItems.find((x) => x.id === t.id)!.status).toBe("Open");
    expect(s.attempts.at(-1)!.status).toBe("Failed");
    expect(s.companies[0].vendorReference).toBeUndefined();
    expect(await service.retryActivity(t.id)).toBe(true);
    s = await service.getState();
    expect(
      s.attempts.filter((a) => a.workItemId === t.id).map((a) => a.status),
    ).toEqual(["Failed", "Succeeded"]);
    expect(
      s.workItems.filter((t) => t.activity === "SetupPortal"),
    ).toHaveLength(1);
    expect(s.workflows[0].id).toBe(before.workflows[0].id);
    await expect(service.retryActivity(t.id)).rejects.toThrow();
  });
  it("document verifier timeout is retryable; expired evidence remains a successful business result", async () => {
    const { service } = await setup();
    await evidence(service, "SubmitLicense", "Expired demo document");
    const t = await task(service, "VerifyLicense");
    await service.executeActivity(t.id, true);
    expect((await service.getState()).qualifications[0].status).toBe(
      "Under review",
    );
    await service.retryActivity(t.id);
    const s = await service.getState();
    expect(s.qualifications[0].status).toBe("Correction required");
    expect(s.attempts.map((a) => a.status)).toEqual(["Failed", "Succeeded"]);
    expect(s.attempts[1].businessOutcome).toBe("Expired");
  });
  it("deduplicates all happy-path event deliveries and refuses unrelated correlations", async () => {
    const { service } = await happy(),
      before = await service.getState();
    for (const e of before.events)
      expect(await service.deliverEvent(e)).toBe(false);
    const review = before.events.find(
      (e) => e.eventType === "InsuranceReviewCompleted",
    )!;
    expect(
      await service.deliverEvent({
        ...review,
        eventId: id(),
        correlationId: "wrong",
      }),
    ).toBe(false);
    expect(await service.getState()).toEqual(before);
  });
  it("rejects an evidence review with the wrong subject or impossible approval", async () => {
    const { service } = await setup();
    await evidence(service, "SubmitLicense", "Expired demo document");
    const s = await service.getState(),
      w = s.workflows.find((w) => w.definitionId === "SkillQualification")!,
      t = await task(service, "VerifyLicense");
    const event: BusinessEvent = {
      eventId: id(),
      eventVersion: 1,
      eventType: "LicenseReviewCompleted",
      occurredAt: s.clock,
      companyId: w.companyId,
      applicationId: w.applicationId,
      qualificationId: w.qualificationId,
      correlationId: w.correlationId,
      actor: "Demo verifier",
      payload: {
        workItemId: t.id,
        evidenceId: s.evidence[0].id,
        outcome: "Valid",
        reason: "Forged approval",
      },
    };
    expect(await service.deliverEvent(event)).toBe(false);
    expect(
      await service.deliverEvent({
        ...event,
        eventId: id(),
        companyId: "other-company",
      }),
    ).toBe(false);
    expect(await service.getState()).toEqual(s);
  });
  it("rejects fake readiness and activation while prerequisites remain incomplete", async () => {
    const { service } = await setup(),
      s = await service.getState(),
      w = s.workflows[0];
    const common = {
      eventId: id(),
      eventVersion: 1 as const,
      occurredAt: s.clock,
      companyId: w.companyId,
      applicationId: w.applicationId,
      correlationId: w.correlationId,
      actor: "Demo",
    };
    expect(
      await service.deliverEvent({
        ...common,
        eventType: "ContractorReadinessChanged",
        payload: { ready: true, approvedSkillCount: 1 },
      }),
    ).toBe(false);
    expect(
      await service.deliverEvent({
        ...common,
        eventType: "ContractorActivated",
        payload: { workItemId: "fake" },
      }),
    ).toBe(false);
    expect(await service.getState()).toEqual(s);
  });
  it("persists durable waits, evidence, failed attempts, outbox and history across service recreation", async () => {
    const name = `test-${id()}`,
      repository = new IndexedDbRepository(name),
      { service } = await setup(repository);
    await evidence(service, "SubmitLicense", "Expired demo document");
    await service.executeActivity(
      (await task(service, "VerifyLicense")).id,
      true,
    );
    await service.advanceTime(3);
    const restored = testService(new IndexedDbRepository(name));
    expect(await restored.getState()).toEqual(await service.getState());
    await restored.retryActivity((await task(restored, "VerifyLicense")).id);
    await qualify(restored);
    expect((await restored.getState()).qualifications[0].status).toBe(
      "Approved",
    );
  });
  it("advances demo time, reminds and escalates once per open human work item", async () => {
    const { service } = await setup();
    await service.advanceTime(3);
    let s = await service.getState();
    expect(s.outbox.filter((m) => m.kind === "Reminder")).toHaveLength(4);
    expect(s.outbox.filter((m) => m.kind === "Escalation")).toHaveLength(0);
    await service.advanceTime(2);
    s = await service.getState();
    expect(s.outbox.filter((m) => m.kind === "Reminder")).toHaveLength(4);
    expect(s.outbox.filter((m) => m.kind === "Escalation")).toHaveLength(4);
    expect(s.workItems.filter((t) => t.status === "Open")).toHaveLength(4);
    await service.advanceTime(3);
    expect(
      (await service.getState()).outbox.filter((m) => m.kind === "Escalation"),
    ).toHaveLength(4);
  });
  it("migrates Iteration 1 planned work without changing IDs or losing its history", async () => {
    const legacy = {
      companies: [
        {
          id: "co",
          name: "Old company",
          contact: "Demo",
          email: "demo@example.com",
        },
      ],
      applications: [
        {
          id: "app",
          companyId: "co",
          source: "Contractor portal",
          skill: "Electrical",
          submittedAt: "2026-01-01T00:00:00Z",
          status: "Next stage",
          responses: [],
          qualifications: [
            { id: "old-q", skill: "Electrical", status: "Requested" },
          ],
        },
      ],
      workItems: [
        {
          id: "review",
          applicationId: "app",
          activity: "ScreenApplication",
          owner: "Recruitment",
          status: "Completed",
          dueAt: null,
          outcome: "Proceed",
        },
        {
          id: "placeholder",
          applicationId: "app",
          activity: "AdministrativeReview",
          owner: "Administration",
          status: "Planned",
          dueAt: null,
        },
      ],
      workflows: [
        {
          id: "instance",
          applicationId: "app",
          correlationId: "correlation",
          definitionVersion: 1,
          status: "Running",
          stage: "Next stage planned",
          waitingFor: null,
          processedEventIds: ["old-event"],
          history: [
            {
              at: "2026-01-01T00:00:00Z",
              message: "Previous history",
              eventId: "old-event",
            },
          ],
        },
      ],
      events: [],
    };
    const s = migrateState(legacy);
    expect(s.workflows[0].id).toBe("instance");
    expect(s.workflows[0].correlationId).toBe("correlation");
    expect(s.workflows[0].history[0].message).toBe("Previous history");
    expect(s.workflows[0].definitionVersion).toBe(2);
    expect(s.requirements).toHaveLength(3);
    expect(s.workItems.some((t) => t.id === "placeholder")).toBe(false);
    expect(s.workItems.some((t) => t.id === "review")).toBe(true);
    expect(s.qualifications[0].skill).toBe("Electrical");
    expect(migrateState(s)).toEqual(s);
  });
  it("all activity definitions include an owner and expected outcome", () => {
    for (const definition of Object.values(activityDefinitions)) {
      expect(definition.owner).toBeTruthy();
      expect(definition.event).toBeTruthy();
    }
  });
});
