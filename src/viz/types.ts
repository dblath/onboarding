import type { Activity } from "../domain";

export type VisualStatus = "neutral" | "waiting" | "complete" | "error";
export interface MapNode {
  id: string;
  label: string;
  owner: string;
  group: string;
  kind: "event" | "activity" | "decision" | "join" | "end";
  activity?: Activity;
  scope?: "company" | "skill";
}
export interface MapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  route?: string;
}
export interface MapDefinition {
  adapterVersion: 1;
  workflowName: "CompanyOnboarding" | "SkillQualification";
  workflowVersion: 2;
  nodes: MapNode[];
  edges: MapEdge[];
}
export interface VisualNode {
  status: VisualStatus;
  explanation: string;
  workItemId?: string;
  eventIds: string[];
  satisfied?: number;
  total?: number;
  outstanding?: string[];
}
export interface FrameCause {
  id: string;
  label: string;
  kind: "event" | "attempt" | "transition";
  actor?: string;
  causedByEventId?: string;
}
export interface VisualFrame {
  number: number;
  revision: number;
  capturedAt: string;
  causes: FrameCause[];
  nodes: Record<string, VisualNode>;
  edges: Record<string, VisualStatus>;
}
export interface VizRecording {
  id: string;
  originEventId: string;
  companyId: string;
  companyName: string;
  workflowId: string;
  originLabel: string;
  startedAt: string;
  stoppedAtRevision?: number;
  captureError?: string;
  definition: MapDefinition;
  workflowIds: string[];
  seen: string[];
  frames: VisualFrame[];
}
export interface VizState {
  version: 1;
  activeRecordingId: string;
  recordings: VizRecording[];
  captureError?: string;
}
