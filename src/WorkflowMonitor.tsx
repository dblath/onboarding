import { useState } from "react";
import { DiagnosticPanel } from "./DiagnosticPanel";
import {
  companyLifecycleCorrelation,
  type State,
  type WorkflowInstance,
} from "./domain";
import type { OnboardingService } from "./application";
import { activityLabel } from "./presentation";
import type { Run } from "./TaskCard";
export function WorkflowMonitor({
  state: s,
  companyId,
  service,
  run,
  busy,
}: {
  state: State;
  companyId: string;
  service: OnboardingService;
  run: Run;
  busy: boolean;
}) {
  const [selected, setSelected] = useState(""),
    [filter, setFilter] = useState("All");
  const workflows = s.workflows.filter((w) => w.companyId === companyId),
    w = workflows.find((w) => w.id === selected) ?? workflows[0];
  if (!w) return <p className="muted">No workflow instances yet.</p>;
  const tasks = s.workItems.filter((t) => t.workflowId === w.id),
    events = s.events.filter((e) => e.correlationId === w.correlationId),
    attempts = s.attempts.filter((a) => a.workflowId === w.id),
    last = events.at(-1);
  const lifecycleEvents = s.events.filter(
    (e) =>
      e.companyId === companyId &&
      e.correlationId === companyLifecycleCorrelation(companyId),
  );
  const name = (w: WorkflowInstance) =>
    w.definitionId === "CompanyOnboarding"
      ? "Company onboarding"
      : `${s.qualifications.find((q) => q.id === w.qualificationId)?.skill} qualification`;
  return (
    <section className="monitor">
      <div className="section-heading">
        <div>
          <div className="eyebrow">ORCHESTRATION OBSERVATORY</div>
          <h2>Watch the work move.</h2>
        </div>
        <span className="pill">Browser-local simulation</span>
      </div>
      <label className="workflow-picker">
        Workflow instance
        <select value={w.id} onChange={(e) => setSelected(e.target.value)}>
          {workflows.map((x) => (
            <option key={x.id} value={x.id}>
              {name(x)} · {x.status} · {x.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </label>
      <div className="monitor-metrics">
        <div>
          <span>Definition</span>
          <strong>
            {w.definitionId} v{w.definitionVersion}
          </strong>
        </div>
        <div>
          <span>Execution state</span>
          <strong>
            {w.status} · {w.stage}
          </strong>
        </div>
        <div>
          <span>Delivery / work</span>
          <strong>
            {events.length} events ·{" "}
            {tasks.filter((t) => t.status === "Open").length} open tasks
          </strong>
        </div>
      </div>
      <div className="event-path">
        <div>
          <small>01 · PARTICIPANT</small>
          <strong>{last?.actor ?? "Waiting"}</strong>
        </div>
        <span>→</span>
        <div>
          <small>02 · BUSINESS EVENT</small>
          <strong>{last?.eventType ?? "No event yet"}</strong>
        </div>
        <span>→</span>
        <div>
          <small>03 · NEXT ACTION</small>
          <strong>
            {tasks
              .filter((t) => t.status === "Open")
              .map((t) => t.owner)
              .filter((v, i, a) => a.indexOf(v) === i)
              .join(" + ") || "No human work outstanding"}
          </strong>
        </div>
      </div>
      <div className="section-heading history-heading">
        <h3>Execution history</h3>
        <label className="sr-only" htmlFor="history-filter">
          History type
        </label>
        <select
          id="history-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {[
            "All",
            "Event",
            "Activity",
            "Rule",
            "Wait",
            "Lifecycle",
            "Timer",
            "Migration",
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <ol className="timeline">
        {w.history
          .filter((h) => filter === "All" || h.kind === filter)
          .map((h, i) => (
            <li key={i}>
              <span className={"history-kind " + h.kind}>{h.kind}</span>
              <span>{h.message}</span>
              <small>
                {new Date(h.at).toLocaleString()}{" "}
                {h.eventId && `· Event ${h.eventId.slice(0, 8)}`}
              </small>
            </li>
          ))}
      </ol>
      <h3>Business event envelopes</h3>
      {events.map((e) => (
        <details key={e.eventId}>
          <summary>
            {e.eventType}{" "}
            <small>
              {e.eventId.slice(0, 8)} · v{e.eventVersion}
            </small>
          </summary>
          <pre>{JSON.stringify(e, null, 2)}</pre>
        </details>
      ))}
      <section
        className="company-signals"
        data-testid="company-lifecycle-signals"
      >
        <h3>Company lifecycle signals · outside workflow execution</h3>
        <p className="muted">
          Post-onboarding readiness and suspension are company facts. These
          signals are not delivered to a completed CompanyOnboarding execution;
          its history and work remain closed.
        </p>
        {!lifecycleEvents.length && (
          <p className="muted">No post-onboarding company signals yet.</p>
        )}
        {lifecycleEvents.map((event) => (
          <details key={event.eventId}>
            <summary>
              {event.eventType} ·{" "}
              {event.eventType === "ContractorReadinessChanged"
                ? event.payload.ready
                  ? "Ready"
                  : "Not ready"
                : "Suspended"}
            </summary>
            <pre>{JSON.stringify(event, null, 2)}</pre>
          </details>
        ))}
      </section>

      <div className="diagnostic-panels">
        <DiagnosticPanel title="Expected events & owners">
          {w.awaitedEvents.length ? (
            w.awaitedEvents.map((wait, i) => {
              const t = tasks.find((t) => t.id === wait.workItemId);
              return (
                <div className="wait-row" key={i}>
                  <span className="live-dot" />
                  <div>
                    <strong>{wait.eventType}</strong>
                    <small>
                      {t
                        ? `${activityLabel(t.activity)} → ${t.owner}`
                        : "Readiness policy waits for company and skill facts"}
                    </small>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="muted">
              No pending waits. This execution has completed.
            </p>
          )}
        </DiagnosticPanel>
        <DiagnosticPanel title="Correlation">
          <dl className="correlation">
            <dt>Instance</dt>
            <dd>{w.id}</dd>
            <dt>Company</dt>
            <dd>{w.companyId}</dd>
            <dt>Application</dt>
            <dd>{w.applicationId ?? "None — company-owned skill"}</dd>
            <dt>Qualification</dt>
            <dd>{w.qualificationId ?? "Company scope"}</dd>
            <dt>Correlation</dt>
            <dd>{w.correlationId}</dd>
          </dl>
        </DiagnosticPanel>
        <DiagnosticPanel title="Activity attempts">
          {attempts.length ? (
            attempts.map((a) => (
              <div className={"attempt " + a.status} key={a.id}>
                <strong>{activityLabel(a.activity)}</strong>
                <span className="pill neutral">
                  Attempt {a.attempt} · {a.status}
                </span>
                <p>{a.technicalError ?? a.businessOutcome}</p>
              </div>
            ))
          ) : (
            <p className="muted">
              Simulated integration attempts appear here. Human work completion
              is recorded separately below.
            </p>
          )}
        </DiagnosticPanel>
        <DiagnosticPanel title="Completed & pending work">
          <div className="work-list">
            {tasks.map((t) => (
              <div key={t.id}>
                <span className={"work-symbol " + t.status}>
                  {t.status === "Completed" ? "✓" : "○"}
                </span>
                <div>
                  <strong>{activityLabel(t.activity)}</strong>
                  <small>
                    {t.owner} · {t.outcome ?? t.expectedOutcome}
                  </small>
                </div>
                <span className="pill neutral">{t.status}</span>
              </div>
            ))}
          </div>
        </DiagnosticPanel>
      </div>
      {last && (
        <DiagnosticPanel title="Event ingress demonstrations">
          <p className="muted">
            Redelivery should be ignored. An unrelated correlation must leave
            this instance unchanged.
          </p>
          <div className="button-row">
            <button
              disabled={busy}
              className="secondary"
              onClick={() =>
                run(async () => {
                  const accepted = await service.deliverEvent(last);
                  if (accepted)
                    throw new Error("Unexpected duplicate acceptance.");
                }, "Duplicate event ignored. No work or history was duplicated.")
              }
            >
              Redeliver last event
            </button>
            <button
              disabled={busy}
              className="secondary"
              onClick={() =>
                run(async () => {
                  const accepted = await service.deliverEvent({
                    ...last,
                    eventId: crypto.randomUUID(),
                    correlationId: "unrelated-demo-correlation",
                  });
                  if (accepted)
                    throw new Error("Unexpected correlation acceptance.");
                }, "Unrelated correlation rejected. The workflow did not advance.")
              }
            >
              Deliver unrelated correlation
            </button>
          </div>
        </DiagnosticPanel>
      )}
    </section>
  );
}
