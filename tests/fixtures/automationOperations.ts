import { operationsState } from "./operationsState";
import { testService } from "../../src/testing";
import {
  createWorkspaceFile,
  validateWorkspace,
} from "../../src/workspace/format";

/** Canonical human verifications and two system-owned activities, via normal commands. */
export async function automationOperationsState() {
  let state = (await operationsState()).state;
  const service = testService({
    load: async () => structuredClone(state),
    save: async (next) => {
      state = structuredClone(next);
    },
  });
  const app = await service.submitApplication({
    name: "Echo Services",
    contact: "Alex Rivera",
    email: "echo@example.com",
    skill: "HVAC",
  });
  const companyId = state.applications.find((a) => a.id === app)!.companyId;
  await service.recordScreeningDecision(app, "Proceed", "Coverage confirmed.");
  for (const [submit, review] of [
    ["SubmitInsurance", "ReviewInsurance"],
    ["SubmitFinancial", "ReviewFinancial"],
    ["SubmitAgreement", "ExecuteAgreement"],
  ] as const) {
    const task = (activity: typeof submit | typeof review) =>
      state.workItems.find(
        (t) =>
          t.companyId === companyId &&
          t.activity === activity &&
          t.status === "Open",
      )!.id;
    await service.submitEvidence(task(submit), "Valid demo document");
    await service.executeActivity(task(review));
  }
  const file = createWorkspaceFile(
    state,
    "Operations A&I review",
    "Sierra awaits activation, Echo awaits vendor creation, Gamma and Delta retain canonical Compliance work. All facts and captures created through normal commands.",
  );
  validateWorkspace(file);
  return file;
}
