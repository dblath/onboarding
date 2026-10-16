import {
  activityDefinitions,
  isJobEligible,
  isReady,
  readinessChecks,
  type Activity,
  type ContractorCompany,
  type OnboardingApplication,
  type Role,
  type State,
} from "./domain";

const prerequisiteActivities: Activity[][] = [
  [
    "SubmitInsurance",
    "SubmitFinancial",
    "SubmitAgreement",
    "ReviewInsurance",
    "ReviewFinancial",
    "ExecuteAgreement",
  ],
  ["CreateVendor", "SetupPortal"],
  ["CompleteTraining", "ConfirmTraining"],
  ["SubmitLicense", "VerifyLicense", "ApproveSkill"],
];
const actionNames: Partial<Record<Activity, string>> = {
  CreateVendor: "Set up the company vendor record",
  PublishActivation: "Publish contractor activation",
  SubmitFinancial: "Provide the financial documents",
  ReviewFinancial: "Review the financial documents",
  ExecuteAgreement: "Complete agreement review",
  SetupPortal: "Complete portal setup",
};
const ownerName = (owner: Role) =>
  owner === "Simulation" ? "Operations" : owner;

export function EligibilityGuidance({
  state,
  company,
  application,
  onOpenWork,
  contractorView = false,
}: {
  state: State;
  company: ContractorCompany;
  application: OnboardingApplication;
  onOpenWork?: (owner: Role) => void;
  contractorView?: boolean;
}) {
  if (isJobEligible(company, state.qualifications)) return null;
  const ready = isReady(company, state.qualifications);
  const suspended = company.activationStatus === "Suspended";
  const tasks = state.workItems.filter(
    (task) => task.companyId === company.id && task.status === "Open",
  );
  const activation = tasks.find(
    (task) => task.activity === "PublishActivation",
  );
  const screening = tasks.filter((task) =>
    ["ScreenApplication", "ProvideInformation"].includes(task.activity),
  );
  const checks = readinessChecks(state, company);
  const summary =
    application.status === "Declined"
      ? "This application was declined. The company is not eligible and has no onboarding actions available."
      : suspended
        ? "This company is suspended and cannot receive jobs, even when all requirements are complete."
        : ready && activation
          ? "All requirements are complete. Contractor activation is awaiting publication by Operations."
          : ready
            ? "All requirements are complete, but contractor activation has not been published. No publication action is currently available; Operations needs to review this company."
            : "This company cannot receive jobs until the outstanding requirements below are complete.";
  const action = (task: (typeof tasks)[number]) => (
    <li key={task.id}>
      <span>
        {actionNames[task.activity] ?? activityDefinitions[task.activity].label}{" "}
        — <strong>{ownerName(task.owner)}</strong>
      </span>
      {onOpenWork && (!contractorView || task.owner === "Contractor") && (
        <button className="text-button" onClick={() => onOpenWork(task.owner)}>
          View {ownerName(task.owner)} action
        </button>
      )}
    </li>
  );
  return (
    <section
      className="eligibility-guidance"
      aria-label="Eligibility blockers"
      data-testid="eligibility-guidance"
    >
      <h3>What is needed before jobs?</h3>
      <p className="eligibility-summary">{summary}</p>
      <div className="eligibility-flags">
        <span>
          Suspended: <strong>{suspended ? "Yes" : "No"}</strong>
        </span>
        <span>
          Activation publication:{" "}
          <strong>
            {activation ? "Pending with Operations" : "Not pending"}
          </strong>
        </span>
      </div>
      {screening.length > 0 && (
        <div>
          <strong>Application review is outstanding</strong>
          <ul>{screening.map(action)}</ul>
        </div>
      )}
      {!ready && (
        <ul className="eligibility-prerequisites">
          {checks.map((check, index) => {
            if (check.complete) return null;
            const next = tasks.filter((task) =>
              prerequisiteActivities[index].includes(task.activity),
            );
            const fallback =
              index === 0
                ? application.status === "Screening" ||
                  application.status === "Information requested"
                  ? "Administrative approval follows application review by Recruitment."
                  : "Administrative approval is incomplete. No administrative action is currently available; Operations needs to review this company."
                : index === 1
                  ? "Contractor portal setup follows administrative approval and vendor setup by Operations."
                  : index === 2
                    ? "The contractor completes initial training after portal setup; Training then confirms it."
                    : application.status === "Screening" ||
                        application.status === "Information requested"
                      ? "Skill assessment begins after application review by Recruitment."
                      : "No approved company skill is available. Qualification recovery has not been implemented; there is no action available to bypass this requirement.";
            return (
              <li key={check.label}>
                <strong>{check.label} — outstanding</strong>
                {next.length ? (
                  <ul>{next.map(action)}</ul>
                ) : (
                  <p>
                    {application.status === "Declined"
                      ? "This application was declined; no onboarding action is available."
                      : fallback}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {activation && <ul>{action(activation)}</ul>}
      {suspended && (
        <p>
          Removing suspension requires a separate administrative request and
          approval. That process and its responsible approval role are not yet
          implemented. Completing qualifications does not remove suspension.
        </p>
      )}
    </section>
  );
}
