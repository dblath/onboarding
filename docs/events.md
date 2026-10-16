# Business event catalog

Each event carries eventId, eventType, eventVersion: 1, occurredAt, companyId, optional applicationId/qualificationId, correlationId, actor, and a typed payload. Initial qualification events retain their application reference; additional skills have no required application. The executable contract is in src/domain.ts.

| Event                          | Payload facts                                                  | Consumer / result                                              |
| ------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------- |
| ApplicationSubmitted           | requested skill                                                | Start CompanyOnboarding; Recruitment work                      |
| ScreeningDecisionRecorded      | decision, reason                                               | Branch company screening                                       |
| AdditionalInformationSubmitted | textual response                                               | Return to screening                                            |
| SkillRequested                 | qualificationId, skill                                         | Start independent qualification                                |
| EvidenceSubmitted              | workItemId, evidenceId, description, fixture                   | Retain version; schedule review                                |
| InsuranceReviewCompleted       | workItemId, evidenceId, Verified / Correction required, reason | Insurance fact or correction                                   |
| FinancialReviewCompleted       | same review result shape                                       | Financial fact or correction                                   |
| AgreementExecuted              | same review result shape                                       | Agreement fact or correction                                   |
| LicenseReviewCompleted         | workItemId, evidenceId, Valid / Expired / Invalid, reason      | Field approval or correction                                   |
| CompanyVendorCreated           | workItemId, vendorReference                                    | Vendor fact; portal work                                       |
| PortalSetupCompleted           | workItemId                                                     | Portal fact; induction work                                    |
| InitialTrainingCompleted       | workItemId                                                     | Contractor completion; Training confirmation work              |
| TrainingConfirmed              | workItemId                                                     | Confirmed training fact                                        |
| SkillApproved                  | workItemId, qualificationId, reason                            | Approve skill; complete its execution; reevaluate readiness    |
| SkillRejected                  | workItemId, qualificationId, required reason                   | Reject only this skill                                         |
| SkillInvalidated               | qualificationId, required reason                               | Withdraw approval; reevaluate eligibility                      |
| ContractorReadinessChanged     | ready, approvedSkillCount                                      | Publish eligibility; schedule activation or suspend projection |
| ContractorActivated            | workItemId                                                     | Record publication; complete company onboarding                |

Ingress deduplicates eventId globally and stores accepted IDs per instance. It verifies correlation, company/application/qualification scope, expected open work and latest evidence. Review outcomes must match fixture rules. Rejection returns false with no domain/history change. This is not a claim of network exactly-once delivery.

## Separate operational records

- ActivityAttempt: execution number/status, technical error or business outcome summary. Timeout produces no business event.
- WorkItem.completionHistory: timestamp, outcome and causing business event.
- HistoryEntry: Event, Activity, Rule, Wait, Lifecycle, Timer or Migration trace.
- OutboxMessage: task notification, reminder, escalation or readiness publication; never external email/SMS.

A skill event can cause a company rule evaluation. The received event remains correlated to the skill instance; a changed readiness result creates a new event correlated to the company instance.
