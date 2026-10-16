import dagre from "@dagrejs/dagre";

export const groups = [
  "Starting point",
  "Insurance",
  "Finance",
  "Agreement",
  "Skill qualification",
  "Enablement",
  "Activation",
];
export const areaColors: Record<string, string> = {
  "Starting point": "#687d9b",
  Insurance: "#438b83",
  Finance: "#567eab",
  Agreement: "#9676ac",
  "Skill qualification": "#b48b50",
  Enablement: "#658f97",
  Activation: "#607f73",
};
interface LayoutNode {
  id: string;
  width?: number;
  height?: number;
  position: { x: number; y: number };
  data: {
    model: { group: string; kind: string };
    count?: number;
    horizontal?: boolean;
  };
}
interface LayoutEdge {
  id: string;
  source: string;
  target: string;
}
const horizontal = new Set(["Starting point", "Enablement", "Activation"]);

/** Local sequences inside macro lanes: geometry only, never an execution order. */
export function layoutGroups(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  backwards: Set<string>,
) {
  const buckets = new Map<string, LayoutNode[]>();
  nodes.forEach((n) => {
    n.width = n.data.count ? 180 : n.data.model.kind === "join" ? 184 : 154;
    n.height = n.data.count ? 48 : 44;
    n.data.horizontal = horizontal.has(n.data.model.group);
    const bucket = buckets.get(n.data.model.group) ?? [];
    bucket.push(n);
    buckets.set(n.data.model.group, bucket);
  });
  const macro = new dagre.graphlib.Graph()
    .setGraph({
      rankdir: "TB",
      nodesep: 32,
      ranksep: 46,
      marginx: 26,
      marginy: 42,
    })
    .setDefaultEdgeLabel(() => ({}));
  const locals = new Map<string, typeof macro>();
  for (const [group, members] of buckets) {
    const local = new dagre.graphlib.Graph()
      .setGraph({
        rankdir: horizontal.has(group) ? "LR" : "TB",
        nodesep: 20,
        ranksep: 22,
        marginx: 12,
        marginy: 12,
      })
      .setDefaultEdgeLabel(() => ({}));
    members.forEach((n) =>
      local.setNode(n.id, { width: n.width!, height: n.height! }),
    );
    const ids = new Set(members.map((n) => n.id));
    edges
      .filter(
        (e) => ids.has(e.source) && ids.has(e.target) && !backwards.has(e.id),
      )
      .forEach((e) => local.setEdge(e.source, e.target));
    dagre.layout(local);
    const bounds = local.graph();
    macro.setNode(group, {
      width: bounds.width! + 20,
      height: bounds.height! + 26,
    });
    locals.set(group, local);
  }
  const owners = new Map(nodes.map((n) => [n.id, n.data.model.group]));
  edges
    .filter((e) => !backwards.has(e.id))
    .forEach((e) => {
      const source = owners.get(e.source)!,
        target = owners.get(e.target)!;
      if (source !== target)
        macro.setEdge(source, target, {
          // The skill lane runs alongside all three administrative checks; it
          // bypasses enablement and converges only at readiness.
          minlen:
            source === "Skill qualification" && target === "Activation" ? 2 : 1,
        });
    });
  dagre.layout(macro);
  nodes.forEach((n) => {
    const group = n.data.model.group,
      box = macro.node(group),
      local = locals.get(group)!;
    const p = local.node(n.id),
      bounds = local.graph();
    n.position = {
      x: box.x - bounds.width! / 2 + p.x - n.width! / 2,
      y: box.y - bounds.height! / 2 + p.y - n.height! / 2,
    };
  });
  const lanes = ["Insurance", "Finance", "Agreement", "Skill qualification"];
  const tops = lanes.map((group) =>
    Math.min(
      ...nodes
        .filter((n) => n.data.model.group === group)
        .map((n) => n.position.y),
    ),
  );
  const top = Math.min(...tops);
  lanes.forEach((group, i) => {
    if (!Number.isFinite(tops[i])) return;
    nodes
      .filter((n) => n.data.model.group === group)
      .forEach((n) => (n.position.y += top - tops[i]));
  });
}
