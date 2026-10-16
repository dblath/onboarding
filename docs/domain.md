# Domain UML

```mermaid
classDiagram
 ContractorCompany "1" --> "0..*" OnboardingApplication
 ContractorCompany "1" --> "0..*" AdministrativeRequirement
 ContractorCompany "1" --> "0..*" SkillQualification : owns independently
 AdministrativeRequirement "1" --> "0..*" Evidence : versioned packs
 SkillQualification "1" --> "0..*" Evidence : versioned license
 OnboardingApplication "0..1" <-- "0..*" SkillQualification : optional origin
 ContractorCompany "1" --> "1" WorkflowInstance : initial onboarding
 SkillQualification "1" --> "1" WorkflowInstance : independent qualification
 WorkflowDefinition "1" --> "0..*" WorkflowInstance : pinned version
 WorkflowInstance "1" --> "0..*" WorkItem : schedules
 WorkItem "1" --> "0..*" ActivityAttempt : technical executions
 WorkItem "1" --> "0..*" CompletionRecord : business completion
 WorkflowInstance "1" --> "0..*" HistoryEntry : orchestration history
 WorkflowInstance "1" --> "0..*" BusinessEvent : correlated delivery
 ContractorCompany "1" --> "0..*" OutboxMessage : in-app notifications
 class ContractorCompany {
  id
  vendorReference
  adminComplete
  portalSetupComplete
  initialTrainingComplete
  readinessPublished
  activationStatus
 }
 class SkillQualification {
  id
  companyId
  originatingApplicationId_optional
  skill
  evidenceIds
  status
 }
 class WorkflowInstance {
  definitionId
  definitionVersion
  correlationId
  companyId
  applicationId_optional
  qualificationId_optional
  status
  stage
  awaitedEvents
  processedEventIds
 }
 class WorkItem {
  activity
  owner
  dueAt
  expectedOutcome
  status
  completionHistory
 }
 class Evidence {
  version
  submittedAt
  fixture
  verificationState
 }
 class ActivityAttempt {
  attempt
  status
  technicalError
  businessOutcome
 }
```

The snapshot is a persistence unit, not a claim that all concepts form one production aggregate. Qualifications have no required application foreign key. Readiness comes from company facts plus approved company qualifications; readinessPublished records the last published result, not an activation override.

```mermaid
flowchart LR
 UI[React participant input] --> UC[Application use case]
 UC --> IP[Integration port / simulated adapter]
 IP --> BE[Typed business outcome event]
 UC --> BE
 BE --> OP[Correlated orchestration port]
 OP --> DP[Domain rules and facts]
 OP --> WI[Work items and waits]
 OP --> H[Execution history]
 DP --> R[Derived readiness event]
 R --> OP
 UC --> REPO[Repository port]
 REPO --> IDB[IndexedDB atomic snapshot]
```

Iteration 3 adds a command coordination port around load, event processing and atomic save. Web Locks serialize commands across tabs; committed revision notifications cause read-only reloads in the three experiences. Domain relationships and workflow versions above are unchanged. See [shared-browser architecture](shared-browser.md).

Iteration 3.1 makes historical application Completed/completedAt distinct from current readiness, operational Pending/Active/Suspended and isJobEligible (Ready AND Active). Post-completion company lifecycle signals have no WorkflowInstance delivery. WorkItem cancellation records superseded initial activation or retired legacy work; original workflow history and events are preserved.
