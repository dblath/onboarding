import { contractorStates } from "./contractorStates";
import { operationsState } from "./operationsState";
import { buildScenario } from "../../src/workspace/scenarios";
import { createWorkspaceFile } from "../../src/workspace/format";
import { testService } from "../../src/testing";

export async function monitorStates() {
  const { files, states } = await contractorStates();
  let state = structuredClone(states["active-work"]);
  const service = testService({
    load: async () => structuredClone(state),
    save: async (next) => {
      state = structuredClone(next);
    },
  });
  for (const type of ["ScreeningDecisionRecorded", "SkillRequested"])
    await service.startVizRecording(
      state.events.find((e) => e.eventType === type)!.eventId,
    );
  return {
    submitted: files.submitted,
    parallel: await operationsState(),
    correction: files.correction,
    failure: await buildScenario("failure"),
    activation: files["activation-pending"],
    independent: files["separate-skill"],
    recordings: createWorkspaceFile(
      state,
      "Multiple onboarding capture points",
      "Application, Recruitment and initial qualification recordings created through normal capture commands.",
    ),
  };
}
