import type { State } from "../domain";

export interface RecordingContext {
  companyId?: string;
  workflowId?: string;
  recordingId?: string;
}
const storageKey = "fieldwork:monitor:recording-view";
const epoch = (state: State) => state.workspaceEpoch ?? "original";
const scope = (context: RecordingContext) =>
  JSON.stringify([context.companyId ?? "", context.workflowId ?? ""]);

/** Tab-local view preferences only. A workspace replacement invalidates every old choice. */
export function rememberedRecording(state: State, context: RecordingContext) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    return saved?.epoch === epoch(state) &&
      typeof saved.choices?.[scope(context)] === "string"
      ? (saved.choices[scope(context)] as string)
      : "";
  } catch {
    return "";
  }
}
export function rememberRecording(
  state: State,
  context: RecordingContext,
  id: string,
) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    const choices =
      saved?.epoch === epoch(state) &&
      saved.choices &&
      typeof saved.choices === "object"
        ? saved.choices
        : {};
    choices[scope(context)] = id;
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ epoch: epoch(state), choices }),
    );
  } catch {
    /* URL selection still works when tab storage is unavailable. */
  }
}

/** Resolve real availability; an explicit/stale selection never falls through to another journey. */
export function recordingSelection(
  state: State,
  context: RecordingContext,
  chosenId = "",
) {
  const recordings = state.viz?.recordings ?? [];
  const companyRecordings = recordings.filter(
    (r) => !context.companyId || r.companyId === context.companyId,
  );
  const explicit = context.recordingId || chosenId;
  const recording = explicit
    ? companyRecordings.find(
        (r) =>
          r.id === explicit &&
          (!context.recordingId ||
            !context.workflowId ||
            r.workflowId === context.workflowId),
      )
    : (companyRecordings
        .filter(
          (r) => !context.workflowId || r.workflowId === context.workflowId,
        )
        .at(-1) ?? companyRecordings.at(-1));
  const placeholder = !recordings.length
    ? "No recordings yet"
    : context.companyId && !companyRecordings.length
      ? "No recordings for this company"
      : explicit && !recording
        ? "Choose a recording — previous selection unavailable"
        : "Choose a recording";
  return {
    recording,
    placeholder,
    companyRecordings,
    unavailable: !!explicit && !recording,
  };
}
