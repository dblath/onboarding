import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import * as definitions from "./definition";
import { IndexedDbRepository, OnboardingService } from "../application";
import { emptyState, id, type State } from "../domain";
import { testService, TestCoordinator } from "../testing";
import { buildScenario } from "../workspace/scenarios";
import { parseWorkspaceFile } from "../workspace/format";
import { recordingStatus } from "./triggers";

const app = (name: string) => ({
  name,
  email: `${name}@example.com`,
  contact: "Alex",
  skill: "HVAC",
});
async function setup(initial = emptyState()) {
  const repository = new IndexedDbRepository(`net-${id()}`),
    lock = new TestCoordinator();
  await repository.save(initial);
  return {
    repository,
    service: testService(repository, lock),
    other: testService(repository, lock),
  };
}
it("opt-in triggers catch only new accepted identities, deduplicate equivalent rules, and disable without stopping existing captures", async () => {
  const { service, other } = await setup();
  await service.submitApplication(app("Before"));
  await service.saveRecordingTrigger({
    name: "Net",
    kind: "application",
    enabled: true,
  });
  await service.saveRecordingTrigger({
    name: "Equivalent net",
    kind: "application",
    enabled: true,
  });
  const applications = await Promise.all([
    service.submitApplication(app("One")),
    other.submitApplication(app("Two")),
    service.submitApplication(app("Three")),
  ]);
  let s = await service.getState();
  expect(s.viz!.recordings).toHaveLength(3);
  expect(s.viz!.triggers!.map((t) => t.fireCount)).toEqual([3, 3]);
  expect(
    s.viz!.recordings.every(
      (r) => r.triggerMatches?.length === 2 && r.frames.length === 1,
    ),
  ).toBe(true);
  const initial = structuredClone(s.viz!.recordings[0].frames[0]);
  await service.deliverEvent(s.events.at(-1)!);
  await service.initialize();
  expect((await service.getState()).viz).toEqual(s.viz);
  for (const t of s.viz!.triggers!)
    await service.saveRecordingTrigger({ ...t, enabled: false });
  await service.submitApplication(app("Disabled"));
  await Promise.all([
    service.recordScreeningDecision(applications[0], "Proceed", ""),
    other.recordScreeningDecision(applications[1], "Proceed", ""),
  ]);
  s = await service.getState();
  expect(s.viz!.recordings.map((r) => r.frames.length)).toEqual([2, 2, 1]);
  expect(s.viz!.recordings[0].frames[0]).toEqual(initial);
  await service.stopVizRecording(s.viz!.recordings[0].id);
  await service.recordScreeningDecision(
    applications[2],
    "Decline",
    "Outside region",
  );
  s = await service.getState();
  expect(s.viz!.recordings.map((r) => r.status)).toEqual([
    "Stopped",
    "Recording",
    "Completed",
  ]);
  expect(s.viz!.recordings[2].frames.at(-1)!.nodes.declined.status).toBe(
    "error",
  );
  await service.removeRecordingTrigger(s.viz!.triggers![0].id);
  expect(
    (await service.saveWorkspace("net")).state.viz!.recordings[0]
      .triggerMatches,
  ).toHaveLength(2);
});
it("starts mid-workflow at the atomic Recruitment commit, with linked skill and no invented earlier frames", async () => {
  const { service } = await setup();
  const a = await service.submitApplication(app("Mid"));
  await service.saveRecordingTrigger({
    name: "Approved",
    kind: "recruitment",
    enabled: true,
  });
  await service.recordScreeningDecision(a, "RequestInformation", "Location?");
  expect((await service.getState()).viz!.recordings).toHaveLength(0);
  await service.submitAdditionalInformation(a, "Denver");
  await service.recordScreeningDecision(a, "Proceed", "");
  let s = await service.getState();
  const r = s.viz!.recordings[0];
  expect(r.frames).toHaveLength(1);
  expect(r.frames[0].revision).toBe(s.revision);
  expect(r.frames[0].nodes.SubmitLicense.status).toBe("waiting");
  expect(r.frames[0].nodes.ScreenApplication.status).toBe("complete");
  expect(r.workflowIds).toHaveLength(2);
  expect(s.events.find((e) => e.eventId === r.originEventId)?.eventType).toBe(
    "ScreeningDecisionRecorded",
  );
  await service.submitEvidence(
    s.workItems.find(
      (t) => t.activity === "SubmitLicense" && t.status === "Open",
    )!.id,
    "Valid demo document",
  );
  s = await service.getState();
  expect(s.viz!.recordings[0].frames).toHaveLength(2);
  expect(s.viz!.recordings[0].frames[0]).toEqual(r.frames[0]);
  expect(
    parseWorkspaceFile(JSON.stringify(await service.saveWorkspace("mid"))).state
      .viz,
  ).toEqual(JSON.parse(JSON.stringify(s.viz)));
});
it("readiness trigger captures pending publication, then terminal activation without resuming a completed workflow", async () => {
  const file = await buildScenario("activation");
  // Return to a real earlier commit by using the original Frame 13 fixture, not by editing facts.
  const legacy = parseWorkspaceFile(
    readFileSync("tests/fixtures/workspace-v1/frame-13-workspace.json", "utf8"),
  );
  const { service } = await setup(legacy.state);
  await service.initialize();
  await service.saveRecordingTrigger({
    name: "Ready",
    kind: "ready",
    enabled: true,
  });
  for (const activity of ["CompleteTraining", "ConfirmTraining"] as const) {
    const s = await service.getState();
    await service.completeParticipantTask(
      s.workItems.find((t) => t.activity === activity && t.status === "Open")!
        .id,
    );
  }
  let s = await service.getState();
  const r = s.viz!.recordings.at(-1)!;
  expect(r.originLabel).toBe("Contractor ready");
  expect(r.frames).toHaveLength(1);
  expect(r.frames[0].nodes["readiness-join"].satisfied).toBe(4);
  expect(r.frames[0].nodes.PublishActivation.status).toBe("waiting");
  await service.executeActivity(
    s.workItems.find(
      (t) => t.activity === "PublishActivation" && t.status === "Open",
    )!.id,
  );
  s = await service.getState();
  expect(s.viz!.recordings.at(-1)!.status).toBe("Completed");
  expect(s.viz!.recordings.at(-1)!.frames).toHaveLength(2);
  const final = structuredClone(s.viz!.recordings.at(-1)!);
  await service.invalidateSkill(s.qualifications[0].id, "Withdrawn");
  expect((await service.getState()).viz!.recordings.at(-1)).toEqual(final);
  expect(
    file.state.workItems.some(
      (t) => t.activity === "PublishActivation" && t.status === "Open",
    ),
  ).toBe(true);
});
it("eleven simultaneous journeys across company and skill workflows remain isolated, survive restore, and stop independently", async () => {
  const file = await buildScenario("activation"),
    { service, other } = await setup(file.state);
  await service.executeActivity(
    file.state.workItems.find(
      (t) => t.activity === "PublishActivation" && t.status === "Open",
    )!.id,
  );
  await service.saveRecordingTrigger({
    name: "Applications",
    kind: "application",
    enabled: true,
  });
  await service.saveRecordingTrigger({
    name: "Skills",
    kind: "skill",
    enabled: true,
  });
  const q = await service.requestSkill(file.state.companies[0].id, "Plumbing");
  const ids = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      (i % 2 ? other : service).submitApplication(app(`Fleet${i}`)),
    ),
  );
  let s = await service.getState();
  expect(
    s.viz!.recordings.filter((r) => r.status === "Recording"),
  ).toHaveLength(11);
  const skill = s.viz!.recordings.find(
    (r) => r.definition.workflowName === "SkillQualification",
  )!;
  const skillInitial = structuredClone(skill.frames);
  await Promise.all(
    ids.map((a, i) =>
      (i % 2 ? other : service).recordScreeningDecision(a, "Proceed", ""),
    ),
  );
  s = await service.getState();
  expect(s.viz!.recordings.find((r) => r.id === skill.id)!.frames).toEqual(
    skillInitial,
  );
  for (const r of s.viz!.recordings.filter(
    (r) => r.triggerMatches?.[0].kind === "application",
  )) {
    expect(r.frames).toHaveLength(2);
    expect(
      r.frames
        .flatMap((f) => f.causes)
        .every(
          (c) =>
            !s.events.find((e) => e.eventId === c.id) ||
            s.events.find((e) => e.eventId === c.id)!.companyId === r.companyId,
        ),
    ).toBe(true);
  }
  const backup = await service.saveWorkspace("Eleven journeys");
  await service.resetWorkspace(s.revision);
  expect((await service.getState()).viz).toBeUndefined();
  await service.restoreWorkspace(
    parseWorkspaceFile(JSON.stringify(backup)),
    (await service.getState()).revision,
  );
  expect((await service.getState()).viz).toEqual(
    JSON.parse(JSON.stringify(backup.state.viz)),
  );
  await service.initialize();
  s = await service.getState();
  const t = s.workItems.find(
    (t) => t.qualificationId === q && t.status === "Open",
  )!;
  await service.submitEvidence(t.id, "Valid demo document");
  s = await service.getState();
  expect(s.viz!.recordings.find((r) => r.id === skill.id)!.frames).toHaveLength(
    2,
  );
  // Recruitment also legitimately emits SkillRequested for each initial skill.
  expect(s.viz!.triggers!.map((t) => t.fireCount)).toEqual([10, 11]);
  await service.stopVizRecording(skill.id);
  const current = await service.getState();
  expect(
    recordingStatus(
      current,
      current.viz!.recordings.find((r) => r.id === skill.id)!,
    ),
  ).toBe("Stopped");
  expect(
    current.viz!.recordings.filter((r) => r.status === "Recording"),
  ).toHaveLength(20);
});
it("sequential independent skills for the same company retain their exact causal scope and terminal history", async () => {
  const initial = (await buildScenario("activation")).state;
  const { service } = await setup(initial);
  await service.executeActivity(
    initial.workItems.find(
      (t) => t.activity === "PublishActivation" && t.status === "Open",
    )!.id,
  );
  await service.saveRecordingTrigger({
    name: "Skills",
    kind: "skill",
    enabled: true,
  });
  const company = initial.companies[0].id;
  const first = await service.requestSkill(company, "Plumbing");
  const task = async (activity: string, qualification = first) =>
    (await service.getState()).workItems.find(
      (t) =>
        t.qualificationId === qualification &&
        t.activity === activity &&
        t.status === "Open",
    )!.id;
  await service.submitEvidence(
    await task("SubmitLicense"),
    "Valid demo document",
  );
  await service.executeActivity(await task("VerifyLicense"));
  await service.decideSkill(
    await task("ApproveSkill"),
    false,
    "Scope not approved",
  );
  const previous = (await service.getState()).viz!.recordings.at(-1)!;
  expect(previous.status).toBe("Completed");
  const second = await service.requestSkill(company, "Plumbing");
  await service.submitEvidence(
    await task("SubmitLicense", second),
    "Valid demo document",
  );
  const s = await service.getState(),
    current = s.viz!.recordings.at(-1)!;
  expect(s.viz!.recordings.at(-2)).toEqual(previous);
  expect(current.workflowIds).toHaveLength(1);
  expect(current.workflowIds).not.toEqual(previous.workflowIds);
  expect(
    current.seen.every((identity) => !previous.seen.includes(identity)),
  ).toBe(true);
  expect(current.frames).toHaveLength(2);
  expect(s.companies[0].activationStatus).toBe("Active");
});
it("a failed trigger projection records its occurrence and gap without rejecting the accepted application or backfilling it later", async () => {
  const { service } = await setup();
  await service.saveRecordingTrigger({
    name: "Net",
    kind: "application",
    enabled: true,
  });
  const failed = vi
    .spyOn(definitions, "mapDefinition")
    .mockImplementationOnce(() => {
      throw new Error("Adapter unavailable");
    });
  try {
    await service.submitApplication(app("CaptureFailure"));
  } finally {
    failed.mockRestore();
  }
  let s = await service.getState();
  expect(s.applications).toHaveLength(1);
  expect(s.viz!.recordings).toHaveLength(0);
  expect(s.viz!.triggers![0].fireCount).toBe(1);
  expect(s.viz!.triggers![0].captureError).toContain("Adapter unavailable");
  await service.initialize();
  await service.submitApplication(app("CaptureRecovery"));
  s = await service.getState();
  expect(s.viz!.triggers![0].fireCount).toBe(2);
  expect(s.viz!.recordings).toHaveLength(1);
  expect(s.viz!.recordings[0].companyName).toBe("CaptureRecovery");
  expect(s.viz!.captureError).toContain("Missing intermediate frames");
});
it("one corrupted capture is quarantined while another recording and its business command progress", async () => {
  const { service, repository } = await setup();
  await service.saveRecordingTrigger({
    name: "Net",
    kind: "application",
    enabled: true,
  });
  const a = await service.submitApplication(app("Broken"));
  const b = await service.submitApplication(app("Healthy"));
  const s = await service.getState();
  s.viz!.recordings[0].definition.nodes = undefined as never;
  await repository.save(s);
  await service.recordScreeningDecision(a, "Proceed", "");
  await service.recordScreeningDecision(b, "Proceed", "");
  const after = await service.getState();
  expect(after.viz!.recordings.map((r) => r.status)).toEqual([
    "Capture issue",
    "Recording",
  ]);
  expect(after.viz!.recordings.map((r) => r.frames.length)).toEqual([1, 2]);
  expect(after.applications.every((a) => a.status === "Onboarding")).toBe(true);
});
it.each([
  "scenario-documents",
  "scenario-failure",
  "scenario-activation",
  "frame-13-workspace",
])(
  "imports the untouched original 3.6 %s file without trigger replay or frame changes",
  async (name) => {
    const file = parseWorkspaceFile(
      readFileSync(`tests/fixtures/workspace-v1/${name}.json`, "utf8"),
    );
    expect(file.formatVersion).toBe(1);
    const { service } = await setup();
    await service.restoreWorkspace(file, 0);
    let s = await service.getState();
    expect(s.viz!.version).toBe(2);
    expect(s.viz!.triggers).toEqual([]);
    expect(s.viz!.recordings.map((r) => r.frames)).toEqual(
      file.state.viz!.recordings.map((r) => r.frames),
    );
    await service.saveRecordingTrigger({
      name: "No replay",
      kind: "application",
      enabled: true,
    });
    await service.initialize();
    s = await service.getState();
    expect(s.viz!.recordings).toHaveLength(file.state.viz!.recordings.length);
    expect(s.viz!.triggers![0].fireCount).toBe(0);
    expect(
      parseWorkspaceFile(
        JSON.stringify(await service.saveWorkspace("upgraded")),
      ).formatVersion,
    ).toBe(2);
  },
);
it("rejects unsupported trigger commands and damaged trigger files without a write", async () => {
  const { service } = await setup();
  await expect(
    service.saveRecordingTrigger({
      name: "Unsupported",
      kind: "unknown" as never,
      enabled: true,
    }),
  ).rejects.toThrow("Unsupported");
  await service.saveRecordingTrigger({
    name: "Net",
    kind: "application",
    enabled: true,
  });
  await service.submitApplication(app("Validate"));
  const file = await service.saveWorkspace("Triggers"),
    before = await service.getState();
  for (const damage of [
    (s: State) => {
      s.viz!.triggers![0].lastEventId = "missing";
    },
    (s: State) => {
      s.viz!.triggers![0].fireCount = 0;
    },
    (s: State) => {
      s.viz!.recordings[0].status = "Completed";
    },
  ]) {
    const bad = structuredClone(file);
    damage(bad.state);
    expect(() => service.restoreWorkspace(bad, before.revision)).toThrow(
      "Invalid workspace",
    );
    expect(await service.getState()).toEqual(before);
  }
});
