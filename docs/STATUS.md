# Unity fieldwork implementation status and context handoff

**Executive summary — Iteration 3.13: UX Cleanup. 2026-10-18, America/Denver. Package 0.3.14. 3.12 is the accepted baseline.**

Journey Map now resolves actual recording availability before rendering. Defaults prefer the selected workflow, then another real capture for the same company. Explicit/unavailable identities never fall through to an unrelated recording. Resolved defaults are pinned in the presentation URL; explicit choices use tab-local company/workflow preferences scoped to workspace epoch. Navigation waits for matching route context before mounting Viz, preventing stale defaults from overriding a destination. Selection runs no capture or business command.

Monitor's existing nav entry is now Workspace. Routes and Save/Load/Reset/scenarios remain unchanged. Automations & Integrations is aligned with its peers; one restrained divider separates the existing onboarding entry from automation navigation. Completed Contractor companies see growth and the blue qualification CTA before historical onboarding. Anonymous landing has one introduction, retains its blank introductory footprint, and restores the contextual heading when starting an application.

Decorative recording/browser/Viz/diagnostic/Workspace washes are blue/slate. Genuine success icons, badges and completed edges remain green; warnings/failures retain amber/red. Original Unity image, favicon, wordmark and all domain/workflow/recording contracts remain unchanged.

**Executed verification: 122/122 regression tests; 51/51 Chromium tests; production build passed; audit 0 vulnerabilities. Ready for manual UX acceptance.** Chet's before/after captures and detailed review remain local-only under docs/chet/iteration-3.13. Stop for UX review; no lifecycle expansion, Iteration 4, backend, field service or designer.

## 1. Implemented / Partial / Not Implemented

| Capability                                                             | Status                | Actual boundary                                                                                                                                      |
| ---------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recording availability/defaults                                        | Implemented           | Real workflow/company captures; honest empty/company/unavailable states; no unrelated fallback                                                       |
| Selection continuity/isolation                                         | Implemented           | Exact URL pinning, tab-local epoch/company/workflow preferences; missing old links require explicit choice                                           |
| Monitor nav cleanup                                                    | Implemented           | Existing Workspace destination, left-aligned automation label, one separator; no duplicate links                                                     |
| Contractor hierarchy                                                   | Implemented           | Completed companies: identity/eligibility, growth CTA, history, disclosed records; unchanged visibility/commands                                     |
| Anonymous introduction                                                 | Implemented           | One visible landing introduction, retained space; application heading/form unchanged                                                                 |
| Cohesive surfaces                                                      | Implemented           | Cool decorative fills/selection/illumination; genuine success/warning/failure semantics preserved                                                    |
| Business-first Monitor                                                 | Implemented, retained | Six global fact-derived summaries, active/attention/all company views, owners/waits, chronology and full diagnostics on demand                       |
| Contractor / human Operations                                          | Implemented, retained | Anonymous apply, email+123/tab-local identity, next action/team; owned human queues, stable all-role totals and safe company selection               |
| End-to-end onboarding / lifecycle                                      | Implemented, retained | Screening, correction/versioned evidence, parallel administration/skills, vendor/profile/training, explicit activation, Ready AND Active eligibility |
| Shared browser / portable state                                        | Implemented, retained | IndexedDB authority, Web Locks, revision invalidation, atomic Save/Load/Reset, validated scenarios and legacy compatibility                          |
| Viz / observer durability                                              | Implemented, retained | Automatic triggers, simultaneous independent captures, exact frames/causes/lineage, playback, compact/grouped maps and failure isolation             |
| Accessibility / browser matrix                                         | Partial               | Representative Chromium 1440/390/native keyboard checks; no certification or Firefox/Safari acceptance                                               |
| Rejected initial skill / qualification-loss recovery                   | Partial               | Consistent state, honest unavailable recovery; no invented shortcut                                                                                  |
| Suspension removal / ongoing compliance / later administration         | Not Implemented       | Future lifecycle decisions remain open                                                                                                               |
| Backend / real auth/integrations / Temporal / designer / field service | Not Implemented       | Explicitly excluded; browser simulation only                                                                                                         |

## 2. Architecture and source boundaries

- [recordingSelection.ts](../src/viz/recordingSelection.ts): pure availability/identity resolution and guarded sessionStorage view preferences. No service command, IndexedDB write, State field, queue or recorder control.
- [JourneyMap.tsx](../src/viz/JourneyMap.tsx): meaningful availability/defaults, All companies discovery and once-only default URL pinning. Existing graph geometry, playback, node inspector and frame semantics retained. Completed node bodies/illumination and lane fills change cosmetically only.
- [App.tsx](../src/App.tsx): matching hash context before Monitor view mount; Journey view cannot run default selection during a transition to another destination. URL callbacks support explicit global browser scope. Invalid company sentinel remains on return to Viz. Existing nav entry gets Workspace label and one real separator; anonymous landing replaces duplicate introduction with an empty spacer.
- [ContractorPortal.tsx](../src/ContractorPortal.tsx): reuses the same growth section/form above history only for completed applications. Same skill choices, Ready + Active guard and requestSkill command; no duplicate form.
- [theme.css](../src/theme.css), [monitor.css](../src/monitor.css), [contractor.css](../src/contractor.css), [viz.css](../src/viz/viz.css), [workspace.css](../src/workspace/workspace.css): scoped nav geometry, retained introductory space, neutral information/history/selection and blue interaction surfaces. Semantic success badges/icons/edges, amber waits and red failures remain.
- Retained [MonitorWorkspace.tsx](../src/MonitorWorkspace.tsx), [monitorModel.ts](../src/monitorModel.ts), [WorkflowMonitor.tsx](../src/WorkflowMonitor.tsx), [presentation.ts](../src/presentation.ts), [RecordingBrowser.tsx](../src/viz/RecordingBrowser.tsx): authoritative business summaries, chronology, exact context links and full original raw diagnostics.

Protected implementation unchanged: application/domain/companyLifecycle/orchestration/migration, IndexedDB/coordination/runtime/workspace hook, portable format/validation/scenario generator, recorder/definition/story/triggers/layout geometry and observer storage. No dependency, font, original asset, business event or recording contract changes. Workspace is the left-nav label for the existing internal Demo Workspace view/region and URL; compatibility is intentional.

Design references: [Monitor](monitor-experience.md), [Operations](operations-experience.md), [Contractor](contractor-experience.md), [presentation language](presentation-language.md). Original Unity PNG SHA256 remains 88ef0146e47c4f25fbb95372945eca19b65e6598c7a8a43a8eb39a5af337d1a1. Logo proportions, padded favicons and accepted wordmark width 95 / weight 450 are untouched.

### Domain, use cases, workflows and events

Company remains the business identity, including one-person companies. Explicit records/policies cover company/application, screening decisions/responses, administrative requirements, versioned evidence, qualifications, WorkItems, workflow instances/history, typed events, integration attempts and outbox. These are records/policies rather than fully encapsulated DDD aggregate/value-object classes. Commands atomically update related records; the UI derives queries from facts.

Ready requires approved administration, completed company profile, confirmed initial training and at least one approved skill. Eligible requires Ready AND Active. Completed onboarding remains historical. Invalidating the only approved skill removes readiness and suspends an Active company; regaining qualifications never removes suspension. Completed CompanyOnboarding roots receive no new work/publication and never resume. Independent skill requests require Ready + Active and reject same-skill records except Rejected/Invalidated. All rules are unchanged.

Action → existing TaskCard handler → OnboardingService use case (recordScreeningDecision, submitEvidence, executeActivity/retryActivity, decideSkill, completeParticipantTask, invalidateSkill/requestSkill) → command queue/shared Web Lock/latest authoritative state → facts/typed business event → LocalOrchestrator.deliver correlation, processed identity and expected-work checks → CompanyOnboarding v2 / SkillQualification v2 rule → completed/new WorkItems → lifecycle policy → safe Viz observation → business durability/isolated auxiliary persistence → revision notification → next participant reloads. Selection/navigation does not enter this command pipeline.

Saved waits/attempts/history survive refresh. Test timeouts leave work Open with failed attempts and no successful business event. Explicit retry continues the same work. Clock advancement drives reminders/escalations without completing work; ingress/timer labs remain deliberate controls behind inspection. Reload recovers saved waits, not a Temporal worker. No server, real durable timers/external services, cross-device state or all-tabs-closed execution. Catalogs: [domain](domain.md), [processes](processes.md), [events](events.md), [rules](rules.md).

## 3. Experience and selection behavior

Monitor summaries remain global and independent of selection: In progress counts Running CompanyOnboarding roots; Need attention uses real corrections, latest failed attempts on Open work, pending publication, suspension, qualification gaps or capture issues; Retry excludes closed/superseded failures; Ready for activation requires readiness plus Open PublishActivation work; Completed counts historical applications; Recording uses the existing recordingStatus. Normal participant waiting is not a failure; no history-text classification.

Active & attention includes running company roots, independent qualifications and actual issues. All companies explicitly exposes history. Company work includes initial skill work in parallel; independent selection shows its own work. Typed event chronology maps meaningful payload outcomes in committed order; latest six changes are visible, earlier changes disclosed without duplication. Full definition/version/state, exact raw history/rules, envelopes/IDs, correlation, attempts, waits and completed/pending work remain behind technical inspection. Automations executes existing explicit activities/retries/publication; Contractor has no internal automation controls.

Recording availability now prefers latest matching workflow capture, then latest capture for the same company. It includes manual/automatic, active/stopped/completed/archived and mid-workflow records. A missing explicit/remembered identity does not fall through. “No recordings for this company” plus All companies distinguishes company absence from the globally empty “No recordings yet.” Defaults are pinned in the URL so workspace-epoch renderer remounts cannot substitute a new journey. Explicit choices are scoped by epoch/company/workflow in tab-local sessionStorage and restored when navigation omits the recording parameter. Broader discovery is an explicit user action. Other tabs and current activeRecordingId/capture are unaffected.

The route correction addresses a real race: mounting Journey Map with a previous Workspace context could briefly resolve a global default and overwrite the intended destination. Monitor navigation now waits for its matching hash, and Journey Map is gated by the actual Journey route; default pinning runs once per resolved context. URL and preferences are presentation state only.

Completed Contractor order is identity/current eligibility → Grow your company's skills with the original blue CTA → Your completed onboarding → disclosed details. In-progress order, duplicate-skill choices, requalification paths and Ready + Active visibility remain. Anonymous landing removes its page heading/subtitle from the accessible/visible content, retaining an empty footprint (45px wide layout / 57px narrow). At 390px the main panel remains at its measured 3.12 Y position of 266.625px. Beginning an application retains the original heading/introduction and form.

## 4. Persistence and three-tab continuity

IndexedDB fieldwork-onboarding remains authoritative: database v2/business schema 4; state/current, viz-control/current, viz-recordings and append-only viz-frames. Business commits first; observer metadata/new frames persist separately, then checkpoint control. Auxiliary failures preserve valid business durability, record capture gaps and isolate affected recordings. No new retention/backfill policy.

Commands coordinate through fieldwork-onboarding:commands:v1. Revision-only BroadcastChannel fieldwork-onboarding:changes:v1 notices follow durability/lock release; tabs reload IndexedDB and never execute notification events. Focus/visibility/pageshow recover missed notices; stale reads cannot replace newer revisions. Role/scope/company/login/view preferences remain tab-local. Missing coordination disables writes. Fresh-tab initialization still increments revision without replaying workflows; the UI tests account for that separately from inspection.

Save exports logical business/Viz state, exact frames/archives/lineage/causes, excluding sessions and new view preferences. Load/Reset atomically replace all stores under the existing lock after preview/backup/confirmation, rejecting stale reviews/old queued commands with higher revision/new epoch. Invalid company/recording selection needs explicit choice. Formats 1/2 and Viz 1/2 remain supported; 50 MiB limit. See [observer storage](observer-storage.md), [shared browser](shared-browser.md), [workspace](workspace.md), [Viz recording](viz-recording.md).

## 5. Executed verification

Windows, Node 24.13.1 / npm 11.8.0. Chromium uses built production assets on temporary port 4173. Port 5173 is untouched.

| Command/check                    | Actual result                                                                                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm test                         | 122 passed, 0 failed; 19 files; final run 34.53 s                                                                                                                      |
| New focused Chromium             | 3 passed, 0 failed; 13.1 s                                                                                                                                             |
| npm run test:browser             | 51 passed, 0 failed; 18 spec files; final full run 3.6 minutes                                                                                                         |
| Production build                 | Passed TypeScript/Vite, 238 modules; main JS 416.90 kB / gzip 119.59; main CSS 66.93 / 13.09; lazy Viz JS 259.98 / 86.16; Workspace 11.09 / 3.97; Triggers 3.91 / 1.57 |
| npm audit --audit-level=moderate | 0 vulnerabilities; no dependency additions                                                                                                                             |

[recordingSelection.test.ts](../src/viz/recordingSelection.test.ts) adds four checks: actual workflow/company defaults, empty/company/unavailable distinctions, stopped/archive choice independent of active capture, scoped preferences and damaged-storage handling. [Recording fixture](../tests/fixtures/recordingSelection.ts) uses normal application/capture/trigger/stop commands, including no-capture and skill-only-capture companies.

[ux-cleanup.spec.ts](../tests/browser/ux-cleanup.spec.ts) adds three cases: desktop/mobile hierarchy, original landing position, application heading, actual nav alignment/divider, computed cool surfaces and unchanged authoritative snapshots; manual/automatic/stopped/mid-workflow selections across navigation/refresh/tabs; archived/completed/empty state and workspace replacement without substitution. Refresh comparisons account only for existing initialization revision; all business events/facts/recordings remain identical. Tests run from a fresh clone without local handoff files. Four before/after pairs use matching fixtures/viewports.

Intermediate results: baseline screenshot capture passed 1/1. Focused attempts were 2 passed / 1 failed twice, then 1 passed / 2 failed while correcting real replacement/default binding and route-mount races. One timeout occurred because a still-mounted default callback restored the old Journey URL while opening Workspace. Matching-route gating, once-only URL binding and preserved invalid company selection fixed it. Final focused rerun passed 3/3. No arbitrary sleeps, deleted cases, changed business/capture rules or relaxed restoration assertions.

Retained coverage includes lifecycle rejection/suspension/completed-root invariants, UI, roles/global totals, privacy, multi-tab contested commands/duplicates/missed notices, exact Frame 13/archive/continuation, portable validation/rollback, triggers/observer failure, 25-company/50-recording scale and 37/80-node layout/playback. Legacy test helpers map Demo Workspace to its new Workspace nav label; original route/region/commands remain.

## 6. Limits, debt, decisions and gaps

Business state still uses a snapshot; per-tab caches, observer metadata/processed identities and import/export cost grow with histories. No retention/compression/streaming/quota guarantee. Monitor uses array projections, not server queries. Shared App retains legacy branches; this is a bounded UX/selection fix, not broad refactoring. View preferences can be unavailable when sessionStorage fails; exact URLs still work. Historical guides may retain older navigation labels.

The retained scale test passed again in 3.13: 25 companies/50 recordings/650 frames at restore and 13 explicit publications continuing to 663 frames. The prior 3.12 readable export was 10,204,083 bytes (9.73 MiB), logical State 6,070,306 bytes; this is historical size evidence, not a new performance claim. Files and capture histories remain unbounded within the 50 MiB import limit.

- Implemented business rules: historical/current/operational separation, explicit publication, Ready AND Active, duplicate skill guard, no completed-root resumption or automatic unsuspension. Unchanged.
- UX decisions: real availability instead of placeholder inference; URL pinning plus epoch-scoped tab preferences; matching-route mount; reuse one growth form; keep landing's blank footprint; blue decorative surfaces with semantic status retained.
- Provisional assumptions: company identity, HVAC/Plumbing, fictional evidence and current admin/vendor/profile/training/reminder sequence. No policy expansion.
- Deviations: no intentional domain/workflow/recording-contract deviations. Workspace rename is the requested nav label; internal view/region names and URLs remain compatible. Existing graph canvas/geometry and accepted wordmark are untouched.
- Product review: recording availability/continuity, missing-company discovery, nav alignment/divider, growth before history, anonymous spacing and blue surfaces. 3.12 is accepted; stop for focused 3.13 feedback.
- Open business decisions: first-skill rejection recovery; suspension-removal request/approval/audit; compliance expiry/grace; post-activation administration. No Iteration 4 implementation.
- Untested/manual: formal screen-reader certification, Firefox/Safari, non-Windows rendering, exhaustive device/zoom/font preferences, real OS save-picker UI, near-quota/crash boundaries. Picker behavior remains stub-tested.
- Known defects: none confirmed in executed acceptance paths; representative coverage is not exhaustive certification. Existing unavailable lifecycle recovery is explicit and has no shortcut. Unknown free text/raw records remain faithful.

## 7. Repository and publication

- Repository onboarding: C:\Users\david\Documents\Repositories\onboarding; main/upstream origin/main; origin fetch/push https://github.com/dblath/onboarding.git.
- Starting accepted/published tip: d0602299f1ae726b327b48a57477ffb360bdcad2. Previous 3.12 implementation: 546e17c0c17425b0db68debe8626ef6488c9a053.
- 3.13 commit/push pending final checks. Changes: bounded UX/selection, scoped colors, tests/fixtures, package version and docs. No domain/workflow/persistence/observer contracts or original branding changes.
- docs/chet is excluded by .git/info/exclude and has no tracked files. Full Chet report, review material and four before/after screenshot pairs remain local-only under docs/chet/iteration-3.13.
- Final formatting, remote/local SHA/clean tree and listener checks follow publication. No force-push, credentials, history replacement, deployment or persistent server. Manual app uses 5174 --strictPort; 5173 remains reserved for David.

## 8. Manual acceptance and next work

Run npm run dev -- --port 5174 --strictPort. Use the same Chrome profile/exact origin:

| Experience | URL                                            |
| ---------- | ---------------------------------------------- |
| Contractor | http://127.0.0.1:5174/#/contractor             |
| Operations | http://127.0.0.1:5174/#/operations             |
| Monitor    | http://127.0.0.1:5174/#/monitor                |
| Workspace  | http://127.0.0.1:5174/#/monitor?view=workspace |

Back up current state before importing review files. Chet's local guide links normal-command fixtures and unedited before/after screenshots.

1. Anonymous Contractor at 1440/390: one main-panel introduction, original CTA/sign-in, absent duplicate page title/subtitle and retained blank space. Start application: contextual page heading/introduction reappear above the existing form. Returning to Sign In creates no company.
2. Ready/Active completed company, alex@example.com / 123: identity/eligibility → growth with blue CTA → completed onboarding → details. Existing HVAC disabled/Plumbing available; visibility/independent request behavior unchanged. Check both widths/keyboard.
3. Monitor sidebar: Workspace uses original view=workspace route and preview/backup/Save/Load/Reset/scenarios. Automation label aligns with peers; one restrained divider after onboarding entry, no duplicate links.
4. Journey Map: real recordings selected immediately, including a company whose only capture is a skill workflow. Choose manual/automatic/stopped/archived/mid-workflow records, navigate away/back and refresh; explicit choice persists without new capture/event/work.
5. Company with no capture says No recordings for this company and offers All companies. Only globally empty state says No recordings yet. Missing exact identity stays unavailable.
6. Two tabs retain different view selections. Replace workspace from the other tab: old company/recording stays unavailable, including after navigation/refresh. Explicitly choose a restored record. Exact Frame 13/archive/replay/continuation remains compatible.
7. Compare selection, information, recording table, expanded controls, lanes and node illumination across experiences. Cool surfaces; genuine green success icons/badges/edges, amber waits and red failures remain. Original Unity image/favicon/wordmark intact.

Run npm test, npm run test:browser, npm run build and npm audit --audit-level=moderate. Static output dist; no backend setup. No app is intentionally left running.

**Next: manual UX acceptance only.** No lifecycle expansion, Iteration 4, field service, backend/authentication or designer. Continue with concrete product feedback before defining another slice.

Continuity: update STATUS from actual code/executed evidence, commit/push, verify remote/local/clean tree and deliver detailed Chet material locally only.
