import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";

import type { OnboardingService } from "./application";
import { createBrowserService } from "./runtime";
import { useWorkspace } from "./useWorkspace";
import {
  useExperience,
  experienceNames,
  internalPersonas,
  type InternalPersona,
} from "./experiences";
import {
  approvedSkills,
  isReady,
  isJobEligible,
  readinessChecks,
  skillCatalog,
  type Persona,
} from "./domain";
import { TaskCard, type Run } from "./TaskCard";
import { WorkflowMonitor } from "./WorkflowMonitor";
import { LifecycleStatus } from "./LifecycleStatus";
import { ContractorAccess, useContractorSession } from "./ContractorAccess";
import { DiagnosticPanel } from "./DiagnosticPanel";
import {
  OperationsQueueNavigation,
  OperationsWorkQueue,
  openWork,
  participantName,
  type QueueParticipant,
} from "./OperationsWorkQueue";
import { EligibilityGuidance } from "./EligibilityGuidance";
import { AutomationQueue, pendingAutomations } from "./AutomationQueue";
import {
  activityLabel,
  automationLink,
  monitorContext,
  simulationMessage,
} from "./presentation";
import "./style.css";
import { VizBoundary } from "./viz/VizBoundary";
const JourneyMap = lazy(() => import("./viz/JourneyMap"));
const DemoWorkspace = lazy(() => import("./workspace/DemoWorkspace"));
const TriggerManager = lazy(() => import("./viz/TriggerManager"));
let browserService: OnboardingService | undefined;
function getDefaultService() {
  return (browserService ??= createBrowserService());
}
type View =
  | "Overview"
  | "Work queue"
  | "Journey Map"
  | "Demo Workspace"
  | "Recording Triggers"
  | "Workflow monitor"
  | "Automations & Integrations"
  | "Outbox";
export function App({
  service = getDefaultService(),
}: { service?: OnboardingService } = {}) {
  const experience = useExperience();
  const [routeContext, setRouteContext] = useState(monitorContext);
  useEffect(() => {
    const changed = () => setRouteContext(monitorContext());
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  const { state, refresh, loading, error, setError, refreshing } =
    useWorkspace(service);
  const contractorSession = useContractorSession(state.companies, !loading);
  const anonymous = experience === "contractor" && !contractorSession.company;
  const [submitted, setSubmitted] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [internalPersona, setInternalPersona] = useState<InternalPersona>(
    () => {
      const saved = sessionStorage.getItem("fieldwork:operations:role");
      return internalPersonas.includes(saved as InternalPersona)
        ? (saved as InternalPersona)
        : "Recruitment";
    },
  );
  const persona: Persona =
    experience === "contractor"
      ? "Contractor"
      : experience === "monitor"
        ? "Workflow Monitor"
        : internalPersona;
  const [queueParticipant, setQueueParticipant] =
    useState<QueueParticipant>(internalPersona);
  const [queueExpanded, setQueueExpanded] = useState(false);
  const [queueCompany, setQueueCompany] = useState("");
  const [networkScope, setNetworkScope] = useState<"active" | "all">(() =>
    sessionStorage.getItem("fieldwork:operations:network-view") === "all"
      ? "all"
      : "active",
  );
  function chooseNetworkScope(scope: "active" | "all") {
    setNetworkScope(scope);
    sessionStorage.setItem("fieldwork:operations:network-view", scope);
  }
  const openTasks = openWork(state);
  const roleCount = (companyId: string) =>
    openTasks.filter(
      (t) => t.companyId === companyId && t.owner === internalPersona,
    ).length;
  const network = state.companies.filter(
    (c) =>
      experience !== "operations" ||
      networkScope === "all" ||
      roleCount(c.id) > 0,
  );
  const [selected, setSelected] = useState(
      () => sessionStorage.getItem(`fieldwork:${experience}:company`) ?? "",
    ),
    [view, setView] = useState<View>(
      experience === "monitor"
        ? "Automations & Integrations"
        : experience === "operations"
          ? "Work queue"
          : "Overview",
    ),
    [creating, setCreating] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    setSelected(
      sessionStorage.getItem(`fieldwork:${experience}:company`) ?? "",
    );
    setView(
      experience === "monitor"
        ? "Automations & Integrations"
        : experience === "operations"
          ? "Work queue"
          : "Overview",
    );
    setCreating(false);
    setNetworkScope(
      sessionStorage.getItem("fieldwork:operations:network-view") === "all"
        ? "all"
        : "active",
    );
    setNotice("");
  }, [experience]);
  useEffect(() => {
    if (experience === "monitor" && routeContext.triggers)
      setView("Recording Triggers");
    if (experience === "monitor" && routeContext.workspace)
      setView("Demo Workspace");
    if (experience === "monitor" && routeContext.journey)
      setView("Journey Map");
    if (experience === "monitor" && routeContext.automation) {
      setView("Automations & Integrations");
      if (routeContext.companyId) {
        setSelected(routeContext.companyId);
        sessionStorage.setItem(
          "fieldwork:monitor:company",
          routeContext.companyId,
        );
      }
    }
  }, [experience, routeContext]);
  useEffect(() => {
    setSubmitted(null);
  }, [state.workspaceEpoch]);
  const views: View[] =
    experience === "monitor"
      ? [
          "Automations & Integrations",
          "Journey Map",
          "Recording Triggers",
          "Demo Workspace",
          "Workflow monitor",
          "Outbox",
        ]
      : ["Overview", "Work queue", "Outbox"];
  const viewName = (v: View) =>
    experience === "contractor"
      ? ((
          {
            Overview: "Your journey",
            "Work queue": "Required actions",
            Outbox: "Messages",
          } as Partial<Record<View, string>>
        )[v] ?? v)
      : v;
  const writeDisabled = busy || Boolean(service.unavailableReason);
  const run: Run = async (action, message) => {
    if (service.unavailableReason) {
      setError(service.unavailableReason);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await refresh();
      setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      await refresh().catch(() => {});
    } finally {
      setBusy(false);
    }
  };
  const c =
      experience === "contractor"
        ? contractorSession.company
        : (network.find((c) => c.id === selected) ??
          (selected ? undefined : network[0])),
    a = state.applications.find((a) => a.companyId === c?.id),
    qualifications = state.qualifications.filter((q) => q.companyId === c?.id),
    tasks = state.workItems.filter(
      (t) => t.companyId === c?.id && t.status === "Open",
    ),
    myTasks = tasks.filter((t) => t.owner === persona),
    ready = c ? isReady(c, state.qualifications) : false,
    eligible = c ? isJobEligible(c, state.qualifications) : false,
    checks = c ? readinessChecks(state, c) : [],
    messages = state.outbox.filter(
      (m) =>
        m.companyId === c?.id &&
        (experience !== "contractor" || m.recipient === "Contractor"),
    ),
    allMyTasks = state.workItems.filter(
      (t) =>
        t.status === "Open" &&
        t.owner === persona &&
        (experience !== "contractor" || t.companyId === c?.id),
    );
  function selectCompany(companyId: string) {
    setSelected(companyId);
    if (experience === "operations" && view === "Work queue")
      setQueueCompany(companyId);
    sessionStorage.setItem(`fieldwork:${experience}:company`, companyId);
    setNotice("");
  }
  useEffect(() => {
    if (loading) return;
    // Remember the initial default so a later replacement cannot silently swap
    // the company already being shown in this tab.
    if (experience !== "contractor" && !selected && network[0]) {
      setSelected(network[0].id);
      sessionStorage.setItem(`fieldwork:${experience}:company`, network[0].id);
    }
    if (
      selected &&
      selected !== "__choose_company__" &&
      !network.some((c) => c.id === selected)
    ) {
      setSelected("__choose_company__");
      sessionStorage.setItem(
        `fieldwork:${experience}:company`,
        "__choose_company__",
      );
    }
    if (queueCompany && !state.companies.some((c) => c.id === queueCompany))
      setQueueCompany("__choose_company__");
    else if (
      experience === "operations" &&
      networkScope === "active" &&
      queueCompany &&
      !roleCount(queueCompany)
    )
      setQueueCompany("");
  }, [
    loading,
    state,
    selected,
    queueCompany,
    experience,
    networkScope,
    internalPersona,
  ]);
  function chooseParticipant(participant: QueueParticipant) {
    if (participant === "Simulation") {
      window.location.hash = automationLink(queueCompany).slice(1);
      return;
    }
    setQueueParticipant(participant);
    if (internalPersonas.includes(participant as InternalPersona)) {
      setInternalPersona(participant as InternalPersona);
      sessionStorage.setItem("fieldwork:operations:role", participant);
    }
    setView("Work queue");
    setCreating(false);
    setNotice("");
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void run(async () => {
      const applicationId = await service.submitApplication({
        name: String(f.get("name")),
        contact: String(f.get("contact")),
        email: String(f.get("email")),
        skill: String(f.get("skill")),
      });
      if (experience === "contractor") {
        contractorSession.signOut();
        setSubmitted({
          name: String(f.get("name")),
          email: String(f.get("email")),
        });
      } else {
        const s = await service.getState();
        selectCompany(
          s.applications.find((a) => a.id === applicationId)!.companyId,
        );
      }
      setCreating(false);
      setView("Overview");
    }, "Application submitted. Recruitment review is ready.");
  }
  return (
    <div
      className={`shell experience-${experience}${anonymous ? " anonymous" : ""}`}
    >
      <aside>
        <a
          className="brand"
          href={`#/${experience}`}
          aria-label="Unity fieldwork"
        >
          <img
            className="brand-image"
            src="./assets/unity.png"
            alt="Unity - A Stronger Frontdoor"
            width="267"
            height="331"
          />
          <span className="brand-caption">
            <strong>Unity</strong>
            <small>fieldwork</small>
          </span>
        </a>
        <div className="workspace">
          {experienceNames[experience].toUpperCase()}
        </div>
        <nav>
          {anonymous ? (
            <>
              <button
                onClick={() => {
                  setCreating(true);
                  setNotice("");
                }}
              >
                New application
              </button>
              <button
                aria-label="Open Sign In"
                onClick={() => {
                  setCreating(false);
                  setNotice("");
                }}
              >
                Sign In
              </button>
            </>
          ) : (
            views.map((v) =>
              v === "Work queue" && experience === "operations" ? (
                <OperationsQueueNavigation
                  active={view === "Work queue"}
                  key={v}
                  state={state}
                  participant={queueParticipant}
                  expanded={queueExpanded}
                  onToggle={() => {
                    setQueueExpanded(!queueExpanded);
                    setView("Work queue");
                    setNotice("");
                  }}
                  onSelect={chooseParticipant}
                />
              ) : (
                <button
                  key={v}
                  aria-label={viewName(v)}
                  aria-current={view === v && !creating ? "page" : undefined}
                  className={view === v && !creating ? "nav-active" : ""}
                  onClick={() => {
                    setView(v);
                    setCreating(false);
                    setNotice("");
                  }}
                >
                  <span>
                    {
                      {
                        Overview: "▦",
                        "Work queue": "☷",
                        "Journey Map": "◎",
                        "Recording Triggers": "⊕",
                        "Demo Workspace": "⇄",
                        "Workflow monitor": "☷",
                        "Automations & Integrations": "↗",
                        Outbox: "◫",
                      }[v]
                    }
                  </span>
                  <span>{viewName(v)}</span>
                  {v === "Automations & Integrations" && (
                    <span className="nav-count">
                      {pendingAutomations(state).length}
                    </span>
                  )}
                  {v === "Work queue" && (
                    <span className="nav-count">{allMyTasks.length}</span>
                  )}
                </button>
              ),
            )
          )}
        </nav>
        <div className="aside-bottom">
          <span className="live-dot" /> Browser-local workspace
          <p>Iteration 3.8 · Focus & progress</p>
        </div>
      </aside>
      <div className="main">
        <header>
          <span className="app-identity">
            <img
              className="header-brand-image"
              src="./assets/unity.png"
              alt="Unity"
              width="267"
              height="331"
            />{" "}
            <span className="product-name">
              <strong>Unity</strong> <em>fieldwork</em>
            </span>{" "}
            <b>/</b> {experienceNames[experience]}
          </span>
          {experience === "operations" ? (
            <div className="persona">
              <label htmlFor="persona">Internal role</label>
              <select
                id="persona"
                value={internalPersona}
                onChange={(e) => {
                  const role = e.target.value as InternalPersona;
                  setInternalPersona(role);
                  setQueueParticipant(role);
                  sessionStorage.setItem("fieldwork:operations:role", role);
                  setView("Work queue");
                  setNotice("");
                }}
              >
                {internalPersonas.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
          ) : experience === "contractor" && !anonymous ? (
            <div className="session-controls">
              <span className="experience-badge">{c?.name}</span>
              <button
                className="text-button"
                onClick={() => {
                  contractorSession.signOut();
                  setSubmitted(null);
                  setCreating(false);
                  setView("Overview");
                  setNotice("");
                  setError("");
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <span className="experience-badge">
              {experienceNames[experience]}
            </span>
          )}
        </header>
        <main>
          <div className="title-row">
            <div>
              <div className="eyebrow">A STRONG NETWORK STARTS HERE</div>
              <h1>
                {persona === "Contractor"
                  ? anonymous
                    ? "Your next chapter starts here."
                    : "Your company. Your next step."
                  : persona === "Workflow Monitor"
                    ? "Every step, in view."
                    : "Good people. Great partnerships."}
              </h1>
              <p className="subtitle">
                {persona === "Contractor"
                  ? "One company. Independent skills. A clear path to your first job."
                  : persona === "Workflow Monitor"
                    ? view === "Automations & Integrations"
                      ? "Run simulated integrations and review actions that need attention."
                      : "Watch business events resume durable waits and schedule the next activity."
                    : view === "Work queue"
                      ? `${participantName(queueParticipant)} work. Review outstanding actions across companies.`
                      : `Your ${persona.toLowerCase()} workspace. Complete an action and see the process move.`}
              </p>
            </div>
            {persona === "Contractor" && (
              <button
                className="primary"
                disabled={writeDisabled || loading}
                onClick={() => setCreating(true)}
              >
                ＋ New application
              </button>
            )}
          </div>
          <div className="demo-banner">
            <span>
              <b>SIMULATION</b> Fictional documents and integrations only. No
              real financial or identity data.
            </span>
            <span
              className="sync-status"
              role="status"
              data-testid="sync-status"
              data-revision={state.revision}
            >
              {service.unavailableReason
                ? "Writes disabled"
                : refreshing
                  ? "Syncing…"
                  : "Live · Shared browser state"}{" "}
              · Revision {state.revision}
            </span>
          </div>
          {!anonymous && (
            <div className="stats">
              <div>
                <span>
                  {experience === "contractor"
                    ? "Your onboarding"
                    : "Contractor companies"}
                </span>
                <strong>
                  {experience === "contractor"
                    ? (a?.status ?? "Not started")
                    : String(state.companies.length).padStart(2, "0")}
                </strong>
              </div>
              <div>
                <span>
                  {experience === "monitor"
                    ? "Business events"
                    : experience === "operations"
                      ? "All open work"
                      : "Your open work"}
                </span>
                <strong>
                  {String(
                    experience === "contractor"
                      ? myTasks.length
                      : experience === "monitor"
                        ? state.events.length
                        : openTasks.length,
                  ).padStart(2, "0")}
                  <small>
                    {experience === "monitor"
                      ? "Persisted"
                      : experience === "operations"
                        ? "All participants"
                        : persona}
                  </small>
                </strong>
              </div>
              <div>
                <span>
                  {experience === "contractor"
                    ? "Approved skills"
                    : "Running workflows"}
                </span>
                <strong>
                  {String(
                    experience === "contractor"
                      ? c
                        ? approvedSkills(c.id, state.qualifications).length
                        : 0
                      : state.workflows.filter((w) => w.status === "Running")
                          .length,
                  ).padStart(2, "0")}
                </strong>
              </div>
              <div>
                <span>Eligible for jobs</span>
                <strong>
                  {experience === "contractor"
                    ? eligible
                      ? "Eligible"
                      : "Not eligible"
                    : String(
                        state.companies.filter((c) =>
                          isJobEligible(c, state.qualifications),
                        ).length,
                      ).padStart(2, "0")}
                  {experience !== "contractor" && <small>Ready + Active</small>}
                </strong>
              </div>
            </div>
          )}
          {error && (
            <div role="alert" className="alert">
              {simulationMessage(error)}
            </div>
          )}
          {notice && (
            <div role="status" className="notice">
              ✓ {notice}
            </div>
          )}
          {experience !== "contractor" && selected === "__choose_company__" && (
            <p role="status" className="notice">
              The previously selected company is unavailable in this view.
              Choose a company from Contractor network to continue.
            </p>
          )}
          {experience !== "contractor" && (
            <div className="experience-links">
              <span>Open the other experiences:</span>
              {(["contractor", "operations", "monitor"] as const)
                .filter((x) => x !== experience)
                .map((x) => (
                  <a key={x} href={`#/${x}`} target="_blank" rel="noopener">
                    {experienceNames[x]} ↗
                  </a>
                ))}
            </div>
          )}
          {loading ? (
            <div className="panel empty">
              Restoring your browser-local workspace…
            </div>
          ) : creating ? (
            <section className="panel form-panel">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">LET’S GET ACQUAINTED</div>
                  <h2>Join the contractor network</h2>
                </div>
                <button
                  className="text-button"
                  onClick={() => setCreating(false)}
                >
                  Cancel
                </button>
              </div>
              <form onSubmit={submit}>
                <div className="form-grid">
                  <label>
                    Fictional company name
                    <input
                      name="name"
                      required
                      placeholder="Summit Home Services"
                    />
                  </label>
                  <label>
                    Contact name
                    <input name="contact" required placeholder="Alex Rivers" />
                  </label>
                  <label>
                    Application email
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="alex@example.com"
                    />
                  </label>
                  <label>
                    Initial requested skill
                    <select name="skill">
                      {skillCatalog.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="muted">
                  One-person companies welcome. Use fictional test data
                  throughout this prototype.
                </p>
                <button disabled={writeDisabled} className="primary">
                  Submit application →
                </button>
              </form>
            </section>
          ) : anonymous ? (
            <ContractorAccess
              key={submitted?.email ?? "welcome"}
              companies={state.companies}
              submitted={submitted}
              onApply={() => {
                setCreating(true);
                setNotice("");
              }}
              loading={loading}
              onSignIn={(companyId) => {
                contractorSession.signIn(companyId);
                setSubmitted(null);
                setView("Overview");
                setNotice("");
                setError("");
              }}
            />
          ) : experience === "monitor" && view === "Recording Triggers" ? (
            <Suspense
              fallback={
                <div className="panel empty">Opening Recording Triggers...</div>
              }
            >
              <TriggerManager
                state={state}
                service={service}
                run={run}
                busy={writeDisabled}
              />
            </Suspense>
          ) : experience === "monitor" && view === "Demo Workspace" ? (
            <Suspense
              fallback={
                <div className="panel empty">Opening Demo Workspace...</div>
              }
            >
              <DemoWorkspace
                state={state}
                service={service}
                run={run}
                busy={writeDisabled}
              />
            </Suspense>
          ) : experience === "monitor" && view === "Journey Map" ? (
            <VizBoundary key={state.workspaceEpoch ?? "original"}>
              <Suspense
                fallback={
                  <div className="panel empty">Opening Journey Map...</div>
                }
              >
                <JourneyMap
                  state={state}
                  service={service}
                  run={run}
                  busy={writeDisabled}
                />
              </Suspense>
            </VizBoundary>
          ) : experience === "monitor" &&
            view === "Automations & Integrations" ? (
            <AutomationQueue
              state={state}
              service={service}
              run={run}
              busy={writeDisabled}
              companyId={routeContext.companyId}
              activityId={routeContext.activityId}
              onCompanyChange={(id) => {
                window.location.hash = automationLink(id).slice(1);
              }}
            />
          ) : (
            <div
              className={`content-grid${experience === "contractor" ? " contractor-workspace" : ""}`}
            >
              {experience !== "contractor" && (
                <section className="panel applications">
                  <div className="section-heading">
                    <h2>Contractor network</h2>
                    <span className="pill neutral">{network.length}</span>
                  </div>
                  {experience === "operations" && (
                    <div
                      className="network-scope"
                      role="group"
                      aria-label="Contractor network view"
                    >
                      <button
                        className="secondary"
                        aria-pressed={networkScope === "active"}
                        onClick={() => chooseNetworkScope("active")}
                      >
                        My active work
                      </button>
                      <button
                        className="secondary"
                        aria-pressed={networkScope === "all"}
                        onClick={() => chooseNetworkScope("all")}
                      >
                        All companies
                      </button>
                      <small>
                        {internalPersona} open work · global queue totals
                        include all participants
                      </small>
                    </div>
                  )}
                  {!network.length &&
                  state.companies.length > 0 &&
                  experience === "operations" ? (
                    <div className="empty">
                      <h3>No active work for {internalPersona}.</h3>
                      <p>
                        Other participants may still have work. Your list
                        includes only your open tasks.
                      </p>
                      <button
                        className="secondary"
                        onClick={() => chooseNetworkScope("all")}
                      >
                        Show all companies
                      </button>
                    </div>
                  ) : !state.companies.length ? (
                    <div className="empty">
                      <div className="empty-icon">↗</div>
                      <h3>A fresh start.</h3>
                      <p>
                        Apply as Contractor to begin an end-to-end onboarding
                        journey.
                      </p>
                    </div>
                  ) : (
                    network.map((company) => {
                      const app = state.applications.find(
                          (a) => a.companyId === company.id,
                        ),
                        count =
                          experience === "operations"
                            ? roleCount(company.id)
                            : allMyTasks.filter(
                                (t) => t.companyId === company.id,
                              ).length;
                      return (
                        <button
                          className={
                            "application-row " +
                            (c?.id === company.id ? "selected" : "")
                          }
                          key={company.id}
                          onClick={() => selectCompany(company.id)}
                        >
                          <div className="avatar">
                            {company.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <strong>{company.name}</strong>
                            <span>
                              {app?.skill} · {count} task
                              {count === 1 ? "" : "s"}
                              {experience === "operations"
                                ? ` open for ${internalPersona}`
                                : " for you"}
                            </span>
                            <span
                              className={
                                "pill " +
                                (app?.status === "Declined" ? "red" : "")
                              }
                            >
                              {app?.status === "Completed"
                                ? "Onboarding complete"
                                : app?.status}{" "}
                              ·{" "}
                              {isJobEligible(company, state.qualifications)
                                ? "Eligible"
                                : "Not eligible"}
                            </span>
                          </div>
                          <span className="arrow">↗</span>
                        </button>
                      );
                    })
                  )}
                  <div className="queue-help">
                    <strong>One state, three experiences.</strong>
                    <p>
                      Keep Contractor Portal, Operations and Monitor open
                      together. Saved actions update every tab.
                    </p>
                  </div>
                </section>
              )}
              <section className="panel details">
                {c && a ? (
                  <>
                    <div className="section-heading">
                      <div>
                        <div className="eyebrow">
                          COMPANY · {c.id.slice(0, 8)}
                        </div>
                        <h2>{c.name}</h2>
                      </div>
                      <span
                        className={
                          "pill " + (a.status === "Declined" ? "red" : "")
                        }
                      >
                        {eligible
                          ? "Eligible for jobs"
                          : a.status === "Declined"
                            ? "Declined"
                            : "Not eligible for jobs"}
                      </span>
                    </div>
                    <div className="contact-line">
                      {c.contact} <span>·</span> {c.email}
                    </div>
                    <LifecycleStatus
                      company={c}
                      application={a}
                      state={state}
                    />
                    {!eligible &&
                      experience !== "monitor" &&
                      view !== "Overview" && (
                        <button
                          className="text-button eligibility-link"
                          onClick={() => setView("Overview")}
                        >
                          See eligibility requirements and next actions
                        </button>
                      )}
                    <div className="page-tabs">
                      {views.map((v) => (
                        <button
                          className={view === v ? "active" : ""}
                          key={v}
                          onClick={() => setView(v)}
                        >
                          {viewName(v)}
                          {v === "Work queue"
                            ? ` (${experience === "operations" ? openTasks.length : myTasks.length})`
                            : ""}
                        </button>
                      ))}
                    </div>
                    {view === "Overview" && (
                      <>
                        <EligibilityGuidance
                          state={state}
                          company={c}
                          application={a}
                          contractorView={experience === "contractor"}
                          onOpenWork={(owner, activityId) => {
                            if (
                              owner === "Simulation" &&
                              experience === "operations"
                            ) {
                              window.location.hash = automationLink(
                                c.id,
                                activityId,
                              ).slice(1);
                              return;
                            }
                            if (experience === "operations") {
                              chooseParticipant(owner);
                              setQueueCompany(c.id);
                              setQueueExpanded(true);
                            } else setView("Work queue");
                          }}
                        />
                        <div
                          className={
                            "readiness-banner " + (eligible ? "ready" : "")
                          }
                        >
                          <div className="readiness-symbol">
                            {eligible ? "✓" : "◷"}
                          </div>
                          <div>
                            <h3>
                              {eligible
                                ? "Eligible to receive jobs"
                                : ready
                                  ? c.activationStatus === "Suspended"
                                    ? "Ready, but operationally suspended"
                                    : "Ready; initial activation pending"
                                  : a.status === "Completed"
                                    ? "Not ready; onboarding remains completed"
                                    : "Building a ready-to-work partnership"}
                            </h3>
                            <p>
                              {ready
                                ? `${approvedSkills(c.id, state.qualifications).length} approved skill(s). Job eligibility requires current readiness and Active operational status. Current operational status: ${c.activationStatus}.`
                                : `${checks.filter((x) => x.complete).length} of 4 readiness requirements complete. Every condition is required.`}
                            </p>
                          </div>
                        </div>
                        <div className="readiness-grid">
                          {checks.map((check) => (
                            <div key={check.label}>
                              <span
                                className={
                                  check.complete ? "checked" : "unchecked"
                                }
                              >
                                {check.complete ? "✓" : "○"}
                              </span>
                              <span>{check.label}</span>
                              <small>
                                {check.complete ? "Complete" : "Pending"}
                              </small>
                            </div>
                          ))}
                        </div>
                        <div className="info-grid">
                          <div>
                            <span>Application history</span>
                            <strong>
                              {a.status} · {a.id.slice(0, 8)}
                            </strong>
                          </div>
                          <div>
                            <span>Vendor reference</span>
                            <strong>
                              {c.vendorReference ?? "Not provisioned"}
                            </strong>
                          </div>
                          <div>
                            <span>Next participants</span>
                            <strong>
                              {[
                                ...new Set(
                                  tasks.map((t) =>
                                    t.owner === "Simulation"
                                      ? "Automations & Integrations"
                                      : t.owner,
                                  ),
                                ),
                              ].join(", ") || "No outstanding work"}
                            </strong>
                          </div>
                          <div>
                            <span>Onboarding completed at</span>
                            <strong>
                              {a.completedAt
                                ? new Date(a.completedAt).toLocaleString()
                                : a.status === "Completed"
                                  ? "Historical completion recorded"
                                  : "Not completed"}
                            </strong>
                          </div>
                        </div>
                        {a.reason && (
                          <div className="callout">
                            <strong>
                              {a.status === "Information requested"
                                ? "Information requested"
                                : a.status === "Declined"
                                  ? "Decline reason"
                                  : "Screening note"}
                            </strong>
                            <p>{a.reason}</p>
                          </div>
                        )}
                        {a.responses.map((r, i) => (
                          <div className="response" key={i}>
                            <strong>Contractor response</strong>
                            <p>{r.text}</p>
                            <small>{new Date(r.at).toLocaleString()}</small>
                          </div>
                        ))}
                        <h3>
                          Administrative requirements{" "}
                          <span className="muted">· independent of skills</span>
                        </h3>
                        {state.requirements.filter((r) => r.companyId === c.id)
                          .length ? (
                          <div className="requirement-list">
                            {state.requirements
                              .filter((r) => r.companyId === c.id)
                              .map((r) => (
                                <div key={r.id}>
                                  <strong>
                                    {r.type === "Financial"
                                      ? "Fictional tax / banking"
                                      : r.type}
                                  </strong>
                                  <span className="pill neutral">
                                    {r.status}
                                  </span>
                                  {r.outcome && (
                                    <small>
                                      {simulationMessage(r.outcome)}
                                    </small>
                                  )}
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="muted">
                            Administrative work is scheduled after Recruitment
                            proceeds.
                          </p>
                        )}
                        <div className="section-heading">
                          <h3>Company skills</h3>
                          <span className="pill neutral">
                            {approvedSkills(c.id, state.qualifications).length}{" "}
                            approved
                          </span>
                        </div>
                        <div className="skills">
                          {qualifications.map((q) => (
                            <article key={q.id}>
                              <div className="section-heading">
                                <strong>{q.skill}</strong>
                                <span
                                  className={
                                    "pill " +
                                    (q.status === "Rejected" ||
                                    q.status === "Invalidated"
                                      ? "red"
                                      : "")
                                  }
                                >
                                  {q.status}
                                </span>
                              </div>
                              <small>
                                {q.originatingApplicationId
                                  ? "Initial application skill"
                                  : "Additional company skill · independent lifecycle"}
                              </small>
                              {q.reason && <p>{q.reason}</p>}
                              {persona === "Compliance" &&
                                q.status === "Approved" && (
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      const f = new FormData(e.currentTarget);
                                      void run(
                                        () =>
                                          service.invalidateSkill(
                                            q.id,
                                            String(f.get("reason")),
                                          ),
                                        "Approval invalidated. Readiness reevaluated without restarting onboarding.",
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
                                    <button
                                      disabled={writeDisabled}
                                      className="secondary danger"
                                    >
                                      Invalidate skill approval
                                    </button>
                                  </form>
                                )}
                            </article>
                          ))}
                          {!qualifications.length && (
                            <p className="muted">
                              Initial skill qualification starts after
                              screening.
                            </p>
                          )}
                        </div>
                        {persona === "Contractor" &&
                          ready &&
                          c.activationStatus === "Active" && (
                            <form
                              className="add-skill"
                              onSubmit={(e) => {
                                e.preventDefault();
                                const skill = String(
                                  new FormData(e.currentTarget).get("skill"),
                                );
                                void run(
                                  () => service.requestSkill(c.id, skill),
                                  "Independent skill workflow started. Company onboarding was not restarted.",
                                );
                              }}
                            >
                              <label>
                                Add another company skill
                                <select name="skill">
                                  {skillCatalog.map((s) => (
                                    <option key={s}>{s}</option>
                                  ))}
                                </select>
                              </label>
                              <button
                                disabled={writeDisabled}
                                className="secondary"
                              >
                                ＋ Request qualification
                              </button>
                            </form>
                          )}
                        <div className="section-heading">
                          <h3>Your next actions</h3>
                          <button
                            className="text-button"
                            onClick={() => setView("Work queue")}
                          >
                            {experience === "contractor"
                              ? "Open your actions →"
                              : "Open work queue →"}
                          </button>
                        </div>
                        {myTasks.length ? (
                          <div className="work-list">
                            {myTasks.map((t) => (
                              <div key={t.id}>
                                <span className="work-symbol">○</span>
                                <div>
                                  <strong>{activityLabel(t.activity)}</strong>
                                  <small>
                                    {experience === "contractor"
                                      ? "Action needed from you"
                                      : `${t.owner} · ${t.expectedOutcome}`}
                                  </small>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="muted">
                            No open actions for {persona}.{" "}
                            {tasks.length
                              ? `Next: ${[...new Set(tasks.map((t) => (t.owner === "Simulation" ? "Operations" : t.owner)))].join(", ")}.`
                              : "This company has no outstanding work."}
                          </p>
                        )}
                        <details>
                          <summary>
                            Evidence register ·{" "}
                            {
                              state.evidence.filter((e) => e.companyId === c.id)
                                .length
                            }{" "}
                            versions retained
                          </summary>
                          {state.evidence
                            .filter((e) => e.companyId === c.id)
                            .map((e) => (
                              <div className="evidence-record" key={e.id}>
                                <strong>{e.description}</strong>
                                <small>
                                  Version {e.version} · {e.verificationState} ·{" "}
                                  {new Date(e.submittedAt).toLocaleString()}
                                </small>
                              </div>
                            ))}
                        </details>
                        {experience !== "contractor" && (
                          <details>
                            <summary>Screening decision history</summary>
                            {a.screeningDecisions.map((d, i) => (
                              <p key={i}>
                                {d.decision} · {d.reason || "No note"} ·{" "}
                                {new Date(d.at).toLocaleString()}
                              </p>
                            ))}
                          </details>
                        )}
                      </>
                    )}
                    {view === "Work queue" && experience !== "operations" && (
                      <>
                        <div className="section-heading">
                          <h3>{persona} work queue</h3>
                          <span className="pill neutral">
                            {myTasks.length} open
                          </span>
                        </div>
                        <p className="muted">
                          {experience === "contractor"
                            ? "Required actions for your signed-in company."
                            : "Tasks for the selected company. Switch companies on the left to see their work."}
                        </p>
                        {myTasks.map((t) => (
                          <TaskCard
                            key={t.id}
                            task={t}
                            state={state}
                            service={service}
                            run={run}
                            busy={writeDisabled}
                          />
                        ))}
                        {!myTasks.length && (
                          <div className="empty">
                            <div className="empty-icon">✓</div>
                            <h3>You’re all caught up here.</h3>
                            <p>
                              {tasks.length
                                ? `The next participant is ${[...new Set(tasks.map((t) => (t.owner === "Simulation" ? "Operations" : t.owner)))].join(" / ")}.`
                                : "No outstanding actions for this company."}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    {experience === "monitor" &&
                      view === "Workflow monitor" && (
                        <WorkflowMonitor
                          state={state}
                          companyId={c.id}
                          service={service}
                          run={run}
                          busy={writeDisabled}
                        />
                      )}
                    {view === "Outbox" && (
                      <>
                        <div className="section-heading">
                          <h3>In-app notification outbox</h3>
                          <span className="pill neutral">
                            {messages.length}
                          </span>
                        </div>
                        <p className="muted">
                          Simulated notifications only. No email or SMS is sent.
                        </p>
                        {[...messages].reverse().map((m) => (
                          <div className="outbox-message" key={m.id}>
                            <span
                              className={
                                "pill " +
                                (m.kind === "Escalation" ? "red" : "neutral")
                              }
                            >
                              {m.kind}
                            </span>
                            <strong>To {m.recipient}</strong>
                            <p>{m.message}</p>
                            <small>
                              {new Date(m.at).toLocaleString()}
                              {m.workItemId
                                ? ` · Work ${m.workItemId.slice(0, 8)}`
                                : ""}
                            </small>
                          </div>
                        ))}
                      </>
                    )}
                    {experience === "monitor" &&
                      view === "Workflow monitor" && (
                        <DiagnosticPanel title="Timer & escalation lab">
                          <p>
                            Current simulation time:{" "}
                            {new Date(state.clock).toLocaleString()}
                          </p>
                          <p>
                            Human work is due after 2 simulation days. A
                            reminder fires when due; escalation follows 2 days
                            later. Advancing time does not complete work.
                          </p>
                          <div className="button-row">
                            <button
                              disabled={writeDisabled}
                              className="secondary"
                              onClick={() =>
                                run(
                                  () => service.advanceTime(3),
                                  "Simulation clock advanced 3 days. Due reminders recorded in the outbox.",
                                )
                              }
                            >
                              Advance 3 days
                            </button>
                            <button
                              disabled={writeDisabled}
                              className="secondary"
                              onClick={() =>
                                run(
                                  () => service.advanceTime(2),
                                  "Simulation clock advanced 2 days. Eligible escalations recorded in the outbox.",
                                )
                              }
                            >
                              Advance 2 days
                            </button>
                          </div>
                        </DiagnosticPanel>
                      )}
                  </>
                ) : experience === "operations" && view === "Work queue" ? (
                  <div className="queue-selection-empty">
                    <h3>Choose a company for its details.</h3>
                    <p>
                      Your current work is listed below. Select a company from
                      Contractor network to inspect its status.
                    </p>
                  </div>
                ) : (
                  <div className="empty large">
                    <div className="empty-icon">◎</div>
                    <h2>
                      {experience === "operations"
                        ? "Choose a company to inspect."
                        : "A clear path to getting started."}
                    </h2>
                    <p>
                      {experience === "operations"
                        ? "Your previous selection is no longer in this view. Choose from your current work or show all companies."
                        : "Submit a fictional company application as Contractor."}
                      <br />
                      Then follow its events all the way to Ready.
                    </p>
                    <div className="mini-steps">
                      Apply <span>→</span> Qualify <span>→</span> Ready
                    </div>
                  </div>
                )}
                {view === "Work queue" && experience === "operations" && (
                  <OperationsWorkQueue
                    state={state}
                    participant={queueParticipant}
                    executionRole={internalPersona}
                    companyId={queueCompany}
                    service={service}
                    run={run}
                    busy={writeDisabled}
                    onCompanyChange={(companyId) => {
                      setQueueCompany(companyId);
                      if (companyId) selectCompany(companyId);
                    }}
                    onOverview={(companyId) => {
                      selectCompany(companyId);
                      setView("Overview");
                    }}
                  />
                )}
              </section>
            </div>
          )}
          <footer>
            <span>
              <span className="live-dot" /> Saved in this browser · Live across
              tabs
            </span>
            <span>
              Educational Temporal-style simulation · No external services
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
