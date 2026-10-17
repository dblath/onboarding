import {
  isJobEligible,
  isReady,
  type State,
  type ContractorCompany,
  type OnboardingApplication,
  type Activity,
  type WorkItem,
} from "./domain";
import { activityLabel } from "./presentation";

export type JourneyStatus =
  | "Complete"
  | "Waiting on you"
  | "Waiting on another team"
  | "Requires correction"
  | "Blocked"
  | "Not yet started";
export const contractorOwner = (owner: WorkItem["owner"]) =>
  owner === "Simulation" ? "Operations" : owner;
const actionLabels: Partial<Record<Activity, string>> = {
  ScreenApplication: "Review your application",
  ReviewInsurance: "Review your insurance documents",
  ReviewFinancial: "Review your financial documents",
  ExecuteAgreement: "Review your contractor agreement",
  VerifyLicense: "Check your skill evidence",
  ApproveSkill: "Approve your skill qualification",
  ConfirmTraining: "Confirm your initial training",
  SubmitInsurance: "Send your insurance documents",
  SubmitFinancial: "Send your financial documents",
  SubmitAgreement: "Send your contractor agreement",
  SubmitLicense: "Send your skill evidence",
  SetupPortal: "Set up your company profile",
  CompleteTraining: "Complete your initial training",
  ProvideInformation: "Respond to Recruitment",
  CreateVendor: "Set up the company vendor record",
  PublishActivation: "Publish contractor activation",
};
export const contractorAction = (task: WorkItem) =>
  actionLabels[task.activity] ?? activityLabel(task.activity);

/** Presentation only: authoritative facts and Open owned work; never schedules or mutates work. */
export function contractorJourney(
  s: State,
  c: ContractorCompany,
  a: OnboardingApplication,
) {
  const open = s.workItems.filter(
    (t) => t.companyId === c.id && t.status === "Open",
  );
  const requirements = s.requirements.filter((r) => r.companyId === c.id);
  const qualifications = s.qualifications.filter((q) => q.companyId === c.id);
  const initial = qualifications.filter(
    (q) => q.originatingApplicationId === a.id,
  );
  const correction = (t: WorkItem) =>
    requirements.some(
      (r) => r.id === t.requirementId && r.status === "Correction required",
    ) ||
    qualifications.some(
      (q) => q.id === t.qualificationId && q.status === "Correction required",
    );
  const mine = open
    .filter((t) => t.owner === "Contractor")
    .sort((x, y) => Number(correction(y)) - Number(correction(x)));
  const others = open.filter((t) => t.owner !== "Contractor");
  const ready = isReady(c, s.qualifications),
    eligible = isJobEligible(c, s.qualifications);
  const historical = a.status === "Completed",
    declined = a.status === "Declined";
  const reviewed =
    !["Screening", "Information requested"].includes(a.status) && !declined;
  function stage(
    key: string,
    title: string,
    activities: Activity[],
    complete: boolean,
    available: boolean,
    detail: string,
    blocked = false,
    initialOnly = false,
  ) {
    const work = open.filter(
      (t) =>
        activities.includes(t.activity) &&
        (!initialOnly || initial.some((q) => q.id === t.qualificationId)),
    );
    const status: JourneyStatus =
      historical || complete
        ? "Complete"
        : declined
          ? key === "application"
            ? "Blocked"
            : "Not yet started"
          : blocked
            ? "Blocked"
            : work.some(correction)
              ? "Requires correction"
              : work.some((t) => t.owner === "Contractor")
                ? "Waiting on you"
                : work.length
                  ? "Waiting on another team"
                  : available
                    ? "Blocked"
                    : "Not yet started";
    return {
      key,
      title,
      status,
      work,
      detail: historical
        ? "Completed during your original onboarding."
        : declined
          ? "Not required for a declined application."
          : detail,
    };
  }
  const stages = [
    stage(
      "application",
      "Application review",
      ["ScreenApplication", "ProvideInformation"],
      reviewed,
      true,
      a.status === "Information requested"
        ? "Recruitment needs a little more information from you."
        : reviewed
          ? "Recruitment approved your application."
          : "Recruitment is reviewing your company application.",
      declined,
    ),
    stage(
      "administration",
      "Company documents",
      [
        "SubmitInsurance",
        "SubmitFinancial",
        "SubmitAgreement",
        "ReviewInsurance",
        "ReviewFinancial",
        "ExecuteAgreement",
      ],
      c.adminComplete,
      reviewed,
      "Insurance, financial documents and your agreement. These checks can run alongside skill qualification.",
    ),
    stage(
      "skills",
      "Skill qualification",
      ["SubmitLicense", "VerifyLicense", "ApproveSkill"],
      initial.some((q) => q.status === "Approved"),
      reviewed,
      "Your initial skill evidence is reviewed by Compliance, then approved by the Field Manager.",
      initial.some((q) => ["Rejected", "Invalidated"].includes(q.status)),
      true,
    ),
    stage(
      "setup",
      "Company setup",
      ["CreateVendor", "SetupPortal"],
      c.portalSetupComplete,
      c.adminComplete,
      "After document approval, Operations creates your vendor record. Then you set up your company profile.",
    ),
    stage(
      "training",
      "Initial training",
      ["CompleteTraining", "ConfirmTraining"],
      c.initialTrainingComplete,
      c.portalSetupComplete,
      "Complete your induction after profile setup. The Training team then confirms it.",
    ),
    stage(
      "activation",
      "Activation",
      ["PublishActivation"],
      false,
      ready,
      "All current readiness requirements must be met before Operations publishes your activation.",
    ),
  ];
  const initialRejected =
    !historical &&
    !qualifications.some((q) => q.status === "Approved") &&
    initial.some((q) => q.status === "Rejected");
  const title = declined
    ? "Your application wasn't approved"
    : c.activationStatus === "Suspended"
      ? "Your company is suspended"
      : eligible
        ? "You're ready for your next job"
        : ready
          ? "You're ready. Activation is next."
          : mine.some(correction)
            ? "A few details need updating"
            : mine.length
              ? "Let's get your company ready"
              : historical
                ? "Your current qualifications need attention"
                : initialRejected
                  ? "Your qualification needs attention"
                  : "You're moving forward";
  const summary = declined
    ? "Recruitment has declined this application. Review the decision below; no onboarding actions are available."
    : c.activationStatus === "Suspended"
      ? "This company is suspended and cannot receive jobs, even when all requirements are complete. Removing suspension requires a separate administrative request and approval; that process is not yet available."
      : ready && !eligible
        ? open.some((t) => t.activity === "PublishActivation")
          ? "All requirements are complete. Contractor activation is awaiting publication by Operations."
          : "All requirements are complete. Operations needs to review activation; no publication action is currently available."
        : eligible
          ? "Your company can receive jobs. Your onboarding is complete; new skill requests stay separate."
          : mine.length
            ? "Complete the actions below. We'll keep you up to date as each team reviews your information."
            : initialRejected
              ? "The initial skill was rejected. No qualification recovery action is currently available. Contact Operations to discuss the next step; approval cannot be bypassed."
              : others.length
                ? "No action needed from you right now. The next steps are with the teams below."
                : "No action is available right now. Operations needs to review the outstanding requirements.";
  return {
    mine,
    others,
    stages,
    ready,
    eligible,
    historical,
    declined,
    initialRejected,
    title,
    summary,
    correction,
    qualifications,
    requirements,
  };
}
