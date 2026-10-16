import {
  approvedSkills,
  isJobEligible,
  isReady,
  type ContractorCompany,
  type OnboardingApplication,
  type State,
} from "./domain";

/** Historical completion, current facts, operational approval and eligibility are independent. */
export function LifecycleStatus({
  company: c,
  application: a,
  state: s,
}: {
  company: ContractorCompany;
  application: OnboardingApplication;
  state: State;
}) {
  const ready = isReady(c, s.qualifications),
    eligible = isJobEligible(c, s.qualifications);
  const firstSkillRejected =
    a.status !== "Completed" &&
    !approvedSkills(c.id, s.qualifications).length &&
    s.qualifications.some(
      (q) => q.companyId === c.id && q.status === "Rejected",
    );
  return (
    <section className="lifecycle-status" aria-label="Contractor lifecycle">
      <dl className="lifecycle-grid">
        <div>
          <dt>Onboarding history</dt>
          <dd data-testid="lifecycle-onboarding">
            {a.status === "Completed"
              ? "Completed"
              : a.status === "Declined"
                ? "Declined"
                : "In progress"}
          </dd>
        </div>
        <div>
          <dt>Current readiness</dt>
          <dd data-testid="lifecycle-readiness">
            {ready ? "Ready" : "Not ready"}
          </dd>
        </div>
        <div>
          <dt>Operational status</dt>
          <dd data-testid="lifecycle-operational">{c.activationStatus}</dd>
        </div>
        <div>
          <dt>Job eligibility</dt>
          <dd data-testid="lifecycle-eligibility">
            {eligible ? "Eligible" : "Not eligible"}
          </dd>
        </div>
      </dl>
      {c.activationStatus === "Suspended" && (
        <p className="suspension-notice">
          Operational suspension remains in force, even if readiness is
          restored. Removing it requires a separate administrative request and
          approval in Iteration 4. That process is not available in this
          iteration.
        </p>
      )}
      {firstSkillRejected && (
        <p className="suspension-notice">
          The initial skill was rejected. Onboarding remains in progress and job
          eligibility is not granted. Qualification recovery is deferred to
          Iteration 4; no restart or automatic activation has been created.
        </p>
      )}
    </section>
  );
}
