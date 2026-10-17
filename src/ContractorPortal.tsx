import { useState, type ReactNode } from "react";
import type { OnboardingService } from "./application";
import {
  isReady,
  skillCatalog,
  type State,
  type ContractorCompany,
  type OnboardingApplication,
} from "./domain";
import { TaskCard, type Run } from "./TaskCard";
import { activityLabel, simulationMessage } from "./presentation";
import {
  contractorJourney,
  contractorAction,
  contractorOwner,
  type JourneyStatus,
} from "./contractorJourney";

const symbols: Record<JourneyStatus, string> = {
  Complete: "✓",
  "Waiting on you": "→",
  "Waiting on another team": "◷",
  "Requires correction": "!",
  Blocked: "!",
  "Not yet started": "○",
};
const tone = (status: JourneyStatus) =>
  ({
    Complete: "complete",
    "Waiting on you": "you",
    "Waiting on another team": "waiting",
    "Requires correction": "correction",
    Blocked: "correction",
    "Not yet started": "upcoming",
  })[status];
function Disclosure({
  title,
  meta,
  children,
  id,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <details className="contractor-disclosure" id={id}>
      <summary>
        <span>
          <strong>{title}</strong>
          {meta && <small>{meta}</small>}
        </span>
        <span className="disclosure-chevron" aria-hidden>
          ›
        </span>
      </summary>
      <div className="contractor-disclosure-body">{children}</div>
    </details>
  );
}
const date = (at: string) =>
  new Date(at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

export function ContractorPortal({
  state,
  company: c,
  application: a,
  service,
  run,
  busy,
  view,
  onView,
}: {
  state: State;
  company: ContractorCompany;
  application: OnboardingApplication;
  service: OnboardingService;
  run: Run;
  busy: boolean;
  view: string;
  onView: (view: "Overview" | "Work queue" | "Outbox") => void;
}) {
  const model = contractorJourney(state, c, a);
  const {
    mine,
    others,
    stages,
    eligible,
    historical,
    qualifications,
    requirements,
  } = model;
  const [focusedTask, setFocusedTask] = useState("");
  const additional = qualifications.filter((q) => !q.originatingApplicationId);
  const evidence = state.evidence.filter((e) => e.companyId === c.id);
  const messages = state.outbox.filter(
    (m) => m.companyId === c.id && m.recipient === "Contractor",
  );
  function openActions(id = "") {
    setFocusedTask(id);
    onView("Work queue");
  }
  const heading =
    view === "Work queue"
      ? "Your required actions"
      : view === "Outbox"
        ? "Your messages"
        : model.title;
  const inspect = (id: string) => {
    const disclosure = document.getElementById(`contractor-${id}`);
    disclosure?.setAttribute("open", "");
    disclosure?.querySelector("summary")?.focus({ preventScroll: true });
    disclosure?.scrollIntoView?.({ block: "start" });
  };
  const skillRequest = isReady(c, state.qualifications) &&
    c.activationStatus === "Active" && (
      <form
        className="contractor-skill-request"
        onSubmit={(event) => {
          event.preventDefault();
          const skill = String(new FormData(event.currentTarget).get("skill"));
          void run(
            () => service.requestSkill(c.id, skill),
            "Qualification requested. Your completed onboarding stays complete.",
          );
        }}
      >
        <label>
          Add another company skill
          <select name="skill">
            {skillCatalog.map((skill) => (
              <option key={skill}>{skill}</option>
            ))}
          </select>
        </label>
        <button className="secondary" disabled={busy}>
          ＋ Request qualification
        </button>
      </form>
    );
  return (
    <div className="contractor-product" key={c.id}>
      <div className="contractor-company">
        <div className="company-monogram" aria-hidden>
          {c.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h1>{c.name}</h1>
          <p>
            {c.contact} <span aria-hidden>·</span> {c.email}
          </p>
        </div>
      </div>
      <section
        className="contractor-now"
        aria-label="What matters now"
        data-testid={!eligible ? "eligibility-guidance" : undefined}
      >
        <div className="contractor-now-heading">
          <div>
            <span className="contractor-kicker">
              {view === "Overview"
                ? historical
                  ? "ONBOARDING COMPLETE · COMPANY ACTIVITY"
                  : "YOUR ONBOARDING"
                : "YOUR WORKSPACE"}
            </span>
            <h2>{heading}</h2>
          </div>
          <span
            className={`contractor-job-status ${eligible ? "complete" : "upcoming"}`}
          >
            <span aria-hidden>{eligible ? "✓" : "○"}</span>
            <span data-testid="lifecycle-eligibility">
              {eligible ? "Eligible" : "Not eligible"}
            </span>
            <small>for jobs</small>
          </span>
        </div>
        <p className="contractor-lead">{model.summary}</p>
        {view === "Overview" &&
          (mine.length ? (
            <div className="contractor-next-action">
              <div>
                <span
                  className={`contractor-status ${model.correction(mine[0]) ? "correction" : "you"}`}
                >
                  {model.correction(mine[0])
                    ? "! Correction needed"
                    : "→ Your next action"}
                </span>
                <h3>{contractorAction(mine[0])}</h3>
                <p>
                  {mine.length > 1
                    ? `${mine.length - 1} other action${mine.length > 2 ? "s" : ""} ready for you. You can complete these in any order.`
                    : "One action ready for you."}
                </p>
              </div>
              <button
                className="primary"
                disabled={busy}
                onClick={() => openActions(mine[0].id)}
              >
                Continue <span aria-hidden>→</span>
              </button>
            </div>
          ) : others.length ? (
            <ul
              className="contractor-waiting-list"
              aria-label="Waiting on other teams"
            >
              {others.map((t) => (
                <li key={t.id}>
                  <span aria-hidden>◷</span>
                  <span>{contractorAction(t)}</span>
                  <strong>{contractorOwner(t.owner)}</strong>
                </li>
              ))}
            </ul>
          ) : null)}
      </section>
      {view === "Work queue" ? (
        <section className="contractor-actions" aria-label="Required actions">
          <div className="contractor-section-heading">
            <h2>
              Ready for you{" "}
              <span className="contractor-count">{mine.length}</span>
            </h2>
            <button className="text-button" onClick={() => onView("Overview")}>
              Back to your journey
            </button>
          </div>
          <p className="contractor-section-note">
            {mine.length
              ? "Use fictional documents only. Each submitted item goes to the responsible team for review."
              : "You're all caught up here. We'll let you know when another action is ready."}
          </p>
          {mine.map((t) => (
            <div
              key={t.id}
              className={
                focusedTask === t.id ? "contractor-focused-action" : ""
              }
            >
              {model.correction(t) && (
                <p className="contractor-correction-note">
                  ! Correction needed — check the review feedback before
                  resubmitting.
                </p>
              )}
              <TaskCard
                task={t}
                state={state}
                service={service}
                run={run}
                busy={busy}
                contractorView
              />
            </div>
          ))}
          {!mine.length && others.length > 0 && (
            <p className="contractor-empty-note">
              Waiting on{" "}
              {Array.from(
                new Set(others.map((t) => contractorOwner(t.owner))),
              ).join(", ")}
              . You don't need to do anything right now.
            </p>
          )}
        </section>
      ) : view === "Outbox" ? (
        <section className="contractor-messages" aria-label="Company messages">
          <div className="contractor-section-heading">
            <h2>
              Messages{" "}
              <span className="contractor-count">{messages.length}</span>
            </h2>
          </div>
          <p className="contractor-section-note">
            Simulated in-app notifications. No email or SMS is sent.
          </p>
          {[...messages].reverse().map((m) => (
            <article className="contractor-message" key={m.id}>
              <span
                className={`contractor-status ${m.kind === "Escalation" ? "correction" : "waiting"}`}
              >
                {m.kind}
              </span>
              <p>{simulationMessage(m.message)}</p>
              <small>{date(m.at)}</small>
            </article>
          ))}
          {!messages.length && (
            <p className="contractor-empty-note">
              No messages yet. Updates for your company will appear here.
            </p>
          )}
        </section>
      ) : (
        <>
          <section
            className="contractor-journey"
            aria-label="Onboarding journey"
          >
            <div className="contractor-section-heading">
              <div>
                <h2>
                  {historical
                    ? "Your completed onboarding"
                    : "Your path to working with Unity"}
                </h2>
                <p>
                  {historical
                    ? `Completed ${a.completedAt ? date(a.completedAt) : "during your initial onboarding"}. Later qualifications are separate company activities.`
                    : "Documents and skill qualification can move forward together. Setup, training and activation follow their prerequisites."}
                </p>
              </div>
              <span className="contractor-status upcoming">
                {historical
                  ? "Completed"
                  : model.declined
                    ? "Declined"
                    : "In progress"}
              </span>
            </div>
            <div className="contractor-stages">
              {stages.map((stage) => (
                <article
                  key={stage.key}
                  className={`contractor-stage ${tone(stage.status)} stage-${stage.key}`}
                  data-testid={`journey-${stage.key}`}
                >
                  <div className="contractor-stage-top">
                    <span className="contractor-stage-symbol" aria-hidden>
                      {symbols[stage.status]}
                    </span>
                    <h3>{stage.title}</h3>
                  </div>
                  <span className={`contractor-status ${tone(stage.status)}`}>
                    {stage.status}
                  </span>
                  <p>{stage.detail}</p>
                  <button
                    className="text-button"
                    onClick={() =>
                      inspect(
                        stage.key === "application"
                          ? "history"
                          : stage.key === "skills"
                            ? "skills"
                            : stage.key === "administration"
                              ? "requirements"
                              : "readiness",
                      )
                    }
                  >
                    View details{" "}
                    <span className="sr-only">for {stage.title}</span>
                    <span aria-hidden>↗</span>
                  </button>
                </article>
              ))}
            </div>
          </section>
          {(additional.length > 0 || skillRequest) && (
            <section
              className="contractor-company-activity"
              aria-label="Separate company activities"
            >
              <div className="contractor-section-heading">
                <div>
                  <h2>Grow your company's skills</h2>
                  <p>
                    Additional qualifications don't reopen completed onboarding.
                  </p>
                </div>
              </div>
              {additional.map((q) => (
                <div className="contractor-record-row" key={q.id}>
                  <strong>{q.skill}</strong>
                  <span
                    className={`contractor-status ${q.status === "Approved" ? "complete" : ["Rejected", "Invalidated", "Correction required"].includes(q.status) ? "correction" : "waiting"}`}
                  >
                    {q.status}
                  </span>
                  {q.reason && <p>{q.reason}</p>}
                </div>
              ))}
              {skillRequest}
            </section>
          )}
        </>
      )}
      <section
        className="contractor-details"
        aria-label="Supporting company information"
      >
        <div className="contractor-section-heading">
          <h2>The details, when you need them</h2>
        </div>
        <Disclosure
          title="Readiness & job eligibility"
          meta="Current requirements and operational status"
          id="contractor-readiness"
        >
          <dl className="contractor-facts">
            <div>
              <dt>Current readiness</dt>
              <dd data-testid="lifecycle-readiness">
                {model.ready ? "Ready" : "Not ready"}
              </dd>
            </div>
            <div>
              <dt>Operational status</dt>
              <dd data-testid="lifecycle-operational">{c.activationStatus}</dd>
            </div>
            <div>
              <dt>Onboarding history</dt>
              <dd data-testid="lifecycle-onboarding">
                {historical
                  ? "Completed"
                  : model.declined
                    ? "Declined"
                    : "In progress"}
              </dd>
            </div>
            <div>
              <dt>Vendor record</dt>
              <dd>{c.vendorReference ?? "Not yet created"}</dd>
            </div>
          </dl>
          <p>
            Readiness requires verified company documents, a completed profile,
            confirmed training and at least one approved skill. Only a Ready and
            Active company can receive jobs. Completed onboarding stays complete
            if current qualifications change.
          </p>
          {c.activationStatus === "Suspended" && (
            <p>
              Operational suspension remains in force, even if readiness is
              restored. Removing it requires a separate administrative request
              and approval. That process is not available yet.
            </p>
          )}
          <ul className="contractor-checklist">
            <li>{c.adminComplete ? "✓" : "○"} Company documents verified</li>
            <li>
              {c.portalSetupComplete ? "✓" : "○"} Company profile complete
            </li>
            <li>
              {c.initialTrainingComplete ? "✓" : "○"} Initial training confirmed
            </li>
            <li>
              {qualifications.some((q) => q.status === "Approved") ? "✓" : "○"}{" "}
              At least one approved skill
            </li>
          </ul>
        </Disclosure>
        <Disclosure
          title="Company documents & reviews"
          meta={`${requirements.filter((r) => r.status === "Verified").length} of ${requirements.length} verified`}
          id="contractor-requirements"
        >
          {requirements.length ? (
            requirements.map((r) => (
              <div className="contractor-record-row" key={r.id}>
                <strong>
                  {r.type === "Financial" ? "Financial documents" : r.type}
                </strong>
                <span
                  className={`contractor-status ${r.status === "Verified" ? "complete" : r.status === "Correction required" ? "correction" : "waiting"}`}
                >
                  {r.status}
                </span>
                {r.outcome && <p>{simulationMessage(r.outcome)}</p>}
                <small>
                  Review owner:{" "}
                  {r.type === "Insurance"
                    ? "Compliance"
                    : r.type === "Financial"
                      ? "Finance"
                      : "Contractor Relations"}
                </small>
              </div>
            ))
          ) : (
            <p>
              Company document requests begin after Recruitment approves your
              application.
            </p>
          )}
        </Disclosure>
        <Disclosure
          title="Skills & qualification history"
          meta={`${qualifications.length} qualification${qualifications.length === 1 ? "" : "s"}`}
          id="contractor-skills"
        >
          {qualifications.map((q) => (
            <div className="contractor-record-row" key={q.id}>
              <strong>{q.skill}</strong>
              <span
                className={`contractor-status ${q.status === "Approved" ? "complete" : ["Correction required", "Rejected", "Invalidated"].includes(q.status) ? "correction" : "waiting"}`}
              >
                {q.status}
              </span>
              <small>
                {q.originatingApplicationId
                  ? "Initial application skill"
                  : "Additional company skill · separate activity"}
              </small>
              {q.reason && <p>{q.reason}</p>}
              <small>
                Evidence review: Compliance · Qualification decision: Field
                Manager
              </small>
            </div>
          ))}
          {!qualifications.length && (
            <p>Your initial qualification starts after application approval.</p>
          )}
        </Disclosure>
        <Disclosure
          title="Submitted evidence & versions"
          meta={`${evidence.length} versions retained`}
          id="contractor-evidence"
        >
          {evidence.map((e) => (
            <div className="contractor-record-row" key={e.id}>
              <strong>{e.description.replace(/\bdemo\b/g, "simulated")}</strong>
              <span
                className={`contractor-status ${e.verificationState === "Verified" ? "complete" : e.verificationState === "Correction required" ? "correction" : "waiting"}`}
              >
                {e.verificationState}
              </span>
              <small>
                Version {e.version} · {date(e.submittedAt)}
              </small>
              <p>{e.fixture.replace(/\bdemo\b/g, "simulated")}</p>
            </div>
          ))}
          {!evidence.length && <p>No evidence submitted yet.</p>}
        </Disclosure>
        <Disclosure
          title="Application decisions & activity history"
          meta="Decisions, reasons, responses and completed actions"
          id="contractor-history"
        >
          <div className="contractor-record-row">
            <strong>Application submitted · {a.skill}</strong>
            <small>{date(a.submittedAt)}</small>
          </div>
          {a.screeningDecisions.map((d, index) => (
            <div className="contractor-record-row" key={`decision-${index}`}>
              <strong>
                Recruitment ·{" "}
                {d.decision === "Proceed"
                  ? "Application approved"
                  : d.decision === "Decline"
                    ? "Application declined"
                    : "More information requested"}
              </strong>
              <p>{d.reason || "No additional note."}</p>
              <small>{date(d.at)}</small>
            </div>
          ))}
          {a.responses.map((r, index) => (
            <div className="contractor-record-row" key={`response-${index}`}>
              <strong>Your response</strong>
              <p>{r.text}</p>
              <small>{date(r.at)}</small>
            </div>
          ))}
          {state.workItems
            .filter((t) => t.companyId === c.id)
            .map((t) => (
              <div className="contractor-record-row" key={t.id}>
                <strong>{activityLabel(t.activity)}</strong>
                <span
                  className={`contractor-status ${t.status === "Completed" ? "complete" : t.status === "Cancelled" ? "upcoming" : "waiting"}`}
                >
                  {t.status}
                </span>
                <small>
                  {contractorOwner(t.owner)} ·{" "}
                  {date(t.completedAt ?? t.cancelledAt ?? t.createdAt)}
                </small>
                {t.outcome && <p>{simulationMessage(t.outcome)}</p>}
              </div>
            ))}
        </Disclosure>
      </section>
    </div>
  );
}
