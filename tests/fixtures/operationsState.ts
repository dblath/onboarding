import { emptyState, type Activity } from "../../src/domain";
import { testService } from "../../src/testing";
import { createWorkspaceFile } from "../../src/workspace/format";

export async function operationsState() {
  let state = emptyState();
  state.clock = "2026-10-17T15:00:00.000Z";
  const service = testService({
    load: async () => structuredClone(state),
    save: async (next) => {
      state = structuredClone(next);
    },
  });
  await service.saveRecordingTrigger({
    name: "Operations review",
    kind: "application",
    enabled: true,
  });
  const apply = (name: string) =>
    service.submitApplication({
      name,
      contact: "Alex Rivera",
      email: `${name.split(" ")[0].toLowerCase()}@example.com`,
      skill: "HVAC",
    });
  await apply("Alpha Services");
  await apply("Beta Services");
  const gamma = await apply("Gamma Services"),
    delta = await apply("Delta Services"),
    sierra = await apply("Sierra Services");
  const company = (app: string) =>
    state.applications.find((a) => a.id === app)!.companyId;
  const task = (app: string, activity: Activity) =>
    state.workItems.find(
      (t) =>
        t.companyId === company(app) &&
        t.activity === activity &&
        t.status === "Open",
    )!.id;
  for (const app of [gamma, delta, sierra])
    await service.recordScreeningDecision(
      app,
      "Proceed",
      "Service area and company experience confirmed.",
    );
  await service.submitEvidence(
    task(gamma, "SubmitInsurance"),
    "Expired demo document",
  );
  await service.submitEvidence(
    task(gamma, "SubmitLicense"),
    "Valid demo document",
  );
  await service.submitEvidence(
    task(delta, "SubmitInsurance"),
    "Valid demo document",
  );
  for (const [submit, review] of [
    ["SubmitInsurance", "ReviewInsurance"],
    ["SubmitFinancial", "ReviewFinancial"],
    ["SubmitAgreement", "ExecuteAgreement"],
    ["SubmitLicense", "VerifyLicense"],
  ] as const) {
    await service.submitEvidence(task(sierra, submit), "Valid demo document");
    await service.executeActivity(task(sierra, review));
  }
  await service.decideSkill(
    task(sierra, "ApproveSkill"),
    true,
    "Evidence and experience verified.",
  );
  await service.executeActivity(task(sierra, "CreateVendor"));
  for (const a of [
    "SetupPortal",
    "CompleteTraining",
    "ConfirmTraining",
  ] as const)
    await service.completeParticipantTask(task(sierra, a));
  return createWorkspaceFile(
    state,
    "Operations review — attention and activation",
    "Two Recruitment companies; Gamma has insurance and license reviews; Delta has insurance; Sierra is Ready with publication outstanding. Created through normal commands.",
  );
}
