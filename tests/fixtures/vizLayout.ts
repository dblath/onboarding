import type {
  MapDefinition,
  VisualFrame,
  VizRecording,
} from "../../src/viz/types";

/** Synthetic layout stress fixture only. Not a workflow definition or execution. */
export function largeVizFixture(): VizRecording {
  const definition: MapDefinition = {
    adapterVersion: 1,
    workflowName: "CompanyOnboarding",
    workflowVersion: 2,
    nodes: [],
    edges: [],
  };
  const add = (id: string, group: string, label: string) =>
    definition.nodes.push({
      id,
      group,
      label,
      owner: "Layout fixture",
      kind: "activity",
    });
  const edge = (source: string, target: string) =>
    definition.edges.push({ id: `${source}:${target}`, source, target });
  for (let i = 0; i < 6; i++) {
    add(
      `start-${i}`,
      "Starting point",
      [
        "Receive request",
        "Check company",
        "Confirm scope",
        "Review details",
        "Accept request",
        "Start checks",
      ][i],
    );
    if (i) edge(`start-${i - 1}`, `start-${i}`);
  }
  const areas = ["Insurance", "Finance", "Agreement", "Skill qualification"];
  for (const [a, group] of areas.entries()) {
    // Eight stages, two independent checks per stage, across four parallel lanes.
    for (let stage = 0; stage < 8; stage++)
      for (let side = 0; side < 2; side++) {
        const id = `lane-${a}-${stage}-${side}`;
        add(
          id,
          group,
          `${side ? "Verify" : "Review"} ${["identity", "evidence", "coverage", "terms", "references", "conditions", "approval", "handoff"][stage]}`,
        );
        if (stage) {
          edge(`lane-${a}-${stage - 1}-0`, id);
          edge(`lane-${a}-${stage - 1}-1`, id);
        } else edge("start-5", id);
      }
  }
  for (let i = 0; i < 5; i++) {
    add(
      `enable-${i}`,
      "Enablement",
      [
        "Confirm checks",
        "Create vendor",
        "Set up portal",
        "Take training",
        "Confirm training",
      ][i],
    );
    if (i) edge(`enable-${i - 1}`, `enable-${i}`);
  }
  for (let a = 0; a < 3; a++)
    for (let side = 0; side < 2; side++)
      edge(`lane-${a}-7-${side}`, "enable-0");
  for (let i = 0; i < 5; i++) {
    add(
      `activate-${i}`,
      "Activation",
      [
        "Join requirements",
        "Review readiness",
        "Publish activation",
        "Confirm delivery",
        "Finish onboarding",
      ][i],
    );
    if (i) edge(`activate-${i - 1}`, `activate-${i}`);
  }
  edge("enable-4", "activate-0");
  for (let side = 0; side < 2; side++) edge(`lane-3-7-${side}`, "activate-0");
  const frame: VisualFrame = {
    number: 0,
    revision: 0,
    capturedAt: "2026-10-16T18:00:00Z",
    causes: [],
    nodes: {},
    edges: {},
  };
  for (const [i, node] of definition.nodes.entries())
    frame.nodes[node.id] = {
      status:
        i < 20
          ? "complete"
          : i < 30
            ? "waiting"
            : i === 40
              ? "error"
              : "neutral",
      explanation:
        "Synthetic geometry and state-pattern fixture. No business execution.",
      eventIds: [],
    };
  for (const e of definition.edges)
    frame.edges[e.id] = frame.nodes[e.target].status;
  return {
    id: "layout-fixture-80",
    companyId: "fixture",
    companyName: "LAYOUT FIXTURE — 80 synthetic steps",
    originEventId: "fixture",
    workflowId: "fixture",
    originLabel: "Layout and state patterns only · not an executable workflow",
    startedAt: frame.capturedAt,
    definition,
    workflowIds: [],
    seen: [],
    frames: [frame],
    stoppedAtRevision: 0,
  };
}
