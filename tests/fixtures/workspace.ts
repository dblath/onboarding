import { emptyState, type Activity } from "../../src/domain";
import { testService } from "../../src/testing";

/** Legitimate service-command fixture: active Frame 13, archived Frame 0,
 * failed + successful attempts, and contractor training still outstanding. */
export async function frame13Workspace() {
  let state = emptyState();
  const service = testService({
    load: async () => structuredClone(state),
    save: async (s) => {
      state = structuredClone(s);
    },
  });
  const app = await service.submitApplication({
    name: "Frame Thirteen Services",
    email: "thirteen@example.com",
    contact: "Alex Rivera",
    skill: "HVAC",
  });
  const archive = await service.startVizRecording(state.events[0].eventId);
  await service.stopVizRecording(archive);
  await service.startVizRecording(state.events[0].eventId);
  await service.recordScreeningDecision(app, "Proceed", "");
  const task = (a: Activity) =>
    state.workItems.find((t) => t.activity === a && t.status === "Open")!.id;
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
  return service.saveWorkspace(
    "Frame 13 meeting",
    "Training outstanding; archive and failed attempt retained",
  );
}
