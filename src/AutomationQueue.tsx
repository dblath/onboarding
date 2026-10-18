import { useEffect, useRef } from "react";
import type { OnboardingService } from "./application";
import type { State } from "./domain";
import { TaskCard, type Run } from "./TaskCard";
import { businessActivityLabel, businessMessage } from "./presentation";
import { LifecycleStatus } from "./LifecycleStatus";

export const pendingAutomations = (state: State) =>
  state.workItems.filter(
    (t) =>
      t.status === "Open" &&
      (t.owner === "Simulation" ||
        state.attempts.filter((a) => a.workItemId === t.id).at(-1)?.status ===
          "Failed"),
  );

export function AutomationQueue({
  state,
  service,
  run,
  busy,
  companyId,
  activityId,
  onCompanyChange,
}: {
  state: State;
  service: OnboardingService;
  run: Run;
  busy: boolean;
  companyId: string;
  activityId: string;
  onCompanyChange: (id: string) => void;
}) {
  const selectedItem = useRef<HTMLDivElement>(null);
  const latest = (id: string) =>
    state.attempts.filter((a) => a.workItemId === id).at(-1);
  const work = state.workItems.filter(
    (t) =>
      (!companyId || t.companyId === companyId) &&
      (t.owner === "Simulation" ||
        latest(t.id)?.status === "Failed" ||
        state.attempts.some((a) => a.workItemId === t.id)),
  );
  const pending = pendingAutomations(state).filter(
    (t) => !companyId || t.companyId === companyId,
  );
  const history = work.filter((t) => t.status !== "Open");
  const company = state.companies.find((c) => c.id === companyId);
  const application = state.applications.find((a) => a.companyId === companyId);
  const selected = work.find((t) => t.id === activityId);
  useEffect(() => {
    if (selected) selectedItem.current?.focus();
  }, [activityId, selected?.id]);
  return (
    <section
      className="panel automation-queue"
      aria-label="Automations & Integrations"
    >
      <div className="section-heading">
        <div>
          <div className="eyebrow">WORKFLOW MONITOR</div>
          <h2>Automations & Integrations</h2>
        </div>
        <span className="pill neutral">{pending.length} pending</span>
      </div>
      <p>
        <strong>Demo integrations · user-triggered only.</strong> No external
        services are called. Run a pending action or retry a failed attempt
        explicitly; nothing executes automatically.
      </p>
      <label>
        Automations company
        <select
          value={companyId}
          onChange={(e) => onCompanyChange(e.target.value)}
        >
          <option value="">All companies</option>
          {state.companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.id.slice(0, 8)})
            </option>
          ))}
        </select>
      </label>
      {companyId && !company && (
        <p role="alert">
          The linked company is unavailable. Choose All companies to review
          available work.
        </p>
      )}
      {company && application && (
        <LifecycleStatus
          state={state}
          company={company}
          application={application}
        />
      )}
      {activityId && !selected && (
        <p role="status">
          The linked activity is unavailable in this company filter. Review the
          available actions below.
        </p>
      )}
      <h3>Needs attention</h3>
      {!pending.length && (
        <p>
          No pending automations or failed verifications in this company filter.
        </p>
      )}
      {pending.map((t) => (
        <div
          key={t.id}
          ref={t.id === activityId ? selectedItem : undefined}
          tabIndex={-1}
          className={`automation-item${t.id === activityId ? " automation-selected" : ""}`}
          data-testid="automation-item"
          data-activity={t.id}
        >
          <div className="queue-company-context">
            <strong>
              {state.companies.find((c) => c.id === t.companyId)?.name ??
                "Unknown company"}
            </strong>
            <span className="pill neutral">
              {latest(t.id)?.status === "Failed"
                ? "Verification failed — retry available"
                : "Waiting for external service"}
            </span>
          </div>
          <p className="muted">
            {latest(t.id)?.status === "Failed"
              ? `Attempt ${latest(t.id)!.attempt} failed. Retry the same action.`
              : "Awaiting your test run; no external request is in progress."}
          </p>
          <TaskCard
            task={t}
            state={state}
            service={service}
            run={run}
            busy={busy}
            automationExecution
          />
        </div>
      ))}
      <details
        className="automation-history"
        open={selected && selected.status !== "Open" ? true : undefined}
      >
        <summary>
          Completed & cancelled integration work ({history.length})
        </summary>
        {history.map((t) => (
          <div
            key={t.id}
            ref={t.id === activityId ? selectedItem : undefined}
            tabIndex={-1}
            className="automation-item"
            data-testid="automation-history-item"
          >
            <strong>
              {state.companies.find((c) => c.id === t.companyId)?.name} ·{" "}
              {businessActivityLabel(t.activity)}
            </strong>
            <p>
              {t.status}
              {latest(t.id)?.status === "Succeeded"
                ? " · Test integration succeeded"
                : ""}
            </p>
            {state.attempts
              .filter((a) => a.workItemId === t.id)
              .map((a) => (
                <p key={a.id}>
                  Attempt {a.attempt}: {a.status} ·{" "}
                  {businessMessage(a.technicalError ?? a.businessOutcome ?? "")}
                </p>
              ))}
          </div>
        ))}
      </details>
    </section>
  );
}
