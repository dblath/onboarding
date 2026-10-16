# Fieldwork implementation status and context handoff

**Executive summary - Iteration 3.3: Operations work visibility, 2026-10-16, America/Denver**

**Ready for manual acceptance; product sign-off is pending.** Package 0.3.3 adds an expandable Operations Work queue with eight participant groups plus All participants. Parent/role counts cover all open work across every company, independently of role/company filters. Items include company context. System Activities exposes vendor setup and activation publication; pending system work is signposted even when the selected participant has no work. Contractor work is visible in Operations but completed in its signed-in portal.

Final verification: **60 regression/UI tests passed, 0 failed; 16 Chromium browser tests passed, 0 failed; TypeScript/production build passed; npm audit reported zero vulnerabilities.** Eligibility guidance identifies missing prerequisites, next owners/actions, pending publication and suspension. Demo login, company-only Contractor, compact headers, Monitor panels and multi-tab behavior remain covered.

The reported condition was reproduced as **Ready / Pending / Not eligible with exactly one open Operations activation publication**, despite zero contractor and Training work. Only explicit publication made the company Active/Eligible. No lifecycle defect was reproduced, but the original tester's exact company/snapshot is unconfirmed; this reproduction does not prove its precise cause.

Iteration 3.1 corrections remain: completed onboarding is historical, readiness is derived, operations is separate, eligibility requires Ready AND Active, and restored readiness never removes suspension. **No domain rules, workflow transitions, event contracts, schema, persistence or concurrency code changed. No automatic activation or suspension bypass. Iteration 4 has not started.**

## 1. Capability matrix

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Cross-role Operations queue | Implemented | Recruitment, Compliance, Finance, Contractor Relations, Field Manager, Training, Contractor and System Activities; only Open WorkItems count, not completed/cancelled work, history or attempts. |
| Global totals and company context | Implemented | Parent/role counts stay global under role/company filtering; All companies is the launch default; every item shows company name/email/short ID. |
| Pending system work discovery | Implemented | Explicit System Activities queue and pending-system signpost from filtered/empty participant queues; existing vendor/activation commands only. |
| Actionable eligibility guidance | Implemented | Missing requirements, next owners/actions, suspension and publication on company Overview; shortcuts select appropriate queue/company. Missing work or unavailable recovery is explicit, without inventing actions. |
| Anonymous application and confirmation | Implemented | Apply without login; confirmation provides submitted email/demo password and sign-in form, without opening the company workspace. |
| Simulated contractor sign-in/out | Implemented | Trimmed/case-normalized email, fixed password 123, unknown-email/wrong-password errors, explicit duplicate-company choice. Only company ID is saved in tab-local sessionStorage. |
| Selected-company contractor workspace | Implemented | Journey, work counts/actions, skills, lifecycle facts and contractor messages use the session company. No all-company selector or fallback. |
| Monitor diagnostics | Implemented | Six independent panels launch closed, support keyboard/ARIA, update while hidden and persist no expanded state. Status/history/events remain outside panels. |
| Compact headers | Implemented | Three experiences retain identity, messaging, subtitle, simulation disclosure and live browser/revision information. Anonymous Contractor omits company metrics. |
| Application, screening, corrections | Implemented | Proceed, information request, decline, reasons, responses and retained evidence versions. |
| Administration, skills, vendor, portal, training | Implemented | Existing happy path and independent skill qualification retained and exercised across three browser pages. |
| Historical onboarding completion | Implemented | Completed/completedAt; closed CompanyOnboarding rejects later events/work and never resumes for later skill activity. |
| Readiness, operations and eligibility | Implemented | Admin AND portal AND training AND one approved company skill; eligibility additionally requires Active. Readiness loss suspends Active; restoration retains suspension. |
| Shared browser state and event protection | Implemented | IndexedDB, Web Locks, revision-only BroadcastChannel, authoritative reload and duplicate/unrelated ingress protection. |
| First rejection / sole-approval loss recovery | Partial | Consistent waiting/suspended states, notices and existing pending qualification completion; no new recovery request until Iteration 4. |
| Temporal/integration simulation | Partial | Persisted waits, attempts, manual retry/timers and local outbox; no real Temporal, dispatcher, worker or external service. |
| Full DDD / production durability | Partial | Interfaces, policies and ports exist; mutable models, service/orchestrator business behavior and whole-snapshot persistence remain. |
| Administrative requests, suspension removal, ongoing compliance | Not implemented | No request/approval/removal shortcut, automatic expiry, renewal lifecycle or recurring scheduler. |
| Real authentication, jobs, cross-device sync, backend, workflow designer | Not implemented | Outside this slice. |

## 2. Iteration 3.3 architecture and changes

- `src/OperationsWorkQueue.tsx`: `openWork` is a read-only Open WorkItem projection. `OperationsQueueNavigation` derives the global parent/eight participant counts; `OperationsWorkQueue` filters role/company independently, adds company context, uses existing TaskCard commands for internal/system work and links contractor work to its portal. Pending-system signposts do not mix those items into the selected role's list.
- `src/EligibilityGuidance.tsx`: reads existing readiness/eligibility policies plus company-owned open work. Shows missing requirements, available owners/actions, publication and suspension. Operations shortcuts open role/company queues; contractor shortcuts expose its own actions only. Viewing guidance executes no business command.
- `src/App.tsx`: local queue expansion/role/company filters, global open-work metric/company counts and blocker navigation. Internal roles remain tab-local; Contractor/System filters do not impersonate them or change the saved internal role.
- `src/TaskCard.tsx`: display-only Simulation owner becomes Operations / System Activities; next-participant text also says Operations. Stored owner remains Simulation.
- `src/style.css`: participant navigation, filters, company cards, blockers and explicit sidebar top anchoring after screenshot review. Compact headers retained.
- Package 0.3.3, no dependency changes. Domain, application, orchestration, migration, coordination and runtime source remain unchanged.

### Retained Iteration 3.2 presentation architecture

- `src/ContractorAccess.tsx`: `useContractorSession` resolves/stores only fieldwork:contractor:session, a company ID. `ContractorAccess` owns input, errors, confirmation and duplicate-email company selection. Password input is transient component state, cleared on accepted credentials and never written to browser persistence/domain state.
- `src/App.tsx`: anonymous/signed-in rendering, sign-out/confirmation, no fallback for contractor identity, scoped navigation counts and company views. Operations/Monitor company preferences and Operations role remain independent. A second application from a signed-in tab ends only that contractor session and returns to confirmation; the original company's business facts are untouched.
- `src/DiagnosticPanel.tsx`: component-local expansion, semantic button, aria-expanded/aria-controls, stable region ID and hidden content retained in the React tree for current data. No storage/service calls. Remount/reload starts closed.
- `src/WorkflowMonitor.tsx`: Expected events & owners, Correlation, Activity attempts, Completed & pending work and Event ingress demonstrations use diagnostic panels; App also wraps Timer & escalation lab. Primary status, execution history, event envelopes and lifecycle signals remain outside; failed-activity retry stays directly accessible.
- `src/style.css`: compact shared header/title/strip/metrics, contractor single-column view and sign-in/panel styles with responsive overrides. Desktop geometry is measured in browser tests.
- Iteration 3.2 introduced package 0.3.2 without dependency changes; current package is 0.3.3.

Company remains the business identity, including one-person companies. There is no new user/account aggregate, login use case, business event or workflow activity. Domain, application, orchestration, migration, coordination and runtime sources were checked and have no changes in this iteration.

### Retained domain and lifecycle architecture

- `src/domain.ts`: company/application/requirements/evidence/qualifications/work/attempts/workflow/history/event models, definition catalogs, `isReady`, `isJobEligible`, `readinessChecks`, `companyLifecycleCorrelation`. OperationalStatus remains Pending/Active/Suspended under compatibility field activationStatus. Work may be Cancelled.
- `src/companyLifecycle.ts`: `applyReadinessChange` updates current publication/operational facts and can append ContractorSuspended event/outbox. Never clears suspension or schedules workflow work.
- `src/application.ts`: OnboardingService commands/queries and IntegrationPort/Repository/IndexedDbRepository; task execution rejects completed workflows. No administrative removal use case.
- `src/orchestration.ts`: explicit company/skill transitions, guarded ingress/scheduling and readiness evaluation. Completed company execution/history/work/processed IDs remain frozen. Later readiness events use company:<companyId>:lifecycle outside the completed execution.
- `src/migration.ts`: existing schema 2/3 to 4 repair maps legacy Ready to historical Completed, derives completion time where evidence exists, cancels invalid reactivation work and relatches historical suspension. Original events/history retained. No 3.2 migration.
- `src/LifecycleStatus.tsx`: separate onboarding history, current readiness, operational state and eligibility.

Entities remain mutable TypeScript interfaces, not encapsulated aggregate roots/value objects; IDs/dates are strings, administrative readiness is a maintained summary, and service/orchestrator retain most business mutations. Layer packaging, runtime schema validation and snapshot storage remain debt. Initial completion still occurs at successful first activation acknowledgement. Completed skill invalidation retains the existing qualification-history behavior; closed CompanyOnboarding protection is not a claim of actual Temporal execution semantics for every record.

## 3. Workflow execution and simulation

User activity -> existing use case -> exclusive Web Lock -> latest IndexedDB load/migration -> validate task/outcome -> typed business event -> workflow correlation -> rule/domain facts -> next Activity/WorkItem -> atomic revision save -> release lock -> BroadcastChannel invalidation -> authoritative reload -> next participant.

Sign-in/out and panel toggles are local presentation actions, outside this chain. Anonymous submission still calls the existing submitApplication command, so Recruitment and Monitor receive the application before contractor login.

CompanyOnboarding v2 and SkillQualification v2 remain compiled constants with explicit transitions; event envelopes remain version 1. Current readiness requires all administrative/portal/training facts plus an approved company skill; job eligibility adds Active status. Later skill events can change readiness outside completed onboarding and cannot schedule activation or clear suspension.

Persisted waits/work survive reload. Simulated integrations record attempts and immediate injected timeouts; manual retry executes the same scheduled activity without duplicating completed business work. Reminders/escalations use explicitly advanced demo time. No real replay, worker-recovery loop, automatic backoff, background dispatcher or wall-clock scheduler exists.

## 4. Three experiences, storage and synchronization

- Routes: /#/contractor, /#/operations, /#/monitor; Operations retains six internal roles, with no role selector in Contractor/Monitor.
- IndexedDB fieldwork-onboarding, version 1, store state, key current; snapshot schema 4. Domain IDs/events/workflow history and migration behavior are unchanged.
- Web Lock fieldwork-onboarding:commands:v1 encloses latest load, validation, processing and atomic save; per-tab queue preserves local order.
- BroadcastChannel fieldwork-onboarding:changes:v1 sends committed/revision metadata after commit/lock release. It transports no business events, snapshots or sessions.
- Notification, focus, visible visibilitychange and pageshow reload authoritative state. Old reads cannot overwrite newer displayed revisions. Duplicate/unrelated ingress does not save or increment revision; missing required browser capabilities disables writes.
- Contractor session is independent of fieldwork:operations:role and fieldwork:<experience>:company. Legacy contractor selection is not login. Invalid session IDs show anonymous rather than another company. No cross-tab sign-out is broadcast.
- Refresh retains the session. Independently opened tabs can use different companies. Browser duplicate/opener tabs may initially inherit sessionStorage; later changes remain tab-local. Experience links use noopener. Browser session restore can restore sessionStorage; there is no secure expiration/logout service.
- Existing startup initialization increments shared revision on reload; local login/panel changes do not mutate business state. Tests distinguish that initialization revision from business changes.
- Shared same-origin data remains available to local code/devtools. UI filtering is not authorization or protected storage. No password/hashes are persisted.

### Eligibility investigation

The new browser journey completes the normal UI through administrative/skill approvals, vendor, portal, induction and Training confirmation. The snapshot then has exactly one Open WorkItem, PublishActivation owned by Simulation (shown as Operations), no ContractorActivated event, Ready facts and Pending operational status. Contractor and Training can both truthfully have zero work while eligibility stays false. Explicit existing publication produces one activation event, completed onboarding and Active/Eligible in all tabs.

This reproduces a visibility problem, not a lifecycle defect. Previous Operations counts/list reflected the selected role and company, concealing other participants/system work. The original manual company/email was requested but its snapshot has not been inspected; do not claim this proves that company's cause. No automatic repair/business change was made. Guidance distinguishes pending publication, Ready/Pending without an available publication (Operations review needed), missing requirements and Suspended (removal process unimplemented).

## 5. Actual verification

Executed on Windows, Node v24.13.1 / npm 11.8.0, 2026-10-16:

| Command | Actual final result |
| --- | --- |
| npm test | **60 passed, 0 failed**, 7 files. |
| npm run test:browser | **16 passed, 0 failed**, one Chromium worker; multiple pages share real IndexedDB, BroadcastChannel and Web Locks. |
| npm run build, also run by test:browser | TypeScript/Vite passed; 46 modules; JS 304.89 kB / CSS 23.01 kB before gzip. |
| npm audit --audit-level=moderate | 0 known vulnerabilities reported. |

Test references:

- `src/workVisibility.test.tsx` (4 new): eight role counts, exclusion of completed/cancelled items, system mapping, global total stable under role/company filters, real command completion/count refresh, pending/missing publication and suspension without state mutation.
- `tests/browser/work-visibility.spec.ts` (2 new): multiple-company filtering and two Operations tabs, live counts after completion, contractor portal routing, vendor discovery and full explicit activation reproduction. Existing pre-activation cancellation browser case also verifies zero global/system open counts after cancellation.

- `src/application.test.ts` (10), `src/iteration2.test.ts` (23), `src/coordination.test.ts` (5), `src/lifecycle.test.ts` (10): retained application/workflow/readiness, migration, event protection and lifecycle regressions.
- `src/ui.test.tsx` (4): participant happy path, prerequisites, correction, retry, timers, skills/invalidation; now performs normal sign-in and expands diagnostic tools before use.
- `src/portalUx.test.tsx` (4 new): anonymous/legacy-selection gating, invalid credentials without writes, explicit duplicate selection, scoped company rendering/sign-out/internal preferences, invalid stored session, independent keyboard panels/current hidden data/reset.
- Existing browser `lifecycle.spec.ts`, `multitab.spec.ts`, `synchronization.spec.ts`: original 11 journeys retained, including the four 3.1 audit scenarios, contested writes, retry, notification ordering/recovery, capability failure and private preferences. Helpers sign in normally and explicitly select System Activities for integrations; no direct-state bypass.
- `tests/browser/portal-ux.spec.ts` (3 new): anonymous application/confirmation/errors/normalized login/reload/sign-out; duplicate choice and independent contractor/internal tabs; six initially closed panels, Enter/Space, independent expansion, live hidden data, no toggle mutation, reload reset, header geometry and screenshots.

Historical 3.2 evidence: initial browser run 11 passes/3 failures (header, reload expectation, locator), followed by corrected focused 3/3 and full 14/14. Current 3.3 checks were executed independently. Screenshot review prompted sidebar anchoring and Operations display-label cleanup; regression/browser/build checks were rerun afterward.

Current screenshots: operations-pending-activation.png and contractor-activation-blocker.png, captured before explicit publication and visually reviewed. Durable copies are in docs/chet/iteration-3.3-screenshots with the local iteration-3.3-status.md handoff. Prior handoffs remain historical; all Chet files/screenshots stay excluded from Git.

### Defects, limits and untested behavior

No remaining required-scenario failure was observed; this is not a zero-defects claim. Manual product/UX acceptance is pending. Broad mobile/accessibility certification, screen-reader review, headed Chrome sleep/resume, process crash recovery, quota/eviction, large-history load, mixed-version tabs and hosted deployment remain unverified. Existing headless visibility tests explicitly dispatch visibility events because pages remain individually visible. No coverage, lint or load-test claims.

Submission confirmation is transient; refresh returns to anonymous sign-in without resubmitting. No password changes, recovery, expiration or backend authorization. Browser autofill/session restoration is outside this demo's guarantees. Diagnostic expansion is not persisted. Event envelope details retain their existing individual controls and launch closed.

First-skill rejection leaves initial onboarding running/waiting and not ready; sole-approval invalidation after activation leaves Completed/Not ready/Suspended/Not eligible. An existing pending qualification can later restore Ready while retaining Suspended/Not eligible. New recovery, ongoing expiry and suspension removal remain absent, with no temporary bypass.

## 6. Manual acceptance, decisions and next boundary

Current acceptance: [Operations work visibility, Iteration 3.3](acceptance-3.3.md). Verify Work queue expansion/eight roles, global parent totals stable under role/company filtering, company context, two-tab count updates, completed/cancelled exclusion, and contractor portal routing. Then complete vendor setup and all human requirements, observe the remaining System Activities activation publication, and explicitly run it to become Eligible. Verify suspension still blocks eligibility after readiness restoration. Manual product acceptance has not been performed.

Queue presentation decisions: All companies on launch; optional company filtering via dropdown or company list; sidebar counts remain global; Contractor/System filters leave the saved internal role intact; contractor activities are read-only in Operations. A pending-system signpost is outside the main participant list and navigates to System Activities. Counts can stay level or increase after completion when successor work is created; this is not a counting defect.

Retained 3.2 UX/lifecycle regression acceptance:

Exact steps/URLs: [Iteration 3.2 UX acceptance](acceptance-3.2.md). [Lifecycle acceptance](acceptance-3.1.md) remains applicable with sign-in after each application.

1. Anonymous apply -> confirmation without company work/status. Wrong/unknown credentials fail; valid email + 123 identifies the company; refresh retains session; sign-out changes no business facts.
2. Duplicate email -> empty explicit company picker; independent contractor tabs and unchanged Operations/Monitor preferences; selected-company-only work/messages/counts.
3. Existing three-tab onboarding without refresh. Before activation: In progress / Ready / Pending / Not eligible. After publication: Completed / Ready / Active / Eligible. Later sole approval loss suspends; restored readiness never clears suspension.
4. Six Monitor diagnostics launch closed; independent pointer/Enter/Space operation, current hidden data, no mutation and reset on reload. Primary status/history/events remain outside panels.
5. Review compact headers at normal desktop zoom, long names and your preferred narrow window. Automated geometry is not human acceptance.

Presentation choices: trim/case-normalize email; duplicate labels include short IDs; company switching requires sign-out/sign-in; another application returns the contractor to confirmation. No qualification/readiness business rule changed.

Before Iteration 4, product must decide: who requests/approves suspension removal and required evidence/denial/audit; first-rejection/sole-invalidation recovery; administrative changes affecting readiness and grace periods; ownership of ongoing compliance without reopening onboarding; actual expiry/training/agreement/job-in-progress/escalation rules; whether initial historical completion should occur earlier than activation acknowledgement.

**Stop after this delivery and request manual UX acceptance.** No Iteration 4 implementation or administrative-request shortcut is included.

## 7. Repository and reporting continuity

- Repository: onboarding, `C:\Users\david\Documents\Repositories\onboarding`; main tracks origin/main.
- Origin fetch/push: `https://github.com/dblath/onboarding.git` ([repository](https://github.com/dblath/onboarding)). History preserved; no reinitialization, force-push or deployment.
- Published pre-3.2 tip: `fc6f559422ff80a3cc5ad8196b3d426e1aa48c7b`. Lifecycle implementation: `04567dc532b0a509c6ae94e91fd4ff47f5843c25`; earlier baseline: `0ac0987bf910502b82f6e0daf2c03a2fc83624aa`.
- Iteration 3.3 baseline: `e59e3f7024bfa8f17de603ae390becffdcead678`. Implementation `c0918e7125806d8f3f1439be948c05b57f70095a` (Expose Operations work across participants and explain eligibility blockers) was committed and pushed to origin/main on 2026-10-16. git ls-remote verified the exact implementation SHA. This publication record receives a separate documentation commit; the final tip SHA and clean-tree/remote agreement are recorded in the delivery message and local Chet handoff.
- Iteration 3.2 implementation: `4cc625d833ca827c6e4febf4a6f227df78d4cd32` (Add demo contractor login and compact working views). `git push origin main` succeeded on 2026-10-16; git ls-remote confirmed that exact implementation SHA on origin/main. The working tree was clean after this push. This publication record is a separate documentation commit; its final tip SHA/remote agreement and clean-tree check are recorded in the delivery message and local Chet handoff.
- Intentional 3.3 changes: queue/guidance presentation, TaskCard owner display, related UI/browser tests, CSS, version metadata and docs. Domain/workflow/storage/coordination source unchanged. Build/test artifacts and docs/chet are not staged/pushed.
- Run: npm install if needed, then npm run dev. Browser prerequisite: npx playwright install chromium. Checks: npm test, npm run test:browser, npm run build. Static assets in dist; no backend/environment variables.
- Docs: README, STATUS, acceptance-3.3, acceptance-3.2, acceptance-3.1, domain UML, processes, event/rule catalogs, assumptions and shared-browser architecture. This report supersedes historical iteration conclusions.

Each iteration: update STATUS from code/executed checks; commit, push, verify local/remote SHA agreement and clean tree; report actual tests/build/manual instructions. Put Chet reports/artifacts in docs/chet, **local only, never stage/commit/push**, as explicitly requested; /docs/chet/ is excluded through .git/info/exclude. Keep manual acceptance separate from automated evidence.

| Date | Handoff |
| --- | --- |
| 2026-10-16 | Iteration 3 audit: 42 regression / 8 browser passes; lifecycle ambiguity, invalid completed-workflow reactivation and recovery gaps identified. |
| 2026-10-16 | Iteration 3.1: lifecycle separation/closed execution/suspension/schema 4 repair; 52 regression / 11 browser passes, commit 04567dc. |
| 2026-10-16 | GitHub main published; report commit fc6f559. Chet destination established as local-only docs/chet. |
| 2026-10-16 | Iteration 3.2: anonymous/demo company login, scoped portal, six diagnostic panels, compact headers; 56 regression/UI / 14 browser passes, production build passed. Manual UX acceptance pending; Iteration 4 deferred. |
| 2026-10-16 | Iteration 3.3 Operations visibility: stable global open-work totals, role/company filters, system-work discovery, eligibility blockers. Pending activation reproduced; original tester snapshot unconfirmed. 60 regression/UI / 16 browser passes; build passed. Manual acceptance pending; no lifecycle changes or Iteration 4. |
