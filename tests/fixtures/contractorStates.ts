import { emptyState, type State, type Activity } from "../../src/domain";
import { testService } from "../../src/testing";
import { createWorkspaceFile } from "../../src/workspace/format";

/** Product review fixtures built only through existing legitimate business commands. */
export async function contractorStates() {
  let state = emptyState();
  state.clock = "2026-10-17T15:00:00.000Z";
  const service = testService({
    load: async () => structuredClone(state),
    save: async (next) => {
      state = structuredClone(next);
    },
  });
  const snapshots: Record<string, State> = {};
  const save = (name: string) => {
    snapshots[name] = structuredClone(state);
  };
  const app = await service.submitApplication({
    name: "Summit Field Services",
    contact: "Alex Rivera",
    email: "alex@example.com",
    skill: "HVAC",
  });
  await service.startVizRecording(state.events[0].eventId);
  save("submitted");
  const task = (activity: Activity) =>
    state.workItems.find((t) => t.activity === activity && t.status === "Open")!
      .id;
  await service.recordScreeningDecision(
    app,
    "Proceed",
    "Company coverage and experience confirmed.",
  );
  save("active-work");
  await service.submitEvidence(
    task("SubmitInsurance"),
    "Expired demo document",
  );
  await service.executeActivity(task("ReviewInsurance"));
  save("correction");
  await service.submitEvidence(task("SubmitInsurance"), "Valid demo document");
  await service.submitEvidence(task("SubmitFinancial"), "Valid demo document");
  await service.submitEvidence(task("SubmitAgreement"), "Valid demo document");
  await service.submitEvidence(task("SubmitLicense"), "Valid demo document");
  save("waiting-team");
  for (const a of [
    "ReviewInsurance",
    "ReviewFinancial",
    "ExecuteAgreement",
    "VerifyLicense",
  ] as const)
    await service.executeActivity(task(a));
  await service.decideSkill(
    task("ApproveSkill"),
    true,
    "Experience and evidence verified.",
  );
  await service.executeActivity(task("CreateVendor"));
  for (const a of [
    "SetupPortal",
    "CompleteTraining",
    "ConfirmTraining",
  ] as const)
    await service.completeParticipantTask(task(a));
  save("activation-pending");
  await service.executeActivity(task("PublishActivation"));
  save("eligible");
  await service.requestSkill(state.companies[0].id, "Plumbing");
  save("separate-skill");
  await service.invalidateSkill(
    state.qualifications.find((q) => q.skill === "HVAC")!.id,
    "Approval withdrawn for review.",
  );
  save("suspended");
  return {
    states: snapshots,
    files: Object.fromEntries(
      Object.entries(snapshots).map(([name, s]) => [
        name,
        createWorkspaceFile(
          s,
          `Contractor UX — ${name}`,
          "Iteration 3.9 review, created through normal commands.",
        ),
      ]),
    ),
  };
}
