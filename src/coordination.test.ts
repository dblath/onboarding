import { describe, expect, it } from "vitest";
import { OnboardingService, type Repository } from "./application";
import { emptyState, type State } from "./domain";
import { TestCoordinator, testService } from "./testing";

class Memory implements Repository {
  state = emptyState();
  async load() {
    return structuredClone(this.state);
  }
  async save(state: State) {
    this.state = structuredClone(state);
  }
}
const application = {
  name: "Concurrent Demo",
  contact: "Alex Demo",
  email: "alex@example.com",
  skill: "HVAC",
};
describe("shared command coordination", () => {
  it("reloads under the shared lock so separate service instances cannot lose writes", async () => {
    const repository = new Memory(),
      coordinator = new TestCoordinator();
    const first = testService(repository, coordinator),
      second = testService(repository, coordinator);
    await Promise.all([
      first.submitApplication(application),
      second.submitApplication({ ...application, name: "Second Demo" }),
    ]);
    const s = await repository.load();
    expect(s.companies).toHaveLength(2);
    expect(s.workflows).toHaveLength(2);
    expect(s.revision).toBe(2);
    const applicationId = s.applications[0].id;
    const outcomes = await Promise.allSettled([
      first.recordScreeningDecision(applicationId, "Proceed", ""),
      second.recordScreeningDecision(applicationId, "Decline", "Stale review"),
    ]);
    expect(
      outcomes.filter((outcome) => outcome.status === "fulfilled"),
    ).toHaveLength(1);
    const after = await repository.load();
    expect(after.revision).toBe(3);
    expect(
      after.events.filter((e) => e.eventType === "ScreeningDecisionRecorded"),
    ).toHaveLength(1);
  });
  it("publishes only after the atomic save resolves and the exclusive lock releases", async () => {
    const repository = new Memory();
    let releaseSave!: () => void, saveStarted!: () => void;
    const gate = new Promise<void>((resolve) => {
        releaseSave = resolve;
      }),
      started = new Promise<void>((resolve) => {
        saveStarted = resolve;
      });
    const save = repository.save.bind(repository);
    repository.save = async (s) => {
      saveStarted();
      await gate;
      await save(s);
    };
    class Probe extends TestCoordinator {
      locked = false;
      notifications: number[] = [];
      override exclusive<T>(command: () => Promise<T>) {
        return super.exclusive(async () => {
          this.locked = true;
          try {
            return await command();
          } finally {
            this.locked = false;
          }
        });
      }
      override publish(revision: number) {
        expect(this.locked).toBe(false);
        expect(repository.state.revision).toBe(revision);
        expect(repository.state.events[0].eventType).toBe(
          "ApplicationSubmitted",
        );
        this.notifications.push(revision);
        super.publish(revision);
      }
    }
    const coordinator = new Probe(),
      service = testService(repository, coordinator),
      command = service.submitApplication(application);
    await started;
    expect(coordinator.notifications).toEqual([]);
    expect(repository.state.revision).toBe(0);
    releaseSave();
    await command;
    expect(coordinator.notifications).toEqual([1]);
  });
  it("does not publish or increment revision on duplicate/unrelated ingress or failed validation", async () => {
    const repository = new Memory(),
      coordinator = new TestCoordinator(),
      service = testService(repository, coordinator),
      notifications: number[] = [];
    coordinator.subscribe((revision) => notifications.push(revision));
    await service.submitApplication(application);
    const s = await service.getState();
    expect(await service.deliverEvent(s.events[0])).toBe(false);
    expect(
      await service.deliverEvent({
        ...s.events[0],
        eventId: crypto.randomUUID(),
        correlationId: "other",
      }),
    ).toBe(false);
    await expect(
      service.recordScreeningDecision(s.applications[0].id, "Decline", ""),
    ).rejects.toThrow();
    expect(await service.getState()).toEqual(s);
    expect(notifications).toEqual([1]);
  });
  it("has no uncoordinated write fallback", async () => {
    const repository = new Memory(),
      service = new OnboardingService(repository);
    await expect(service.submitApplication(application)).rejects.toThrow(
      "Web Locks",
    );
    expect(repository.state.companies).toHaveLength(0);
    expect(repository.state.revision).toBe(0);
  });
  it("upgrades Iteration 2 under the lock without changing business records", async () => {
    const repository = new Memory();
    const original = testService(repository);
    await original.submitApplication(application);
    await original.recordScreeningDecision(
      repository.state.applications[0].id,
      "Proceed",
      "",
    );
    const previous = structuredClone(repository.state);
    repository.state = {
      ...previous,
      schemaVersion: 2,
      revision: undefined,
    } as unknown as State;
    const coordinator = new TestCoordinator();
    const first = testService(repository, coordinator),
      second = testService(repository, coordinator);
    await Promise.all([first.initialize(), second.initialize()]);
    expect(await repository.load()).toEqual({
      ...previous,
      schemaVersion: 3,
      revision: 2,
    });
  });
});
