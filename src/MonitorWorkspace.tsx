import { useEffect, useState } from "react";
import type { State } from "./domain";
import type { OnboardingService } from "./application";
import type { Run } from "./TaskCard";
import {
  monitorCompanies,
  monitorSummary,
  businessEventLabel,
  workDescription,
} from "./monitorModel";
import {
  businessMessage,
  businessActivityLabel,
  automationLink,
  journeyMapLink,
} from "./presentation";
import { contractorOwner } from "./contractorJourney";
import { recordingStatus } from "./viz/triggers";
import { WorkflowMonitor } from "./WorkflowMonitor";
import { DiagnosticPanel } from "./DiagnosticPanel";
import { LifecycleStatus } from "./LifecycleStatus";

const date = (s: string) =>
  new Date(s).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export function MonitorWorkspace({
  state,
  companyId,
  workflowId,
  inspection,
  messagesOnly = false,
  onCompany,
  onWorkflow,
  service,
  run,
  busy,
}: {
  state: State;
  companyId: string;
  workflowId: string;
  inspection: boolean;
  messagesOnly?: boolean;
  onCompany: (id: string) => void;
  onWorkflow: (id: string) => void;
  service: OnboardingService;
  run: Run;
  busy: boolean;
}) {
  const [scope, setScope] = useState<"active" | "all">(
    inspection ? "all" : "active",
  );
  const [filter, setFilter] = useState("all");
  const [listOpen, setListOpen] = useState(false);
  useEffect(() => {
    if (inspection) setScope("all");
  }, [inspection]);
  const companies = monitorCompanies(state),
    summary = monitorSummary(state);
  const visible = companies.filter(
    (c) =>
      (scope === "all" || c.active) && (filter !== "attention" || c.attention),
  );
  const model = visible.find((c) => c.company.id === companyId);
  const workflowName = (id: string) => {
    const w = state.workflows.find((w) => w.id === id);
    const q = state.qualifications.find((q) => q.id === w?.qualificationId);
    return w?.definitionId === "CompanyOnboarding"
      ? "Company onboarding"
      : `${q?.skill ?? "Skill"} ${q?.originatingApplicationId ? "initial qualification" : "independent qualification"}`;
  };
  const selectedWorkflow =
    model?.workflows.find((w) => w.id === workflowId) ?? model?.root;
  const currentWork =
    model?.work.filter((t) =>
      selectedWorkflow?.definitionId === "CompanyOnboarding"
        ? t.workflowId === selectedWorkflow.id ||
          state.qualifications.some(
            (q) =>
              q.id === t.qualificationId &&
              q.originatingApplicationId === model.application.id,
          )
        : t.workflowId === selectedWorkflow?.id,
    ) ?? [];
  const chronology = state.events.filter(
    (e) => e.companyId === model?.company.id,
  );
  const entries = (limit?: number, skip = 0) =>
    [...chronology]
      .reverse()
      .slice(skip, limit === undefined ? undefined : skip + limit)
      .map((e) => (
        <li key={e.eventId}>
          <span className="mon-history-mark" aria-hidden>
            ✓
          </span>
          <div>
            <strong>{businessEventLabel(e, state)}</strong>
            <small>{date(e.occurredAt)}</small>
          </div>
        </li>
      ));
  const automation = (task?: State["workItems"][number]) =>
    automationLink(
      model?.company.id,
      task?.id ?? "",
      task?.workflowId ?? selectedWorkflow?.id,
    );
  return (
    <div className="monitor-workspace">
      {!messagesOnly && (
        <section className="mon-summary" aria-label="Onboarding overview">
          {[
            ["In progress", summary.inProgress, "inProgress"],
            ["Need attention", summary.attention, "attention"],
            ["Retry available", summary.retries, "retries"],
            ["Ready for activation", summary.activation, "activation"],
            ["Onboarding complete", summary.completed, "completed"],
            ["Recording now", summary.recording, "recording"],
          ].map(([label, n, key]) => (
            <div
              key={key}
              className={key === "attention" && Number(n) ? "attention" : ""}
            >
              <strong data-testid={`monitor-${key}`}>{n}</strong>
              <span>{label}</span>
            </div>
          ))}
        </section>
      )}
      <div className="mon-working-grid">
        <section className="mon-company-list" aria-label="Onboarding journeys">
          <div className="mon-list-heading">
            <h2>Company journeys</h2>
            <span>{visible.length}</span>
          </div>
          <div className="mon-scope" role="group" aria-label="Journey scope">
            <button
              aria-pressed={scope === "active"}
              onClick={() => setScope("active")}
            >
              Active & attention
            </button>
            <button
              aria-pressed={scope === "all"}
              onClick={() => setScope("all")}
            >
              All companies
            </button>
          </div>
          <label className="mon-attention-filter">
            Show
            <select
              aria-label="Journey attention filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All in this view</option>
              <option value="attention">Needs attention</option>
            </select>
          </label>
          <button
            className="secondary mon-list-toggle"
            aria-expanded={listOpen}
            aria-controls="monitor-companies"
            onClick={() => setListOpen(!listOpen)}
          >
            Choose a company · {visible.length} <span aria-hidden>⌄</span>
          </button>
          <div
            id="monitor-companies"
            className={"mon-companies" + (listOpen ? " is-open" : "")}
          >
            {visible.map((c) => (
              <button
                key={c.company.id}
                className={`mon-company-row application-row ${model?.company.id === c.company.id ? "selected" : ""}`}
                aria-current={
                  model?.company.id === c.company.id ? "true" : undefined
                }
                onClick={() => {
                  onCompany(c.company.id);
                  setListOpen(false);
                }}
              >
                <strong>{c.company.name}</strong>
                <span>{c.status}</span>
                <small>
                  {c.work.length} open action{c.work.length === 1 ? "" : "s"}
                  {c.captureIssues.length ? " · Recording needs review" : ""}
                </small>
              </button>
            ))}
          </div>
          {!visible.length && (
            <p className="mon-list-empty">
              No journeys in this view. Inspect All companies for completed and
              historical onboarding.
            </p>
          )}
          <p className="mon-list-note">
            Normal waiting is part of onboarding. Attention flags identify
            corrections, retries, publication, qualification gaps, suspension or
            recording issues.
          </p>
        </section>
        <section className="mon-selected" aria-label="Selected onboarding">
          {model ? (
            <>
              <div className="mon-company-heading">
                <div>
                  <h2>{model.company.name}</h2>
                  <p>
                    {model.company.contact} · {model.company.email}
                  </p>
                </div>
                <span
                  className={`mon-status ${model.eligible ? "complete" : model.attention ? "attention" : "waiting"}`}
                >
                  {model.status}
                </span>
              </div>
              <div className="mon-context">
                <label>
                  Journey
                  <select
                    aria-label="Onboarding journey"
                    value={selectedWorkflow?.id ?? ""}
                    onChange={(e) => onWorkflow(e.target.value)}
                  >
                    {model.workflows.map((w) => (
                      <option key={w.id} value={w.id}>
                        {workflowName(w.id)} ·{" "}
                        {w.status === "Running"
                          ? "In progress"
                          : w.stage === "Declined"
                            ? "Declined"
                            : "Complete"}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mon-context-links">
                  <a href={automation()}>Automations & Integrations ↗</a>
                  <a
                    href={journeyMapLink(
                      model.company.id,
                      selectedWorkflow?.id,
                    )}
                  >
                    Journey Map / Viz ↗
                  </a>
                </div>
              </div>
              {messagesOnly ? (
                <section className="mon-section">
                  <h3>Company messages</h3>
                  <p>Demo in-app notifications. No email or SMS is sent.</p>
                  {[...state.outbox]
                    .filter((m) => m.companyId === model.company.id)
                    .reverse()
                    .map((m) => (
                      <div className="mon-message" key={m.id}>
                        <strong>
                          {m.kind} · {contractorOwner(m.recipient)}
                        </strong>
                        <p>{businessMessage(m.message)}</p>
                        <small>{date(m.at)}</small>
                      </div>
                    ))}
                </section>
              ) : (
                <>
                  <section
                    className="mon-section mon-attention"
                    aria-label="Needs attention"
                  >
                    <div className="mon-section-heading">
                      <h3>Needs attention</h3>
                      <span>
                        {model.attention
                          ? "Review next steps"
                          : "Normal progress"}
                      </span>
                    </div>
                    {model.failures.map((t) => (
                      <div className="mon-issue failure" key={t.id}>
                        <strong>
                          Verification did not respond · retry available
                        </strong>
                        <p>
                          {businessActivityLabel(t.activity)} ·{" "}
                          {contractorOwner(t.owner)}. The work is still open; no
                          successful result was recorded.
                        </p>
                        <a href={automation(t)}>
                          Review and retry in Automations ↗
                        </a>
                      </div>
                    ))}
                    {model.corrections.map((r) => (
                      <div className="mon-issue correction" key={r.id}>
                        <strong>
                          {r.type === "Financial"
                            ? "Financial documents"
                            : r.type}{" "}
                          correction · Contractor
                        </strong>
                        <p>
                          {businessMessage(
                            r.outcome ?? "A replacement is required.",
                          )}
                        </p>
                      </div>
                    ))}
                    {model.skillCorrections.map((q) => (
                      <div className="mon-issue correction" key={q.id}>
                        <strong>
                          {q.skill} evidence correction · Contractor
                        </strong>
                        <p>
                          {businessMessage(
                            q.reason ??
                              "Replacement skill evidence is required.",
                          )}
                        </p>
                      </div>
                    ))}
                    {model.publication && (
                      <div className="mon-issue publication">
                        <strong>Ready for activation · Operations</strong>
                        <p>
                          All requirements are complete. Contractor activation
                          is awaiting publication. The company is not yet
                          eligible for jobs.
                        </p>
                        <a href={automation(model.publication)}>
                          Open activation publication ↗
                        </a>
                      </div>
                    )}
                    {model.company.activationStatus === "Suspended" && (
                      <div className="mon-issue failure">
                        <strong>Company suspended</strong>
                        <p>
                          Eligibility remains suspended even if qualifications
                          recover. Removing suspension requires a separate
                          administrative request and approval; that capability
                          is not available yet.
                        </p>
                      </div>
                    )}
                    {model.qualificationGap && (
                      <div className="mon-issue correction">
                        <strong>Qualifications need Operations review</strong>
                        <p>
                          Current qualification requirements are not met.
                          Operations needs to review the available recovery
                          path.
                        </p>
                      </div>
                    )}
                    {model.captureIssues.length > 0 && (
                      <div className="mon-issue correction">
                        <strong>Recording needs review</strong>
                        <p>
                          {model.captureIssues.length} journey recording(s) have
                          a capture issue. Business work and healthy recordings
                          remain independent.
                        </p>
                      </div>
                    )}
                    {!model.attention && (
                      <p className="mon-normal">
                        No intervention is required.{" "}
                        {currentWork.length
                          ? `Work is with ${[...new Set(currentWork.map((t) => contractorOwner(t.owner)))].join(", ")}.`
                          : "There are no open actions for this journey."}
                      </p>
                    )}
                  </section>
                  <section
                    className="mon-section"
                    aria-label="Current work and waits"
                  >
                    <div className="mon-section-heading">
                      <h3>What's happening</h3>
                      <span>{currentWork.length} open actions</span>
                    </div>
                    <p className="mon-helper">
                      {selectedWorkflow?.definitionId === "CompanyOnboarding"
                        ? "Company onboarding includes the initial qualification. Documents and skill checks progress in parallel."
                        : "This qualification is separate from company onboarding."}
                    </p>
                    <ul className="mon-work">
                      {currentWork.map((t) => (
                        <li key={t.id}>
                          <span aria-hidden>
                            {model.failures.some((f) => f.id === t.id)
                              ? "!"
                              : "○"}
                          </span>
                          <div>
                            <strong>{businessActivityLabel(t.activity)}</strong>
                            <small>
                              {contractorOwner(t.owner)} ·{" "}
                              {model.failures.some((f) => f.id === t.id)
                                ? "Retry needed"
                                : "Waiting for action"}
                            </small>
                          </div>
                          {t.owner === "Simulation" ||
                          model.failures.some((f) => f.id === t.id) ? (
                            <a href={automation(t)}>Open automation ↗</a>
                          ) : (
                            <span className="mon-work-context">
                              {t.owner === "Contractor"
                                ? "Contractor Portal"
                                : "Operations"}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {!currentWork.length && (
                      <p>
                        No open work in this journey.{" "}
                        {model.historical
                          ? "Completed onboarding stays complete."
                          : "Review the prerequisites and current qualification facts below."}
                      </p>
                    )}
                    <div className="mon-progress">
                      {model.model.stages.map((stage) => (
                        <details key={stage.key}>
                          <summary>
                            <span
                              aria-hidden
                              className={
                                stage.status === "Complete" ? "complete" : ""
                              }
                            >
                              {stage.status === "Complete" ? "✓" : "○"}
                            </span>
                            <strong>{stage.title}</strong>
                            <small>
                              {stage.status === "Waiting on you"
                                ? "With Contractor"
                                : stage.status}
                            </small>
                          </summary>
                          <p>{stage.detail}</p>
                          {stage.work.map((t) => (
                            <p key={t.id}>{workDescription(t)}</p>
                          ))}
                        </details>
                      ))}
                    </div>
                    {!!model.independent.length && (
                      <div className="mon-independent">
                        <h4>Independent company qualifications</h4>
                        {model.independent.map((q) => (
                          <div className="mon-independent-row" key={q.id}>
                            <p>
                              <strong>{q.skill}</strong> · {q.status}. Original
                              onboarding{" "}
                              {model.historical
                                ? "remains complete"
                                : "continues separately"}
                              .
                              {model.work.filter(
                                (t) => t.qualificationId === q.id,
                              ).length > 0 && (
                                <>
                                  {" "}
                                  With{" "}
                                  {[
                                    ...new Set(
                                      model.work
                                        .filter(
                                          (t) => t.qualificationId === q.id,
                                        )
                                        .map((t) => contractorOwner(t.owner)),
                                    ),
                                  ].join(", ")}
                                  .
                                </>
                              )}
                            </p>
                            <button
                              className="text-button"
                              onClick={() => {
                                const w = model.workflows.find(
                                  (w) => w.qualificationId === q.id,
                                );
                                if (w) onWorkflow(w.id);
                              }}
                            >
                              View qualification
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                  <section
                    className="mon-section"
                    aria-label="Business chronology"
                  >
                    <div className="mon-section-heading">
                      <h3>What happened</h3>
                      <span>Business changes</span>
                    </div>
                    <p className="mon-helper">
                      Newest first, in recorded business-event order. Failures
                      and retry ownership are shown above.
                    </p>
                    <ol className="mon-chronology">{entries(6)}</ol>
                    {chronology.length > 6 && (
                      <details className="mon-more">
                        <summary>
                          Earlier business changes ({chronology.length - 6})
                        </summary>
                        <ol className="mon-chronology">
                          {entries(undefined, 6)}
                        </ol>
                      </details>
                    )}
                  </section>
                  <section
                    className="mon-section mon-recordings"
                    aria-label="Company recordings"
                  >
                    <div className="mon-section-heading">
                      <h3>Recorded journeys</h3>
                      <span>{model.recordings.length} recordings</span>
                    </div>
                    <p className="mon-helper">
                      Choose the capture point you want to replay. Mid-workflow
                      recordings begin at their actual capture, not the original
                      application.
                    </p>
                    {!model.recordings.length && (
                      <p>
                        No recorded journey for this company.{" "}
                        <a
                          href={journeyMapLink(
                            model.company.id,
                            selectedWorkflow?.id,
                          )}
                        >
                          Open Viz to choose a capture point ↗
                        </a>
                      </p>
                    )}
                    {model.recordings.map((r) => (
                      <a
                        className="mon-recording"
                        key={r.id}
                        href={journeyMapLink(
                          model.company.id,
                          r.workflowId,
                          r.id,
                        )}
                      >
                        <span>
                          <strong>{r.originLabel}</strong>
                          <small>
                            {workflowName(r.workflowId)} ·{" "}
                            {recordingStatus(state, r)}
                          </small>
                        </span>
                        <span>
                          Frame {r.frames.at(-1)?.number ?? 0} ·{" "}
                          {r.frames.length} frames ↗
                        </span>
                      </a>
                    ))}
                  </section>
                </>
              )}
              <details
                className="mon-technical"
                key={`${model.company.id}:${selectedWorkflow?.id}`}
                open={inspection || undefined}
              >
                <summary>
                  Technical execution inspection{" "}
                  <span>
                    Definitions, raw history, events, correlation and test tools
                  </span>
                </summary>
                <div className="mon-technical-body">
                  <LifecycleStatus
                    state={state}
                    company={model.company}
                    application={model.application}
                  />
                  <WorkflowMonitor
                    state={state}
                    companyId={model.company.id}
                    workflowId={selectedWorkflow?.id}
                    onWorkflowChange={onWorkflow}
                    service={service}
                    run={run}
                    busy={busy}
                  />
                  <DiagnosticPanel title="Timer & escalation lab">
                    <p>Current test time: {date(state.clock)}</p>
                    <p>
                      Human work is due after 2 test days; escalation follows 2
                      days later. Advancing time does not complete work.
                    </p>
                    <div className="button-row">
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => service.advanceTime(3),
                            "Test clock advanced 3 days. Due reminders recorded in the outbox.",
                          )
                        }
                      >
                        Advance 3 days
                      </button>
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => service.advanceTime(2),
                            "Test clock advanced 2 days. Eligible escalations recorded in the outbox.",
                          )
                        }
                      >
                        Advance 2 days
                      </button>
                    </div>
                  </DiagnosticPanel>
                </div>
              </details>
            </>
          ) : (
            <div className="mon-empty">
              <h2>Select an onboarding journey</h2>
              <p>
                Choose an active company to understand its progress, or inspect
                All companies for completed and historical work. A previous
                company is never silently replaced.
              </p>
              <button
                className="secondary"
                onClick={() => {
                  setScope("all");
                  setFilter("all");
                }}
              >
                Inspect all companies
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
