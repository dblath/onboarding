import { OnboardingService, type Repository } from "../application";
import { emptyState, type Activity, type State } from "../domain";
import type { CommandCoordinator } from "../coordination";
import { createWorkspaceFile } from "./format";

export const scenarios = [
  {
    id: "documents",
    name: "Awaiting contractor documents",
    description:
      "Recruitment has accepted the application. Contractor evidence is outstanding across four parallel checks.",
  },
  {
    id: "failure",
    name: "Verification failure",
    description:
      "An insurance verification timed out. The failed attempt and explicit retry are available in Automations & Integrations.",
  },
  {
    id: "activation",
    name: "Ready for activation",
    description:
      "All four prerequisites are satisfied. Publication is outstanding; the company remains not eligible for jobs.",
  },
] as const;
export type ScenarioId = (typeof scenarios)[number]["id"];

/** Isolated generation through the real service, orchestrator, integrations and recorder.
 * Nothing is written to the live repository until confirmed restore. */
export async function buildScenario(scenarioId: ScenarioId) {
  const scenario = scenarios.find((x) => x.id === scenarioId);
  if (!scenario) throw new Error("Unknown demonstration scenario.");
  let state = emptyState();
  state.clock = "2026-10-16T15:00:00.000Z";
  const repository: Repository = {
    load: async () => structuredClone(state),
    save: async (s) => {
      state = structuredClone(s);
    },
  };
  const coordinator: CommandCoordinator = {
    exclusive: async (run) => run(),
    publish: () => {},
    subscribe: () => () => {},
  };
  const service = new OnboardingService(
    repository,
    undefined,
    undefined,
    coordinator,
  );
  const app = await service.submitApplication({
    name: "Summit Field Services",
    contact: "Alex Rivera",
    email: "alex@example.com",
    skill: "HVAC",
  });
  await service.startVizRecording(state.events[0].eventId);
  await service.recordScreeningDecision(app, "Proceed", "");
  const task = (activity: Activity) => {
    const t = state.workItems.find(
      (t) => t.activity === activity && t.status === "Open",
    );
    if (!t)
      throw new Error(`Scenario generation: ${activity} is not available.`);
    return t.id;
  };
  if (scenarioId !== "documents") {
    await service.submitEvidence(
      task("SubmitInsurance"),
      "Valid demo document",
    );
    await service.executeActivity(task("ReviewInsurance"), true);
  }
  if (scenarioId === "activation") {
    await service.retryActivity(task("ReviewInsurance"));
    await service.submitEvidence(
      task("SubmitFinancial"),
      "Valid demo document",
    );
    await service.executeActivity(task("ReviewFinancial"));
    await service.submitEvidence(
      task("SubmitAgreement"),
      "Valid demo document",
    );
    await service.executeActivity(task("ExecuteAgreement"));
    await service.submitEvidence(task("SubmitLicense"), "Valid demo document");
    await service.executeActivity(task("VerifyLicense"));
    await service.decideSkill(task("ApproveSkill"), true, "");
    await service.executeActivity(task("CreateVendor"));
    await service.completeParticipantTask(task("SetupPortal"));
    await service.completeParticipantTask(task("CompleteTraining"));
    await service.completeParticipantTask(task("ConfirmTraining"));
  }
  return createWorkspaceFile(state, scenario.name, scenario.description);
}
