# Unity fieldwork implementation status and context handoff

**Executive summary - Iteration 3.4, 2026-10-16, America/Denver. Package 0.3.4.**

Unity fieldwork is the consistent product identity in navigation, breadcrumbs and browser titles. The supplied Unity PNG and favicon assets remain unchanged and proportionally rendered. The Simulation disclosure remains prominent; no integration is live.

Workflow Monitor now opens in **Automations & Integrations**, showing pending vendor creation, initial activation publication, failed verification retries and completed/cancelled integration history. These are projections of existing WorkItems/attempts, not another persisted queue. Execution remains explicitly user-triggered through existing commands. Workflow execution history, event activity and collapsed diagnostics are available separately through Workflow monitor.

Operations retains global open-work totals across all companies and all roles. Its automation entry navigates to Monitor; individual automation cards and eligibility guidance provide company/activity deep links. Human queues remain in Operations. Contractors see pending activation but have no internal automation controls. Operations role/company preferences are preserved.

The branding-era count-test failure was confirmed as an immediate assertion before asynchronous command/refresh completion. It now uses `waitFor` on the expected rendered count, with no sleeps or speculative production timing changes. Current final regression: **62 passed, 0 failed**. Final Chromium: **19 passed, 0 failed**; TypeScript/production build passed and dependency audit reported **0 vulnerabilities**. See verification below for exact runs, including intermediate failures.

The prior eligibility incident is resolved by the tester's confirmation: completing the System task made the company eligible (Ready / Active). No lifecycle repair or automatic activation was introduced. Completed onboarding, current readiness, operational status and job eligibility remain distinct. **Iteration 4 and Save/Load State have not started. Stop for product review after delivery.**

## 1. Implemented / Partial / Not Implemented

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Unity fieldwork identity | Implemented | Capital Unity/lowercase fieldwork, complementary serif/sans typography, exact experience breadcrumbs and browser titles; routine UI says simulation rather than demo. User-entered names are unchanged. |
| Intact logo and favicons | Implemented | Original 267 x 331 PNG; desktop/mobile proportional contain sizing; existing 331-square padded and 32-square proportional icons unchanged. |
| Monitor automation operations | Implemented | Default Monitor view; pending system work, failed verification retries, company filtering, action/status/company context and separate attempt/completion history. No automatic execution. |
| Operations discovery and counts | Implemented | Expandable queue; global parent/eight participant totals count Open WorkItems only, independent of role/company filters. All participants includes navigation-only automation cards. |
| Automation deep links | Implemented | `#/monitor?view=automations&company=<id>&activity=<workItemId>`; company filter, selected activity focus, reload support, completed selected activity history, unavailable-context notices. No Operations role/company reassignment. |
| Eligibility guidance | Implemented | Outstanding requirements, owner, publication and suspension; internal publication links go to Monitor. Contractor cannot execute internal work. |
| Anonymous application / company sign-in | Implemented | Submit without login; confirmation; application email + fixed password 123; unknown/wrong credentials fail; duplicate email requires explicit company choice; tab-local sessionStorage and sign-out. No real authentication. |
| Screening, correction and approvals | Implemented | Proceed, information request, decline; evidence versions/corrections; administrative reviews, company skill qualification, vendor, portal and training. |
| Lifecycle separation | Implemented | Historical completed onboarding stays closed; readiness derives from current facts; eligibility requires Ready AND Active; readiness loss suspends Active; restoration never clears suspension. |
| Monitor execution diagnostics | Implemented | Separate workflow view with primary execution history/events and six independent initially collapsed supporting panels, keyboard/ARIA controls, live hidden data, no expansion persistence. |
| Same-browser synchronization | Implemented | IndexedDB snapshot, Web Locks, revision-only BroadcastChannel, authoritative reload and duplicate/correlation protection. Three-tab browser acceptance retained. |
| Temporal / integration simulation | Partial | Persisted waits, attempts, manually injected timeout, explicit retry/time advancement and local outbox. No real Temporal, worker, external integration or scheduler. |
| Qualification recovery | Partial | Existing pending skill may finish; rejection/invalidation remains consistent. No new recovery request or suspension-removal bypass. |
| Full DDD / production durability | Partial | Policies and ports exist; models remain mutable interfaces and whole-snapshot storage persists; business mutations reside in service/orchestrator. |
| Administrative requests / suspension removal / ongoing compliance | Not Implemented | No request/approval lifecycle, recurring expiry/renewal or automatic reinstatement. Iteration 4 deferred. |
| Real identity, backend, jobs, cross-device sync, workflow designer, Save/Load State | Not Implemented | Outside this iteration. |

## 2. Architecture and responsibility boundaries

### Iteration 3.4 presentation changes

- `src/App.tsx`: shared Unity fieldwork chrome, exact breadcrumb text, Monitor default automation view, global attention badge, navigation-only Operations automation selection and retained tab preferences. Removes old Operations system execution console and Monitor bottom-of-page retry console.
- `src/AutomationQueue.tsx`: `pendingAutomations` derives Open system work plus Open human verification work whose latest attempt failed. The component filters company context and renders existing TaskCards with explicit automation execution enabled; completed/cancelled work is separate. No repository, new state schema, command or event contract.
- `src/OperationsWorkQueue.tsx`: existing Open WorkItem projection and global counts; Simulation displays as Automations & Integrations. System-owned work renders links, never execution controls. Contractor work remains a portal link; human participant commands remain in Operations.
- `src/presentation.ts`: `activityLabel` maps internal identifiers to business labels and `simulationMessage` translates only known system messages without changing stored definitions or user text; `automationLink` encodes company/WorkItem IDs and `monitorContext` reads hash query context.
- `src/experiences.ts`: query-aware hash routing and `Unity fieldwork - experience` document title composition (rendered with an em dash). Known routes remain Contractor/Operations/Monitor.
- `src/TaskCard.tsx`: existing execute/retry commands; failed verification and system execution require the Monitor presentation context. Operations failed human work links to Monitor for retry. Evidence option labels say simulated while their stored values remain identical.
- `src/EligibilityGuidance.tsx`: pending system actions link directly to Monitor by company and WorkItem; contractor view retains descriptive information without internal links/controls.
- `src/ContractorAccess.tsx`, `src/style.css`, `index.html`: routine wording, complementary restrained typography and unchanged intact-logo treatment. Package version is 0.3.4; dependency versions unchanged.

Operations' automation badge counts only Simulation-owned Open work so participant totals partition the parent total without double-counting. Monitor's attention badge also includes failed human verifications, whose ownership/count stays in their human Operations role. The shared WorkItem is displayed in both discovery contexts; it is stored and completed once. A successful human verification is retained in integration history, not an additional pending automation.

Plain `#/monitor` launches the automation queue across all companies. Workflow monitor and Outbox remain separate local views. Deep links select the requested company/activity and focus the pending item; a completed selected item opens its history. Invalid company/activity context shows an explicit notice instead of silently substituting work. A company dropdown change clears activity context. Operations queue filters/expansion remain local across same-app route switches; a fresh launch keeps the established All companies queue default. Stored Operations role/company identity is never overwritten by Monitor navigation. Monitor context uses its own company preference.

### Retained domain and application architecture

- `src/domain.ts`: ContractorCompany, OnboardingApplication, AdministrativeRequirement, evidence, SkillQualification, WorkItem, ActivityAttempt, WorkflowInstance, history, outbox and typed event envelopes. `isReady`, `isJobEligible`, `readinessChecks`, `companyLifecycleCorrelation` remain authoritative policies.
- Company is the business identity, including one-person companies. OperationalStatus remains Pending/Active/Suspended in compatibility field `activationStatus`. WorkItem status is Open/Completed/Cancelled.
- `src/application.ts`: OnboardingService application/evidence/screening/skill/participant/integration commands and queries; IntegrationPort, Repository and IndexedDbRepository. `executeActivity` / `retryActivity` still validate persisted work and reject completed workflow work.
- `src/orchestration.ts`: CompanyOnboarding v2 and SkillQualification v2 compiled transitions, guarded event ingress/scheduling and readiness evaluation. Business event envelopes remain version 1. Completed company workflow/history/processed IDs never resume for later skill events.
- `src/companyLifecycle.ts`: `applyReadinessChange` changes current publication/operational facts outside closed onboarding, can suspend Active after readiness loss, and never clears suspension or schedules reactivation.
- `src/migration.ts`: snapshot schema 4 repair from schema 2/3; legacy historical completion and invalid reactivation repair preserve original events/history. No 3.4 migration.
- `src/LifecycleStatus.tsx`: onboarding history / current readiness / operational status / eligibility displayed separately.

Readiness requires administrative completion AND portal setup AND initial training AND at least one approved company skill. Job eligibility additionally requires Active. First onboarding completion remains at successful initial activation acknowledgement. Later qualifications can restore Ready while retaining Suspended / Not eligible. No new administrative-removal use case exists.

Architecture limitations: entities are mutable TypeScript interfaces rather than encapsulated aggregate roots/value objects; IDs/dates are strings; administrative readiness is a maintained summary; service/orchestrator own most mutations. Whole-snapshot persistence, no runtime schema validation, and linear scans of work/attempt history remain prototype debt. No broad refactoring or workflow designer was introduced.

## 3. Execution, waiting and simulated recovery

User action -> TaskCard / existing use case -> exclusive Web Lock -> latest IndexedDB load/migration -> validate task/outcome -> domain changes and typed business event -> workflow correlation -> explicit rule evaluation -> next Activity/WorkItem -> atomic revision save -> release lock -> revision BroadcastChannel notification -> authoritative reload -> next participant.

`AutomationQueue` calls the same `OnboardingService.executeActivity` / `retryActivity` through App's `run`; it adds no alternative execution pipeline. Vendor creation schedules existing contractor portal work. Activation publication acknowledges the initial activation and changes eligibility if current readiness is satisfied. Merely opening Monitor, selecting a company, or following a deep link executes no business command. Existing startup initialization can increment revision on reload; tests compare domain/event/work data separately from that initialization revision.

Persisted waits/work survive reload. Simulated integrations record attempts, with immediate injected timeouts; failure leaves work open. Explicit retry executes the same scheduled activity, preserving successful business work. Timer reminders/escalations require advancing simulation time manually. There is no background worker, automatic retry/backoff, real Temporal replay/recovery loop, external dispatcher or wall-clock scheduler. No temporary activation/reinstatement shortcut.

## 4. Three experiences and synchronization

- Routes: `/#/contractor`, `/#/operations`, `/#/monitor`, with automation query context within the Monitor hash. Same exact origin is required for shared state.
- IndexedDB `fieldwork-onboarding`, version 1, object store `state`, key `current`; snapshot schema 4. One authoritative snapshot; the automation queue is a read-only projection of it until an explicit existing command runs.
- Web Lock `fieldwork-onboarding:commands:v1` encloses latest load, validation, processing and atomic save. Per-tab queue preserves local ordering.
- BroadcastChannel `fieldwork-onboarding:changes:v1` carries committed/revision metadata, not business events or snapshots, after commit/lock release.
- Notification, focus, visibility return and pageshow trigger authoritative reload. Stale reads cannot overwrite newer displayed revisions. Duplicate/unrelated ingress does not save/increment revision. Missing required browser capabilities disables writes.
- Contractor stores only company ID in `fieldwork:contractor:session`; Operations role/company and Monitor company keys remain independent. No password storage or cross-tab sign-out; same-browser data is not protected by these UI filters.
- Refresh retains tab-local identity; browser duplication/opener/session restore may initially inherit sessionStorage. Experience links use noopener. No real authentication/expiration/backend authorization.

Tested: contested writes, duplicate ingress, revision ordering, missed-channel visibility recovery, capability failure, tab preference isolation, deep-link reload, no navigation-driven execution, system counts, failed retry persistence, and explicit activation updating eligibility across three tabs. Browser visibility tests dispatch lifecycle events explicitly in headless Chromium. Physical process crash, real sleep/resume, storage eviction/quota, mixed-version tabs and cross-device behavior remain unverified.

## 5. Actual verification

Executed on Windows / Node v24.13.1 / npm 11.8.0 on 2026-10-16. Final source verification is recorded here; product acceptance remains separate.

| Command / check | Actual result |
| --- | --- |
| `npm test` | **62 passed, 0 failed**, 7 files, final run. Includes 2 new automation UI cases and the corrected state-based count wait. |
| `npm run test:browser` | **19 passed, 0 failed**, one Chromium worker, including production build. Final run: 54.8 seconds. |
| `npm run build` (also inside browser command) | TypeScript/Vite passed, 48 modules; JS 310.62 kB / CSS 23.87 kB before gzip. |
| `npm audit --audit-level=moderate` | **0 vulnerabilities** reported. |
| Protected-source/asset diff | Domain, application, orchestration, lifecycle, migration, storage/runtime/coordination and all three Unity PNGs unchanged from branding delivery. |

Test references and evidence:

- `src/workVisibility.test.tsx` (6): Open-only participant counts; stable global totals under filtering and real command completion; navigation-only system cards; pending/failed/history separation with no render mutation; eligibility publication links/missing publication and suspension.
- The old failure was at the immediate Recruitment count assertion after `user.click`. TaskCard submits via `void run(...)`; click completion does not imply IndexedDB command, refresh and React render completion. `waitFor` now retries that rendered-state assertion. Production command/refresh timing was not changed. Full regression passed 60/60 after synchronization correction, then 62/62 with the new UI cases, and 62/62 on final source.
- `src/application.test.ts` (10), `src/iteration2.test.ts` (23), `src/coordination.test.ts` (5), `src/lifecycle.test.ts` (10): retained command/workflow/integration, readiness, event protection and migration regressions.
- `src/ui.test.tsx` (4), `src/portalUx.test.tsx` (4): end-to-end participant actions, corrections, failure/retry through Monitor, timers, qualification/invalidation, anonymous/session/duplicate handling and independent diagnostics. Updated presentation labels; stored fixture/event contracts unchanged.
- `tests/browser/automation-ux.spec.ts` (2 new): Monitor default, invalid context, system discovery without execution in Operations, retained Operations preferences, exact company/activity link/focus/reload, no navigation mutation, other-company work preserving totals, explicit publication and eligibility in all three tabs, retained completed activity history. Captures all three experiences.
- `tests/browser/branding.spec.ts` (1): exact titles and breadcrumbs across three experiences, logo containment/desktop/mobile proportions, served PNG favicon sizes and pixel-exact original preservation in transparent padding. Assets themselves unchanged.
- `tests/browser/work-visibility.spec.ts` (2): global role/company counts, cross-tab updates and human filtering, vendor/activation discovery in Operations and execution in Monitor.
- Retained `lifecycle.spec.ts` (3), `multitab.spec.ts` (3), `synchronization.spec.ts` (5), `portal-ux.spec.ts` (3): four lifecycle audit scenarios, completed-workflow freeze, suspension, cancellation, contested writes, explicit failed retry, three-tab flows, session isolation, collapsed/keyboard/live diagnostics and compact headers. Helpers follow new UI routes; no direct-state bypass was added.

Intermediate runs are not hidden: first regression 59 passed / 1 failed because the old eligibility test still expected the removed Operations navigation button; its assertions now verify the deep link. An intermediate complete browser run finished 15 passed / 2 failed because reload/default-Monitor tests still expected diagnostics; those tests now explicitly choose the diagnostics view. Next browser run finished 18 passed / 1 failed because a new history assertion matched all six rows; it now selects the activation row. A further 18/1 run exposed a test assuming queue navigation was collapsed after the newly preserved route context; its toggle is now conditional on aria-expanded. One earlier browser attempt was interrupted after its first passing test while test-route updates were still being completed. Final results above supersede these runs.

Branding-era evidence was 59/60 regression, 17/17 browser, build passed; it is historical and superseded by the corrected current regression. Prior 3.3 delivery was 60/60 regression and 16/16 browser. No lint, coverage, load-test, broad accessibility certification or hosted-deployment claims. Current screenshots are isolated fictional test data, captured from the served production build and visually reviewed; no new native browser-tab capture is claimed in 3.4. Prior real-tab favicon captures remain local historical evidence, with unchanged favicon binaries.

## 6. Decisions, limitations and product review

Implemented rules remain authoritative: no auto execution/publication, no reopened completed onboarding, no suspended-company bypass, no new readiness condition. Current company remains the business identity. Simulation remains explicitly disclosed even though product branding no longer says demo.

Presentation decisions: Monitor opens in an all-company automation queue; failed human integration attempts are recoverable there while human ownership/counts stay unchanged. Deep links use existing WorkItem IDs. Completed/cancelled work and attempts remain available separately. Stored evidence enum values, activity definitions, database/channel/session keys and historical event/outbox text can retain legacy wording for compatibility; company names and user-entered content are not renamed. New visible activity/evidence labels use simulation wording. The logo is an unchanged asset; complementary product typography is separate from it.

Known limits: manual product review is pending. No remaining automated failure was observed in final runs; this is not a claim of zero defects. Existing confirmation is transient on refresh; authentication is presentation-only. No scheduler/worker, real external service, automatic recovery or cross-device synchronization. Broad mobile/screen-reader verification, very large histories, quotas/eviction, mixed versions and hosted deployment remain untested. Whole portrait logo is intact in favicons; its small text is naturally limited at tab size.

Before further business lifecycle work, product must decide suspension-removal request/approval/evidence/denial/audit rules; recovery after first skill rejection or sole invalidation; ongoing compliance/expiry/grace periods; post-activation administrative changes; training/agreement renewal, in-progress jobs and escalation rules; and whether initial onboarding historical completion should happen before activation acknowledgement. Do not invent provisional shortcuts.

Highest-value immediate next step: manual product review of the Automation queue, action discovery and terminology using `docs/chet/acceptance-3.4.md`. Gather feedback before expanding scope. No Iteration 4 or Save/Load State implementation is included.

## 7. Repository, run commands and continuity

- Repository: `onboarding`, `C:\Users\david\Documents\Repositories\onboarding`; branch `main` tracks `origin/main`.
- Origin fetch/push: `https://github.com/dblath/onboarding.git`. History preserved; no force-push, reinitialization or deployment.
- Iteration 3.4 baseline: `0dc17902d0d369f3b62cbfa320d7a98ed572fb66`. Implementation `7d1bc73ffa0ece37c5718dbad5f6d890ef17cea6` (Deliver Unity fieldwork automation operations in Monitor) was committed and pushed to origin/main on 2026-10-16. `git ls-remote` verified that exact SHA; working tree was clean after the implementation push. This publication record receives a separate documentation commit; its final tip/remote agreement and clean-tree verification are recorded in the delivery and local Chet handoff. Changes are presentation, query routing, related tests, package version metadata and documentation only. No dependency-version change. No Chet files/screenshots were staged or published.
- Earlier implementations: 3.1 `04567dc532b0a509c6ae94e91fd4ff47f5843c25`; 3.2 `4cc625d833ca827c6e4febf4a6f227df78d4cd32`; 3.3 `c0918e7125806d8f3f1439be948c05b57f70095a`; Unity branding `cbd352fa5ea884b67e71ed42ebf2d38f59d02036`. Previous publication reports remain in Git history and local Chet snapshots.
- Run: `npm install` if needed, `npm run dev`; dev origin `http://127.0.0.1:5173`. Routes: `/#/contractor`, `/#/operations`, `/#/monitor`; automation deep link: `/#/monitor?view=automations`.
- Production: `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 4174`. Same routes on `http://127.0.0.1:4174`. Static `dist`, no backend/environment variables. Keep tabs on the same exact origin.
- Checks: `npm test`, `npx playwright install chromium` if needed, `npm run test:browser` (isolated production preview port 4173), `npm run build`, `npm audit --audit-level=moderate`.
- Docs: README, STATUS, public/assets/README, prior acceptance-3.1/3.2/3.3 and branding walkthroughs (historical UI labels/locations), domain UML, process/event/rule catalogs, assumptions and shared-browser architecture.
- Chet's current detailed report, screenshots and acceptance steps are **local only** under `docs/chet/`. `/docs/chet/` is excluded by `.git/info/exclude`; never stage/commit/push it. Test artifacts remain ignored. Current manual steps supersede old System Activities execution instructions.

Reporting standard: each completed iteration updates STATUS from actual code and executed checks, commits/pushes, verifies local/remote SHA and clean working tree, reports failures as well as passes, and leaves manual product acceptance distinct from automation. This report is the current state; historical reports do not override it.
