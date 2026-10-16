# Company onboarding process

CompanyOnboarding v2 starts once per application. Independent skill work starts after Recruitment proceeds. The company instance stays the same through information requests and administrative corrections.

```mermaid
flowchart TD
 A[ApplicationSubmitted] --> B[Recruitment screening]
 B -->|RequestInformation| C[Contractor response]
 C -->|AdditionalInformationSubmitted| B
 B -->|Decline with reason| D[Close declined]
 B -->|Proceed| E[Parallel administrative requirements]
 B -->|Proceed| SK[Independent initial SkillQualification v2]
 E --> I[Insurance / Compliance]
 E --> F[Fictional financial pack / Finance]
 E --> G[Demo agreement / Contractor Relations]
 I -->|Correction| IC[Contractor replacement] --> I
 F -->|Correction| FC[Contractor replacement] --> F
 G -->|Correction| GC[Contractor replacement] --> G
 I --> J{All three verified?}
 F --> J
 G --> J
 J -->|Yes| V[Simulated vendor provisioning]
 V -->|CompanyVendorCreated| P[Contractor portal setup]
 P -->|PortalSetupCompleted| T[Contractor induction]
 T -->|InitialTrainingCompleted| TC[Training confirms completion]
 TC --> R{Readiness policy}
 SK --> R
 R -->|All prerequisites met| RC[ContractorReadinessChanged: true]
 RC --> ACT[Simulated activation publication]
 ACT -->|ContractorActivated| DONE[Complete initial onboarding]
 DONE --> ADD[Additional company skill request]
 ADD --> SK2[Independent qualification; no company restart]
```

Integration activities are explicitly run from the simulation panel. A timeout records a failed ActivityAttempt, emits no business outcome and leaves the task open. Retry uses the same task with another numbered attempt. Expired/incomplete evidence is a successful technical execution with a correction business outcome.

# Skill qualification process

```mermaid
stateDiagram-v2
 [*] --> AwaitingEvidence: SkillRequested
 AwaitingEvidence --> Verification: EvidenceSubmitted
 Verification --> CorrectionRequired: LicenseReviewCompleted / Expired or Invalid
 CorrectionRequired --> Verification: replacement EvidenceSubmitted
 Verification --> FieldApproval: LicenseReviewCompleted / Valid
 FieldApproval --> Approved: SkillApproved
 FieldApproval --> Rejected: SkillRejected
 Approved --> [*]
 Rejected --> [*]
```

Every qualification has an ID, correlation, tasks, evidence versions and execution history. Additional skills omit originatingApplicationId. Approval/rejection completes skill execution. Later explicit SkillInvalidated records against that historical qualification and recomputes company eligibility without reopening initial onboarding. Reinstatement is outside this iteration.

# Waiting and simulated timers

Work defines expected event, owner and subject. Multiple administrative tasks can await EvidenceSubmitted simultaneously; workItemId disambiguates them. Skill work uses a different correlation. A company with completed training but no approved skill waits for ContractorReadinessChanged.

The persisted clock starts at workspace creation and advances only on command. Human work is due after two demo days; reminder when due, escalation two days later. Each occurs once per open task. Timers create outbox/history records, never approvals or task completions.
