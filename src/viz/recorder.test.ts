import "fake-indexeddb/auto";
import { expect, it, vi } from "vitest";
import { IndexedDbRepository } from "../application";
import { id, type State, type Activity } from "../domain";
import { testService } from "../testing";
import { mapDefinition } from "./definition";

async function setup(start = true) {
  const repository = new IndexedDbRepository(`viz-${id()}`),
    service = testService(repository);
  const app = await service.submitApplication({
    name: "Viz Company",
    email: "viz@example.com",
    contact: "Viz Tester",
    skill: "HVAC",
  });
  const s = await service.getState(),
    company = s.companies[0].id,
    origin = s.events[0].eventId;
  if (start) await service.startVizRecording(origin);
  const task = async (activity: Activity) =>
    (await service.getState()).workItems.find(
      (t) =>
        t.companyId === company &&
        t.activity === activity &&
        t.status === "Open",
    )!.id;
  const record = async () => (await service.getState()).viz!.recordings.at(-1)!;
  return { repository, service, app, company, origin, task, record };
}
it("captures only the current in-progress state at Frame 0 and pins the actual v2 adapter", async () => {
  const x = await setup(false);
  await x.service.recordScreeningDecision(x.app, "Proceed", "");
  await x.service.submitEvidence(
    await x.task("SubmitInsurance"),
    "Valid demo document",
  );
  const before = await x.service.getState();
  await x.service.startVizRecording(x.origin);
  const r = await x.record();
  expect(r.frames).toHaveLength(1);
  expect(r.frames[0].number).toBe(0);
  expect(r.frames[0].nodes.ReviewInsurance.status).toBe("waiting");
  expect(r.frames[0].nodes.ScreenApplication.status).toBe("complete");
  expect(r.definition.nodes).toHaveLength(37);
  expect(r.definition.workflowVersion).toBe(2);
  expect(r.workflowIds).toHaveLength(2);
  const after = await x.service.getState();
  expect(after.events).toEqual(before.events);
  expect(after.workItems).toEqual(before.workItems);
  expect(JSON.stringify(r.frames[0])).not.toContain('"companies"');
  expect(JSON.stringify(r.frames[0])).not.toContain('"payload"');
});
it("records parallel branches, precise joins, timeout without an event, retry and at least ten immutable committed frames", async () => {
  const x = await setup();
  const initial = (await x.record()).frames[0];
  await x.service.recordScreeningDecision(x.app, "Proceed", "");
  for (const a of [
    "SubmitInsurance",
    "SubmitFinancial",
    "SubmitAgreement",
    "SubmitLicense",
  ] as const)
    await x.service.submitEvidence(await x.task(a), "Valid demo document");
  let r = await x.record();
  expect(r.frames.at(-1)!.nodes.ReviewInsurance.status).toBe("waiting");
  expect(r.frames.at(-1)!.nodes.ReviewFinancial.status).toBe("waiting");
  const events = (await x.service.getState()).events.length,
    count = r.frames.length;
  await x.service.executeActivity(await x.task("ReviewInsurance"), true);
  r = await x.record();
  expect((await x.service.getState()).events).toHaveLength(events);
  expect(r.frames).toHaveLength(count + 1);
  expect(r.frames.at(-1)!.nodes.ReviewInsurance.status).toBe("error");
  expect(r.frames.at(-1)!.causes.some((c) => c.kind === "attempt")).toBe(true);
  await x.service.retryActivity(await x.task("ReviewInsurance"));
  for (const a of [
    "ReviewFinancial",
    "ExecuteAgreement",
    "VerifyLicense",
  ] as const)
    await x.service.executeActivity(await x.task(a));
  await x.service.decideSkill(await x.task("ApproveSkill"), true, "Approved");
  await x.service.executeActivity(await x.task("CreateVendor"));
  await x.service.completeParticipantTask(await x.task("SetupPortal"));
  await x.service.completeParticipantTask(await x.task("CompleteTraining"));
  r = await x.record();
  const waiting = structuredClone(r.frames.at(-1)!);
  expect(waiting.nodes["readiness-join"].satisfied).toBe(3);
  expect(waiting.nodes["readiness-join"].outstanding).toEqual([
    "Training confirmation — Training",
  ]);
  expect(waiting.nodes["readiness-join"].status).toBe("waiting");
  await x.service.completeParticipantTask(await x.task("ConfirmTraining"));
  r = await x.record();
  expect(r.frames.at(-1)!.nodes["readiness-join"].status).toBe("complete");
  expect(r.frames.at(-1)!.nodes.PublishActivation.status).toBe("waiting");
  expect(r.frames.length).toBeGreaterThan(10);
  expect(r.frames[0]).toEqual(initial);
  expect(r.frames.at(-2)).toEqual(waiting);
  const readinessCause = r.frames.at(-1)!.causes.find((c) => c.causedByEventId);
  expect(readinessCause?.causedByEventId).toBe(
    r.frames.at(-1)!.causes.find((c) => c.label === "Training Confirmed")?.id,
  );
  await x.service.executeActivity(await x.task("PublishActivation"));
  expect((await x.record()).frames.at(-1)!.nodes.complete.status).toBe(
    "complete",
  );
});
it("ignores unrelated companies, duplicate delivery and initialization; capture survives renderer absence and service replacement", async () => {
  const x = await setup();
  const before = await x.record();
  await x.service.submitApplication({
    name: "Other",
    contact: "Other",
    email: "other@example.com",
    skill: "Plumbing",
  });
  await x.service.initialize();
  await x.service.deliverEvent((await x.service.getState()).events[0]);
  expect(await x.record()).toEqual(before);
  const replacement = testService(x.repository);
  await replacement.recordScreeningDecision(x.app, "Proceed", "");
  expect((await x.record()).frames).toHaveLength(2);
});
it("independent same-company origins stay outside the selected lineage; switching stops previous capture and starts fresh Frame 0", async () => {
  const x = await setup();
  await x.service.recordScreeningDecision(x.app, "Proceed", "");
  for (const a of [
    "SubmitInsurance",
    "SubmitFinancial",
    "SubmitAgreement",
    "SubmitLicense",
  ] as const)
    await x.service.submitEvidence(await x.task(a), "Valid demo document");
  for (const a of [
    "ReviewInsurance",
    "ReviewFinancial",
    "ExecuteAgreement",
    "VerifyLicense",
    "CreateVendor",
  ] as const)
    await x.service.executeActivity(await x.task(a));
  await x.service.decideSkill(await x.task("ApproveSkill"), true, "Approved");
  for (const a of [
    "SetupPortal",
    "CompleteTraining",
    "ConfirmTraining",
  ] as const)
    await x.service.completeParticipantTask(await x.task(a));
  await x.service.executeActivity(await x.task("PublishActivation"));
  const previous = await x.record();
  const qualification = await x.service.requestSkill(x.company, "Plumbing");
  expect(await x.record()).toEqual(previous);
  const s = await x.service.getState(),
    origin = s.events.find(
      (e) =>
        e.eventType === "SkillRequested" && e.qualificationId === qualification,
    )!;
  await x.service.startVizRecording(origin.eventId);
  let current = await x.record();
  expect(current.frames).toHaveLength(1);
  expect(current.definition.workflowName).toBe("SkillQualification");
  expect(current.workflowIds).toHaveLength(1);
  await x.service.submitEvidence(
    await x.task("SubmitLicense"),
    "Valid demo document",
  );
  current = await x.record();
  expect(current.frames).toHaveLength(2);
  const old = (await x.service.getState()).viz!.recordings[0];
  expect(old.frames).toEqual(previous.frames);
  expect(old.stoppedAtRevision).toBeDefined();
  // A second selection of an existing origin captures its current state without earlier frames.
  await x.service.startVizRecording(x.origin);
  expect((await x.record()).frames).toHaveLength(1);
});
it("fails closed for unsupported graph versions and invalid origins, without changing business state", async () => {
  const x = await setup(false);
  const before = await x.service.getState();
  expect(() =>
    mapDefinition({ ...before.workflows[0], definitionVersion: 1 }),
  ).toThrow("legacy");
  await expect(x.service.startVizRecording("missing")).rejects.toThrow(
    "accepted",
  );
  expect(await x.service.getState()).toEqual(before);
});
it("records correction and decline routes from real outcomes rather than illuminating all possible paths", async () => {
  const x = await setup();
  await x.service.recordScreeningDecision(
    x.app,
    "RequestInformation",
    "Clarify operating region",
  );
  let frame = (await x.record()).frames.at(-1)!;
  expect(frame.nodes.ProvideInformation.status).toBe("waiting");
  expect(frame.nodes.declined.status).toBe("neutral");
  await x.service.submitAdditionalInformation(x.app, "Updated region");
  await x.service.recordScreeningDecision(x.app, "Proceed", "");
  await x.service.submitEvidence(
    await x.task("SubmitLicense"),
    "Expired demo document",
  );
  await x.service.executeActivity(await x.task("VerifyLicense"));
  frame = (await x.record()).frames.at(-1)!;
  expect(frame.nodes["license-correction"].status).toBe("waiting");
  expect(frame.nodes.ApproveSkill.status).toBe("neutral");
  expect(frame.nodes["skill-approved"].status).toBe("neutral");
  const y = await setup();
  await y.service.recordScreeningDecision(
    y.app,
    "Decline",
    "Outside operating area",
  );
  frame = (await y.record()).frames.at(-1)!;
  expect(frame.nodes.declined.status).toBe("error");
  expect(frame.nodes.parallel.status).toBe("neutral");
});
it("reports a projection gap while allowing a valid business command to commit", async () => {
  const x = await setup();
  const s = await x.service.getState();
  // Corrupt only auxiliary Viz data to emulate an unsupported/failed projection; business data stays valid.
  s.viz!.recordings[0].definition.nodes = undefined as never;
  await x.repository.save(s);
  await x.service.recordScreeningDecision(x.app, "Proceed", "");
  const after = await x.service.getState();
  expect(after.applications[0].status).toBe("Onboarding");
  expect(after.viz!.captureError).toContain("Business processing continued");
  expect(after.viz!.recordings[0].frames).toHaveLength(1);
});
it("preserves a cancelled activation as reached-but-cancelled visual work after readiness loss", async () => {
  const x = await setup(false);
  await x.service.recordScreeningDecision(x.app, "Proceed", "");
  for (const activity of [
    "SubmitInsurance",
    "SubmitFinancial",
    "SubmitAgreement",
    "SubmitLicense",
  ] as const)
    await x.service.submitEvidence(
      await x.task(activity),
      "Valid demo document",
    );
  for (const activity of [
    "ReviewInsurance",
    "ReviewFinancial",
    "ExecuteAgreement",
    "VerifyLicense",
    "CreateVendor",
  ] as const)
    await x.service.executeActivity(await x.task(activity));
  await x.service.decideSkill(await x.task("ApproveSkill"), true, "Approved");
  for (const activity of [
    "SetupPortal",
    "CompleteTraining",
    "ConfirmTraining",
  ] as const)
    await x.service.completeParticipantTask(await x.task(activity));
  await x.service.startVizRecording(x.origin);
  const pending = await x.task("PublishActivation"),
    before = (await x.record()).frames[0];
  expect(before.nodes.PublishActivation.status).toBe("waiting");
  await x.service.invalidateSkill(
    (await x.service.getState()).qualifications[0].id,
    "Approval withdrawn before publication",
  );
  const frame = (await x.record()).frames.at(-1)!;
  expect(frame.nodes.PublishActivation.status).toBe("neutral");
  expect(frame.nodes.PublishActivation.workItemId).toBe(pending);
  expect(frame.nodes.PublishActivation.explanation).toContain("Superseded");
  expect(frame.nodes.complete.status).toBe("neutral");
  expect((await x.record()).frames[0]).toEqual(before);
});
