import { useEffect, useState } from "react";
import type { State } from "../domain";
import { recordingStatus } from "./triggers";

export function RecordingBrowser({
  state,
  selected,
  onSelect,
  companyId = "",
}: {
  state: State;
  selected?: string;
  onSelect: (id: string) => void;
  companyId?: string;
}) {
  const [status, setStatus] = useState("all");
  const [company, setCompany] = useState(companyId);
  useEffect(() => setCompany(companyId), [companyId]);
  const [trigger, setTrigger] = useState("");
  const recordings = state.viz?.recordings ?? [];
  const triggers = new Map(
    recordings.flatMap((r) =>
      (r.triggerMatches ?? []).map((t) => [t.id, t.name] as const),
    ),
  );
  const filtered = recordings.filter(
    (r) =>
      (!company || r.companyId === company) &&
      (!trigger ||
        (trigger === "manual"
          ? !r.triggerMatches?.length
          : r.triggerMatches?.some((t) => t.id === trigger))) &&
      (status === "all" ||
        (status === "current"
          ? ["Recording", "Capture issue"].includes(
              recordingStatus(state, r),
            ) && r.stoppedAtRevision === undefined
          : ["Completed", "Stopped"].includes(recordingStatus(state, r)) ||
            r.stoppedAtRevision !== undefined)),
  );
  return (
    <details className="recording-browser" open>
      <summary>
        Recording browser ·{" "}
        {
          recordings.filter((r) => recordingStatus(state, r) === "Recording")
            .length
        }{" "}
        recording · {recordings.length} journeys
      </summary>
      <div className="recording-filters">
        <label>
          Show recordings
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All journeys</option>
            <option value="current">Current recordings</option>
            <option value="history">Completed / history</option>
          </select>
        </label>
        <label>
          Recording company
          <select value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="">All companies</option>
            {state.companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Recording trigger
          <select value={trigger} onChange={(e) => setTrigger(e.target.value)}>
            <option value="">All triggers</option>
            <option value="manual">Manual</option>
            {[...triggers].map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="recording-table">
        <table>
          <thead>
            <tr>
              <th>Company / capture point</th>
              <th>Trigger</th>
              <th>Workflow</th>
              <th>State</th>
              <th>Frames</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} aria-selected={r.id === selected}>
                <td>
                  <button
                    className="text-button"
                    aria-label={`View ${r.companyName} ${r.originLabel} ${r.id.slice(0, 8)}`}
                    onClick={() => onSelect(r.id)}
                  >
                    {r.companyName}
                  </button>
                  <small>{r.originLabel}</small>
                </td>
                <td>
                  {r.triggerMatches?.map((t) => t.name).join(", ") || "Manual"}
                </td>
                <td>
                  {r.definition.workflowName} v{r.definition.workflowVersion}
                  <small>
                    map {r.definition.adapterVersion} ·{" "}
                    {r.workflowId.slice(0, 8)}
                  </small>
                </td>
                <td>{recordingStatus(state, r)}</td>
                <td>{r.frames.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p>No journeys match these filters.</p>}
      </div>
    </details>
  );
}
