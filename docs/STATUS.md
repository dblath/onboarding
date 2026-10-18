# Unity fieldwork implementation status and context handoff

**Executive summary — Iteration 3.14: Automations as an Operations Participant. 2026-10-18, America/Denver. Package 0.3.15. Accepted baseline: 3.13.**

Automations & Integrations (A&I) now stays in Onboarding Operations and uses its existing work-first company/action layout. Selecting A&I defaults to My active work, showing only companies with Open canonical Simulation-owned WorkItems and their counts. Explicit runs/retries use the same TaskCard/service commands as Monitor. All companies, progress and disclosed history remain available. The actual Operations participant list aligns wrapped labels to the same left edge, with one divider between Contractor and A&I. Rendered desktop/mobile captures were inspected.

Monitor's existing automation queue, execution, retry, publication, attempts/history and technical inspection are retained. There is no second queue or engine. Monitor also exposes failed human verifications, so its pending count can exceed the Operations A&I-owned count. Canonical ownership is preserved: Compliance owns insurance/license; Finance owns financial review; Contractor Relations owns agreement review; Simulation owns vendor creation and activation publication. A failed human verification does not become A&I-owned.

**Executed verification: 122/122 regression tests; 54/54 Chromium tests; production build passed; audit 0 vulnerabilities. Ready for manual product review.** Chet's detailed review, validated scenario and screenshots are local-only under docs/chet/iteration-3.14. No Iteration 4, lifecycle expansion or designer.

## 1. Implemented / Partial / Not Implemented

| Capability                                                              | Status                 | Actual boundary                                                                                                                               |
| ----------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
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

Windows, Node 24.13.1 / npm 11.8.0. Chromium uses production assets on temporary port 4173. This iteration did not start or modify the pre-existing servers on 5173/4174.

| Command/check                                           | Actual result                                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| npm test                                                | 122 passed, 0 failed; 19 files; 24.15 s                                                                             |
| Focused Chromium: automation-operations + automation-ux | 5 passed, 0 failed; 17.0 s                                                                                          |
| npm run test:browser                                    | 54 passed, 0 failed; 19 spec files; 3.8 minutes                                                                     |
| Production build                                        | Passed TypeScript/Vite; 238 modules; main JS 417.51 kB / gzip 119.74; CSS 67.27 / 13.14; lazy Viz JS 259.98 / 86.16 |
| npm audit --audit-level=moderate                        | 0 vulnerabilities; no dependency additions                                                                          |
| Formatting / git diff checks                            | Passed for implementation/test changes                                                                              |

[operationsWorkspace.test.ts](../src/operationsWorkspace.test.ts) extends exact-owner Open grouping to Simulation, confirming no mutation. [automationOperations.ts](../tests/fixtures/automationOperations.ts) builds and validates a six-company portable scenario through normal commands: two Open system activities, human verification work and six captures.

[automation-operations.spec.ts](../tests/browser/automation-operations.spec.ts) adds three cases: actual geometry/divider at 1440/390, active/all scope, counts/refresh and unchanged selection snapshot; vendor failure/Monitor retry, human verification/Monitor history, human timeout/Monitor retry, Monitor publication failure/Operations retry, Contractor eligibility and preserved/continued Viz frames; actual shared-lock contention with one attempt/event/completion and an explicit stale-work error. No sleeps or alternate execution path.

[automation-ux.spec.ts](../tests/browser/automation-ux.spec.ts) replaces the obsolete redirect expectation with Operations-local participant behavior, retaining Monitor deep-link/reload/publication checks. [helpers.ts](../tests/browser/helpers.ts) explicitly selects a company after entering A&I; product selection protection is unchanged. Existing Monitor execution paths and human/global inventory coverage remain.

Intermediate evidence: first focused run passed layout, failed cross-surface setup because Monitor retained Alpha's filter, then was interrupted while contention waited for an absent filtered activity. Setup now explicitly chooses All companies and releases its held lock in finally. Next focused run: 3 passed, 2 failed due to a history selector matching both companies and guessed stale-error wording. Assertions now use Echo context and the actual service error; final focused run passed 5/5. TypeScript also caught presentation Role typing and optional Viz access in new tests; corrected without domain changes. No production concurrency workaround, sleeps, hidden retries or removed cases.

The full 54-case Chromium suite passed, including retained lifecycle rejection/suspension/completed-root invariants, roles/global totals, privacy, missed notices/duplicates, Frame 13/archive/continuation, import validation/rollback, observer failure, 25-company/50-recording scale and 37/80-node layouts. All 19 spec files passed; no skipped cases or retries concealed failures.

## 5. Decisions, limitations and gaps

- Implemented business rules: existing readiness/activation/suspension, explicit publication, duplicate-skill guards, no completed-root resumption; unchanged.
- Architecture decision: A&I aliases Simulation and reuses the participant/TaskCard path. Monitor's broader failed-verification filter is unchanged. Its badge can legitimately differ from Operations A&I; global Operations total includes every Open WorkItem once.
- Provisional assumptions: company identity, HVAC/Plumbing, fictional evidence and current admin/vendor/profile/training/reminder sequence. No policy expansion.
- Requirement interpretation: verification examples follow canonical ownership. Normal verifications stay human-owned; failed human retries retain Monitor's established path. System retries work on both surfaces. Reassigning verification requires an explicit future business decision.
- Debt: business snapshot/array queries, per-tab caches, growing Viz histories/processed identities/import cost; no retention/compression/streaming/quota guarantee. Shared App retains legacy branches; no broad refactoring.
- Known retained gaps: first-skill rejection recovery; suspension-removal approval; compliance expiry/grace; post-activation administrative requests. No shortcut or automatic unsuspension.
- Untested/manual: formal screen-reader certification, Firefox/Safari, non-Windows rendering, exhaustive devices/zoom/fonts, actual OS picker UI, near-quota/crash boundaries. Branding aspect-ratio/favicon regression retained.
- Known defects: none confirmed in executed regression/focused/full Chromium paths; coverage remains representative rather than exhaustive. Prior participant misalignment/Monitor redirect corrected on the actual Operations surface.

## 6. Repository and publication

Repository onboarding: C:\Users\david\Documents\Repositories\onboarding. Branch main/upstream origin/main. Origin fetch/push https://github.com/dblath/onboarding.git. Starting accepted/published tip 502a762810eee91dc566fdb0dc8d476a9cb0a4ba (3.13 publication); previous implementation a02b719ac36906013730338eb64fca6b67c48f65. Tree was clean at start.

Changes: bounded Operations presentation/participant navigation, TaskCard reuse, tests/fixture, Operations guide, STATUS and package version. Commit/push and final synchronization pending final checks. No domain/workflow/event/persistence/observer/workspace contract or original asset changes. docs/chet is excluded by .git/info/exclude and has zero tracked files; report/scenario/screenshots stay local-only. No force-push, history replacement, credentials or deployment.

## 7. Manual acceptance and next work

Run `npm run dev -- --port 5174 --strictPort`; static output dist; no backend. Same Chrome profile/exact origin:

| Experience | URL                                            |
| ---------- | ---------------------------------------------- |
| Contractor | http://127.0.0.1:5174/#/contractor             |
| Operations | http://127.0.0.1:5174/#/operations             |
| Monitor    | http://127.0.0.1:5174/#/monitor                |
| Workspace  | http://127.0.0.1:5174/#/monitor?view=workspace |

Back up before importing Chet's local six-company scenario. Full guide/screenshots: docs/chet/iteration-3.14/REVIEW.md.

1. Expand Work queue: Recruitment/Compliance/Contractor/A&I align; one divider directly after Contractor. Check 1440/390 and keyboard selection.
2. A&I stays in Operations, defaults My active work: Sierra/Echo each show one Open action. Global total 13; A&I 2. All companies exposes all six. Selection executes nothing.
3. Echo: inject vendor timeout in Operations; retry available there/Monitor. Retry in Monitor: Echo/task disappear from active Operations, A&I 1; attempt history retained.
4. Compliance/Delta: verify insurance in Operations; Monitor history updates. Compliance/Gamma: license timeout, existing Monitor retry; Compliance count updates, no ownership reassignment.
5. Contractor sierra@example.com / 123: Ready/Pending/Not eligible. Operations A&I/Sierra: explicitly publish (or fail then retry). Contractor becomes Eligible; Monitor work disappears, history/Viz extend. Completed company remains in All companies/history.
6. Reload original scenario and publish in Monitor instead: same Operations update. Automated contention coverage verifies once-only outcome/stale rejection across both surfaces.

Run npm test, npm run test:browser, npm run build and npm audit --audit-level=moderate. Temporary test preview stopped; no listener remained on 4173. No new persistent app server was started; pre-existing 5173/4174 servers were untouched.

**Next: product review only.** Validate navigation, canonical ownership expectations and both execution surfaces before another slice. No Iteration 4, designer, backend/authentication or field service. Update STATUS from actual evidence each iteration; commit/push/verify; keep Chet artifacts local-only.
