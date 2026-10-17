import type { BusinessEvent, State } from "../domain";
import type { RecordingTrigger, TriggerKind, VizRecording } from "./types";

export const triggerCatalog: {
  kind: TriggerKind;
  label: string;
  contract: string;
  scope: string;
}[] = [
  {
    kind: "application",
    label: "Every new application",
    contract: "ApplicationSubmitted",
    scope: "CompanyOnboarding v2 · map adapter 1",
  },
  {
    kind: "recruitment",
    label: "After Recruitment approval",
    contract: "ScreeningDecisionRecorded · decision Proceed",
    scope: "CompanyOnboarding v2 · map adapter 1",
  },
  {
    kind: "ready",
    label: "Contractor becomes ready",
    contract: "ContractorReadinessChanged · ready true",
    scope: "CompanyOnboarding v2 · map adapter 1",
  },
  {
    kind: "skill",
    label: "New skill request",
    contract: "SkillRequested",
    scope: "SkillQualification v2 · map adapter 1",
  },
];
export function matchesTrigger(t: RecordingTrigger, e: BusinessEvent) {
  return (
    t.enabled &&
    ((t.kind === "application" && e.eventType === "ApplicationSubmitted") ||
      (t.kind === "recruitment" &&
        e.eventType === "ScreeningDecisionRecorded" &&
        e.payload.decision === "Proceed") ||
      (t.kind === "ready" &&
        e.eventType === "ContractorReadinessChanged" &&
        e.payload.ready) ||
      (t.kind === "skill" && e.eventType === "SkillRequested"))
  );
}
export function recordingStatus(s: State, r: VizRecording) {
  return r.captureError
    ? "Capture issue"
    : (r.status ??
        (r.stoppedAtRevision !== undefined
          ? "Stopped"
          : r.id === s.viz?.activeRecordingId
            ? "Recording"
            : "Stopped"));
}
/** Upgrade metadata only. Never replay events, change a frame, or enable a rule. */
export function upgradeViz(s: State) {
  if (!s.viz) return;
  for (const r of s.viz.recordings) {
    r.status ??= recordingStatus(s, r);
    if (
      s.viz.version === 1 &&
      r.status === "Recording" &&
      s.workflows.find((w) => w.id === r.workflowId)?.status === "Completed"
    ) {
      r.status = "Completed";
      r.completedAtRevision = r.frames.at(-1)?.revision ?? s.revision;
    }
  }
  s.viz.version = 2;
  s.viz.triggers ??= [];
}
