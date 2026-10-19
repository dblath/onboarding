# Unity fieldwork implementation status and context handoff

**Executive summary — Contractor & Viz Cleanup after 3.14. 2026-10-19, America/Denver. Package 0.3.16. Starting published baseline: 3.14.**

Contractor journey badges now say With Unity. The duplicate Review your application / Recruitment summary row is omitted; the heading, useful summary, onboarding path and action controls remain. Other pending-review information is retained. This is presentation only: the existing status enum and all ownership/domain facts are unchanged.

Viz playback, horizontal group pills and canvas are adjacent. Frame metadata, narrative, readiness breakdown and changed-step inspection remain in a collapsed Journey context & recorded details disclosure below the map, with live viewed-frame updates. Inspection no longer expands groups; only the pills / Expand all / Group overview do so. Focus blockers has an accessible Clear blocker focus toggle; clearing or either fit control restores the full current map. A stable default React Flow options reference prevents re-render from overwriting a queued blocker-specific fit. No recorder, business command, layout definition or state contract changed.

**Executed verification: 122/122 regression tests; 56/56 Chromium tests; production build passed; audit 0 vulnerabilities. Ready for manual UX review.** Chet's report, validated review scenarios and desktop/mobile/presentation screenshots stay local-only under docs/chet/contractor-viz-cleanup-2026-10-19. No Iteration 4, lifecycle expansion or designer. The earlier interrupted draft had been fully reverted; this task began from a clean tree.

## 1. Implemented / Partial / Not Implemented

| Capability                                                              | Status                 | Actual boundary                                                                                                                               |
| ----------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Contractor waiting copy / duplicate row                                 | Implemented            | With Unity badges; omit duplicate application review only; original path, summary and next actions retained                                   |
| Compact Viz / disclosed context                                         | Implemented            | Playback → pills → canvas; live viewed-frame diagnostics below map, collapsed by default                                                      |
| Pill-only expansion / reversible focus                                  | Implemented            | Inspection does not expand groups; native keyboard toggle and both fit controls clear blocker focus                                           |
| A&I in Operations                                                       | Implemented            | Same work-first layout; active default; Open canonical ownership; company counts; explicit execute/retry/publication                          |
| Participant navigation                                                  | Implemented            | Wrapped labels share a left edge; one divider after Contractor; selection/focus/mobile behavior retained                                      |
| Monitor A&I                                                             | Implemented, retained  | Existing queue, failed human retries, history/attempts, deep links and explicit execution                                                     |
| Cross-surface safety                                                    | Implemented, exercised | Shared WorkItems/commands; active queues update both ways; one outcome under contested publication                                            |
| Contractor / human Operations                                           | Implemented, retained  | Anonymous apply; email + 123/tab-local identity; owned human work, global totals, progress and safe selection                                 |
| Recording selection / blue UX                                           | Implemented, retained  | Real matching journeys, scoped preferences, honest unavailable states, growth before history, blue/slate surfaces                             |
| Onboarding / lifecycle                                                  | Implemented, retained  | Screening/corrections, versioned evidence, parallel admin/skills, vendor/profile/training; explicit publication; Ready AND Active eligibility |
| Shared browser / portable state                                         | Implemented, retained  | IndexedDB, Web Locks, invalidation; atomic Save/Load/Reset/scenarios; exact Viz restoration                                                   |
| Viz / observer durability                                               | Implemented, retained  | Automatic/manual simultaneous captures, exact frames/causes/lineage, playback, compact/grouped maps, failure isolation                        |
| Accessibility / browser matrix                                          | Partial                | Representative Chromium 1440/390/native keyboard coverage; no certification or Firefox/Safari acceptance                                      |
| Initial skill rejection / qualification-loss recovery                   | Partial                | Consistent state and explicit unavailable recovery; no shortcut                                                                               |
| Suspension-removal approval / ongoing compliance / later administration | Not Implemented        | Future business lifecycle decisions                                                                                                           |
| Backend / real auth/integrations / Temporal / designer / field service  | Not Implemented        | Explicitly excluded; browser simulation only                                                                                                  |

## 2. Architecture and source boundaries

Current cleanup:

- [ContractorPortal.tsx](../src/ContractorPortal.tsx): maps the existing waiting status to With Unity and excludes ScreenApplication from the summary waiting rows. Other review information remains. [contractorJourney.ts](../src/contractorJourney.ts) changes one summary sentence so it no longer points to an absent list; no readiness/stage calculation changes.
- [JourneyMap.tsx](../src/viz/JourneyMap.tsx): moves the existing metadata/story/readiness JSX below the map in a native details disclosure. Detail-panel member selection calls only setSelected; no implicit setCollapsed or Expand group action. Local pressed state controls blocker/full-map camera fits, resets on viewed frame/recording/group changes, and never calls an application command. Both fit buttons clear it.
- React Flow queues fitView requests. Previously, an inline default fitViewOptions object acquired a new identity on local re-render and StoreUpdater could overwrite queued blocker-specific options. The stable module-level default preserves the requested node subset; the full-map default geometry is unchanged. The new browser test caught this defect and verifies both actual focus and restoration.
- [viz.css](../src/viz/viz.css): rounded standalone playback, compact pill spacing, blue/slate context disclosure below canvas and pressed focus styling. Pan, zoom, minimap, semantic state colors, original Unity assets and graph layout remain.

Retained 3.14 Operations architecture:

- [experiences.ts](../src/experiences.ts): presentation-only Operations catalog extends human roles with canonical Simulation. Domain Persona/Role/activity definitions are unchanged.
- [App.tsx](../src/App.tsx): chooseParticipant selects A&I locally instead of redirecting to Monitor. Sidebar and selector share this path; A&I defaults to active scope. Existing tab-local role/scope/company preferences and authoritative network filter remain. Missing/out-of-scope selection requires explicit choice rather than silent substitution.
- [OperationsWorkQueue.tsx](../src/OperationsWorkQueue.tsx): original Open-only projections/global inventory, one participant divider and explicit label span. All participants/Contractor remain secondary discovery surfaces.
- [operations.css](../src/operations.css): scoped left-aligned wrapping/flex labels, count shrink protection and restrained divider. Monitor navigation/styles are untouched.
- [OperationsWorkspace.tsx](../src/OperationsWorkspace.tsx): operationsAttention and owned actions still query exact Open owner/company facts. Reuses company lists/progress/history/TaskCard, passing automationExecution for Simulation. Adds explicit simulation disclosure and omits the redundant Monitor-only signpost when the A&I action is already visible.
- [TaskCard.tsx](../src/TaskCard.tsx): existing executeActivity/retryActivity controls reused; only Operations A&I failure/notice wording adapted. Existing human retry links and Monitor controls remain.
- [AutomationQueue.tsx](../src/AutomationQueue.tsx), [MonitorWorkspace.tsx](../src/MonitorWorkspace.tsx), [WorkflowMonitor.tsx](../src/WorkflowMonitor.tsx): unchanged. Monitor includes Open system work plus Open work whose latest integration attempt failed.

Protected domain/application/orchestration/lifecycle/migration, repository/coordination/runtime/workspace hook, portable format/scenarios and all Viz recorder/observer/storage/layout contracts are unchanged. No dependencies, fonts or original Unity/favicons changed. Current design: [Operations](operations-experience.md), [Monitor](monitor-experience.md), [Contractor](contractor-experience.md), [presentation](presentation-language.md). Domain catalogs: [domain](domain.md), [processes](processes.md), [events](events.md), [rules](rules.md).

### Domain, workflow and action execution

Company remains the business identity, including one-person companies. Records/policies cover company/application, screening decisions/responses, requirements, versioned evidence, qualifications, WorkItems, workflow/history, typed events, attempts and outbox. These are records/policies rather than fully encapsulated DDD aggregate/value-object classes. Commands atomically update related records; presentation derives queries from facts.

User action → TaskCard handler → OnboardingService use case in [application.ts](../src/application.ts) → command queue/shared Web Lock/latest authoritative state → facts/typed event → LocalOrchestrator.deliver in [orchestration.ts](../src/orchestration.ts), correlation/processed identity/expected-work checks → CompanyOnboarding v2 or SkillQualification v2 rules → completed/new WorkItems → lifecycle policy → safe Viz observation → business durability/isolated auxiliary persistence → revision notification → next participant reloads. Selection/navigation does not enter this pipeline.

Both A&I surfaces call executeActivity(workItemId, fail), or retryActivity(workItemId) after failure. The existing task guard rejects closed/stale work inside the shared lock. Technical timeouts append a failed attempt, leave work Open and emit no successful outcome. Explicit retry uses the same work and increments the attempt. No selection-driven execution, automatic retry or activation was introduced.

Ready requires approved administration, completed profile, confirmed initial training and at least one approved skill. Eligible requires Ready AND Active. Completed onboarding stays historical. Last-skill invalidation removes readiness and suspends an Active company; later approval never removes suspension. Completed CompanyOnboarding roots receive no new work/publication and never resume. Independent skill requests retain Ready + Active and duplicate-skill guards. All rules are unchanged.

Saved waits/attempts/history survive refresh. Explicit clock advancement drives reminders/escalations without completing work. Reload restores saved waits; this is a Temporal-like local simulation, not a Temporal worker/server. No real durable timers/external services, cross-device state or execution while all tabs are closed.

## 3. Persistence, synchronization and retained UX

IndexedDB fieldwork-onboarding remains authoritative: database v2/business schema 4; state/current, viz-control/current, viz-recordings and append-only viz-frames. Business commits first; observer metadata/new frames persist separately, then checkpoint control. Capture failures preserve business durability, record gaps and isolate affected recordings. No retention/backfill changes.

Commands coordinate through Web Lock fieldwork-onboarding:commands:v1. Revision-only BroadcastChannel fieldwork-onboarding:changes:v1 notices follow durability/lock release. Tabs reload IndexedDB without executing notification events. Focus/visibility/pageshow recover missed notices; stale reads cannot replace newer revisions. Unavailable coordination disables writes. Sessions and role/scope/company/view preferences remain tab-local. Fresh-tab initialization still increments revision without replaying workflows.

Save/Load/Reset retain formats 1/2, Viz 1/2 and 50 MiB limit. Atomic replacement uses the existing lock, newer revision/new epoch, rejects stale reviews/queued commands and invalidates missing selections. Exact recordings/archives/frames/causes/lineage are restored; sessions/view preferences are not exported. See [workspace](workspace.md), [shared browser](shared-browser.md), [observer storage](observer-storage.md), [Viz recording](viz-recording.md).

The 3.13 selection correction is retained: workflow then same-company default; explicit URL pinning and epoch/company/workflow-scoped tab preferences; no unrelated fallback after replacement. Company absence offers All companies; only global absence says No recordings yet. Matching-route mounting prevents stale Journey defaults overriding navigation. Selection remains read-only. Workspace label/routes, growth-before-history, anonymous introductory spacing, cool decorative surfaces and semantic green/amber/red remain.

## 4. Executed verification

Current cleanup coverage: [contractor-viz-cleanup.spec.ts](../tests/browser/contractor-viz-cleanup.spec.ts) adds two cases for external-facing copy, retained review/path content, 1440/390 spacing and overflow, default collapsed context, exact Frame 13/state equality, inspection without expansion, pill controls, actual blocker camera change, keyboard clearing and both fit controls. It uses the existing legitimate contractor/Frame 13 fixtures. [onboarding-first.spec.ts](../tests/browser/onboarding-first.spec.ts) updates obsolete visible-copy expectations while retaining all seven company states/actions.

The first new focused run was 1 passed / 1 failed: the camera assertion exposed queued fit options being overwritten. After the display fix, the same assertion passed; focused rerun 2/2 (8.2 s). No arbitrary sleeps, removed cases, relaxed state comparisons or business/capture changes. The full suite also passed live story updates while the disclosure is closed, historical playback/background capture and real workflow continuation. A final focused capture run explicitly fits each resized viewport with Follow changes off, preserving its no-auto-camera semantics.

Windows, Node 24.13.1 / npm 11.8.0. Chromium uses production assets on temporary port 4173. This iteration did not start or modify the pre-existing servers on 5173/4174.

| Command/check                            | Actual result                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| npm test                                 | 122 passed, 0 failed; 19 files; final run 46.28 s                                                                   |
| Focused Chromium: contractor-viz-cleanup | 2 passed, 0 failed; final capture run 9.3 s                                                                         |
| npm run test:browser                     | 56 passed, 0 failed; 20 spec files; 4.6 minutes                                                                     |
| Production build                         | Passed TypeScript/Vite; 238 modules; main JS 417.61 kB / gzip 119.77; CSS 67.27 / 13.14; lazy Viz JS 260.15 / 86.25 |
| npm audit --audit-level=moderate         | 0 vulnerabilities; no dependency additions                                                                          |
| Formatting / git diff checks             | Passed for implementation/test changes                                                                              |

[operationsWorkspace.test.ts](../src/operationsWorkspace.test.ts) extends exact-owner Open grouping to Simulation, confirming no mutation. [automationOperations.ts](../tests/fixtures/automationOperations.ts) builds and validates a six-company portable scenario through normal commands: two Open system activities, human verification work and six captures.

[automation-operations.spec.ts](../tests/browser/automation-operations.spec.ts) adds three cases: actual geometry/divider at 1440/390, active/all scope, counts/refresh and unchanged selection snapshot; vendor failure/Monitor retry, human verification/Monitor history, human timeout/Monitor retry, Monitor publication failure/Operations retry, Contractor eligibility and preserved/continued Viz frames; actual shared-lock contention with one attempt/event/completion and an explicit stale-work error. No sleeps or alternate execution path.

[automation-ux.spec.ts](../tests/browser/automation-ux.spec.ts) replaces the obsolete redirect expectation with Operations-local participant behavior, retaining Monitor deep-link/reload/publication checks. [helpers.ts](../tests/browser/helpers.ts) explicitly selects a company after entering A&I; product selection protection is unchanged. Existing Monitor execution paths and human/global inventory coverage remain.

Historical 3.14 evidence: focused automation setup/selectors/error-wording failures were fixed before that delivery (5/5 focused, 54/54 full). Those cases remain in the current full regression suite; they are not new failures in this cleanup.

The full 56-case Chromium suite passed, including retained lifecycle rejection/suspension/completed-root invariants, roles/global totals, privacy, missed notices/duplicates, Frame 13/archive/continuation, import validation/rollback, observer failure, 25-company/50-recording scale and 37/80-node layouts. All 20 spec files passed; no skipped cases or retries concealed failures.

## 5. Decisions, limitations and gaps

- Implemented business rules: existing readiness/activation/suspension, explicit publication, duplicate-skill guards, no completed-root resumption; unchanged.
- Architecture decision: A&I aliases Simulation and reuses the participant/TaskCard path. Monitor's broader failed-verification filter is unchanged. Its badge can legitimately differ from Operations A&I; global Operations total includes every Open WorkItem once.
- Provisional assumptions: company identity, HVAC/Plumbing, fictional evidence and current admin/vendor/profile/training/reminder sequence. No policy expansion.
- Requirement interpretation: verification examples follow canonical ownership. Normal verifications stay human-owned; failed human retries retain Monitor's established path. System retries work on both surfaces. Reassigning verification requires an explicit future business decision.
- Debt: business snapshot/array queries, per-tab caches, growing Viz histories/processed identities/import cost; no retention/compression/streaming/quota guarantee. Shared App retains legacy branches; no broad refactoring.
- Known retained gaps: first-skill rejection recovery; suspension-removal approval; compliance expiry/grace; post-activation administrative requests. No shortcut or automatic unsuspension.
- Untested/manual: formal screen-reader certification, Firefox/Safari, non-Windows rendering, exhaustive devices/zoom/fonts, actual OS picker UI, near-quota/crash boundaries. Branding aspect-ratio/favicon regression retained.
- Known defects: none confirmed in executed regression/focused/full Chromium paths; coverage remains representative rather than exhaustive. The queued-fit camera defect is corrected; no hidden production or workflow workaround was introduced. Prior A&I navigation and canonical ownership remain unchanged.

## 6. Repository and publication

Repository onboarding: C:\Users\david\Documents\Repositories\onboarding. Branch main/upstream origin/main. Origin fetch/push https://github.com/dblath/onboarding.git. Starting published tip cd22846174f92d2d8dfbad516f6510eaf7f90ecc (3.14 publication); implementation f250a897f1a84e910377a396782fe1b403426df8. Tree was clean at start; the copied prompt's draft-work warning no longer applied.

Current changes are bounded Contractor/Viz presentation, browser acceptance tests, package version and documentation. Commit/push pending final checks. No domain/workflow/event/persistence/observer/workspace contract or original asset changes. docs/chet is excluded by .git/info/exclude and has zero tracked files; report/scenarios/screenshots stay local-only. No force-push, history replacement, credentials or deployment.

## 7. Manual acceptance and next work

Run `npm run dev -- --port 5174 --strictPort`; static output dist; no backend. Same Chrome profile/exact origin:

| Experience | URL                                            |
| ---------- | ---------------------------------------------- |
| Contractor | http://127.0.0.1:5174/#/contractor             |
| Operations | http://127.0.0.1:5174/#/operations             |
| Monitor    | http://127.0.0.1:5174/#/monitor                |
| Workspace  | http://127.0.0.1:5174/#/monitor?view=workspace |

Back up before importing review scenarios. Current guide/screenshots: docs/chet/contractor-viz-cleanup-2026-10-19/REVIEW.md. The prior A&I guide/scenario remains local-only under docs/chet/iteration-3.14.

Current cleanup acceptance:

1. Contractor submitted application: You're moving forward and summary remain; duplicate Review your application / Recruitment row is absent. The path still shows Application review, with With Unity. Inspect desktop/mobile and existing next-action controls.
2. Viz: playback immediately precedes pills/canvas. Journey context & recorded details is below the map and closed by default. Open it by keyboard; metadata, story and readiness reflect the viewed frame and continue updating while closed.
3. Select a group and its members: detail inspection works, no Expand group button, no implicit expansion. Use pills / Expand all / Group overview to change detail level.
4. Expand all and Fit map, then Focus blockers. Button becomes Clear blocker focus / pressed, camera focuses the blockers. Space/Enter clears to the full map; top Fit map and native Fit View also clear. Historical inspection and these controls create no events/work/frames.
5. Check normal/presentation at 1440/390, pan/zoom/minimap and background capture. Exact saved Frame 13 journey, archive and workflow continuation remain covered.

Retained A&I acceptance:

1. Expand Work queue: Recruitment/Compliance/Contractor/A&I align; one divider directly after Contractor. Check 1440/390 and keyboard selection.
2. A&I stays in Operations, defaults My active work: Sierra/Echo each show one Open action. Global total 13; A&I 2. All companies exposes all six. Selection executes nothing.
3. Echo: inject vendor timeout in Operations; retry available there/Monitor. Retry in Monitor: Echo/task disappear from active Operations, A&I 1; attempt history retained.
4. Compliance/Delta: verify insurance in Operations; Monitor history updates. Compliance/Gamma: license timeout, existing Monitor retry; Compliance count updates, no ownership reassignment.
5. Contractor sierra@example.com / 123: Ready/Pending/Not eligible. Operations A&I/Sierra: explicitly publish (or fail then retry). Contractor becomes Eligible; Monitor work disappears, history/Viz extend. Completed company remains in All companies/history.
6. Reload original scenario and publish in Monitor instead: same Operations update. Automated contention coverage verifies once-only outcome/stale rejection across both surfaces.

Run npm test, npm run test:browser, npm run build and npm audit --audit-level=moderate. Temporary test preview stopped; no listener remained on 4173. No new persistent app server was started; pre-existing 5173/4174 servers were untouched.

**Next: UX review only.** Validate Contractor copy/duplicate removal, compact Viz controls, disclosed live context, pill-only expansion and reversible blocker focus on desktop/mobile. Retained lifecycle decisions remain open; no Iteration 4, designer, backend/authentication or field service. Update STATUS from actual evidence each iteration; commit/push/verify; keep Chet artifacts local-only.
