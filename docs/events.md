# Business event catalog

Each event carries eventId, eventType, eventVersion: 1, occurredAt, companyId, optional applicationId/qualificationId, correlationId, actor, and a typed payload. Initial qualification events retain their application reference; additional skills have no required application. The executable contract is in src/domain.ts.

| Event                          | Payload facts                                                  | Consumer / result                                                                        |
| ------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| ApplicationSubmitted           | requested skill                                                | Start CompanyOnboarding; Recruitment work                                                |
| ScreeningDecisionRecorded      | decision, reason                                               | Branch company screening                                                                 |
| AdditionalInformationSubmitted | textual response                                               | Return to screening                                                                      |
| SkillRequested                 | qualificationId, skill                                         | Start independent qualification                                                          |
| EvidenceSubmitted              | workItemId, evidenceId, description, fixture                   | Retain version; schedule review                                                          |
| InsuranceReviewCompleted       | workItemId, evidenceId, Verified / Correction required, reason | Insurance fact or correction                                                             |
| FinancialReviewCompleted       | same review result shape                                       | Financial fact or correction                                                             |
| AgreementExecuted              | same review result shape                                       | Agreement fact or correction                                                             |
| LicenseReviewCompleted         | workItemId, evidenceId, Valid / Expired / Invalid, reason      | Field approval or correction                                                             |
| CompanyVendorCreated           | workItemId, vendorReference                                    | Vendor fact; portal work                                                                 |
| PortalSetupCompleted           | workItemId                                                     | Portal fact; induction work                                                              |
| InitialTrainingCompleted       | workItemId                                                     | Contractor completion; Training confirmation work                                        |
| TrainingConfirmed              | workItemId                                                     | Confirmed training fact                                                                  |
| SkillApproved                  | workItemId, qualificationId, reason                            | Approve skill; complete its execution; reevaluate readiness                              |
| SkillRejected                  | workItemId, qualificationId, required reason                   | Reject only this skill                                                                   |
| SkillInvalidated               | qualificationId, required reason                               | Withdraw approval; reevaluate eligibility                                                |
| ContractorReadinessChanged     | ready, approvedSkillCount                                      | Update readiness; initial activation only on running onboarding; never remove suspension |
| ContractorSuspended            | reason, causedByEventId                                        | Record operational suspension outside workflow execution                                 |
| ContractorActivated            | workItemId                                                     | Record publication; complete company onboarding                                          |

Ingress deduplicates eventId globally and stores accepted IDs per instance. It verifies correlation, company/application/qualification scope, expected open work and latest evidence. Review outcomes must match fixture rules. Rejection returns false with no domain/history change. This is not a claim of network exactly-once delivery.

## Separate operational records

- ActivityAttempt: execution number/status, technical error or business outcome summary. Timeout produces no business event.
- WorkItem.completionHistory: timestamp, outcome and causing business event.
- HistoryEntry: Event, Activity, Rule, Wait, Lifecycle, Timer or Migration trace.
- OutboxMessage: task notification, reminder, escalation or readiness publication; never external email/SMS.

A skill event can cause company readiness reevaluation. While initial onboarding runs, its readiness event can resume the initial activation gate. After company onboarding completes, changed readiness uses correlation `company:<companyId>:lifecycle`, with no application/qualification workflow delivery. The additive `ContractorSuspended` event uses that company correlation and carries reason/causedByEventId. Readiness payloads optionally carry causedByEventId too. These signals appear separately from the immutable completed company execution. No suspension-removal command/event exists in 3.1.
