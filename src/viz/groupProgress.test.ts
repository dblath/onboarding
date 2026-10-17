import { expect, it } from "vitest";
import { emptyState, type Activity } from "../domain";
import { testService } from "../testing";
import { groupProgress } from "./groupProgress";
import { largeVizFixture } from "../../tests/fixtures/vizLayout";

it("counts applicable activity stages from immutable frames, without gateways, speculative branches or duplicate correction loops", async () => {
  let state = emptyState();
  const service = testService({
    load: async () => structuredClone(state),
    save: async (s) => {
      state = structuredClone(s);
    },
  });
  const app = await service.submitApplication({
    name: "Counts",
    contact: "Alex",
    email: "counts@example.com",
    skill: "HVAC",
  });
  await service.startVizRecording(state.events[0].eventId);
  const recording = () => state.viz!.recordings[0];
  const progress = (group: string) =>
    groupProgress(recording().definition, recording().frames.at(-1)!, group);
  expect(progress("Insurance").label).toBe("Route pending");
  expect(progress("Starting point").label).toBe("Decision pending");
  await service.recordScreeningDecision(app, "Proceed", "");
  const start = structuredClone(recording().frames.at(-1)!);
  expect(progress("Insurance").remaining).toBe(2);
  expect(progress("Enablement").remaining).toBe(4);
  expect(progress("Skill qualification").remaining).toBe(3);
  const task = (a: Activity) =>
    state.workItems.find((t) => t.activity === a && t.status === "Open")!.id;
  await service.submitEvidence(
    task("SubmitInsurance"),
    "Expired demo document",
  );
  expect(progress("Insurance").remaining).toBe(1);
  await service.executeActivity(task("ReviewInsurance"));
  expect(progress("Insurance").remaining).toBe(2);
  await service.submitEvidence(task("SubmitInsurance"), "Valid demo document");
  expect(progress("Insurance").remaining).toBe(1);
  await service.executeActivity(task("ReviewInsurance"), true);
  expect(progress("Insurance").remaining).toBe(1);
  await service.retryActivity(task("ReviewInsurance"));
  expect(progress("Insurance").label).toBe("Complete");
  expect(
    groupProgress(recording().definition, start, "Insurance").remaining,
  ).toBe(2);
  expect(progress("Starting point").remaining).toBe(0); // Optional information request never required.

  const declinedApp = await service.submitApplication({
    name: "Declined branch",
    contact: "Alex",
    email: "declined@example.com",
    skill: "HVAC",
  });
  await service.startVizRecording(state.events.at(-1)!.eventId);
  await service.recordScreeningDecision(
    declinedApp,
    "Decline",
    "Outside service area",
  );
  const declined = state.viz!.recordings.at(-1)!;
  expect(
    groupProgress(declined.definition, declined.frames.at(-1)!, "Insurance"),
  ).toMatchObject({
    label: "Not required",
    remaining: 0,
  });
  expect(
    groupProgress(
      declined.definition,
      declined.frames.at(-1)!,
      "Starting point",
    ).label,
  ).toBe("Complete");
});
it("keeps a synthetic 80-step topology compact while counting its actual activity nodes", () => {
  const r = largeVizFixture();
  const groups = [...new Set(r.definition.nodes.map((n) => n.group))];
  for (const group of groups) {
    const expected = r.definition.nodes.filter(
      (n) =>
        n.group === group &&
        n.kind === "activity" &&
        r.frames[0].nodes[n.id].status !== "complete",
    ).length;
    expect(groupProgress(r.definition, r.frames[0], group).remaining).toBe(
      expected,
    );
  }
});
