# Unity fieldwork implementation status and context handoff

**Executive summary — Iteration 3.12: Monitor the Onboarding. 2026-10-18, America/Denver. Package 0.3.13.**

The accepted 3.11 Contractor/Operations UX remains. Workflow Monitor now opens with a business operational overview: running company onboarding, attention, failed/retryable work, ready activation publication, historical completion and current recording activity. Companies default to Active & attention, with explicit All companies/history. Selection reveals business status, parallel work and owners, real corrections/retries/publication, prerequisite-aware progress, readable chronology and all company capture points. Independent qualifications remain separate from completed onboarding.

Full original execution diagnostics remain behind Technical execution inspection. Automations & Integrations still executes explicit test integrations/retries/publication; Journey Map / Viz still visualizes real captured execution. Company/workflow/activity/recording links preserve context. Viewing/navigation do not start capture, execute business commands, rewrite frames or move another viewer. No graph canvas, recorder, trigger, domain/workflow, persistence, session, logo, wordmark or font changes.

Contractor navigation wraps at 390px, exposing New application. Qualification choices disable already-approved/outstanding requests, default to an available skill, and disable submission when none remain. Existing rejected/invalidated requalification and Ready + Active rules are unchanged.

**Executed verification: 118/118 regression tests; 48/48 Chromium tests; production build passed; audit 0 vulnerabilities. Ready for manual Monitor/Contractor UX acceptance.** Detailed review material is local-only under docs/chet/iteration-3.12. Stop for product review after delivery; no Iteration 4, designer or field-service expansion.

## 1. Implemented / Partial / Not Implemented

| Capability                                                     | Status                              | Actual boundary                                                                                                                                          |
| -------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Business-first Monitor landing                                 | Implemented                         | Six authoritative summaries, active/attention company list, explicit history, no history-text classification or duplicate technical metric wall          |
| Company/journey investigation                                  | Implemented                         | Business status, parallel work/waits/owners, actual attention, six prerequisites, chronology; company and initial/independent skill scopes distinguished |
| Technical diagnostics                                          | Implemented, retained               | Definition/version/state, full rule/history filters, unchanged envelopes/IDs, attempts, correlation, waits and all work, disclosed on demand             |
| Monitor / Automations / Viz boundary                           | Implemented                         | Contextual company/workflow/activity/exact-recording links; integrations/retries/publication remain explicit in Automations                              |
| Recording discovery / viewing isolation                        | Implemented                         | All company capture points including mid-workflow, exact selection, company-filtered browser with All companies, presentation-only context               |
| Contractor mobile navigation                                   | Implemented                         | Wrapped actions at 390px; New application reachable, original logo proportions intact                                                                    |
| Qualification choices                                          | Implemented                         | Duplicate approved/outstanding choices disabled with reasons; no eligible choices disables CTA; normal rejected/invalidated requalification preserved    |
| Accepted Contractor / role-owned Operations                    | Implemented, retained               | Anonymous application/email+123/tab-local identity; next action/team; human role queues, stable global counts and safe company selection                 |
| Lifecycle / end-to-end onboarding                              | Implemented, retained               | Screening, evidence/corrections, parallel skill/admin work, vendor/profile/training, explicit publication, Ready AND Active eligibility                  |
| Multi-tab / portable workspace                                 | Implemented, retained               | Authoritative IndexedDB, Web Locks, revision invalidation, Save/Load/Reset/validated normal-command scenarios and legacy compatibility                   |
| Viz recorder / observer durability                             | Implemented, retained               | Triggers, independent captures, immutable frames/playback/grouping, lineage/causes, failure isolation and separated auxiliary storage                    |
| Desktop/mobile/keyboard                                        | Implemented representative coverage | 1440/390 Chromium layouts, chooser/disclosures/native forms; not formal accessibility certification                                                      |
| Initial rejection / loss-of-qualification recovery             | Partial                             | Consistent states and honest limitations; no invented recovery or unsuspension shortcut                                                                  |
| Real authentication/integrations/Temporal/backend              | Not Implemented                     | Browser simulation, demo login and test activities only                                                                                                  |
| Suspension removal / ongoing compliance / later administration | Not Implemented                     | Iteration 4 business decisions remain open                                                                                                               |
| Field service / dispatch / workflow designer                   | Not Implemented                     | Explicitly excluded                                                                                                                                      |

## 2. Architecture and source boundaries

- [MonitorWorkspace.tsx](../src/MonitorWorkspace.tsx), [monitorModel.ts](../src/monitorModel.ts), [monitor.css](../src/monitor.css): bounded read-only Monitor presentation, pure authoritative projections, navy/blue/slate geometry and responsive disclosures. No independent queue or persisted read model.
- [App.tsx](../src/App.tsx): business-first Monitor default/navigation, company/workflow presentation context, compact Monitor heading and existing command runner. Existing role/company/session protections remain. Hidden legacy metrics are replaced visually by one set of business summaries.
- [WorkflowMonitor.tsx](../src/WorkflowMonitor.tsx): retained full diagnostics now supports controlled workflow selection so business and technical investigation agree. Original raw history/events/attempts are untouched.
- [presentation.ts](../src/presentation.ts): optional workflow context on automation/inspection links and new company/workflow/recording Viz links. Existing two-argument callers retain URL behavior. Legacy recorder vocabulary remains frozen; business-event labels in monitorModel switch on typed payloads rather than raw history.
- [JourneyMap.tsx](../src/viz/JourneyMap.tsx), [RecordingBrowser.tsx](../src/viz/RecordingBrowser.tsx): presentation boundary only. Exact recording binding, contextual browser filter and selected-company/workflow callback. Initial context binds once per workspace/context; later captures in another tab do not move the viewer. All companies remains available. No recorder/canvas/layout/definition changes.
- [ContractorPortal.tsx](../src/ContractorPortal.tsx), [qualificationChoices.ts](../src/qualificationChoices.ts), [contractor.css](../src/contractor.css): native choices mirror the existing duplicate guard; existing Ready + Active visibility/command retained; mobile nav wraps.

Unchanged protected implementation: application use cases/domain/companyLifecycle/orchestration/migration, IndexedDB/coordination/runtime/workspace hook, portable format/validation/scenario generator, Viz recorder/definition/story/triggers and observer storage. Company identity/session matching is unchanged. No dependency/font/asset additions.

Design references: [Monitor experience](monitor-experience.md), [Operations experience](operations-experience.md), [Contractor experience](contractor-experience.md), [presentation language](presentation-language.md). Accepted original Unity PNG SHA256 remains 88ef0146e47c4f25fbb95372945eca19b65e6598c7a8a43a8eb39a5af337d1a1; logo, transparent-padded favicons and wordmark width 95 / weight 450 unchanged.

### Domain, use cases, workflows and events

Company remains the business identity, including one-person companies. Records include company/application, screening decisions/responses, requirements, versioned evidence, qualifications, WorkItems, workflow instances/history, typed business events, attempts and outbox. These are explicit records/policies rather than fully encapsulated DDD aggregate/value-object classes. Commands atomically update related records; UI projections are queries.

Ready requires approved administration, completed company profile, confirmed initial training and at least one approved skill. Eligible requires Ready AND Active. Onboarding completion is historical. Invalidating the only approved skill removes readiness and suspends an Active company. Qualification recovery never removes suspension. Completed CompanyOnboarding roots receive no new work/publication and never resume. Independent skill requests require Ready + Active and reject same-skill records other than Rejected/Invalidated. All rules are unchanged.

User action → existing TaskCard handler → OnboardingService use case (recordScreeningDecision, submitEvidence, executeActivity/retryActivity, decideSkill, completeParticipantTask, invalidateSkill/requestSkill) → local command queue/shared Web Lock/latest authoritative state → domain facts and typed business event → LocalOrchestrator.deliver correlation, processed identity and expected-work validation → compiled CompanyOnboarding v2 / SkillQualification v2 rule → completed/new WorkItems → lifecycle evaluation → safe Viz observation → business durability and isolated auxiliary persistence → revision notification → next participant reloads. Monitor itself projects that result; it cannot activate or repair eligibility by display logic.

Persisted waits/attempts/history survive refresh. A test integration timeout records a failed attempt and leaves work Open, without a successful business event. Explicit retry continues the same work. Advancing the test clock creates reminders/escalations; it does not execute activities. Existing ingress/timer lab controls remain deliberate actions behind technical inspection. Reload recovers saved waits, not a Temporal worker. No real Temporal service, durable background timer/server, cross-device state or all-tabs-closed worker. Catalogs: [domain](domain.md), [processes](processes.md), [events](events.md), [rules](rules.md).

## 3. Monitor behavior and responsibility boundaries

Summary semantics are global and independent of company/journey/filter selection:

- In progress: Running CompanyOnboarding roots. Independent skill roots are not counted as new company onboardings.
- Need attention: companies with correction-required requirement/qualification, latest failed attempt on Open work, pending publication, suspension, unmet qualification after rejection/invalidation or capture issue. Ordinary participant waiting is not a failure.
- Retry available: Open WorkItems whose latest attempt Failed; historical/superseded failures are excluded.
- Ready for activation: authoritative readiness plus an Open PublishActivation WorkItem.
- Onboarding complete: historically Completed applications, even if current readiness later changes.
- Recording now: existing recordingStatus reports Recording, including independent simultaneous captures.

Active & attention includes running company roots, running independent skills and companies needing attention. All companies exposes closed/historical work. Filters/selection do not change summary counts, choose a different company silently, or persist business facts. Current work in company scope includes initial skill work in parallel; independent selection includes only that workflow. Independent qualification cards show current owners and provide View qualification without reopening company onboarding.

Business chronology maps State.events payloads to readable outcomes in committed array order, newest first. Latest six changes are visible; earlier changes expand without repetition. Failed attempts are displayed from authoritative attempts, not fabricated business events. Technical inspection retains exact execution history/rule evaluations, raw JSON and correlation. Normal launch is collapsed; explicit inspection deep links open it. Existing inner panels remain independently expandable and update while hidden.

Recording links include company/workflow/recording identities and preserve mid-workflow capture. General Journey Map navigation resolves the latest matching company/workflow recording; a missing linked recording remains unavailable, never creates capture or substitutes an unrelated recording. Explicit recording selection updates presentation URL/context without changing activeRecordingId, frames, causes, seen identities or another viewer. Deliberately starting capture also puts the new recording in the URL; the existing capture command alone changes recording state. Recording browser defaults to contextual company; All companies supports fleet investigation.

Ready/Pending explicitly says activation is unpublished and jobs remain unavailable. Automation links identify company/workflow/exact WorkItem. Monitor never auto-retries/publishes/starts capture; Contractor cannot execute internal activities. Human Operations roles, preferences and all-role parent count remain unchanged.

## 4. Persistence and three-tab continuity

IndexedDB fieldwork-onboarding remains authoritative: database v2/business schema 4; state/current, viz-control/current, viz-recordings and append-only viz-frames. Business commits first; changed observer metadata/new frames persist separately, then checkpoint control. Auxiliary failure preserves business durability, records explicit capture gaps and isolates the affected recording. No fabricated backfill or retention change.

Production commands coordinate through fieldwork-onboarding:commands:v1. Revision-only BroadcastChannel fieldwork-onboarding:changes:v1 notifications follow durability/lock release; tabs reload IndexedDB and never execute notification events. Focus/visibility/pageshow recover missed notices. Stale reads cannot overwrite newer revisions. Role/scope/company/login stay tab-local. Missing concurrency support disables writes. Existing initialization commits increment revision on opening a fresh tab; this is separate from inspecting an already-initialized workspace and is unchanged.

Save exports logical business/Viz state including exact frames/archives/lineage/causes, excluding sessions. Load/Reset atomically replace all stores under the Web Lock after preview/backup/explicit confirmation with stale-review rejection, higher revision and new epoch. Old queued commands reject. Invalid selections require explicit choice. Existing formats 1/2 and Viz 1/2 remain supported; maximum file 50 MiB. See [observer storage](observer-storage.md), [shared browser](shared-browser.md), [workspace](workspace.md), [Viz recording](viz-recording.md).

## 5. Executed verification

Windows, Node 24.13.1 / npm 11.8.0. Chromium runs built production assets on temporary port 4173. Port 5173 is untouched.

| Command/check                    | Actual result                                                                                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm test                         | 118 passed, 0 failed; 18 files; final run 31.82 s                                                                                                                      |
| New focused Chromium acceptance  | 4 passed, 0 failed; 18.0 s; included in full suite                                                                                                                     |
| npm run test:browser             | 48 passed, 0 failed; 17 spec files; final full run 3.4 minutes                                                                                                         |
| Production build                 | Passed TypeScript/Vite, 237 modules; main JS 416.54 kB / gzip 119.44; main CSS 65.81 / 12.90; lazy Viz JS 258.68 / 85.70; Workspace 11.09 / 3.97; Triggers 3.91 / 1.57 |
| npm audit --audit-level=moderate | 0 vulnerabilities; no dependency additions                                                                                                                             |

New evidence: [monitorModel.test.ts](../src/monitorModel.test.ts) verifies fact-based summaries, normal waiting, independent workflow status and projection non-mutation; inserting misleading raw history wording does not affect metrics. [qualificationChoices.test.ts](../src/qualificationChoices.test.ts) exercises actual duplicate rejection and rejected/approved/invalidated/requalification commands without domain changes. [monitorStates.ts](../tests/fixtures/monitorStates.ts) uses normal business/capture commands. [monitor-business.spec.ts](../tests/browser/monitor-business.spec.ts) covers all eight requested situations, 1440/390, hidden/expanded full diagnostics, independent qualification selection, exact/mid-workflow recording links, two independent viewers and capture in another tab, explicit retry/publication across three tabs, mobile navigation and rejected/invalidated requalification. Read-only flows compare complete authoritative snapshots including Viz; fresh-tab initialization is completed before that comparison.

Retained technical execution suites explicitly request view=inspection through their helper. Product default/collapsed landing is tested directly by the new spec. Fleet-recording/global-automation tests explicitly choose All companies where required by the new contextual entry. State/event/workflow/frame assertions remain; no arbitrary sleeps or business-rule changes.

The first full Chromium run completed with 44 passed / 4 failed (7.3 minutes). Three failures assumed a global recording/automation scope; tests now explicitly choose All companies for fleet assertions. The fourth exercised replacement of a workspace whose contextual company no longer existed: the view now requires an explicit restored-recording choice, and that choice updates the presentation URL so subsequent restore/refresh retains the correct context. This corrected a URL-context gap without changing stored recordings or recovery semantics. The focused 13-case rerun passed (1.7 minutes), including 25-company/50-recording scale and exact Frame 13/archive/continuation. Initial new browser runs were 0 passed / 4 failed, then 1 passed / 3 failed, then 3 passed / 1 failed, on test assumptions: landing title, event-ID recording lookup, exact label ambiguity, native option disabled assertion, initial sign-in scroll position, retry control label and second-tab initialization revision. Corrected to actual controls/IDs/native properties and initialization before snapshots; focused run then passed 4/4. No arbitrary waits, deleted acceptance cases or changed capture/business rules were used to obtain a pass.

Retained coverage includes domain/lifecycle rejection/suspension/completed-root invariants, role counts/parent stability, happy path/corrections, auth privacy, multi-tab concurrent commands/duplicates/missed notices, workspace validation/atomic rollback/exact Frame 13/archive continuation, triggers/observer failure and scale/layout scenarios. These are browser simulations, not external integrations.

## 6. Scale, limits and technical debt

Local 3.12 review files were generated through normal commands and validated: submitted 36,807 bytes; parallel five-company fleet 523,279; correction 94,001; verification failure 89,393; activation pending 321,091; independent qualification 342,166; three simultaneous capture points 101,952; eligible Contractor 338,830. These are readable JSON including histories/frames. Multi-recording fixture includes application, Recruitment decision and initial skill capture, without reconstructed earlier frames.

The final 3.12 scale test passed with 25 companies, 50 recordings and 650 frames at restore, continuing through 13 explicit publications to 663 frames. Its measured readable export is 10,204,083 bytes (9.73 MiB); logical State is 6,070,306 bytes. The local scale-metrics.json retains raw measurements from this environment. These are representative browser measurements, not performance guarantees. Historical 3.8 measurement reduced logical writes from 78,070,018 to 18,600,842 bytes over 13 commands (76.2%) with a 10,204,083-byte readable export. These remain historical measurements, not new performance claims.

Business state is still a snapshot; per-tab full caches, observer metadata/processed identities and export/import costs grow with histories. No retention/compression/streaming/quota guarantee. Monitor projections use in-memory array scans, not server queries. The shared App retains legacy presentation branches; bounded Monitor/Operations components avoid broad shell refactoring. Old acceptance docs may describe superseded navigation labels. No backend or new dependency.

## 7. Decisions, assumptions and gaps

- Implemented business rules: historical completion/current readiness/operational status separation; approved skill prerequisite; explicit initial publication; Ready AND Active; no completed-root resumption or automatic unsuspension. Unchanged.
- Presentation decisions: global summaries from facts; active/attention company list; purposeful technical disclosure; typed business chronology; company/initial/independent journey selection; exact recording links and once-only contextual binding; no unavailable skill encouraged in the selector.
- Provisional assumptions: company identity, HVAC/Plumbing catalog, fictional evidence, current administration/vendor/profile/training sequence and reminder/escalation rules. No new policy.
- Architecture decisions: UI-only projection instead of a new queue/state store; controlled diagnostics selection; presentation context kept apart from recorder control. Raw records and immutable recorder vocabulary remain faithful.
- Deviations: no intentional business/architecture-contract deviations. Reuses Contractor progress areas for company prerequisites rather than creating another progress engine. Browser helpers are explicit about technical/fleet intent after the new default/contextual navigation.
- Product review needed: landing density/attention categories; discoverability of independent skills, recordings and technical investigation; mobile chooser/navigation; qualification disabled reasons. 3.11 remains the accepted baseline pending this review.
- Open business decisions: first-skill rejection recovery; suspension-removal request/approval/audit; ongoing expiry/compliance/grace policies; post-activation administrative requests. No Iteration 4 implementation.
- Untested/manual: formal screen-reader certification, Firefox/Safari, non-Windows font rendering, actual OS save-picker UI, exhaustive devices, near-quota/crash boundaries. Chromium picker behavior remains stub-tested, not OS UI acceptance.
- Known defects: none confirmed in the executed acceptance paths; this is representative coverage, not exhaustive certification. Existing unavailable lifecycle recovery is explicit; no shortcut introduced. Unknown free text/raw historical wording is intentionally not rewritten.

## 8. Repository and publication

- Repository onboarding: C:\Users\david\Documents\Repositories\onboarding; main/upstream origin/main; origin fetch/push https://github.com/dblath/onboarding.git.
- Starting published tip: c49e298fafaed4ebda21528db8121913a7cef8ec. Previous 3.11 implementation: 0a88ce4a0b22b52ebdcf5889f935f9b905817ac1.
- **3.12 implementation 546e17c0c17425b0db68debe8626ef6488c9a053 committed and pushed on 2026-10-18.** Local HEAD, origin/main and GitHub refs/heads/main matched; working tree was clean. This publication record is a documentation-only follow-up; final tip is reported in delivery and the local Chet handoff. Changes are bounded presentation/context, tests, package version and documentation. No domain/workflow/persistence/observer contracts or original branding asset changes.
- docs/chet is excluded through .git/info/exclude; no Chet files are tracked. Detailed handoff/scenarios/screenshots remain local-only. No force-push, history replacement, credentials, deployment or persistent server.
- Prettier and staged/working diff checks passed. Temporary Chromium preview stopped; no listener on 4173 or 5174. Port 5173 remains reserved for the user and was untouched; manual app commands use 5174 --strictPort. Final SHA/remote equality/clean tree are rechecked after this publication record.
- Current docs: STATUS/README, Monitor/Operations/Contractor experience notes, presentation language, observer/workspace/Viz/shared-browser and domain/process/event/rule catalogs.

## 9. Manual acceptance and next work

Run npm run dev -- --port 5174 --strictPort. Open the same Chrome profile/exact origin:

| Experience                | URL                                            |
| ------------------------- | ---------------------------------------------- |
| Contractor                | http://127.0.0.1:5174/#/contractor             |
| Operations                | http://127.0.0.1:5174/#/operations             |
| Monitor business overview | http://127.0.0.1:5174/#/monitor                |
| Workspace                 | http://127.0.0.1:5174/#/monitor?view=workspace |

Back up any current workspace before loading local docs/chet/iteration-3.12/scenarios files through Demo Workspace preview/confirmation. Files replace the whole workspace; do not import them as additive data.

1. submitted.json: select Summit Field Services. In progress 1; attention/retry 0; company awaits Recruitment; real Review application work and readable application chronology; technical inspection collapsed.
2. parallel.json: five company roots, one attention/ready publication, five recordings. Select Gamma: four parallel Open actions across Contractor/Compliance. Select Sierra: actual publication is pending. Attention filter shows Sierra; global totals remain stable. At 390 use Choose a company.
3. correction.json: Insurance correction owned by Contractor, existing history/evidence retained. Open expanded technical inspection and compare original events/rules/work/attempts/IDs; disclosures do not execute work.
4. failure.json: one retry available, work still Open. Review and retry opens Automations with exact company/activity/workflow. Merely navigating has no effect. Explicit Retry activity records success and advances normal work.
5. activation.json: Ready, Pending, Not eligible; publication outstanding. Open activation publication in Automations and explicitly publish. Contractor/Operations/Monitor converge to Active/Eligible/historical completion. The finished company leaves Active & attention; inspect All companies to see it.
6. independent.json: onboarding complete, additional Plumbing qualification underway. View qualification shows the separate skill workflow/Contractor work. Original root/history stay closed. Company status and independent work are distinct.
7. recordings.json: three actual running recordings, including Recruitment/initial skill mid-workflow capture. Select each Recorded journeys link; correct recording/workflow opens. Mid-workflow Frame 0 starts at real capture; no invented application frames. Replay/inspect without mutation. A new explicit capture in another tab does not move this viewer.
8. eligible.json: sign in alex@example.com / 123. At 390 every navigation action, including New application, is visible/reachable. HVAC choice disabled as already approved, Plumbing available/default. Request Plumbing once: selector/CTA disable when both skills are unavailable; existing independent workflow is created once. Rejected/invalidated requalification remains available only under unchanged Ready + Active policy.

Review the representative screenshots and full local Chet report in docs/chet/iteration-3.12. Run npm test, npm run test:browser, npm run build and npm audit --audit-level=moderate. Static output is dist; no backend/environment setup. No app is intentionally left running.

**Next: manual Monitor/Contractor UX acceptance only.** Validate hierarchy, company/independent journey discovery, attention clarity and technical/Viz handoff before another implementation slice. Do not start Iteration 4, field service, scheduling/dispatch, authentication/backend or a workflow designer.

Continuity: each iteration updates STATUS from actual code/executed evidence, commits/pushes, verifies remote/local/clean tree and delivers detailed Chet material locally only.
