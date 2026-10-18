// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import {
  recordingSelection,
  rememberedRecording,
  rememberRecording,
} from "./recordingSelection";
import { selectionWorkspace } from "../../tests/fixtures/recordingSelection";
import { frame13Workspace } from "../../tests/fixtures/workspace";
import { emptyState } from "../domain";

afterEach(() => sessionStorage.clear());
it("defaults to real workflow/company captures, including skill-only context, without mutating state", async () => {
  const { state } = await selectionWorkspace();
  const before = structuredClone(state);
  const company = state.companies.find((c) => c.name === "Skill capture only")!;
  const workflow = state.workflows.find(
    (w) => w.companyId === company.id && w.definitionId === "CompanyOnboarding",
  )!;
  const result = recordingSelection(state, {
    companyId: company.id,
    workflowId: workflow.id,
  });
  expect(result.recording?.companyId).toBe(company.id);
  expect(result.recording?.definition.workflowName).toBe("SkillQualification");
  expect(recordingSelection(state, {}).recording).toBeDefined();
  expect(state).toEqual(before);
});
it("distinguishes empty global state, absent company capture and unavailable explicit identities", async () => {
  const { state } = await selectionWorkspace();
  const absent = state.companies.find((c) => c.name === "No capture")!;
  expect(recordingSelection(emptyState(), {}).placeholder).toBe(
    "No recordings yet",
  );
  expect(recordingSelection(state, { companyId: absent.id })).toMatchObject({
    recording: undefined,
    placeholder: "No recordings for this company",
  });
  const company = state.companies[0].id;
  expect(
    recordingSelection(state, { companyId: company, recordingId: "removed" }),
  ).toMatchObject({ recording: undefined, unavailable: true });
  expect(
    recordingSelection(state, { companyId: company }, "removed").recording,
  ).toBeUndefined();
  expect(
    recordingSelection(state, {
      companyId: absent.id,
      recordingId: state.viz!.recordings[0].id,
    }).recording,
  ).toBeUndefined();
});
it("honors stopped/archived/manual selections without preferring active capture", async () => {
  const { state } = await frame13Workspace();
  const archived = state.viz!.recordings[0];
  expect(archived.stoppedAtRevision).toBeDefined();
  expect(
    recordingSelection(state, { companyId: archived.companyId }, archived.id)
      .recording,
  ).toEqual(archived);
});
it("tab preferences are scoped by company/workflow and workspace epoch; damaged storage is ignored", async () => {
  const { state } = await selectionWorkspace();
  const r = state.viz!.recordings[0],
    context = { companyId: r.companyId, workflowId: r.workflowId };
  rememberRecording(state, context, r.id);
  expect(rememberedRecording(state, context)).toBe(r.id);
  expect(rememberedRecording(state, { companyId: "elsewhere" })).toBe("");
  expect(
    rememberedRecording({ ...state, workspaceEpoch: "replaced" }, context),
  ).toBe("");
  sessionStorage.setItem("fieldwork:monitor:recording-view", "damaged");
  expect(rememberedRecording(state, context)).toBe("");
});
