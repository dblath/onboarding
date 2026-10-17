import type { MapEdge, MapNode, VisualFrame, VizRecording } from "./types";

// Display-only vocabulary. Pinned definitions and event contracts stay unchanged.
const labels: Record<string, string> = {
  origin: "Application received",
  ScreenApplication: "Review application",
  "screening-decision": "Proceed?",
  ProvideInformation: "Add information",
  declined: "Application declined",
  parallel: "Parallel checks",
  SubmitInsurance: "Send insurance",
  ReviewInsurance: "Check insurance",
  SubmitFinancial: "Send financial pack",
  ReviewFinancial: "Check finances",
  SubmitAgreement: "Send agreement",
  ExecuteAgreement: "Check agreement",
  SubmitLicense: "Send license",
  VerifyLicense: "Check license",
  "license-decision": "License valid?",
  "license-correction": "Replace license",
  ApproveSkill: "Approve skill",
  "skill-decision": "Skill approved?",
  "skill-approved": "Skill approved",
  "skill-rejected": "Skill rejected",
  "admin-join": "Admin approved",
  CreateVendor: "Create vendor",
  SetupPortal: "Set up portal",
  CompleteTraining: "Take training",
  ConfirmTraining: "Confirm training",
  "readiness-join": "Ready to activate",
  PublishActivation: "Publish activation",
  complete: "Onboarding complete",
};
export function compactLabel(node: MapNode) {
  if (node.id === "origin" && node.label === "Recruitment approval recorded")
    return "Recruitment approved";
  if (node.id === "origin" && node.label === "Contractor becomes ready")
    return "Contractor ready";
  if (node.id === "origin" && node.label.toLowerCase().includes("skill"))
    return "Skill requested";
  if (labels[node.id]) return labels[node.id];
  if (node.id.endsWith("-decision")) return "Evidence accepted?";
  if (node.id.endsWith("-correction")) return "Replace evidence";
  if (node.id.endsWith("-accepted")) return "Evidence verified";
  return node.label;
}

/** Compare recorded states only; never infer missing frames or execute work. */
export function edgeStatus(
  recording: VizRecording,
  frame: VisualFrame,
  edge: MapEdge,
) {
  const target = recording.definition.nodes.find((n) => n.id === edge.target);
  const source = frame.nodes[edge.source];
  // A satisfied incoming dependency stays green while the join waits on others.
  // This is a display of recorded source facts, not a workflow transition.
  if (target?.kind === "join" && ["complete", "error"].includes(source.status))
    return source.status;
  return frame.edges[edge.id];
}

export function frameStory(recording: VizRecording, frame: VisualFrame) {
  const previous = recording.frames[frame.number - 1];
  const nodes = new Set(
    previous
      ? Object.keys(frame.nodes).filter(
          (id) =>
            JSON.stringify(frame.nodes[id]) !==
            JSON.stringify(previous.nodes[id]),
        )
      : [],
  );
  const edges = new Set(
    previous
      ? recording.definition.edges
          .filter(
            (edge) =>
              edgeStatus(recording, frame, edge) !==
              edgeStatus(recording, previous, edge),
          )
          .map((edge) => edge.id)
      : [],
  );
  const changed = recording.definition.nodes.filter((n) => nodes.has(n.id));
  const activities = changed.filter((n) => n.kind === "activity");
  const lead =
    activities.find((n) => frame.nodes[n.id].status === "error") ??
    activities.find((n) => frame.nodes[n.id].status === "complete") ??
    activities.find((n) => frame.nodes[n.id].status === "waiting") ??
    changed[0];
  const next = recording.definition.nodes.filter(
    (n) =>
      n.kind === "activity" &&
      ["waiting", "error"].includes(frame.nodes[n.id].status),
  );
  next.sort((a, b) => Number(nodes.has(b.id)) - Number(nodes.has(a.id)));
  const ready = frame.nodes["readiness-join"];
  const title = !previous
    ? "Current state captured"
    : lead
      ? `${compactLabel(lead)} — ${frame.nodes[lead.id].status === "complete" ? "completed" : frame.nodes[lead.id].status === "error" ? "needs attention" : frame.nodes[lead.id].status === "waiting" ? "waiting" : "updated"}`
      : "Recorded progress updated";
  const explanation =
    ready?.status === "complete" && nodes.has("readiness-join")
      ? "All four activation requirements are satisfied."
      : lead
        ? frame.nodes[lead.id].explanation
        : "This is the starting snapshot. Earlier history has not been reconstructed.";
  return { nodes, edges, changed, next, title, explanation };
}
