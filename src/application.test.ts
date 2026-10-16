import { testService } from "./testing";
import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  IndexedDbRepository,
  OnboardingService,
  type Repository,
} from "./application";
import { emptyState, isReady, type State } from "./domain";
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
  name: "Summit Electrical",
  contact: "Alex Rivers",
  email: "alex@example.com",
  skill: "Electrical",
};
async function setup() {
  const service = testService(new Memory());
  const id = await service.submitApplication(input);
  return { service, id };
}
describe("Iteration 1 acceptance", () => {
  it("creates one application, one workflow and Recruitment work", async () => {
    const { service } = await setup();
    const s = await service.getState();
    expect(s.applications).toHaveLength(1);
    expect(s.workflows).toHaveLength(1);
    expect(await service.getWorkQueue("Recruitment")).toHaveLength(1);
    expect(s.events[0].eventType).toBe("ApplicationSubmitted");
  });
  it("Proceed advances the same instance and starts independent company and skill work", async () => {
    const { service, id } = await setup();
    const before = await service.getWorkflowInstance(id);
    await service.recordScreeningDecision(id, "Proceed", "Suitable experience");
    const s = await service.getState();
    expect(s.workflows).toHaveLength(2);
    expect(s.workflows[0].id).toBe(before!.id);
    expect(s.requirements).toHaveLength(3);
    expect(s.qualifications).toHaveLength(1);
    expect(s.applications[0].status).toBe("Onboarding");
  });
  it("information request completes contractor work and returns to screening", async () => {
    const { service, id } = await setup();
    await service.recordScreeningDecision(
      id,
      "RequestInformation",
      "Please clarify your experience",
    );
    expect(await service.getWorkQueue("Contractor")).toHaveLength(1);
    await service.submitAdditionalInformation(
      id,
      "Ten years of field experience",
    );
    expect(await service.getWorkQueue("Contractor")).toHaveLength(0);
    expect(await service.getWorkQueue("Recruitment")).toHaveLength(1);
    const s = await service.getState();
    expect(s.workflows).toHaveLength(1);
    expect(s.applications[0].responses[0].text).toContain("Ten years");
    await service.recordScreeningDecision(
      id,
      "RequestInformation",
      "One more detail",
    );
    await service.submitAdditionalInformation(id, "More detail");
    expect(await service.getWorkQueue("Recruitment")).toHaveLength(1);
  });
  it("Decline closes without next-stage work and retains reason", async () => {
    const { service, id } = await setup();
    await service.recordScreeningDecision(
      id,
      "Decline",
      "Outside current trade scope",
    );
    const s = await service.getState();
    expect(s.workflows[0].status).toBe("Completed");
    expect(s.applications[0].reason).toContain("trade scope");
    expect(s.workItems.filter((w) => w.status !== "Completed")).toHaveLength(0);
  });
  it("deduplicates submission and screening delivery", async () => {
    const { service, id } = await setup();
    let s = await service.getState();
    expect(await service.deliverEvent(s.events[0])).toBe(false);
    await service.recordScreeningDecision(id, "RequestInformation", "Details");
    s = await service.getState();
    expect(await service.deliverEvent(s.events[1])).toBe(false);
    expect((await service.getState()).workItems).toHaveLength(2);
  });
  it("rejects unrelated correlations without mutating history", async () => {
    const { service, id } = await setup();
    const s = await service.getState();
    const e = {
      ...s.events[0],
      eventId: crypto.randomUUID(),
      eventType: "ScreeningDecisionRecorded" as const,
      correlationId: "unrelated",
      payload: { decision: "Proceed" as const, reason: "" },
    };
    expect(await service.deliverEvent(e)).toBe(false);
    expect(await service.getState()).toEqual(s);
    expect((await service.getApplication(id))!.status).toBe("Screening");
  });
  it("prevents stale and invalid decisions", async () => {
    const { service, id } = await setup();
    await expect(
      service.recordScreeningDecision(id, "Decline", " "),
    ).rejects.toThrow();
    await service.recordScreeningDecision(id, "Proceed", "");
    await expect(
      service.recordScreeningDecision(id, "Decline", "Late decision"),
    ).rejects.toThrow();
    expect(
      (await service.getState()).events.filter(
        (e) => e.eventType === "ScreeningDecisionRecorded",
      ),
    ).toHaveLength(1);
  });
  it("serializes concurrent decisions", async () => {
    const { service, id } = await setup();
    const results = await Promise.allSettled([
      service.recordScreeningDecision(id, "Proceed", ""),
      service.recordScreeningDecision(id, "Decline", "Duplicate"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
  it("restores all state from IndexedDB in a new repository and service", async () => {
    const first = testService(new IndexedDbRepository());
    const id = await first.submitApplication(input);
    await first.recordScreeningDecision(
      id,
      "RequestInformation",
      "Details please",
    );
    const restored = testService(new IndexedDbRepository());
    expect(await restored.getState()).toEqual(await first.getState());
    await restored.submitAdditionalInformation(id, "Here are details");
    expect((await restored.getApplication(id))!.status).toBe("Screening");
  });
  it("requires every readiness condition", async () => {
    const { service, id } = await setup();
    await service.recordScreeningDecision(id, "Proceed", "");
    const s = await service.getState(),
      c = s.companies[0];
    expect(isReady(c, s.qualifications)).toBe(false);
    c.adminComplete = true;
    c.portalSetupComplete = true;
    c.initialTrainingComplete = true;
    expect(isReady(c, s.qualifications)).toBe(false);
    s.qualifications[0].status = "Approved";
    expect(isReady(c, s.qualifications)).toBe(true);
    for (const key of [
      "adminComplete",
      "portalSetupComplete",
      "initialTrainingComplete",
    ] as const) {
      c[key] = false;
      expect(isReady(c, s.qualifications)).toBe(false);
      c[key] = true;
    }
  });
});
