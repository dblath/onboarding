import {
  isReady,
  isJobEligible,
  type State,
  type BusinessEvent,
} from "./domain";
import { contractorJourney, contractorOwner } from "./contractorJourney";
import { businessActivityLabel } from "./presentation";
import { recordingStatus } from "./viz/triggers";

/** Read-only company projection; no history-text inference or persisted UI state. */
export function monitorCompanies(state: State) {
  return state.companies.map((company) => {
    const application = state.applications.find(
      (a) => a.companyId === company.id,
    )!;
    const workflows = state.workflows.filter((w) => w.companyId === company.id);
    const root = workflows.find((w) => w.definitionId === "CompanyOnboarding");
    const work = state.workItems.filter(
      (t) => t.companyId === company.id && t.status === "Open",
    );
    const failures = work.filter(
      (t) =>
        state.attempts.filter((a) => a.workItemId === t.id).at(-1)?.status ===
        "Failed",
    );
    const qualifications = state.qualifications.filter(
      (q) => q.companyId === company.id,
    );
    const corrections = state.requirements.filter(
      (r) => r.companyId === company.id && r.status === "Correction required",
    );
    const skillCorrections = qualifications.filter(
      (q) => q.status === "Correction required",
    );
    const recordings = (state.viz?.recordings ?? []).filter(
      (r) => r.companyId === company.id,
    );
    const captureIssues = recordings.filter(
      (r) => recordingStatus(state, r) === "Capture issue",
    );
    const running = root?.status === "Running";
    const historical = application.status === "Completed";
    const ready = isReady(company, state.qualifications);
    const eligible = isJobEligible(company, state.qualifications);
    const publication = work.find((t) => t.activity === "PublishActivation");
    const independent = qualifications.filter(
      (q) => !q.originatingApplicationId,
    );
    const activeSkills = workflows.filter(
      (w) =>
        w.definitionId === "SkillQualification" &&
        w.status === "Running" &&
        independent.some((q) => q.id === w.qualificationId),
    );
    const qualificationGap =
      !ready &&
      qualifications.some((q) =>
        ["Rejected", "Invalidated"].includes(q.status),
      );
    const attention = !!(
      failures.length ||
      corrections.length ||
      skillCorrections.length ||
      publication ||
      captureIssues.length ||
      company.activationStatus === "Suspended" ||
      qualificationGap
    );
    const model = contractorJourney(state, company, application);
    const status =
      company.activationStatus === "Suspended"
        ? "Suspended — eligibility unavailable"
        : publication && ready
          ? "Ready — activation awaiting publication"
          : historical
            ? activeSkills.length
              ? "Onboarding complete · additional qualification underway"
              : eligible
                ? "Onboarding complete · eligible for jobs"
                : "Onboarding complete · current requirements outstanding"
            : failures.length
              ? "Verification needs a retry"
              : corrections.length || skillCorrections.length
                ? "Contractor correction needed"
                : qualificationGap
                  ? "Qualifications need review"
                  : application.status === "Screening"
                    ? "Application awaiting Recruitment"
                    : application.status === "Information requested"
                      ? "Recruitment is waiting for a response"
                      : application.status === "Declined"
                        ? "Application declined"
                        : "Onboarding in progress";
    return {
      company,
      application,
      workflows,
      root,
      work,
      failures,
      corrections,
      skillCorrections,
      recordings,
      captureIssues,
      running,
      historical,
      ready,
      eligible,
      publication,
      independent,
      activeSkills,
      qualificationGap,
      attention,
      active: running || !!activeSkills.length || attention,
      model,
      status,
    };
  });
}

export function monitorSummary(state: State) {
  const companies = monitorCompanies(state);
  return {
    inProgress: companies.filter((c) => c.running).length,
    attention: companies.filter((c) => c.attention).length,
    retries: companies.reduce((n, c) => n + c.failures.length, 0),
    activation: companies.filter((c) => c.ready && c.publication).length,
    completed: companies.filter((c) => c.historical).length,
    recording: (state.viz?.recordings ?? []).filter(
      (r) => recordingStatus(state, r) === "Recording",
    ).length,
    captureIssues: (state.viz?.recordings ?? []).filter(
      (r) => recordingStatus(state, r) === "Capture issue",
    ).length,
  };
}

export function businessEventLabel(event: BusinessEvent, state: State) {
  switch (event.eventType) {
    case "ApplicationSubmitted":
      return "Company application received";
    case "ScreeningDecisionRecorded":
      return event.payload.decision === "Proceed"
        ? "Recruitment approved the application"
        : event.payload.decision === "Decline"
          ? "Recruitment declined the application"
          : "Recruitment requested more information";
    case "AdditionalInformationSubmitted":
      return "Contractor responded to Recruitment";
    case "EvidenceSubmitted": {
      const task = state.workItems.find(
        (t) => t.id === event.payload.workItemId,
      );
      const qualification = state.qualifications.find(
        (q) => q.id === event.qualificationId,
      );
      return task?.activity === "SubmitLicense"
        ? `${qualification?.skill ?? "Skill"} evidence submitted`
        : task?.activity === "SubmitInsurance"
          ? "Insurance documents submitted"
          : task?.activity === "SubmitFinancial"
            ? "Financial documents submitted"
            : "Contractor agreement submitted";
    }
    case "InsuranceReviewCompleted":
      return event.payload.outcome === "Verified"
        ? "Insurance documents verified"
        : "Insurance replacement requested";
    case "FinancialReviewCompleted":
      return event.payload.outcome === "Verified"
        ? "Financial documents verified"
        : "Financial document correction requested";
    case "AgreementExecuted":
      return event.payload.outcome === "Verified"
        ? "Contractor agreement confirmed"
        : "Agreement correction requested";
    case "LicenseReviewCompleted":
      return event.payload.outcome === "Valid"
        ? "Skill evidence verified"
        : "Skill evidence replacement requested";
    case "SkillRequested":
      return `${event.payload.skill} qualification requested`;
    case "SkillApproved":
      return `${state.qualifications.find((q) => q.id === event.qualificationId)?.skill ?? "Skill"} qualification approved`;
    case "SkillRejected":
      return "Skill qualification not approved";
    case "SkillInvalidated":
      return "Skill approval withdrawn";
    case "CompanyVendorCreated":
      return "Company vendor record created";
    case "PortalSetupCompleted":
      return "Company profile completed";
    case "InitialTrainingCompleted":
      return "Contractor completed initial training";
    case "TrainingConfirmed":
      return "Training completion confirmed";
    case "ContractorReadinessChanged":
      return event.payload.ready
        ? "Current readiness confirmed"
        : "Current onboarding requirements outstanding";
    case "ContractorSuspended":
      return "Company suspended from job eligibility";
    case "ContractorActivated":
      return "Contractor activation published";
  }
}

export const workDescription = (work: State["workItems"][number]) =>
  `${businessActivityLabel(work.activity)} · ${contractorOwner(work.owner)}`;
