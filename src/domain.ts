import type { VizState } from "./viz/types";

export const personas = [
  "Contractor",
  "Recruitment",
  "Compliance",
  "Finance",
  "Contractor Relations",
  "Field Manager",
  "Training",
  "Workflow Monitor",
] as const;
export type Persona = (typeof personas)[number];
export type Role = Exclude<Persona, "Workflow Monitor"> | "Simulation";
export type Decision = "Proceed" | "RequestInformation" | "Decline";
export const skillCatalog = ["HVAC", "Plumbing"] as const;
export type RequirementType = "Insurance" | "Financial" | "Agreement";
export type EvidenceFixture =
  "Valid demo document" | "Expired demo document" | "Incomplete demo document";
export type OperationalStatus = "Pending" | "Active" | "Suspended";
export interface ContractorCompany {
  id: string;
  name: string;
  contact: string;
  email: string;
  vendorReference?: string;
  adminComplete: boolean;
  portalSetupComplete: boolean;
  initialTrainingComplete: boolean;
  readinessPublished: boolean;
  activationStatus: OperationalStatus;
}
export interface OnboardingApplication {
  id: string;
  companyId: string;
  source: "Contractor portal";
  skill: string;
  submittedAt: string;
  status:
    | "Screening"
    | "Information requested"
    | "Onboarding"
    | "Completed"
    | "Declined";
  completedAt?: string;
  responses: { text: string; at: string }[];
  reason?: string;
  screeningDecisions: { decision: Decision; reason: string; at: string }[];
}
export interface AdministrativeRequirement {
  id: string;
  companyId: string;
  type: RequirementType;
  applicable: boolean;
  status:
    "Awaiting evidence" | "Under review" | "Correction required" | "Verified";
  evidenceIds: string[];
  outcome?: string;
}
export interface Evidence {
  id: string;
  companyId: string;
  requirementId?: string;
  qualificationId?: string;
  version: number;
  submittedAt: string;
  description: string;
  fixture: EvidenceFixture;
  verificationState: "Submitted" | "Verified" | "Correction required";
}
export interface SkillQualification {
  id: string;
  companyId: string;
  originatingApplicationId?: string;
  skill: string;
  status:
    | "Awaiting evidence"
    | "Under review"
    | "Correction required"
    | "Awaiting approval"
    | "Approved"
    | "Rejected"
    | "Invalidated";
  evidenceIds: string[];
  reason?: string;
}
export type Activity =
  | "ScreenApplication"
  | "ProvideInformation"
  | "SubmitInsurance"
  | "SubmitFinancial"
  | "SubmitAgreement"
  | "ReviewInsurance"
  | "ReviewFinancial"
  | "ExecuteAgreement"
  | "SubmitLicense"
  | "VerifyLicense"
  | "ApproveSkill"
  | "CreateVendor"
  | "SetupPortal"
  | "CompleteTraining"
  | "ConfirmTraining"
  | "PublishActivation";
export interface WorkItem {
  id: string;
  workflowId: string;
  applicationId?: string;
  companyId: string;
  qualificationId?: string;
  requirementId?: string;
  activity: Activity;
  owner: Role;
  dueAt: string;
  status: "Open" | "Completed" | "Cancelled";
  outcome?: string;
  expectedOutcome: string;
  instructions: string;
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
  remindedAt?: string;
  escalatedAt?: string;
  completionHistory: { at: string; outcome: string; eventId: string }[];
}
export const activityDefinitions: Record<
  Activity,
  { label: string; owner: Role; event: string }
> = {
  ScreenApplication: {
    label: "Review application",
    owner: "Recruitment",
    event: "ScreeningDecisionRecorded",
  },
  ProvideInformation: {
    label: "Provide additional information",
    owner: "Contractor",
    event: "AdditionalInformationSubmitted",
  },
  SubmitInsurance: {
    label: "Submit insurance evidence",
    owner: "Contractor",
    event: "EvidenceSubmitted",
  },
  SubmitFinancial: {
    label: "Submit fictional tax / banking pack",
    owner: "Contractor",
    event: "EvidenceSubmitted",
  },
  SubmitAgreement: {
    label: "Submit demo agreement",
    owner: "Contractor",
    event: "EvidenceSubmitted",
  },
  ReviewInsurance: {
    label: "Review insurance",
    owner: "Compliance",
    event: "InsuranceReviewCompleted",
  },
  ReviewFinancial: {
    label: "Verify fictional financial pack",
    owner: "Finance",
    event: "FinancialReviewCompleted",
  },
  ExecuteAgreement: {
    label: "Execute simulated agreement",
    owner: "Contractor Relations",
    event: "AgreementExecuted",
  },
  SubmitLicense: {
    label: "Submit license evidence",
    owner: "Contractor",
    event: "EvidenceSubmitted",
  },
  VerifyLicense: {
    label: "Verify license",
    owner: "Compliance",
    event: "LicenseReviewCompleted",
  },
  ApproveSkill: {
    label: "Approve skill qualification",
    owner: "Field Manager",
    event: "SkillApproved / SkillRejected",
  },
  CreateVendor: {
    label: "Provision simulated vendor",
    owner: "Simulation",
    event: "CompanyVendorCreated",
  },
  SetupPortal: {
    label: "Complete demo portal setup",
    owner: "Contractor",
    event: "PortalSetupCompleted",
  },
  CompleteTraining: {
    label: "Complete initial training",
    owner: "Contractor",
    event: "InitialTrainingCompleted",
  },
  ConfirmTraining: {
    label: "Confirm training completion",
    owner: "Training",
    event: "TrainingConfirmed",
  },
  PublishActivation: {
    label: "Publish activation to demo contractor management",
    owner: "Simulation",
    event: "ContractorActivated",
  },
};
export interface WorkflowDefinition {
  name: "CompanyOnboarding" | "SkillQualification";
  version: 2;
  activities: Activity[];
}
export const definition: WorkflowDefinition = {
  name: "CompanyOnboarding",
  version: 2,
  activities: [
    "ScreenApplication",
    "ProvideInformation",
    "SubmitInsurance",
    "SubmitFinancial",
    "SubmitAgreement",
    "ReviewInsurance",
    "ReviewFinancial",
    "ExecuteAgreement",
    "CreateVendor",
    "SetupPortal",
    "CompleteTraining",
    "ConfirmTraining",
    "PublishActivation",
  ],
};
export const skillDefinition: WorkflowDefinition = {
  name: "SkillQualification",
  version: 2,
  activities: ["SubmitLicense", "VerifyLicense", "ApproveSkill"],
};
export interface HistoryEntry {
  at: string;
  kind:
    | "Event"
    | "Activity"
    | "Rule"
    | "Wait"
    | "Lifecycle"
    | "Timer"
    | "Migration";
  message: string;
  eventId?: string;
}
export interface WorkflowInstance {
  id: string;
  companyId: string;
  applicationId?: string;
  qualificationId?: string;
  definitionId: WorkflowDefinition["name"];
  correlationId: string;
  definitionVersion: 1 | 2;
  status: "Running" | "Completed";
  stage: string;
  waitingFor: string | null;
  awaitedEvents: {
    eventType: string;
    workItemId?: string;
    subjectId?: string;
  }[];
  processedEventIds: string[];
  history: HistoryEntry[];
}
export interface ActivityAttempt {
  id: string;
  workItemId: string;
  workflowId: string;
  activity: Activity;
  attempt: number;
  at: string;
  status: "Failed" | "Succeeded";
  technicalError?: string;
  businessOutcome?: string;
}
export interface OutboxMessage {
  id: string;
  companyId: string;
  at: string;
  recipient: Role;
  kind: "Task" | "Reminder" | "Escalation" | "Readiness" | "Operational";
  message: string;
  workItemId?: string;
}
export interface EventPayloads {
  ApplicationSubmitted: { skill: string };
  ScreeningDecisionRecorded: { decision: Decision; reason: string };
  AdditionalInformationSubmitted: { text: string };
  EvidenceSubmitted: {
    workItemId: string;
    evidenceId: string;
    description: string;
    fixture: EvidenceFixture;
  };
  InsuranceReviewCompleted: {
    workItemId: string;
    evidenceId: string;
    outcome: "Verified" | "Correction required";
    reason: string;
  };
  FinancialReviewCompleted: {
    workItemId: string;
    evidenceId: string;
    outcome: "Verified" | "Correction required";
    reason: string;
  };
  AgreementExecuted: {
    workItemId: string;
    evidenceId: string;
    outcome: "Verified" | "Correction required";
    reason: string;
  };
  LicenseReviewCompleted: {
    workItemId: string;
    evidenceId: string;
    outcome: "Valid" | "Expired" | "Invalid";
    reason: string;
  };
  CompanyVendorCreated: { workItemId: string; vendorReference: string };
  PortalSetupCompleted: { workItemId: string };
  InitialTrainingCompleted: { workItemId: string };
  TrainingConfirmed: { workItemId: string };
  SkillRequested: { qualificationId: string; skill: string };
  SkillApproved: {
    workItemId: string;
    qualificationId: string;
    reason: string;
  };
  SkillRejected: {
    workItemId: string;
    qualificationId: string;
    reason: string;
  };
  SkillInvalidated: { qualificationId: string; reason: string };
  ContractorReadinessChanged: {
    ready: boolean;
    approvedSkillCount: number;
    causedByEventId?: string;
  };
  ContractorSuspended: { reason: string; causedByEventId: string };
  ContractorActivated: { workItemId: string };
}
export type EventType = keyof EventPayloads;
export type BusinessEvent = {
  [K in EventType]: {
    eventId: string;
    eventType: K;
    eventVersion: 1;
    occurredAt: string;
    companyId: string;
    applicationId?: string;
    qualificationId?: string;
    correlationId: string;
    actor: string;
    payload: EventPayloads[K];
  };
}[EventType];
export interface State {
  /** Optional auxiliary visual recording; no domain rule reads it. Schema 4 remains compatible. */
  viz?: VizState;
  schemaVersion: 4;
  revision: number;
  clock: string;
  companies: ContractorCompany[];
  applications: OnboardingApplication[];
  requirements: AdministrativeRequirement[];
  qualifications: SkillQualification[];
  evidence: Evidence[];
  workItems: WorkItem[];
  workflows: WorkflowInstance[];
  events: BusinessEvent[];
  attempts: ActivityAttempt[];
  outbox: OutboxMessage[];
}
export const emptyState = (): State => ({
  schemaVersion: 4,
  revision: 0,
  clock: new Date().toISOString(),
  companies: [],
  applications: [],
  requirements: [],
  qualifications: [],
  evidence: [],
  workItems: [],
  workflows: [],
  events: [],
  attempts: [],
  outbox: [],
});
export const id = () => crypto.randomUUID();
export const approvedSkills = (
  companyId: string,
  qualifications: SkillQualification[],
) =>
  qualifications.filter(
    (q) => q.companyId === companyId && q.status === "Approved",
  );
export const isReady = (
  company: ContractorCompany,
  qualifications: SkillQualification[],
) =>
  company.adminComplete &&
  company.portalSetupComplete &&
  company.initialTrainingComplete &&
  approvedSkills(company.id, qualifications).length >= 1;
export const isJobEligible = (
  company: ContractorCompany,
  qualifications: SkillQualification[],
) => isReady(company, qualifications) && company.activationStatus === "Active";
export const companyLifecycleCorrelation = (companyId: string) =>
  `company:${companyId}:lifecycle`;
export const administrativeComplete = (
  requirements: AdministrativeRequirement[],
) =>
  requirements.filter((r) => r.applicable).length === 3 &&
  requirements
    .filter((r) => r.applicable)
    .every((r) => r.status === "Verified");
export const latestEvidence = (s: State, task: WorkItem) =>
  !task.requirementId && !task.qualificationId
    ? undefined
    : s.evidence
        .filter((e) =>
          task.requirementId
            ? e.requirementId === task.requirementId
            : e.qualificationId === task.qualificationId,
        )
        .sort((a, b) => b.version - a.version)[0];
export const readinessChecks = (s: State, c: ContractorCompany) => [
  { label: "Administrative requirements", complete: c.adminComplete },
  { label: "Portal setup", complete: c.portalSetupComplete },
  { label: "Initial training confirmed", complete: c.initialTrainingComplete },
  {
    label: "At least one approved skill",
    complete: approvedSkills(c.id, s.qualifications).length > 0,
  },
];
export const reviewEvidence = (e: Evidence) =>
  e.fixture === "Valid demo document"
    ? "Valid"
    : e.fixture === "Expired demo document"
      ? "Expired"
      : "Invalid";
export const submissionActivity: Record<RequirementType, Activity> = {
  Insurance: "SubmitInsurance",
  Financial: "SubmitFinancial",
  Agreement: "SubmitAgreement",
};
export const reviewActivity: Record<RequirementType, Activity> = {
  Insurance: "ReviewInsurance",
  Financial: "ReviewFinancial",
  Agreement: "ExecuteAgreement",
};
