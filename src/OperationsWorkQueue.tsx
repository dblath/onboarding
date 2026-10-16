import type { OnboardingService } from "./application";
import { type Role, type State, type WorkItem } from "./domain";
import { internalPersonas } from "./experiences";
import { TaskCard, type Run } from "./TaskCard";

import { activityLabel, automationLink } from "./presentation";

export const queueParticipants: Role[] = [
  ...internalPersonas,
  "Contractor",
  "Simulation",
];
export type QueueParticipant = Role | "All";
export const participantName = (owner: QueueParticipant) =>
  owner === "Simulation"
    ? "Automations & Integrations"
    : owner === "All"
      ? "All participants"
      : owner;
export const openWork = (state: State) =>
  state.workItems.filter((task) => task.status === "Open");

export function OperationsQueueNavigation({
  state,
  expanded,
  participant,
  onToggle,
  onSelect,
  active = false,
}: {
  state: State;
  expanded: boolean;
  participant: QueueParticipant;
  onToggle: () => void;
  onSelect: (participant: QueueParticipant) => void;
  active?: boolean;
}) {
  const tasks = openWork(state);
  return (
    <div className="operations-queue-navigation">
      <button
        aria-label="Work queue"
        aria-expanded={expanded}
        aria-controls="operations-queue-participants"
        aria-current={active ? "page" : undefined}
        aria-describedby="operations-queue-total"
        onClick={onToggle}
      >
        <span aria-hidden="true">{expanded ? "⌄" : ">"}</span>
        <span>Work queue</span>
        <span
          id="operations-queue-total"
          className="nav-count"
          data-testid="queue-total"
        >
          {tasks.length}
        </span>
      </button>
      <div
        id="operations-queue-participants"
        role="group"
        aria-label="Work queue participants"
        hidden={!expanded}
      >
        {(["All", ...queueParticipants] as QueueParticipant[]).map((owner) => (
          <button
            key={owner}
            aria-label={`${participantName(owner)} work`}
            aria-pressed={participant === owner}
            aria-describedby={`queue-count-${owner.replaceAll(" ", "-")}`}
            onClick={() => onSelect(owner)}
          >
            <span>{participantName(owner)}</span>
            <span
              id={`queue-count-${owner.replaceAll(" ", "-")}`}
              className="nav-count"
              data-testid={`queue-count-${owner}`}
            >
              {owner === "All"
                ? tasks.length
                : tasks.filter((task) => task.owner === owner).length}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function OperationsWorkQueue({
  state,
  participant,
  companyId,
  service,
  run,
  busy,
  onCompanyChange,
  onOverview,
}: {
  state: State;
  participant: QueueParticipant;
  companyId: string;
  service: OnboardingService;
  run: Run;
  busy: boolean;
  onCompanyChange: (companyId: string) => void;
  onOverview: (companyId: string) => void;
}) {
  const tasks = openWork(state);
  const scoped = tasks.filter(
    (task) => !companyId || task.companyId === companyId,
  );
  const visible = scoped.filter(
    (task) => participant === "All" || task.owner === participant,
  );
  const system =
    participant === "All" || participant === "Simulation"
      ? []
      : scoped.filter((task) => task.owner === "Simulation");
  function item(task: WorkItem) {
    const company = state.companies.find(
      (company) => company.id === task.companyId,
    );
    return (
      <div
        key={task.id}
        className="queue-item"
        data-testid="queue-item"
        data-owner={task.owner}
        data-company={task.companyId}
      >
        <div className="queue-company-context">
          <div>
            <strong>{company?.name ?? "Unknown company"}</strong>
            <small>
              {company?.email} · {task.companyId.slice(0, 8)}
            </small>
          </div>
          <button
            className="text-button"
            onClick={() => onOverview(task.companyId)}
          >
            Company overview
          </button>
        </div>
        {task.owner === "Simulation" ? (
          <article className="task-card">
            <span className="pill neutral">Simulation</span>
            <h3>{activityLabel(task.activity)}</h3>
            <p>
              Pending simulated integration. Run this action in Workflow
              Monitor.
            </p>
            <a href={automationLink(task.companyId, task.id)}>
              Open automation action
            </a>
          </article>
        ) : task.owner === "Contractor" ? (
          <article className="task-card">
            <span className="pill neutral">Contractor action</span>
            <h3>{activityLabel(task.activity)}</h3>
            <p>{task.instructions.replace(/\bdemo\b/g, "simulated")}</p>
            <p className="muted">
              The contractor completes this action in their signed-in company
              portal.
            </p>
            <a href="#/contractor" target="_blank" rel="noopener">
              Open Contractor Portal ↗
            </a>
          </article>
        ) : (
          <TaskCard
            task={task}
            state={state}
            service={service}
            run={run}
            busy={busy}
          />
        )}
      </div>
    );
  }
  return (
    <section
      className="operations-work-queue"
      aria-label="Operations work queue"
    >
      <div className="section-heading">
        <h3>{participantName(participant)} work queue</h3>
        <span className="pill neutral" data-testid="queue-visible-count">
          {visible.length} open
        </span>
      </div>
      <div className="queue-filters">
        <label>
          Work queue company
          <select
            value={companyId}
            onChange={(event) => onCompanyChange(event.target.value)}
          >
            <option value="">All companies</option>
            {state.companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name} ({company.id.slice(0, 8)})
              </option>
            ))}
          </select>
        </label>
        <p className="muted">
          {companyId
            ? "Company filter applied."
            : "Showing work across all companies."}{" "}
          Navigation counts always include all open work across every company
          and participant.
        </p>
      </div>
      {visible.map(item)}
      {!visible.length && (
        <p className="queue-empty">
          No open work for this participant in the current company filter. Other
          participants may still have actions; check Work queue totals.
        </p>
      )}
      {system.length > 0 && (
        <p className="automation-signpost">
          {system.length} pending automation(s).{" "}
          <a href={automationLink(companyId)}>
            Open Automations & Integrations
          </a>
        </p>
      )}
    </section>
  );
}
