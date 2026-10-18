import { useState, type ReactNode } from "react";
import type { OnboardingService } from "./application";
import {
  type State,
  type Role,
  type ContractorCompany,
  type Activity,
} from "./domain";
import { type InternalPersona } from "./experiences";
import {
  contractorJourney,
  contractorOwner,
  contractorAction,
} from "./contractorJourney";
import { TaskCard, type Run } from "./TaskCard";
import {
  OperationsWorkQueue,
  type QueueParticipant,
  openWork,
} from "./OperationsWorkQueue";
import { LifecycleStatus } from "./LifecycleStatus";
import { EligibilityGuidance } from "./EligibilityGuidance";
import {
  businessActivityLabel,
  automationLink,
  businessMessage,
  businessText,
  workflowMonitorLink,
} from "./presentation";

const date = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
export function operationsAttention(state: State, role: Role) {
  return state.companies.map((company) => {
    const work = state.workItems
      .filter(
        (t) =>
          t.companyId === company.id && t.owner === role && t.status === "Open",
      )
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    return { company, work, count: work.length, first: work[0] };
  });
}
function Records({
  title,
  meta,
  children,
  open = false,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="ops-disclosure" open={open || undefined}>
      <summary>
        <span>
          <strong>{title}</strong>
          {meta && <small>{meta}</small>}
        </span>
        <span className="ops-chevron" aria-hidden>
          ›
        </span>
      </summary>
      <div className="ops-disclosure-body">{children}</div>
    </details>
  );
}
function CompanyRecord({
  state,
  company: c,
  role,
  service,
  run,
  busy,
  showFacts,
  showMessages,
  onParticipant,
}: {
  state: State;
  company: ContractorCompany;
  role: InternalPersona;
  service: OnboardingService;
  run: Run;
  busy: boolean;
  showFacts: boolean;
  showMessages: boolean;
  onParticipant: (role: QueueParticipant) => void;
}) {
  const a = state.applications.find((a) => a.companyId === c.id)!;
  const model = contractorJourney(state, c, a);
  const activities: Record<string, Activity[]> = {
    application: ["ScreenApplication", "ProvideInformation"],
    administration: [
      "SubmitInsurance",
      "SubmitFinancial",
      "SubmitAgreement",
      "ReviewInsurance",
      "ReviewFinancial",
      "ExecuteAgreement",
    ],
    skills: ["SubmitLicense", "VerifyLicense", "ApproveSkill"],
    setup: ["CreateVendor", "SetupPortal"],
    training: ["CompleteTraining", "ConfirmTraining"],
    activation: ["PublishActivation"],
  };
  const evidence = (ids: string[]) =>
    state.evidence
      .filter((e) => ids.includes(e.id))
      .map((e) => (
        <div className="ops-evidence" key={e.id}>
          <strong>{businessText(e.description)}</strong>
          <span>
            Version {e.version} · {e.verificationState} · {date(e.submittedAt)}
          </span>
          <p>{businessText(e.fixture)}</p>
        </div>
      ));
  return (
    <div className="ops-company-record" key={c.id}>
      <div className="ops-section-heading">
        <div>
          <h3>Onboarding at a glance</h3>
          <p>
            {model.historical
              ? "Completed onboarding is historical. Current qualifications and operational status remain separate."
              : "Documents and skill qualification run in parallel. Setup, training and activation follow their prerequisites."}
          </p>
        </div>
        <a href={workflowMonitorLink(c.id)} target="_blank" rel="noopener">
          Inspect in Workflow Monitor ↗
        </a>
      </div>
      <div className="ops-progress-grid">
        {model.stages.map((stage) => {
          const owned = stage.work.some((t) => t.owner === role),
            owners = [
              ...new Set(stage.work.map((t) => contractorOwner(t.owner))),
            ];
          const status =
            stage.status === "Complete"
              ? "Complete"
              : stage.status === "Requires correction"
                ? "Correction needed"
                : stage.status === "Blocked"
                  ? "Needs attention"
                  : owned
                    ? "Your team"
                    : owners.length
                      ? `With ${owners.join(" / ")}`
                      : "Not yet started";
          return (
            <details
              className={`ops-stage ${stage.status === "Complete" ? "complete" : owned ? "owned" : stage.status === "Requires correction" || stage.status === "Blocked" ? "correction" : "waiting"}`}
              key={stage.key}
              data-testid={`ops-stage-${stage.key}`}
            >
              <summary>
                <span className="ops-stage-icon" aria-hidden>
                  {stage.status === "Complete"
                    ? "✓"
                    : owned
                      ? "→"
                      : stage.status === "Requires correction" ||
                          stage.status === "Blocked"
                        ? "!"
                        : "○"}
                </span>
                <span>
                  <strong>{stage.title}</strong>
                  <small>{status}</small>
                </span>
                <span className="ops-chevron" aria-hidden>
                  ›
                </span>
              </summary>
              <div className="ops-stage-body">
                <p>{stage.detail}</p>
                {stage.key === "application" && (
                  <>
                    {a.reason && <p>{a.reason}</p>}
                    {a.screeningDecisions.map((d, i) => (
                      <div className="ops-record-row" key={`d${i}`}>
                        <strong>
                          {d.decision === "Proceed"
                            ? "Application approved"
                            : d.decision === "Decline"
                              ? "Application declined"
                              : "Information requested"}{" "}
                          · Recruitment
                        </strong>
                        <p>{d.reason || "No additional note"}</p>
                        <small>{date(d.at)}</small>
                      </div>
                    ))}
                    {a.responses.map((r, i) => (
                      <div className="ops-record-row" key={`r${i}`}>
                        <strong>Contractor response</strong>
                        <p>{r.text}</p>
                        <small>{date(r.at)}</small>
                      </div>
                    ))}
                  </>
                )}
                {stage.key === "administration" &&
                  model.requirements.map((r) => (
                    <div className="ops-record-row" key={r.id}>
                      <strong>
                        {r.type === "Financial"
                          ? "Financial documents"
                          : r.type}{" "}
                        · {r.status}
                      </strong>
                      {r.outcome && <p>{businessMessage(r.outcome)}</p>}
                      {evidence(r.evidenceIds)}
                    </div>
                  ))}
                {stage.key === "skills" &&
                  model.qualifications.map((q) => (
                    <div className="ops-record-row" key={q.id}>
                      <strong>
                        {q.skill} · {q.status}
                      </strong>
                      <small>
                        {q.originatingApplicationId
                          ? "Initial application skill"
                          : "Additional company skill · separate activity"}
                      </small>
                      {q.reason && <p>{q.reason}</p>}
                      {evidence(q.evidenceIds)}
                      {role === "Compliance" && q.status === "Approved" && (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            const reason = String(
                              new FormData(event.currentTarget).get("reason"),
                            );
                            void run(
                              () => service.invalidateSkill(q.id, reason),
                              "Skill approval invalidated. Current readiness updated; completed onboarding stays complete.",
                            );
                          }}
                        >
                          <label>
                            Invalidation reason
                            <input
                              name="reason"
                              required
                              placeholder="Approval no longer valid"
                            />
                          </label>
                          <button className="secondary danger" disabled={busy}>
                            Invalidate skill approval
                          </button>
                        </form>
                      )}
                    </div>
                  ))}
                {stage.key === "setup" && (
                  <p>
                    Vendor record: {c.vendorReference ?? "Not yet created"}.
                    Company profile:{" "}
                    {c.portalSetupComplete ? "Complete" : "Outstanding"}.
                  </p>
                )}
                {stage.key === "training" && (
                  <p>
                    Initial training confirmation:{" "}
                    {c.initialTrainingComplete ? "Complete" : "Outstanding"}.
                  </p>
                )}
                {stage.key === "activation" && (
                  <>
                    <p>
                      Operational status: {c.activationStatus}. Job eligibility:{" "}
                      {model.eligible ? "Eligible" : "Not eligible"}.
                    </p>
                    {state.workItems
                      .filter(
                        (t) =>
                          t.companyId === c.id &&
                          t.activity === "PublishActivation" &&
                          t.status === "Open",
                      )
                      .map((t) => (
                        <a key={t.id} href={automationLink(c.id, t.id)}>
                          Open Automations & Integrations
                        </a>
                      ))}
                  </>
                )}
                <div className="ops-area-history">
                  {state.workItems
                    .filter(
                      (t) =>
                        t.companyId === c.id &&
                        activities[stage.key].includes(t.activity),
                    )
                    .map((t) => (
                      <div className="ops-record-row" key={t.id}>
                        <strong>
                          {businessActivityLabel(t.activity)} · {t.status}
                        </strong>
                        <small>
                          {contractorOwner(t.owner)} ·{" "}
                          {date(t.completedAt ?? t.cancelledAt ?? t.createdAt)}
                        </small>
                        {t.outcome && <p>{businessMessage(t.outcome)}</p>}
                      </div>
                    ))}
                </div>
              </div>
            </details>
          );
        })}
      </div>
      <Records
        title="Company facts & readiness"
        meta="Current status, contact details and eligibility requirements"
        open={showFacts}
      >
        <p>
          {c.contact} · {c.email}
        </p>
        <LifecycleStatus company={c} application={a} state={state} />
        <EligibilityGuidance
          state={state}
          company={c}
          application={a}
          onOpenWork={(owner) => onParticipant(owner)}
        />
      </Records>
      <Records
        title="Messages & activity history"
        meta="Business notifications, ownership and completed work"
        open={showMessages}
      >
        <p>Demo in-app notifications. No email or SMS is sent.</p>
        {[...state.outbox]
          .filter((m) => m.companyId === c.id)
          .reverse()
          .map((m) => (
            <div className="ops-record-row" key={m.id}>
              <strong>
                {m.kind} ·{" "}
                {m.recipient === "Simulation" ? "Operations" : m.recipient}
              </strong>
              <p>{businessMessage(m.message)}</p>
              <small>{date(m.at)}</small>
            </div>
          ))}
        <h4>Company activity</h4>
        {[...state.workItems]
          .filter((t) => t.companyId === c.id)
          .reverse()
          .map((t) => (
            <div className="ops-record-row" key={t.id}>
              <strong>
                {businessActivityLabel(t.activity)} · {t.status}
              </strong>
              <small>
                {contractorOwner(t.owner)} ·{" "}
                {date(t.completedAt ?? t.cancelledAt ?? t.createdAt)}
              </small>
              {t.outcome && <p>{businessMessage(t.outcome)}</p>}
            </div>
          ))}
      </Records>
      <p className="ops-technical-link">
        Definitions, execution history, events, correlation and technical
        attempts:{" "}
        <a href={workflowMonitorLink(c.id)} target="_blank" rel="noopener">
          Open Workflow Monitor ↗
        </a>
      </p>
    </div>
  );
}

export function OperationsWorkspace({
  state,
  role,
  companies,
  company,
  scope,
  onScope,
  onCompany,
  participant,
  queueCompany,
  onQueueCompany,
  onParticipant,
  view,
  service,
  run,
  busy,
}: {
  state: State;
  role: InternalPersona;
  companies: ContractorCompany[];
  company?: ContractorCompany;
  scope: "active" | "all";
  onScope: (scope: "active" | "all") => void;
  onCompany: (id: string) => void;
  participant: QueueParticipant;
  queueCompany: string;
  onQueueCompany: (id: string) => void;
  onParticipant: (p: QueueParticipant) => void;
  view: string;
  service: OnboardingService;
  run: Run;
  busy: boolean;
}) {
  const [listOpen, setListOpen] = useState(false);
  const attention = operationsAttention(state, role),
    owned = state.workItems.filter(
      (t) =>
        t.companyId === company?.id && t.owner === role && t.status === "Open",
    );
  const a = state.applications.find((a) => a.companyId === company?.id),
    model = company && a ? contractorJourney(state, company, a) : undefined;
  const inventory = participant !== role;
  const select = (id: string) => {
    onCompany(id);
    setListOpen(false);
  };
  return (
    <div className="operations-product">
      {inventory && (
        <section className="ops-inventory">
          <div className="ops-section-heading">
            <div>
              <h2>All outstanding work</h2>
              <p>
                Global discovery. Your current execution role is {role}; other
                teams' work is read-only.
              </p>
            </div>
            <button className="secondary" onClick={() => onParticipant(role)}>
              Return to my work
            </button>
          </div>
          <OperationsWorkQueue
            state={state}
            participant={participant}
            executionRole={role}
            companyId={queueCompany}
            service={service}
            run={run}
            busy={busy}
            onCompanyChange={onQueueCompany}
            onOverview={(id) => {
              onScope("all");
              select(id);
              onParticipant(role);
            }}
          />
        </section>
      )}
      {!inventory && (
        <div className="ops-working-grid">
          <section
            className="ops-company-list"
            aria-label="Companies needing attention"
          >
            <div className="ops-list-heading">
              <h2>
                {scope === "active"
                  ? "Companies needing you"
                  : "Contractor network"}
              </h2>
              <span>{companies.length}</span>
            </div>
            <div
              className="ops-list-scope"
              role="group"
              aria-label="Contractor network view"
            >
              <button
                aria-pressed={scope === "active"}
                onClick={() => onScope("active")}
              >
                My active work
              </button>
              <button
                aria-pressed={scope === "all"}
                onClick={() => onScope("all")}
              >
                All companies
              </button>
            </div>
            <button
              className="ops-list-toggle secondary"
              aria-expanded={listOpen}
              aria-controls="ops-companies"
              onClick={() => setListOpen(!listOpen)}
            >
              {listOpen ? "Hide companies" : "Choose a company"} ·{" "}
              {companies.length} <span aria-hidden>⌄</span>
            </button>
            <div
              id="ops-companies"
              className={"ops-companies" + (listOpen ? " is-open" : "")}
            >
              {companies.map((c) => {
                const row = attention.find((r) => r.company.id === c.id)!;
                const first = row.first;
                return (
                  <button
                    className={`application-row ops-company-row ${company?.id === c.id ? "selected" : ""}`}
                    key={c.id}
                    onClick={() => select(c.id)}
                    aria-current={company?.id === c.id ? "true" : undefined}
                  >
                    <span className="ops-company-name">
                      <strong>{c.name}</strong>
                      <span className="ops-role-count">{row.count}</span>
                    </span>
                    <span className="ops-company-task">
                      {first
                        ? businessActivityLabel(first.activity)
                        : `No open ${role} work`}
                    </span>
                    <small>
                      {first
                        ? first.escalatedAt
                          ? "Escalated · attention needed"
                          : Date.parse(first.dueAt) < Date.parse(state.clock)
                            ? `Overdue · ${date(first.dueAt)}`
                            : `Due ${date(first.dueAt)}`
                        : "Available for investigation"}
                    </small>
                  </button>
                );
              })}
            </div>
            {!companies.length && (
              <div className="ops-list-empty">
                <strong>No active work for {role}.</strong>
                <p>
                  {state.companies.length
                    ? "Other teams may still be working. Explore company records when you need to."
                    : "New applications will appear here when Recruitment has work."}
                </p>
                <button className="secondary" onClick={() => onScope("all")}>
                  Show all companies
                </button>
              </div>
            )}
            <p className="ops-list-note">
              Counts here are Open {role} work only. The Work queue badge
              includes all participants.
            </p>
          </section>
          <section
            className="ops-selected-company"
            aria-label="Selected company work"
          >
            {company && a && model ? (
              <>
                <div className="ops-company-heading">
                  <div>
                    <h2>{company.name}</h2>
                    <p>
                      {company.contact} · {company.email}
                    </p>
                  </div>
                  <span
                    className={`ops-status ${model.eligible ? "complete" : company.activationStatus === "Suspended" ? "correction" : "waiting"}`}
                  >
                    {model.eligible
                      ? "Eligible for jobs"
                      : company.activationStatus === "Suspended"
                        ? "Suspended"
                        : model.ready
                          ? "Ready · activation pending"
                          : model.historical
                            ? "Onboarding complete · current requirements outstanding"
                            : a.status === "Screening"
                              ? "Application review"
                              : a.status === "Declined"
                                ? "Application declined"
                                : "Onboarding in progress"}
                  </span>
                </div>
                <section
                  className="ops-actions"
                  aria-label="Operations work queue"
                >
                  <div className="ops-section-heading">
                    <h3>Your actions</h3>
                    <span data-testid="queue-visible-count">
                      {owned.length} open for {role}
                    </span>
                  </div>
                  {owned.map((t) => (
                    <div
                      className="queue-item"
                      data-testid="queue-item"
                      data-company={company.id}
                      data-owner={t.owner}
                      key={t.id}
                    >
                      <TaskCard
                        task={t}
                        state={state}
                        service={service}
                        run={run}
                        busy={busy}
                        operationsView
                      />
                    </div>
                  ))}
                  {!owned.length && (
                    <div className="ops-no-actions">
                      <strong>
                        No {role} action is needed for this company.
                      </strong>
                      <p>{model.summary}</p>
                      {model.others.length > 0 && (
                        <ul>
                          {model.others.map((t) => (
                            <li key={t.id}>
                              {contractorAction(t)}{" "}
                              <strong>· {contractorOwner(t.owner)}</strong>
                            </li>
                          ))}
                        </ul>
                      )}
                      {model.mine.length > 0 && (
                        <p>
                          {model.mine.length} action(s) with Contractor in their
                          signed-in portal.
                        </p>
                      )}
                    </div>
                  )}
                </section>
                {openWork(state).filter(
                  (t) => t.companyId === company.id && t.owner === "Simulation",
                ).length > 0 && (
                  <div className="ops-automation-note" role="note">
                    <strong>
                      {model.ready
                        ? "Ready for activation"
                        : "Automation needs attention"}
                    </strong>
                    <p>
                      {model.ready
                        ? "All requirements are complete. Contractor activation is awaiting publication by Operations."
                        : "Company setup includes a pending test integration. Execution is in Workflow Monitor."}
                    </p>
                    <a
                      href={automationLink(
                        company.id,
                        openWork(state).find(
                          (t) =>
                            t.companyId === company.id &&
                            t.owner === "Simulation",
                        )?.id,
                      )}
                    >
                      Open Automations & Integrations
                    </a>
                  </div>
                )}
                <CompanyRecord
                  key={company.id}
                  state={state}
                  company={company}
                  role={role}
                  service={service}
                  run={run}
                  busy={busy}
                  onParticipant={onParticipant}
                  showFacts={view === "Overview"}
                  showMessages={view === "Outbox"}
                />
              </>
            ) : (
              <div className="ops-welcome">
                <span className="ops-empty-symbol" aria-hidden>
                  ✓
                </span>
                <h2>
                  {companies.length
                    ? "Choose the next company to work with"
                    : `You're caught up, ${role}`}
                </h2>
                <p>
                  {companies.length
                    ? "Select a company from the list. Your actions appear here, ready to complete."
                    : "There is no Open work for your role in this view. Other teams' progress remains available in All companies."}
                </p>
                {scope === "active" && (
                  <button className="secondary" onClick={() => onScope("all")}>
                    Browse company records
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
