import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  ViewportPortal,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type NodeProps,
  type Edge,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import type { State } from "../domain";
import type { OnboardingService } from "../application";
import { automationLink } from "../presentation";
import type { Run } from "../TaskCard";
import { originatingEvents, originWorkflow } from "./recorder";
import type {
  MapNode,
  VisualFrame,
  VisualNode,
  VisualStatus,
  VizRecording,
} from "./types";
import "@xyflow/react/dist/style.css";
import "./viz.css";

const colors: Record<VisualStatus, string> = {
  neutral: "#adb6be",
  waiting: "#e6a137",
  complete: "#25a580",
  error: "#e06067",
};
const statusLabels = {
  neutral: "Not reached",
  waiting: "Waiting",
  complete: "Completed",
  error: "Needs attention",
};
const visualLabel = (visual: VisualNode) =>
  visual.status === "neutral" && visual.workItemId
    ? "Cancelled"
    : statusLabels[visual.status];
const icons = { neutral: "○", waiting: "◷", complete: "✓", error: "!" };
type JourneyNode = Node<
  { model: MapNode; visual: VisualNode; count?: number; selected: boolean },
  "journey"
>;
function JourneyNodeCard({ data }: NodeProps<JourneyNode>) {
  return (
    <div
      className={`viz-node ${data.model.kind} ${data.visual.status}${data.selected ? " selected" : ""}`}
      data-testid={`viz-node-${data.model.id}`}
      data-status={data.visual.status}
    >
      <Handle type="target" position={Position.Top} />
      <div className="viz-node-top">
        <span>
          {data.count
            ? `${data.count} steps · group`
            : data.model.kind === "join"
              ? "DEPENDENCY JOIN"
              : data.model.group}
        </span>
        <span className="viz-node-icon" aria-hidden>
          {data.model.kind === "decision" && data.visual.status === "neutral"
            ? "◇"
            : data.visual.status === "neutral" && data.visual.workItemId
              ? "×"
              : icons[data.visual.status]}
        </span>
      </div>
      <strong>{data.model.label}</strong>
      <div className="viz-node-footer">
        <span>
          {data.visual.satisfied !== undefined
            ? `${data.visual.satisfied} of ${data.visual.total} complete`
            : visualLabel(data.visual)}
        </span>
        <small>{data.model.owner}</small>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
const nodeTypes = { journey: JourneyNodeCard };
const groups = [
  "Starting point",
  "Insurance",
  "Finance",
  "Agreement",
  "Skill qualification",
  "Enablement",
  "Activation",
];

function diagram(
  r: VizRecording,
  frame: VisualFrame,
  collapsed: Set<string>,
  selected: string,
) {
  const nodes: JourneyNode[] = [],
    replacement = new Map<string, string>();
  for (const group of groups) {
    const members = r.definition.nodes.filter((n) => n.group === group);
    if (!members.length) continue;
    if (collapsed.has(group)) {
      const states = members.map((n) => frame.nodes[n.id]);
      const end = [...members]
        .reverse()
        .find(
          (n) =>
            ["end", "join"].includes(n.kind) &&
            frame.nodes[n.id].status === "complete",
        );
      const join = members.find(
        (n) =>
          group === "Activation" &&
          n.kind === "join" &&
          frame.nodes[n.id].status !== "neutral",
      );
      const blocker =
        states.find((n) => n.status === "error") ??
        states.find((n) => n.status === "waiting");
      const status = states.some((n) => n.status === "error")
        ? "error"
        : blocker
          ? "waiting"
          : end && group !== "Enablement"
            ? "complete"
            : states.some((n) => n.status === "complete")
              ? "complete"
              : "neutral";
      const visual: VisualNode = {
        ...(join ? frame.nodes[join.id] : (blocker ?? states[0])),
        status,
        eventIds: [...new Set(states.flatMap((n) => n.eventIds))],
        explanation:
          blocker?.explanation ??
          "Expand this group to inspect its recorded steps and conditional paths.",
      };
      const model: MapNode = {
        id: `group:${group}`,
        label:
          group === "Starting point"
            ? r.definition.workflowName === "SkillQualification"
              ? "Skill request received"
              : "Application & recruitment"
            : group === "Activation"
              ? "Readiness & activation"
              : group === "Enablement"
                ? "Vendor, portal & training"
                : group === "Skill qualification"
                  ? "Skill qualification"
                  : `${group} assurance`,
        owner:
          members.find((n) => frame.nodes[n.id].status === "error")?.owner ??
          members.find((n) => frame.nodes[n.id].status === "waiting")?.owner ??
          [...new Set(members.map((n) => n.owner))]
            .filter((o) => o !== "Workflow")
            .join(" · "),
        group,
        kind: join ? "join" : "event",
      };
      nodes.push({
        id: model.id,
        type: "journey",
        position: { x: 0, y: 0 },
        data: {
          model,
          visual,
          count: members.length,
          selected: selected === model.id,
        },
        ariaLabel: `${model.label}, ${statusLabels[status]}, ${members.length} steps`,
        focusable: true,
      });
      members.forEach((n) => replacement.set(n.id, model.id));
    } else
      for (const model of members) {
        nodes.push({
          id: model.id,
          type: "journey",
          position: { x: 0, y: 0 },
          data: {
            model,
            visual: frame.nodes[model.id],
            selected: selected === model.id,
          },
          ariaLabel: `${model.label}, ${visualLabel(frame.nodes[model.id])}, ${model.owner}`,
          focusable: true,
        });
        replacement.set(model.id, model.id);
      }
  }
  const edges: Edge[] = [],
    seen = new Set<string>();
  for (const e of r.definition.edges) {
    const source = replacement.get(e.source)!,
      target = replacement.get(e.target)!,
      key = `${source}:${target}`;
    if (source === target || seen.has(key)) continue;
    seen.add(key);
    const state = frame.edges[e.id];
    edges.push({
      id: key,
      source,
      target,
      type: "smoothstep",
      label: !collapsed.size ? e.label : undefined,
      style: {
        stroke: colors[state],
        strokeWidth: state === "neutral" ? 1.3 : 2,
        opacity: state === "neutral" ? 0.5 : 0.9,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: colors[state],
        width: 18,
        height: 18,
      },
      animated: state === "waiting",
      labelStyle: { fill: "#60717c", fontSize: 11 },
      labelBgStyle: { fill: "#f7fafb", fillOpacity: 0.95 },
      data: { status: state },
    });
  }
  const layout = new dagre.graphlib.Graph()
    .setGraph({
      rankdir: "TB",
      nodesep: collapsed.size ? 32 : 40,
      ranksep: collapsed.size ? 58 : 34,
      marginx: 28,
      marginy: 28,
    })
    .setDefaultEdgeLabel(() => ({}));
  nodes.forEach((n) => layout.setNode(n.id, { width: 216, height: 108 }));
  // Back/correction routes are rendered but excluded from rank assignment so loops do not stretch the map.
  const backwards = new Set(
    r.definition.edges
      .filter((e) => e.label === "Resubmit" || e.label === "Review again")
      .map((e) => `${replacement.get(e.source)}:${replacement.get(e.target)}`),
  );
  edges
    .filter((e) => !backwards.has(e.id))
    .forEach((e) =>
      layout.setEdge(e.source, e.target, {
        minlen:
          e.source === "group:Skill qualification" &&
          e.target === "group:Activation"
            ? 2
            : e.source === "skill-approved" && e.target === "readiness-join"
              ? 4
              : 1,
      }),
    );
  dagre.layout(layout);
  nodes.forEach((n) => {
    const p = layout.node(n.id);
    n.position = { x: p.x - 108, y: p.y - 54 };
    n.width = 216;
    n.height = 108;
  });
  return { nodes, edges };
}

function Canvas({
  recording,
  frame,
  collapsed,
  selected,
  onSelect,
}: {
  recording: VizRecording;
  frame: VisualFrame;
  collapsed: Set<string>;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const flow = useReactFlow();
  const container = useRef<HTMLDivElement>(null);
  const generation = useRef(0);
  const [fitting, setFitting] = useState(false);
  const fit = useCallback(
    async (blockers = false) => {
      const token = ++generation.current;
      setFitting(true);
      const ids = blockers
        ? flow
            .getNodes()
            .filter((n) =>
              ["waiting", "error"].includes(
                (n.data as JourneyNode["data"]).visual.status,
              ),
            )
        : undefined;
      await flow.fitView({
        nodes: ids?.length ? ids : undefined,
        padding: 0.14,
        maxZoom: 1,
        duration: 0,
      });
      if (token === generation.current) setFitting(false);
    },
    [flow],
  );
  const graph = useMemo(
    () => diagram(recording, frame, collapsed, selected),
    [recording.definition, frame, collapsed, selected],
  );
  useEffect(() => {
    const element = container.current;
    let pending = 0;
    const resize = new ResizeObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => void fit());
    });
    if (element) resize.observe(element);
    pending = requestAnimationFrame(() => void fit());
    return () => {
      resize.disconnect();
      cancelAnimationFrame(pending);
    };
  }, [recording.id, collapsed, fit]);
  return (
    <div
      className="viz-canvas"
      ref={container}
      data-testid="viz-canvas"
      data-fitting={fitting}
      onKeyDownCapture={(event) => {
        const node = (event.target as HTMLElement).closest<HTMLElement>(
          ".react-flow__node",
        );
        if (node && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          event.stopPropagation();
          if (node.dataset.id) onSelect(node.dataset.id);
        }
      }}
    >
      <div className="viz-canvas-tools">
        <span>
          JOURNEY CANVAS{" "}
          <b>
            {graph.nodes.length} visible / {recording.definition.nodes.length}{" "}
            steps
          </b>
        </span>
        <button onClick={() => void fit()}>Fit map</button>
        <button onClick={() => void fit(true)}>Focus blockers</button>
      </div>
      <ReactFlow<JourneyNode>
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, n) => onSelect(n.id)}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesReconnectable={false}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.14, maxZoom: 1 }}
        minZoom={0.12}
        maxZoom={1.7}
        deleteKeyCode={null}
        onBeforeDelete={async () => false}
        aria-label="Viz workflow journey graph"
        defaultEdgeOptions={{ focusable: false }}
      >
        <ViewportPortal>
          <svg
            className="viz-lane-backgrounds"
            width="1"
            height="1"
            aria-hidden="true"
          >
            {["Insurance", "Finance", "Agreement", "Skill qualification"]
              .filter((group) => !collapsed.has(group))
              .map((group, i) => {
                const members = graph.nodes.filter(
                  (n) => n.data.model.group === group,
                );
                if (!members.length) return null;
                const x = Math.min(...members.map((n) => n.position.x)) - 16,
                  y = Math.min(...members.map((n) => n.position.y)) - 34;
                const width =
                    Math.max(...members.map((n) => n.position.x + 216)) -
                    x +
                    16,
                  height =
                    Math.max(...members.map((n) => n.position.y + 108)) -
                    y +
                    18;
                return (
                  <g key={group}>
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      rx="16"
                      fill={["#edf7f5", "#eef3fa", "#f5f0f9", "#fcf5e9"][i]}
                      fillOpacity=".7"
                      stroke={["#d4e8e1", "#d7e1ed", "#e6dbee", "#ecdfc7"][i]}
                    />
                    <text
                      x={x + 15}
                      y={y + 21}
                      fill="#7f949c"
                      fontSize="10"
                      fontWeight="650"
                      letterSpacing="1.3"
                    >
                      {group.toUpperCase()} LANE
                    </text>
                  </g>
                );
              })}
          </svg>
        </ViewportPortal>
        <Background color="#cdd9de" gap={24} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) =>
            colors[(n.data as JourneyNode["data"]).visual.status]
          }
          maskColor="rgba(237,243,246,.75)"
          pannable
          zoomable
          aria-label="Journey minimap"
        />
      </ReactFlow>
    </div>
  );
}

export default function JourneyMap({
  state,
  service,
  run,
  busy,
}: {
  state: State;
  service: OnboardingService;
  run: Run;
  busy: boolean;
}) {
  const [originChoice, setOriginChoice] = useState("");
  const [viewedId, setViewedId] = useState("");
  const [index, setIndex] = useState<number | null>(null);
  const [selected, setSelected] = useState("");
  const [collapsed, setCollapsed] = useState(() => new Set(groups));
  const [large, setLarge] = useState(false);
  const recordings = state.viz?.recordings ?? [];
  const recording = recordings.find(
    (r) => r.id === (viewedId || state.viz?.activeRecordingId),
  );
  const currentIndex = recording
    ? index === null
      ? recording.frames.length - 1
      : Math.min(index, recording.frames.length - 1)
    : 0;
  const frame = recording?.frames[currentIndex];
  const active = recording?.id === state.viz?.activeRecordingId;
  const live = active && index === null;
  const sources = originatingEvents(state);
  const selectedModel = recording?.definition.nodes.find(
    (n) => n.id === selected,
  );
  const selectedVisual = selectedModel && frame?.nodes[selectedModel.id];
  const groupName = selected.startsWith("group:") ? selected.slice(6) : "";
  const detailEvents = selectedVisual
    ? state.events.filter((e) => selectedVisual.eventIds.includes(e.eventId))
    : [];
  const task = state.workItems.find(
    (t) => t.id === selectedVisual?.workItemId && t.status === "Open",
  );
  function chooseRecording(id: string) {
    setViewedId(id);
    setIndex(null);
    setSelected("");
  }
  function toggle(group: string) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  }
  return (
    <section
      className={`viz-workspace${large ? " viz-presentation" : ""}`}
      aria-label="Journey Map"
    >
      {large && (
        <div className="viz-presentation-brand">
          <img
            src="./assets/unity.png"
            alt="Unity logo"
            width="267"
            height="331"
          />
          <span>
            <strong>Unity</strong> fieldwork <b>/</b> Workflow Monitor <b>/</b>{" "}
            Journey Map
          </span>
          <button onClick={() => setLarge(false)}>Exit presentation</button>
        </div>
      )}
      <div className="viz-heading">
        <div>
          <div className="eyebrow">
            THE VIZUALIZINATOR <span>VIZ</span>
          </div>
          <h2>A living picture of the work.</h2>
          <p>
            Follow one beginning. See every handoff. Know what’s holding things
            up.
          </p>
        </div>
        <span className="viz-disclosure">
          Simulation · recorded business execution
        </span>
      </div>
      <div className="viz-selectors">
        <label>
          Originating event
          <select
            aria-label="Originating event"
            value={originChoice}
            onChange={(e) => setOriginChoice(e.target.value)}
          >
            <option value="">Choose an application or skill request…</option>
            {sources.map((e) => {
              const w = originWorkflow(state, e);
              const q = state.qualifications.find(
                (q) => q.id === e.qualificationId,
              );
              return (
                <option
                  key={e.eventId}
                  value={e.eventId}
                  disabled={!w || w.definitionVersion !== 2}
                >
                  {state.companies.find((c) => c.id === e.companyId)?.name} ·{" "}
                  {e.eventType === "ApplicationSubmitted"
                    ? "Application"
                    : `${q?.skill ?? "Skill"} request`}{" "}
                  · {w?.stage ?? "Unavailable"} · {e.eventId.slice(0, 8)}
                  {w?.definitionVersion !== 2 ? " (legacy unsupported)" : ""}
                </option>
              );
            })}
          </select>
        </label>
        <button
          className="primary"
          disabled={!originChoice || busy}
          onClick={() =>
            void run(async () => {
              const id = await service.startVizRecording(originChoice);
              chooseRecording(id);
            }, "Journey tracking started at Frame 0. Earlier visual history has not been reconstructed.")
          }
        >
          Track journey <span aria-hidden>↗</span>
        </button>
        <label>
          Recording
          <select
            aria-label="Recording"
            value={recording?.id ?? ""}
            onChange={(e) => chooseRecording(e.target.value)}
          >
            <option value="" disabled>
              No recordings yet
            </option>
            {recordings.map((r, i) => (
              <option key={r.id} value={r.id}>
                {i + 1}. {r.companyName} · {r.originLabel} ·{" "}
                {r.id === state.viz?.activeRecordingId
                  ? "Recording"
                  : "Archived"}
              </option>
            ))}
          </select>
        </label>
      </div>
      {(recording?.captureError ?? state.viz?.captureError) && (
        <p className="alert" role="alert">
          {recording?.captureError ?? state.viz?.captureError}
        </p>
      )}
      {!recording || !frame ? (
        <div className="viz-empty">
          <div className="viz-empty-symbol">↗</div>
          <h3>Every journey has a beginning.</h3>
          <p>
            Choose an originating event above. Viz captures its current state as
            Frame 0, then follows only that workflow and its explicitly linked
            initial skill.
          </p>
          <div>
            <span>01 Select a beginning</span>
            <span>02 Watch the parallel work</span>
            <span>03 Rewind what was recorded</span>
          </div>
          <small>
            No automatic capture. No invented past. Business processing runs
            independently of Viz.
          </small>
        </div>
      ) : (
        <>
          <div className="viz-recording-bar">
            <div>
              <span className={`viz-live-dot${active ? " active" : ""}`} />
              <strong>{recording.companyName}</strong>
              <span>
                {recording.originLabel} · v
                {recording.definition.workflowVersion} · instance{" "}
                {recording.workflowId.slice(0, 8)}
              </span>
              <span className={`viz-mode ${live ? "live" : ""}`}>
                {live
                  ? "Recording live"
                  : active
                    ? "Historical playback · still recording"
                    : "Archived · capture stopped"}
              </span>
            </div>
            <button className="text-button" onClick={() => setLarge(!large)}>
              {large ? "Exit presentation" : "Presentation view"}
            </button>
          </div>
          <div className="viz-playback" aria-label="Visual playback">
            <button
              aria-label="Jump to first frame"
              disabled={currentIndex === 0}
              onClick={() => setIndex(0)}
            >
              │←
            </button>
            <button
              aria-label="Step backward"
              disabled={currentIndex === 0}
              onClick={() => setIndex(currentIndex - 1)}
            >
              ←
            </button>
            <button
              aria-label="Step forward"
              disabled={currentIndex === recording.frames.length - 1}
              onClick={() => setIndex(currentIndex + 1)}
            >
              →
            </button>
            <label>
              Visual history
              <input
                aria-label="Visual history"
                type="range"
                min={0}
                max={recording.frames.length - 1}
                value={currentIndex}
                onChange={(e) => setIndex(Number(e.target.value))}
              />
            </label>
            <strong data-testid="viz-frame-number">
              Frame {currentIndex} / {recording.frames.length - 1}
            </strong>
            <button
              className={live ? "viz-live-button" : "secondary"}
              onClick={() => setIndex(null)}
            >
              {active ? "Return to Live" : "Latest recorded"}
            </button>
          </div>
          <div className="viz-frame-caption">
            <span>{index === null ? "LATEST CAPTURE" : "RECORDED STATE"}</span>
            <strong data-testid="viz-frame-cause">
              {frame.causes.map((c) => c.label).join(" · ")}
            </strong>
            <small>
              Revision {frame.revision} ·{" "}
              {new Date(frame.capturedAt).toLocaleTimeString()} · Playback never
              changes live business state
            </small>
          </div>
          <div className="viz-group-controls" aria-label="Logical groups">
            <span>DETAIL LEVEL</span>
            {groups
              .filter((g) =>
                recording.definition.nodes.some((n) => n.group === g),
              )
              .map((g) => (
                <button
                  key={g}
                  aria-expanded={!collapsed.has(g)}
                  onClick={() => toggle(g)}
                >
                  {collapsed.has(g) ? "+" : "−"} {g}
                </button>
              ))}
            <button onClick={() => setCollapsed(new Set())}>Expand all</button>
            <button onClick={() => setCollapsed(new Set(groups))}>
              Group overview
            </button>
          </div>
          <div className={`viz-map-and-detail${selected ? " has-detail" : ""}`}>
            <ReactFlowProvider>
              <Canvas
                recording={recording}
                frame={frame}
                collapsed={collapsed}
                selected={selected}
                onSelect={setSelected}
              />
            </ReactFlowProvider>
            {selected && (
              <section
                className="viz-detail"
                aria-label="Selected journey step"
              >
                <button
                  className="text-button viz-close"
                  aria-label="Close node details"
                  onClick={() => setSelected("")}
                >
                  ×
                </button>
                {groupName ? (
                  <>
                    <span className="eyebrow">LOGICAL GROUP</span>
                    <h3>{groupName}</h3>
                    <p>
                      Expand this group to inspect its recorded activities,
                      conditional routes and dependencies.
                    </p>
                    <button
                      className="secondary"
                      onClick={() => {
                        toggle(groupName);
                        setSelected("");
                      }}
                    >
                      Expand group
                    </button>
                    {recording.definition.nodes
                      .filter((n) => n.group === groupName)
                      .map((n) => (
                        <button
                          className="viz-detail-step"
                          key={n.id}
                          onClick={() => {
                            setSelected(n.id);
                            setCollapsed(
                              (previous) =>
                                new Set(
                                  [...previous].filter((g) => g !== groupName),
                                ),
                            );
                          }}
                        >
                          <span
                            style={{ color: colors[frame.nodes[n.id].status] }}
                          >
                            {icons[frame.nodes[n.id].status]}
                          </span>
                          {n.label}
                          <small>{visualLabel(frame.nodes[n.id])}</small>
                        </button>
                      ))}
                  </>
                ) : selectedModel && selectedVisual ? (
                  <>
                    <span className="eyebrow">
                      {selectedModel.kind} ·{" "}
                      {live ? "LIVE" : `FRAME ${currentIndex}`}
                    </span>
                    <h3>{selectedModel.label}</h3>
                    <span
                      className={`viz-detail-status ${selectedVisual.status}`}
                    >
                      {icons[selectedVisual.status]}{" "}
                      {visualLabel(selectedVisual)}
                    </span>
                    <dl>
                      <dt>Responsible participant</dt>
                      <dd>{selectedModel.owner}</dd>
                      <dt>
                        {selectedVisual.satisfied !== undefined
                          ? `${selectedVisual.satisfied} satisfied · ${selectedVisual.total! - selectedVisual.satisfied} outstanding`
                          : "What’s happening"}
                      </dt>
                      <dd>{selectedVisual.explanation}</dd>
                    </dl>
                    {selectedVisual.outstanding?.length ? (
                      <ul>
                        {selectedVisual.outstanding.map((text) => (
                          <li key={text}>{text}</li>
                        ))}
                      </ul>
                    ) : null}
                    {live && task && (
                      <a
                        className="viz-next-action"
                        href={
                          task.owner === "Simulation" ||
                          state.attempts
                            .filter((a) => a.workItemId === task.id)
                            .at(-1)?.status === "Failed"
                            ? automationLink(task.companyId, task.id)
                            : task.owner === "Contractor"
                              ? "#/contractor"
                              : "#/operations"
                        }
                      >
                        {task.owner === "Simulation" ||
                        state.attempts
                          .filter((a) => a.workItemId === task.id)
                          .at(-1)?.status === "Failed"
                          ? "Open automation action"
                          : task.owner === "Contractor"
                            ? "Open Contractor Portal"
                            : "Open Operations workspace"}{" "}
                        ↗
                      </a>
                    )}
                    {!live && (
                      <p className="muted">
                        Historical inspection only. Return to Live for available
                        next actions.
                      </p>
                    )}
                    <details>
                      <summary>Events & execution references</summary>
                      <p>
                        {recording.definition.workflowName} v
                        {recording.definition.workflowVersion} · adapter{" "}
                        {recording.definition.adapterVersion}
                      </p>
                      <p>
                        Work:{" "}
                        {selectedVisual.workItemId ?? "Dependency or decision"}
                      </p>
                      {detailEvents.length ? (
                        detailEvents.map((e) => (
                          <div key={e.eventId}>
                            <strong>{e.eventType}</strong>
                            <small>
                              {e.actor} · {e.eventId}
                            </small>
                          </div>
                        ))
                      ) : (
                        <p>
                          No direct event reference on this dependency. Its
                          recorded state comes from authoritative execution
                          facts.
                        </p>
                      )}
                    </details>
                  </>
                ) : null}
              </section>
            )}
          </div>
          <div className="viz-legend">
            <span>
              <i style={{ background: colors.complete }} />
              Completed / progressed ✓
            </span>
            <span>
              <i style={{ background: colors.waiting }} />
              Waiting ◷
            </span>
            <span>
              <i style={{ background: colors.error }} />
              Needs attention !
            </span>
            <span>
              <i style={{ background: colors.neutral }} />
              Not reached ○
            </span>
            <small>
              {recording.definition.nodes.length} definition steps ·{" "}
              {recording.frames.length} immutable states · only the active
              selection records
            </small>
          </div>
          <details className="viz-recording-reference">
            <summary>Recording scope & causation</summary>
            <p>
              Origin: {recording.originEventId} · Workflow:{" "}
              {recording.workflowId}
            </p>
            <p>
              Included workflow instances: {recording.workflowIds.join(", ")}.
              Independent skill requests for the same company are separate
              journeys. Shared readiness prerequisites are dependency facts, not
              additional journeys. Frames represent atomic committed visual
              changes; one frame can identify multiple contributing events and
              attempts.
            </p>
            {frame.causes.map((c) => (
              <p key={c.id}>
                {c.label} · {c.id}
                {c.causedByEventId
                  ? ` · explicitly caused by ${c.causedByEventId}`
                  : ""}
              </p>
            ))}
          </details>
        </>
      )}
    </section>
  );
}
