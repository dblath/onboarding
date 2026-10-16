import { describe, it, expect } from "vitest";
import {
  emptyState,
  id,
  isJobEligible,
  isReady,
  companyLifecycleCorrelation,
  type Activity,
  type State,
} from "./domain";
import { testService } from "./testing";
import type { OnboardingService, Repository } from "./application";
import { migrateState } from "./migration";
import { schedule } from "./orchestration";
class Memory implements Repository {
  state = emptyState();
  async load() {
    return structuredClone(this.state);
  }
  async save(s: State) {
    this.state = structuredClone(s);
  }
}
async function journey() {
  const repository = new Memory(),
    service = testService(repository),
    applicationId = await service.submitApplication({
      name: "Lifecycle Demo",
      contact: "Alex Demo",
      email: "alex@example.com",
      skill: "HVAC",
    });
  await service.recordScreeningDecision(applicationId, "Proceed", "");
  const task = async (activity: Activity, qualificationId?: string) => {
    const t = (await service.getState()).workItems.find(
      (t) =>
        t.status === "Open" &&
        t.activity === activity &&
        (!qualificationId || t.qualificationId === qualificationId),
    );
    if (!t) throw new Error(`No open ${activity}`);
    return t.id;
  };
  const qualify = async (qualificationId?: string, approve = true) => {
    await service.submitEvidence(
      await task("SubmitLicense", qualificationId),
      "Valid demo document",
    );
    await service.executeActivity(await task("VerifyLicense", qualificationId));
    await service.decideSkill(
      await task("ApproveSkill", qualificationId),
      approve,
      approve ? "" : "Demo rejection",
    );
  };
  const companySetup = async () => {
    for (const [submit, review] of [
      ["SubmitInsurance", "ReviewInsurance"],
      ["SubmitFinancial", "ReviewFinancial"],
      ["SubmitAgreement", "ExecuteAgreement"],
    ] as [Activity, Activity][]) {
      await service.submitEvidence(await task(submit), "Valid demo document");
      await service.executeActivity(await task(review));
    }
    await service.executeActivity(await task("CreateVendor"));
    for (const activity of [
      "SetupPortal",
      "CompleteTraining",
      "ConfirmTraining",
    ] as Activity[])
      await service.completeParticipantTask(await task(activity));
  };
  const activate = async () => {
    await service.executeActivity(await task("PublishActivation"));
  };
  return {
    service,
    repository,
    applicationId,
    task,
    qualify,
    companySetup,
    activate,
  };
}
async function active() {
  const j = await journey();
  await j.qualify();
  await j.companySetup();
  await j.activate();
  return j;
}
const root = (s: State) =>
  s.workflows.find((w) => w.definitionId === "CompanyOnboarding")!;
describe("Iteration 3.1 lifecycle invariants", () => {
  it("initial skill rejection leaves consistent non-ready onboarding with no impossible activation transition", async () => {
    const j = await journey();
    await j.companySetup();
    await j.qualify(undefined, false);
    const s = await j.service.getState();
    expect(s.applications[0].status).toBe("Onboarding");
    expect(s.applications[0].completedAt).toBeUndefined();
    expect(root(s).status).toBe("Running");
    expect(isReady(s.companies[0], s.qualifications)).toBe(false);
    expect(isJobEligible(s.companies[0], s.qualifications)).toBe(false);
    expect(s.companies[0].activationStatus).toBe("Pending");
    expect(s.workItems.filter((t) => t.status === "Open")).toHaveLength(0);
    expect(root(s).waitingFor).toBe("ContractorReadinessChanged");
    await expect(
      j.service.requestSkill(s.companies[0].id, "Plumbing"),
    ).rejects.toThrow("after activation");
    expect(await j.service.getState()).toEqual(s);
  });
  it("readiness alone is not job eligibility or historical onboarding completion", async () => {
    const j = await journey();
    await j.qualify();
    await j.companySetup();
    let s = await j.service.getState();
    expect(isReady(s.companies[0], s.qualifications)).toBe(true);
    expect(s.companies[0].activationStatus).toBe("Pending");
    expect(isJobEligible(s.companies[0], s.qualifications)).toBe(false);
    expect(s.applications[0].status).toBe("Onboarding");
    await j.activate();
    s = await j.service.getState();
    expect(isJobEligible(s.companies[0], s.qualifications)).toBe(true);
    expect(s.applications[0].status).toBe("Completed");
    expect(s.applications[0].completedAt).toBe(s.clock);
  });
  it("last approval invalidation suspends operational status and preserves the completed execution exactly", async () => {
    const j = await active(),
      before = await j.service.getState();
    await j.service.invalidateSkill(
      before.qualifications[0].id,
      "Approval withdrawn",
    );
    const s = await j.service.getState();
    expect(isReady(s.companies[0], s.qualifications)).toBe(false);
    expect(isJobEligible(s.companies[0], s.qualifications)).toBe(false);
    expect(s.companies[0].activationStatus).toBe("Suspended");
    expect(root(s)).toEqual(root(before));
    expect(s.workItems.filter((t) => t.workflowId === root(s).id)).toEqual(
      before.workItems.filter((t) => t.workflowId === root(before).id),
    );
    expect(
      s.events
        .slice(before.events.length)
        .filter(
          (e) =>
            e.eventType === "ContractorReadinessChanged" ||
            e.eventType === "ContractorSuspended",
        )
        .every(
          (e) =>
            e.correlationId === companyLifecycleCorrelation(s.companies[0].id),
        ),
    ).toBe(true);
    expect(
      s.events.filter((e) => e.eventType === "ContractorSuspended"),
    ).toHaveLength(1);
    await expect(
      j.service.requestSkill(s.companies[0].id, "HVAC"),
    ).rejects.toThrow("after activation");
  });
  it("application completion remains historical after current eligibility is lost, including service reload", async () => {
    const j = await active(),
      before = await j.service.getState();
    await j.service.invalidateSkill(
      before.qualifications[0].id,
      "Approval withdrawn",
    );
    const restored = testService(j.repository);
    await restored.initialize();
    const s = await restored.getState();
    expect(s.applications[0]).toEqual(before.applications[0]);
    expect(s.applications[0].status).toBe("Completed");
    expect(isJobEligible(s.companies[0], s.qualifications)).toBe(false);
    expect(root(s)).toEqual(root(before));
  });
  it("a previously pending skill restores readiness but never suspension removal or onboarding work", async () => {
    const j = await active(),
      before = await j.service.getState(),
      q = await j.service.requestSkill(before.companies[0].id, "Plumbing");
    await j.service.invalidateSkill(
      before.qualifications[0].id,
      "Approval withdrawn",
    );
    await j.qualify(q);
    const s = await j.service.getState();
    expect(isReady(s.companies[0], s.qualifications)).toBe(true);
    expect(s.companies[0].readinessPublished).toBe(true);
    expect(s.companies[0].activationStatus).toBe("Suspended");
    expect(isJobEligible(s.companies[0], s.qualifications)).toBe(false);
    expect(root(s)).toEqual(root(before));
    expect(s.workItems.filter((t) => t.workflowId === root(s).id)).toEqual(
      before.workItems.filter((t) => t.workflowId === root(before).id),
    );
    expect(
      s.events.filter((e) => e.eventType === "ContractorActivated"),
    ).toHaveLength(1);
    expect(
      s.events
        .filter((e) => e.eventType === "ContractorReadinessChanged")
        .map((e) => e.payload.ready),
    ).toEqual([true, false, true]);
    const oldActivation = before.events.find(
      (e) => e.eventType === "ContractorActivated",
    )!;
    expect(
      await j.service.deliverEvent({ ...oldActivation, eventId: id() }),
    ).toBe(false);
    await expect(
      j.service.retryActivity(oldActivation.payload.workItemId),
    ).rejects.toThrow();
    await expect(
      j.service.requestSkill(s.companies[0].id, "HVAC"),
    ).rejects.toThrow("after activation");
    expect(await j.service.getState()).toEqual(s);
  });
  it("completed CompanyOnboarding rejects fresh correlated events and direct scheduling without changing history", async () => {
    const j = await active(),
      before = await j.service.getState(),
      w = root(before);
    expect(
      await j.service.deliverEvent({
        eventId: id(),
        eventType: "ContractorReadinessChanged",
        eventVersion: 1,
        occurredAt: before.clock,
        companyId: w.companyId,
        applicationId: w.applicationId,
        correlationId: w.correlationId,
        actor: "Domain policy",
        payload: { ready: true, approvedSkillCount: 1 },
      }),
    ).toBe(false);
    const copy = structuredClone(before);
    expect(() =>
      schedule(copy, root(copy), "PublishActivation", "Forbidden new work"),
    ).toThrow("completed");
    expect(copy).toEqual(before);
    expect(await j.service.getState()).toEqual(before);
  });
  it("additional skill evidence/approval and loss of one of two approvals never mutate completed onboarding", async () => {
    const j = await active(),
      before = await j.service.getState(),
      q = await j.service.requestSkill(before.companies[0].id, "Plumbing");
    await j.qualify(q);
    await j.service.invalidateSkill(
      before.qualifications[0].id,
      "HVAC withdrawn",
    );
    const s = await j.service.getState();
    expect(root(s)).toEqual(root(before));
    expect(isReady(s.companies[0], s.qualifications)).toBe(true);
    expect(isJobEligible(s.companies[0], s.qualifications)).toBe(true);
    expect(s.companies[0].activationStatus).toBe("Active");
    expect(
      s.events.filter((e) => e.eventType === "ContractorSuspended"),
    ).toHaveLength(0);
  });
  it("readiness loss before initial activation cancels that task without claiming completion or operational suspension", async () => {
    const j = await journey();
    await j.qualify();
    await j.companySetup();
    const before = await j.service.getState(),
      taskId = await j.task("PublishActivation");
    await j.service.invalidateSkill(
      before.qualifications[0].id,
      "Approval withdrawn",
    );
    const s = await j.service.getState();
    expect(s.workItems.find((t) => t.id === taskId)!.status).toBe("Cancelled");
    expect(s.companies[0].activationStatus).toBe("Pending");
    expect(s.applications[0].status).toBe("Onboarding");
    expect(root(s).status).toBe("Running");
    expect(isJobEligible(s.companies[0], s.qualifications)).toBe(false);
    await expect(j.service.executeActivity(taskId)).rejects.toThrow();
  });
  it("migrates legacy Ready to historical Completed without rewriting workflow history or events", async () => {
    const j = await active(),
      before = await j.service.getState(),
      legacy = structuredClone(before) as unknown as {
        schemaVersion: number;
        applications: { status: string; completedAt?: string }[];
      };
    legacy.schemaVersion = 3;
    legacy.applications[0].status = "Ready";
    delete legacy.applications[0].completedAt;
    const s = migrateState(legacy);
    expect(s.schemaVersion).toBe(4);
    expect(s.applications[0].status).toBe("Completed");
    expect(s.applications[0].completedAt).toBe(before.clock);
    expect(s.companies[0].activationStatus).toBe("Active");
    expect(root(s).history).toEqual(root(before).history);
    expect(s.events).toEqual(before.events);
    expect(migrateState(s)).toEqual(s);
  });
  it("repairs legacy reactivation work and re-latches historical suspension while preserving execution history", async () => {
    const j = await active(),
      initial = await j.service.getState(),
      q = await j.service.requestSkill(initial.companies[0].id, "Plumbing");
    await j.service.invalidateSkill(
      initial.qualifications[0].id,
      "Approval withdrawn",
    );
    await j.qualify(q);
    const legacy = await j.service.getState();
    legacy.companies[0].activationStatus = "Active";
    root(legacy).stage = "Reactivation pending";
    const invalidTask = {
      ...legacy.workItems.find((t) => t.activity === "PublishActivation")!,
      id: id(),
      status: "Open" as const,
    };
    legacy.workItems.push(invalidTask);
    const history = structuredClone(root(legacy).history),
      events = structuredClone(legacy.events);
    const s = migrateState({ ...legacy, schemaVersion: 3 });
    expect(isReady(s.companies[0], s.qualifications)).toBe(true);
    expect(s.companies[0].activationStatus).toBe("Suspended");
    expect(isJobEligible(s.companies[0], s.qualifications)).toBe(false);
    expect(s.workItems.find((t) => t.id === invalidTask.id)!.status).toBe(
      "Cancelled",
    );
    expect(root(s).stage).toBe("Onboarding complete");
    expect(root(s).status).toBe("Completed");
    expect(root(s).waitingFor).toBeNull();
    expect(root(s).history).toEqual(history);
    expect(s.events).toEqual(events);
  });
});
