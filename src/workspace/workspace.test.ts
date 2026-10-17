import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import {
  OnboardingService,
  IndexedDbRepository,
  type Repository,
} from "../application";
import {
  emptyState,
  isReady,
  isJobEligible,
  type State,
  type Activity,
} from "../domain";
import { TestCoordinator } from "../testing";
import { buildScenario, scenarios } from "./scenarios";
import {
  createWorkspaceFile,
  parseWorkspaceFile,
  workspaceFilename,
  workspaceSummary,
} from "./format";

function setup(initial = emptyState(), coordinator = new TestCoordinator()) {
  let state = structuredClone(initial),
    fail = false;
  const repository: Repository = {
    load: async () => structuredClone(state),
    save: async (s) => {
      if (fail) throw new Error("Storage transaction failed");
      state = structuredClone(s);
    },
  };
  const service = new OnboardingService(
    repository,
    undefined,
    undefined,
    coordinator,
  );
  return {
    service,
    repository,
    get: () => structuredClone(state),
    fail: () => {
      fail = true;
    },
  };
}
it("preserves legitimate free-text company and scenario names, including object-reserved words", async () => {
  const x = setup();
  await x.service.submitApplication({
    name: "constructor",
    contact: "Alex",
    email: "names@example.com",
    skill: "HVAC",
  });
  const file = await x.service.saveWorkspace("prototype");
  expect(parseWorkspaceFile(JSON.stringify(file)).scenario.name).toBe(
    "prototype",
  );
  expect(file.state.companies[0].name).toBe("constructor");
});
it.each(scenarios)(
  "generates coherent $name through actual business commands",
  async (scenario) => {
    const file = await buildScenario(scenario.id),
      s = file.state,
      c = s.companies[0];
    expect(parseWorkspaceFile(JSON.stringify(file))).toEqual(file);
    expect(s.events[0].eventType).toBe("ApplicationSubmitted");
    expect(s.viz!.recordings[0].frames.length).toBeGreaterThan(1);
    expect(isJobEligible(c, s.qualifications)).toBe(false);
    expect(isReady(c, s.qualifications)).toBe(scenario.id === "activation");
    if (scenario.id === "documents")
      expect(
        s.workItems.filter((t) => t.status === "Open").map((t) => t.owner),
      ).toEqual(["Contractor", "Contractor", "Contractor", "Contractor"]);
    if (scenario.id === "failure")
      expect(s.attempts.at(-1)?.status).toBe("Failed");
    if (scenario.id === "activation")
      expect(
        s.workItems.filter((t) => t.status === "Open").map((t) => t.activity),
      ).toEqual(["PublishActivation"]);
  },
);

it("round-trips exact Frame 13, archive, identities and clock, then continues without replay or duplicate events", async () => {
  const x = setup(),
    service = x.service;
  const app = await service.submitApplication({
    name: "Frame Thirteen",
    email: "thirteen@example.com",
    contact: "Alex",
    skill: "HVAC",
  });
  const origin = x.get().events[0].eventId;
  const archive = await service.startVizRecording(origin);
  await service.stopVizRecording(archive);
  await service.startVizRecording(origin);
  await service.recordScreeningDecision(app, "Proceed", "");
  const task = (a: Activity) =>
    x.get().workItems.find((t) => t.activity === a && t.status === "Open")!.id;
  for (const [submit, review] of [
    ["SubmitInsurance", "ReviewInsurance"],
    ["SubmitFinancial", "ReviewFinancial"],
    ["SubmitAgreement", "ExecuteAgreement"],
    ["SubmitLicense", "VerifyLicense"],
  ] as const) {
    await service.submitEvidence(task(submit), "Valid demo document");
    if (review === "ReviewInsurance") {
      await service.executeActivity(task(review), true);
      await service.retryActivity(task(review));
    } else await service.executeActivity(task(review));
  }
  await service.decideSkill(task("ApproveSkill"), true, "");
  await service.executeActivity(task("CreateVendor"));
  await service.completeParticipantTask(task("SetupPortal"));
  const file = await service.saveWorkspace(
    "Frame 13",
    "Portal ready; training outstanding; failed attempt and archive retained",
  );
  expect(file.state.viz!.recordings[1].frames.at(-1)!.number).toBe(13);
  const original = structuredClone(file),
    beforeRevision = x.get().revision;
  await service.resetWorkspace(beforeRevision);
  await service.restoreWorkspace(
    parseWorkspaceFile(JSON.stringify(file)),
    x.get().revision,
  );
  const restored = x.get();
  expect({
    ...restored,
    revision: file.state.revision,
    workspaceEpoch: undefined,
  }).toEqual({ ...file.state, workspaceEpoch: undefined });
  expect(restored.revision).toBeGreaterThan(beforeRevision);
  expect(restored.viz!.recordings[1].frames[3]).toEqual(
    file.state.viz!.recordings[1].frames[3],
  );
  await service.completeParticipantTask(task("CompleteTraining"));
  await service.completeParticipantTask(task("ConfirmTraining"));
  await service.executeActivity(task("PublishActivation"));
  const after = x.get();
  expect(isJobEligible(after.companies[0], after.qualifications)).toBe(true);
  expect(after.viz!.recordings[1].frames.slice(0, 14)).toEqual(
    original.state.viz!.recordings[1].frames,
  );
  expect(after.viz!.recordings[0]).toEqual(original.state.viz!.recordings[0]);
  expect(after.events.slice(0, original.state.events.length)).toEqual(
    original.state.events,
  );
  expect(new Set(after.events.map((e) => e.eventId)).size).toBe(
    after.events.length,
  );
  expect(file).toEqual(original);
  expect(
    parseWorkspaceFile(
      JSON.stringify(await service.saveWorkspace("Completed")),
    ),
  ).toBeTruthy();
});

it("exports under the shared lock without changing revision or including local sessions/identity", async () => {
  const x = setup((await buildScenario("failure")).state);
  const before = x.get();
  const [file] = await Promise.all([
    x.service.saveWorkspace("Verification failure", "Retry available"),
    x.service.advanceTime(1),
  ]);
  expect(file.state).toEqual(before);
  expect(file).not.toHaveProperty("sessionStorage");
  expect(workspaceFilename("Ready for Activation!")).toBe(
    "unity-fieldwork-ready-for-activation.json",
  );
  expect(workspaceSummary(file).failedAttempts).toBe(1);
});

it("atomically replaces IndexedDB with a fresh higher revision, then survives a fresh service", async () => {
  const repo = new IndexedDbRepository(`workspace-${crypto.randomUUID()}`),
    coord = new TestCoordinator();
  const service = new OnboardingService(repo, undefined, undefined, coord),
    file = await buildScenario("failure");
  await service.initialize();
  await service.restoreWorkspace(file, (await service.getState()).revision);
  const restored = await repo.load();
  expect(restored.viz).toEqual(file.state.viz);
  const fresh = new OnboardingService(repo, undefined, undefined, coord);
  await fresh.initialize();
  expect((await fresh.getState()).viz).toEqual(file.state.viz);
  const t = restored.workItems.find(
    (t) => t.activity === "ReviewInsurance" && t.status === "Open",
  )!;
  await fresh.retryActivity(t.id);
  expect((await fresh.getState()).attempts.at(-1)?.status).toBe("Succeeded");
});

it("leaves every current fact unchanged on failed save, stale preview and malformed imports", async () => {
  const file = await buildScenario("failure"),
    x = setup(file.state),
    before = x.get();
  await expect(
    x.service.restoreWorkspace(file, before.revision - 1),
  ).rejects.toThrow("changed while");
  x.fail();
  await expect(
    x.service.restoreWorkspace(file, before.revision),
  ).rejects.toThrow("Storage transaction failed");
  expect(x.get()).toEqual(before);
  await expect(x.service.resetWorkspace(before.revision)).rejects.toThrow(
    "Storage transaction failed",
  );
  expect(x.get()).toEqual(before);
  expect(() =>
    x.service.restoreWorkspace({ format: "incorrect" }, before.revision),
  ).toThrow("Invalid workspace");
  expect(x.get()).toEqual(before);
});

it("rejects old-tab and queued commands across replacement, then allows a refreshed explicit action", async () => {
  const file = await buildScenario("failure"),
    x = setup(file.state),
    other = new OnboardingService(
      x.repository,
      undefined,
      undefined,
      new TestCoordinator(),
    );
  await other.getState();
  const t = x
    .get()
    .workItems.find(
      (t) => t.activity === "ReviewInsurance" && t.status === "Open",
    )!;
  await x.service.restoreWorkspace(file, x.get().revision);
  const restored = x.get();
  await expect(other.retryActivity(t.id)).rejects.toThrow(
    "workspace was replaced",
  );
  expect(x.get()).toEqual(restored);
  await other.getState();
  await other.retryActivity(t.id);
  expect(x.get().attempts.at(-1)?.status).toBe("Succeeded");
});

it.each([false, true])(
  "accepts reordered JSON keys without false frames, including an unrelated trigger gap (%s)",
  async (gap) => {
    const file = await buildScenario("failure");
    if (gap)
      file.state.viz!.captureError =
        "Viz capture gap: a different trigger could not start. Business processing continued.";
    const json = JSON.stringify(file, (_key, value) =>
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).reverse())
        : value,
    );
    const parsed = parseWorkspaceFile(json),
      x = setup();
    await x.service.restoreWorkspace(parsed, 0);
    expect(x.get().viz).toEqual(file.state.viz);
    await x.service.initialize();
    expect(x.get().viz).toEqual(file.state.viz);
    const seen = structuredClone(x.get().viz!.recordings[0].seen);
    // Another identical timeout adds a real attempt identity, but no visual change.
    await x.service.executeActivity(
      x
        .get()
        .workItems.find(
          (t) => t.activity === "ReviewInsurance" && t.status === "Open",
        )!.id,
      true,
    );
    expect(x.get().viz!.recordings[0].seen).not.toEqual(seen);
    expect(x.get().viz!.recordings[0].frames).toEqual(
      file.state.viz!.recordings[0].frames,
    );
  },
);

it("serializes competing confirmed replacements so the stale confirmation cannot overwrite the winner", async () => {
  const coord = new TestCoordinator(),
    x = setup(emptyState(), coord),
    other = new OnboardingService(x.repository, undefined, undefined, coord);
  const documents = await buildScenario("documents"),
    failure = await buildScenario("failure");
  const results = await Promise.allSettled([
    x.service.restoreWorkspace(documents, 0),
    other.restoreWorkspace(failure, 0),
  ]);
  expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected"]);
  expect(x.get().events).toEqual(documents.state.events);
});

it("resets all collections and recording together, preserving monotonic invalidation", async () => {
  const x = setup((await buildScenario("activation")).state),
    before = x.get();
  await x.service.resetWorkspace(before.revision);
  const reset = x.get();
  expect(reset.revision).toBeGreaterThan(before.revision);
  expect(reset.workspaceEpoch).toBeTruthy();
  expect(reset.viz).toBeUndefined();
  for (const v of Object.values(reset))
    if (Array.isArray(v)) expect(v).toEqual([]);
  await x.service.submitApplication({
    name: "Fresh",
    email: "fresh@example.com",
    contact: "Alex",
    skill: "Plumbing",
  });
  expect(x.get().companies).toHaveLength(1);
});

it("rejects a command already queued behind a confirmed replacement even if another read observes the new workspace", async () => {
  const file = await buildScenario("failure"),
    coord = new TestCoordinator(),
    x = setup(file.state, coord);
  const other = new OnboardingService(
    x.repository,
    undefined,
    undefined,
    coord,
  );
  await other.getState();
  let release!: () => void;
  const blocker = coord.exclusive(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  await Promise.resolve();
  const restore = x.service.restoreWorkspace(file, x.get().revision);
  const task = x
    .get()
    .workItems.find(
      (t) => t.activity === "ReviewInsurance" && t.status === "Open",
    )!;
  const stale = expect(other.retryActivity(task.id)).rejects.toThrow(
    "workspace was replaced",
  );
  release();
  await blocker;
  await restore;
  await other.getState();
  await stale;
  expect(x.get().attempts).toEqual(file.state.attempts);
});

it("rejects unsupported, damaged or inconsistent business and visual state before any write", async () => {
  const file = await buildScenario("failure");
  const corruptions: ((f: typeof file) => void)[] = [
    (f) => {
      f.formatVersion = 999 as 1;
    },
    (f) => {
      f.state.schemaVersion = 3 as 4;
    },
    (f) => {
      f.state.companies = [];
    },
    (f) => {
      f.state.workItems[0].workflowId = "missing";
    },
    (f) => {
      f.state.workflows[0].processedEventIds.push("missing");
    },
    (f) => {
      f.state.evidence[0].requirementId = "missing";
    },
    (f) => {
      f.state.companies[0].activationStatus = "Active";
    },
    (f) => {
      f.state.viz!.activeRecordingId = "missing";
    },
    (f) => {
      f.state.viz!.recordings[0].originEventId = "missing";
    },
    (f) => {
      f.state.viz!.recordings[0].seen = [];
    },
    (f) => {
      f.state.viz!.recordings[0].definition.edges[0].target = "missing";
    },
    (f) => {
      delete f.state.viz!.recordings[0].frames[0].nodes.origin;
    },
    (f) => {
      f.state.viz!.recordings[0].frames[0].causes[0].id = "missing";
    },
    (f) => {
      f.state.viz!.recordings[0].frames.at(-1)!.nodes.ReviewInsurance.status =
        "complete";
    },
  ];
  for (const damage of corruptions) {
    const bad = structuredClone(file);
    damage(bad);
    expect(() => parseWorkspaceFile(JSON.stringify(bad))).toThrow(
      "Invalid workspace",
    );
  }
  expect(() => parseWorkspaceFile("{broken")).toThrow(
    "not valid workspace JSON",
  );
  const withSessions = { ...file, sessionStorage: { password: "123" } };
  expect(() => parseWorkspaceFile(JSON.stringify(withSessions))).toThrow(
    "not supported",
  );
  expect(() => createWorkspaceFile(file.state, " ")).toThrow(
    "Invalid workspace",
  );
});
