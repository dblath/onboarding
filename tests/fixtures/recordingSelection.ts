import { monitorStates } from "./monitorStates";
import { testService } from "../../src/testing";
import { createWorkspaceFile } from "../../src/workspace/format";

/** Mixed real capture sources/states, plus a company with no recording and a skill-only capture. */
export async function selectionWorkspace() {
  let state = structuredClone((await monitorStates()).recordings.state);
  const service = testService({
    load: async () => structuredClone(state),
    save: async (next) => {
      state = structuredClone(next);
    },
  });
  await service.stopVizRecording(state.viz!.recordings[0].id);
  await service.startVizRecording(state.events[0].eventId);
  await service.saveRecordingTrigger({
    name: "Selection review",
    kind: "application",
    enabled: true,
  });
  const apply = (name: string) =>
    service.submitApplication({
      name,
      email: `${name.toLowerCase().replaceAll(" ", "-")}@example.com`,
      contact: "Alex Rivera",
      skill: "HVAC",
    });
  await apply("Automatic capture");
  await service.saveRecordingTrigger({
    ...state.viz!.triggers![0],
    enabled: false,
  });
  await apply("No capture");
  const skillOnly = await apply("Skill capture only");
  await service.recordScreeningDecision(
    skillOnly,
    "Proceed",
    "Service area confirmed.",
  );
  await service.startVizRecording(
    state.events.find(
      (e) => e.eventType === "SkillRequested" && e.applicationId === skillOnly,
    )!.eventId,
  );
  return createWorkspaceFile(
    state,
    "Recording selection review",
    "Manual, stopped, automatic, mid-workflow and absent company capture, through normal commands.",
  );
}
