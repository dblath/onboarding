# Fieldwork implementation status and context handoff

**Executive summary — Iteration 3.1, 2026-10-16, America/Denver**

**Ready for manual acceptance testing; product sign-off is pending.** Package 0.3.1 corrects the lifecycle issues found in the Iteration 3 audit. Initial onboarding completion is historical; readiness is derived from current facts; operational status is independently Pending/Active/Suspended; job eligibility requires **Ready AND Active**. Completed CompanyOnboarding executions reject subsequent events/work and remain unchanged during later qualification activity. Regaining readiness never removes suspension.

Actual verification: **52 regression tests passed, 0 failed; 11 Chromium multi-tab tests passed, 0 failed; TypeScript/production build passed; npm audit reported zero vulnerabilities.** The original three experiences, IndexedDB, BroadcastChannel, Web Locks, onboarding happy path, corrections, retry and monitoring remain functional in these tests. The critical previously-pending-skill scenario now ends **Completed / Ready / Suspended / Not eligible**, with no reactivation task or completed-workflow history mutation.

**Iteration 4 has not been implemented.** First-skill recovery, requalification after losing the only approval, post-activation administrative requests and suspension removal remain explicitly unavailable. The future suspension-removal process must include a separate administrative request and approval; no shortcut exists in 3.1.

## 1. Current capabilities

| Capability                                                      | Status          | Current behavior                                                                                                                                                                                                    |
| --------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application, screening, information requests and decline        | Implemented     | Stable company/application identity; role work, reasons and resubmission.                                                                                                                                           |
| Initial administration and evidence corrections                 | Implemented     | Insurance, fictional financial pack and agreement; versioned fixtures and reviews.                                                                                                                                  |
| Independent skill qualifications                                | Implemented     | Company ownership, optional originating application, separate workflow and approval/rejection. HVAC/Plumbing catalog.                                                                                               |
| Vendor, portal and initial training                             | Implemented     | Existing sequence and explicit Training confirmation preserved.                                                                                                                                                     |
| Historical onboarding completion                                | Implemented     | Application status Completed and completion timestamp; completed initial workflow remains closed. Initial completion still occurs at successful initial activation publication, preserving the existing happy path. |
| Current readiness                                               | Implemented     | AdminComplete AND PortalSetupComplete AND InitialTrainingComplete AND at least one company-owned Approved skill.                                                                                                    |
| Operational status and job eligibility                          | Implemented     | Stored operational status retains the compatibility field name activationStatus; isJobEligible requires isReady AND Active. Pending or Suspended is not eligible, even if Ready.                                    |
| Post-completion readiness loss/restoration                      | Implemented     | Company lifecycle events update current facts outside completed onboarding. Suspension remains until future approved removal.                                                                                       |
| Additional skills while Active and Ready                        | Implemented     | No repeated onboarding, portal or training. Existing pending skills can still finish after suspension.                                                                                                              |
| Only-skill rejection/invalidation recovery                      | Partial         | Consistent waiting/suspended states and clear notices; no recovery request process until Iteration 4.                                                                                                               |
| Post-activation administrative requests and suspension approval | Not implemented | No request/approval/removal command, screen, workflow or temporary bypass.                                                                                                                                          |
| Ongoing compliance                                              | Not implemented | No date-based expiry, renewal scheduler, recurring training or compliance case lifecycle. Explicit skill invalidation only.                                                                                         |
| Three live experiences and safe shared writes                   | Implemented     | Same hash routes, exact-origin IndexedDB, revision-only BroadcastChannel and exclusive Web Locks.                                                                                                                   |
| Temporal concepts and simulated integrations                    | Partial         | Persisted waits, known transitions, attempts, injected failures, manual retry, simulated timers and in-app outbox; no real Temporal, worker service or external integration.                                        |
| Full DDD aggregates and production durability                   | Partial         | Interfaces/policies and ports exist, but most aggregate behavior still resides in the service/orchestrator and one snapshot transaction.                                                                            |
| Authentication, jobs, cross-device sync, workflow designer      | Not implemented | Intentionally outside scope.                                                                                                                                                                                        |

## 2. Changes made in Iteration 3.1

1. Replaced the ambiguous historical application status Ready with Completed, adding completedAt for new completions and deriving it from existing activation evidence during migration where possible.
2. Added isJobEligible and updated every job-eligibility badge/count/heading to use readiness plus Active operational status.
3. Added a shared four-state presentation in Contractor, Operations and Monitor: Onboarding history, Current readiness, Operational status, Job eligibility.
4. Completed CompanyOnboarding ingress rejects every new event; schedule rejects completed executions; application work execution also checks that its workflow is not completed.
5. Stopped rule/history writes against completed onboarding. Post-completion readiness changes have correlation company:<companyId>:lifecycle, not the closed workflow correlation.
6. Added a narrow company lifecycle policy handler and ContractorSuspended event. Readiness loss suspends an Active company; restoration leaves Suspended untouched. Initial activation accepts only Pending operational status and a running initial onboarding workflow.
7. Initial activation work invalidated before publication is Cancelled with an explicit outcome, rather than represented as successful completion.
8. Snapshot schema 4 migrates supported existing data under the same Web Lock, retires open work wrongly attached to completed company workflows, clears invalid pending waits and normalizes legacy Reactivation pending metadata. Existing events and execution history are retained. Historical readiness loss after activation re-establishes suspension even if the old implementation later auto-reactivated.
9. Added ten committed regression cases and three browser journeys for lifecycle corrections. Existing tests were retained; assertions for the renamed historical status and new schema were updated.

## 3. Architecture and domain boundaries

- `src/domain.ts`: company/application/requirement/evidence/qualification/work/workflow models; definition/activity/event catalogs; isReady, isJobEligible and companyLifecycleCorrelation policies. OperationalStatus is Pending/Active/Suspended. WorkItem adds Cancelled/cancelledAt.
- `src/companyLifecycle.ts`: applyReadinessChange changes company publication/operational facts, appends the suspension event and notification, and never schedules workflow work or clears suspension. This is a policy handler, not a new workflow engine.
- `src/application.ts`: existing OnboardingService commands/queries, IntegrationPort, Repository and IndexedDbRepository. task rejects completed execution. No administrative request/removal use case was added.
- `src/orchestration.ts`: existing bounded company/skill transitions and event ingress. A company-scoped post-onboarding readiness event is recorded without delivering to a WorkflowInstance. Initial readiness signals can still resume running initial onboarding. Completed company execution, its processed IDs/history and work remain frozen after initial completion.
- `src/migration.ts`: schema 2/3 to 4 and earlier legacy migration. Repair changes current projections, cancellation/wait metadata and historical application label, not original event/history entries.
- `src/LifecycleStatus.tsx`, `src/App.tsx`: explicit lifecycle display and limited recovery notices. No UI command sets readiness or removes suspension.
- `src/WorkflowMonitor.tsx`: selected-instance execution history remains distinct from company lifecycle signals outside workflow execution.
- `src/runtime.ts`, `src/coordination.ts`, `src/browserCoordination.ts`, `src/useWorkspace.ts`, `src/experiences.ts`: existing production composition, shared command lock, revision notification, authoritative reload and hash routes.

Entities are still mutable TypeScript interfaces, not rich aggregate-root classes or explicit value objects. Qualifications belong directly to the company and may have no application. IDs/dates remain strings. Administrative readiness is a summary maintained after reviews. DDD encapsulation, layer packaging and runtime schema validation remain prototype debt; this release does not claim a broad architecture refactor.

### Execution path

Participant form → application command → exclusive origin-scoped Web Lock → reload/migrate IndexedDB → validate task/outcome → typed event → correlated known transition → business facts, rule evaluation and next WorkItem → atomic save/revision → release lock → BroadcastChannel invalidation → every tab reloads authoritative state.

After onboarding completion, a skill event still advances its independent qualification where applicable. evaluateReadiness computes the company policy and, if changed, records a company-scoped ContractorReadinessChanged. applyReadinessChange can emit ContractorSuspended. **It does not append to the completed company workflow, create activation work, or remove suspension.** SkillInvalidated retains the existing qualification-history behavior; no claim is made that completed skill records model actual Temporal execution semantics.

Definitions remain CompanyOnboarding v2 and SkillQualification v2 compiled constants with explicit switch transitions. No new workflow definition/designer was added. Event envelopes remain version 1; ContractorSuspended is additive and readiness payloads optionally identify their causing event. Business events, ActivityAttempts, WorkItem completion records and orchestration history are separate.

Waiting, fixture verification, immediate injected timeouts, manual retry and manually advanced timers retain their Iteration 3 behavior. No real worker, background dispatcher, replay, backoff scheduler or external service exists.

## 4. Persistence and multi-tab behavior

- Routes: /#/contractor, /#/operations, /#/monitor. Operations retains its six internal roles; Contractor and Monitor have no role selector. sessionStorage keeps role/company selection tab-local.
- Database fieldwork-onboarding, IndexedDB version 1, store state, key current. Snapshot schema is now 4; the database/store identity and origin are unchanged.
- Web Lock fieldwork-onboarding:commands:v1 encloses latest load, migration, validation, event processing and atomic revision save. A local queue preserves call order per tab.
- Channel fieldwork-onboarding:changes:v1 sends only committed/revision metadata after transaction completion and lock release. No snapshots or business events are transported through it.
- Receivers reload IndexedDB; focus, visible visibilitychange and pageshow also reload. Older reads cannot replace newer displayed revisions. Duplicate/unrelated ingress neither commits nor increments revision.
- Unsupported required browser capabilities fail closed. No uncoordinated writes were added.
- Close old application tabs before accepting this release. Earlier code does not understand schema 4 or the corrected lifecycle rules. Storage migration is automatic; do not clear data as the upgrade procedure.

## 5. Actual test evidence

Verification executed for this delivery on Windows, Node v24.13.1 and npm 11.8.0:

| Command                                      | Actual result                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| npm test                                     | 52 passed, 0 failed, 5 test files.                                                                            |
| npm run test:browser                         | 11 passed, 0 failed, one Chromium worker; multiple pages share one context/origin/IndexedDB in each scenario. |
| npm run build, also executed by test:browser | TypeScript and Vite production build passed; 42 modules transformed.                                          |
| npm audit --audit-level=moderate             | 0 known vulnerabilities reported.                                                                             |

Test references:

- `src/application.test.ts`: 10 original application/screening regressions.
- `src/iteration2.test.ts`: 23 original workflow, readiness, evidence, skills, retry, timer and migration cases.
- `src/ui.test.tsx`: 4 existing rendered React participant scenarios.
- `src/coordination.test.ts`: 5 existing shared-command/publication/migration cases, with schema expectation updated to 4.
- `src/lifecycle.test.ts`: 10 new cases: initial rejection; readiness before activation; last-approval invalidation; historical completion after eligibility loss/reload; pending skill approval after suspension; completed ingress/scheduling rejection; another approval preserving eligibility; cancellation before initial activation; legacy label/history migration; repair of legacy reactivation work and suspension.
- `tests/browser/lifecycle.spec.ts`: 3 new normal-UI journeys. Four lifecycle values converge in all tabs; completed history/work remain exactly equal; suspension survives restored qualifications and refresh, and no release/activation shortcut exists.
- `tests/browser/multitab.spec.ts` and `synchronization.spec.ts`: all 8 existing browser scenarios pass, including expired-license happy path, contested transition, independent concurrent reviews, retry, notification ordering, capability failure and preference isolation.

The four audit scenarios are now protected by committed tests. The restored-readiness/suspension case also has a captured browser screenshot reviewed during implementation. Manual product acceptance has not been performed by the team yet.

### Remaining limits and unverified behavior

No known remaining failure in the required 3.1 scenarios was observed in the executed suites. This is not a claim of zero defects. Native headed Chrome sleep/resume, OS/process crashes, quota/eviction failures, large-history load, mixed-version tabs, hostile runtime payloads, broad accessibility/mobile review and HTTPS deployment remain unverified. The lifecycle recovery test in headless Chromium explicitly dispatches visibility events because its pages remain individually visible.

The only-skill recovery limitations remain intentionally unresolved, without impossible transitions. Post-activation administrative requests, ongoing expiry checks and suspension removal are absent. A completed company workflow is not repurposed to handle those future requests.

## 6. Ready for manual acceptance

Detailed steps: [Iteration 3.1 acceptance walkthrough](acceptance-3.1.md).

Use the same Chrome profile and origin:

- Contractor: http://127.0.0.1:5173/#/contractor
- Operations: http://127.0.0.1:5173/#/operations
- Monitor: http://127.0.0.1:5173/#/monitor

Create/select a different fictional company for each scenario in all three tabs. Expected values are ordered **Onboarding history / Current readiness / Operational status / Job eligibility**:

| Scenario                                | Exact action and expected result                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Happy path, before activation           | Complete application, Proceed, all valid evidence/reviews, vendor, HVAC approval, portal, induction and Training confirmation. Stop before publishing activation: **In progress / Ready / Pending / Not eligible**.                                                                                                                                                          |
| Happy path, after activation            | Operations runs the scheduled initial activation publication: **Completed / Ready / Active / Eligible**. Company workflow completes with no waits.                                                                                                                                                                                                                           |
| Initial skill rejected                  | Fresh company; reject HVAC in Field Manager with reason, complete the company setup branch. **In progress / Not ready / Pending / Not eligible**. No activation/restart/recovery shortcut. Running company workflow waits for readiness.                                                                                                                                     |
| Last approved skill invalidated         | Fresh activated HVAC company, no other skill requested. Compliance → Overview → invalidate HVAC with reason. **Completed / Not ready / Suspended / Not eligible**. Historical completion/time and closed execution history/work remain unchanged. Refresh retains state.                                                                                                     |
| Pending skill approved after suspension | Fresh activated HVAC company; Contractor requests Plumbing but leaves it pending. Invalidate HVAC, then submit/verify/approve the existing Plumbing qualification. **Completed / Ready / Suspended / Not eligible**. No activation task, Reactivation pending stage, new onboarding wait, or history growth. Suspension removal is explicitly unavailable until Iteration 4. |
| Another approved skill remains          | Fully approve Plumbing before invalidating HVAC. **Completed / Ready / Active / Eligible**; no suspension or onboarding restart.                                                                                                                                                                                                                                             |
| Initial activation prerequisites lost   | Stop before initial activation, invalidate HVAC. **In progress / Not ready / Pending / Not eligible**. Activation task is Cancelled; onboarding was never completed and this company was never Active.                                                                                                                                                                       |

All participant changes must propagate without manual refresh. Refresh/reopening is a separate persistence check. Monitor shows later readiness/suspension in company lifecycle signals outside workflow execution, preserving the closed company history.

## 7. Business decisions and next boundary

Confirmed by this request: readiness alone is insufficient for jobs; historical completion is not undone; restored readiness does not remove suspension; removal requires an administrative request and approval in Iteration 4. No temporary approval button, reactivation activity, fresh-company reset or manual readiness override was implemented.

Still requiring product decisions before Iteration 4:

1. Which role can request/approve suspension removal, with what evidence, outcomes, denial/correction and audit trail?
2. How does qualification recovery work for first rejection or sole approval invalidation: same qualification, a new request, appeal, another skill or closure?
3. Which new administrative requests affect current readiness, when do they suspend work, and are grace periods permitted?
4. Which separate process owns ongoing company administration/compliance and suspension approval, without resuming initial onboarding?
5. What are actual expiry/applicability, training confirmation, contract, job-in-progress and escalation rules?

Initial completion remains recorded at initial activation acknowledgement to preserve the existing journey. The four states are independent thereafter. If product wants an earlier historical-completion milestone, validate that separately rather than silently changing it in this correction.

**Stop here: no Iteration 4 implementation is included.** Next action is manual acceptance of the exact scenarios above, then agreement on the administrative-request lifecycle.

## 8. Repository and reporting continuity

- Repository: onboarding, `C:\Users\david\Documents\Repositories\onboarding`.
- Branch: main. Prior implementation baseline: `0ac0987bf910502b82f6e0daf2c03a2fc83624aa`.
- Iteration 3.1 delivery is the commit containing this report; use `git rev-parse HEAD` for its final SHA. The final handoff includes that SHA. No Git remotes are configured; no push/deployment is part of this delivery.
- This report was previously untracked from the audit and is included in the 3.1 commit. Application, test, migration, UI and documentation changes are intentional release changes; ignored build/test artifacts are not committed.
- Run: `npm install` if needed, then `npm run dev`. Test prerequisites on a fresh machine: `npx playwright install chromium`. Production build: `npm run build`. Static assets remain in dist; no backend/authentication/hosted data was introduced.
- Other docs: README, domain UML, processes, event/rule catalogs, assumptions, shared-browser architecture and acceptance-3.1.md. Current STATUS takes precedence over historical Iteration 3 conclusions.

At each iteration close, update this report from actual source and executed checks, keeping current state, changes, evidence, defects, decisions, manual-acceptance status and next boundary explicit. Do not claim product acceptance from automated tests alone.

| Date       | Handoff                                                                                                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-10-16 | Iteration 3 audit: 42 regression and 8 browser tests passed; identified blocked only-skill recovery, ambiguous application status, completed-workflow reactivation and absent ongoing administration.                                                                                |
| 2026-10-16 | Iteration 3.1: historical completion separated from readiness/operations/eligibility; closed execution protected; suspension retained; schema 4 repairs legacy work/history projections. 52 regression and 11 browser tests pass. Ready for manual acceptance; Iteration 4 deferred. |
