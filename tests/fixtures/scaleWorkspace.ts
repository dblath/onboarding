import { emptyState, type Activity } from "../../src/domain";
import { testService } from "../../src/testing";

/** Real commands only: 25 ready companies, correction loops, failures/retries,
 * initial skill completions and at least 500 immutable company/skill frames. */
export async function scaleWorkspace() {
  let state = emptyState();
  const service = testService({
    load: async () => structuredClone(state),
    save: async (s) => {
      state = structuredClone(s);
    },
  });
  await service.saveRecordingTrigger({
    name: "Scale applications",
    kind: "application",
    enabled: true,
  });
  await service.saveRecordingTrigger({
    name: "Scale qualifications",
    kind: "skill",
    enabled: true,
  });
  for (let i = 1; i <= 25; i++) {
    const app = await service.submitApplication({
      name: `Scale Company ${String(i).padStart(2, "0")}`,
      contact: "Alex",
      email: `scale${i}@example.com`,
      skill: "HVAC",
    });
    const company = state.applications.find((a) => a.id === app)!.companyId;
    const task = (activity: Activity) =>
      state.workItems.find(
        (t) =>
          t.companyId === company &&
          t.activity === activity &&
          t.status === "Open",
      )!.id;
    await service.recordScreeningDecision(
      app,
      "RequestInformation",
      "Confirm service area",
    );
    await service.submitAdditionalInformation(app, "Denver area confirmed");
    await service.recordScreeningDecision(app, "Proceed", "Suitable");
    for (const [submit, review] of [
      ["SubmitInsurance", "ReviewInsurance"],
      ["SubmitFinancial", "ReviewFinancial"],
      ["SubmitAgreement", "ExecuteAgreement"],
      ["SubmitLicense", "VerifyLicense"],
    ] as const) {
      await service.submitEvidence(
        task(submit),
        submit === "SubmitLicense"
          ? "Expired demo document"
          : "Valid demo document",
      );
      if (review === "ReviewInsurance") {
        await service.executeActivity(task(review), true);
        await service.executeActivity(task(review), true);
        await service.retryActivity(task(review));
      } else await service.executeActivity(task(review));
      if (review === "VerifyLicense") {
        await service.submitEvidence(task(submit), "Valid demo document");
        await service.retryActivity(task(review));
      }
    }
    await service.decideSkill(task("ApproveSkill"), true, "Qualified");
    await service.executeActivity(task("CreateVendor"));
    for (const a of [
      "SetupPortal",
      "CompleteTraining",
      "ConfirmTraining",
    ] as const)
      await service.completeParticipantTask(task(a));
  }
  return service.saveWorkspace(
    "Scale meeting",
    "25 companies; parallel qualification captures; corrections, retries and publication waiting",
  );
}
