# Unity fieldwork implementation status and context handoff

**Executive summary — Iteration 3.9: Onboarding First. 2026-10-17, America/Denver. Package 0.3.10.**

The signed-in Contractor Portal now presents an onboarding product: one company identity, one clear next action or real next team, current job eligibility, a compact prerequisite-aware business journey, and supporting records behind independent disclosures. The repeated metrics/four-status/readiness/card arrangement is removed from Contractor. Company documents and initial skill qualification appear alongside one another; setup, training and activation explain their actual prerequisites without a fabricated percentage or numbered linear sequence.

Historical completed onboarding stays complete. Additional qualifications appear as separate company activities. Current readiness and operational status remain distinct in the inspectable facts, while suspension or pending activation is explained at the top. A Ready/Pending company stays Not eligible until Operations explicitly publishes activation in Monitor. Existing forms, evidence versions, company sign-in, role ownership, workflow rules, Viz, observer storage and portable workspace behavior are preserved.

The read-only HomeItem frontend supplied the navy/blue/slate palette, white surfaces, fine borders, compact chrome, business status treatments, form hierarchy and progressive disclosure patterns. Its business model, API layer, editor tree and component hierarchy were not copied. Shared theme colors and wider Unity lettering apply across experiences; Operations and Monitor layouts were not redesigned. Unity's width axis is now 95 instead of 75, retaining weight 450, without horizontal transforms or asset changes.

**Executed verification: 110/110 regression tests; 38/38 Chromium tests; production build passed; audit 0 vulnerabilities.** Ready for manual Contractor product acceptance. Operations and Monitor layout redesign remains deferred. All seven requested conditions are rendered at both 1440px and 390px by the new acceptance suite. Detailed Chet report, four representative screenshots, additional captures and portable review fixtures remain local-only under `docs/chet/`.

## 1. Capability matrix

| Capability                                                             | Status                | Actual behavior / boundary                                                                                                                                                 |
| ---------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signed-in business overview                                            | Implemented           | Company/contact, plain-English status, one recommended action and other-action count, or actual next work/owners                                                           |
| Parallel onboarding journey                                            | Implemented           | Six compact business sections; documents and skills parallel; explicit setup/training/activation prerequisites; no invented percentage                                     |
| Historical completion and later skills                                 | Implemented           | Completed six-section onboarding remains historical; new skills are separate company activities; current suspension/readiness still determine eligibility                  |
| Details on demand                                                      | Implemented           | Independent native disclosures for readiness/operational facts, requirements/reviews, qualifications, every evidence version, decisions/reasons/responses and work history |
| Existing contractor actions and messages                               | Implemented           | Existing TaskCard forms/commands retained, business success notices for Contractor, company-filtered notifications, no internal automation execution                       |
| Anonymous application / simulated login                                | Implemented           | Start a new application remains marquee; secondary sign-in, email + 123, duplicate-email choice, tab-local company identity/sign-out                                       |
| Blue/slate theme and wider Unity                                       | Implemented           | Shared foundation tokens and focus/disabled controls; native width-axis change; complete source logo and padded favicons unchanged                                         |
| Desktop/mobile and keyboard                                            | Implemented           | Requested states at 1440 × 1000 and 390 × 844; overflow/above-fold action checks; native Enter/Space disclosures and keyboard focus                                        |
| Operations role focus/global counts                                    | Implemented, retained | My active work from Open owned WorkItems; All companies discovery; safe selection; all-role global totals; Monitor automation deep links                                   |
| Viz triggers/group counts/playback                                     | Implemented, retained | Four opt-in catalog entries, independent recordings, selected-frame counts, correction loops, compact 37/80-node views                                                     |
| IndexedDB observer isolation                                           | Implemented, retained | Business-first durability, changed metadata/new frames, explicit gaps, healthy capture continuation, atomic all-store replacement                                          |
| Save/Load/Reset and scenarios                                          | Implemented, retained | Complete portable file; confirmed atomic replacement; original 3.6/3.7 files; exact frames/archives and continuation                                                       |
| Formal accessibility / all browsers                                    | Partial               | Representative computed contrast and keyboard checks; no formal audit, assistive-technology matrix or Firefox/Safari acceptance                                            |
| Initial rejected-skill / lost-qualification recovery                   | Partial               | Consistent state and honest lack of recovery action; no lifecycle shortcut                                                                                                 |
| Operations / Monitor layout redesign                                   | Not Implemented       | Deliberately deferred until Contractor design is reviewed; only shared visual foundation/wordmark changed                                                                  |
| Suspension-removal approval, ongoing compliance, post-activation admin | Not Implemented       | Iteration 4 product decisions remain open                                                                                                                                  |
| Backend, real auth/integrations, Temporal service, designer            | Not Implemented       | Browser simulation; integrations remain explicitly user-triggered                                                                                                          |

## 2. Reference, UI architecture and source boundaries

HomeItem inspected read-only at `C:\Users\david\Documents\Repositories\homeitemV2fe`, commit `c9a357c82301275d773504fd3c9141831e03857d`: `src/app/App.tsx`, `src/styles/global.css`, `src/features/catalog/CatalogPage.tsx`, `src/features/editor/HomeItemWorkspace.tsx`. No changes, installs or server launches in that repository. Detailed adopted/not-copied rationale: [`contractor-experience.md`](contractor-experience.md).

- [`src/ContractorPortal.tsx`](../src/ContractorPortal.tsx): new signed-in presentation using the existing shell/session and TaskCard. Three intentional views remain Your journey, Required actions and Messages. Disclosure is native HTML; stage inspection opens/focuses the related disclosure. Presentation never schedules work.
- [`src/contractorJourney.ts`](../src/contractorJourney.ts): pure business display adapter over current company/application facts, initial/additional qualifications, requirements and Open WorkItems. Correction tasks sort first; current eligibility uses existing domain policies. No new persisted projection or commands.
- [`src/contractor.css`](../src/contractor.css): Contractor-only hierarchy, six-section geometry, record/disclosure styling, action forms, mobile navigation and stacking. [`theme.css`](../src/theme.css): shared HomeItem-inspired palette, controls, contrast/focus and semantic treatments. [`style.css`](../src/style.css): existing local font width 75 -> 95 at weight 450, wider fallback faces. No font download/dependency.
- [`src/App.tsx`](../src/App.tsx): signed-in Contractor routes into the new component; removes Contractor marketing header/global metrics; retains Simulation/live shared-browser strip and tab-local navigation/session. New application becomes secondary signed-in navigation. Operations/Monitor keep their layout and all queue/diagnostic behavior.
- [`src/TaskCard.tsx`](../src/TaskCard.tsx): existing forms/handlers; optional Contractor presentation chooses business success notices. Internal success notices/actions are unchanged.
- [`src/application.ts`](../src/application.ts), [`domain.ts`](../src/domain.ts), [`orchestration.ts`](../src/orchestration.ts), [`companyLifecycle.ts`](../src/companyLifecycle.ts): unchanged use cases, events, compiled workflow and lifecycle policies.
- [`src/indexedDbRepository.ts`](../src/indexedDbRepository.ts), [`coordination.ts`](../src/coordination.ts), `src/workspace/*`, `src/viz/*`, [`ContractorAccess.tsx`](../src/ContractorAccess.tsx): unchanged persistence, synchronization, portable file contracts, recorder/trigger/map semantics and simulated identity.

### Business rules and domain model retained

The company remains the business identity, including one-person companies. Typed records cover company/application, screening, three administrative requirements, versioned evidence, qualifications, WorkItems, workflow instances/history, accepted business events, integration attempts and outbox. They are explicit records/policies rather than fully encapsulated DDD aggregate/value-object classes; commands can update related records together.

Ready requires approved administration, completed portal setup, confirmed training and at least one approved skill. Eligible requires Ready AND Active. Onboarding completion is historical; sole-approved-skill loss removes readiness and suspends an Active company. Regaining a qualification never removes suspension. Completed CompanyOnboarding roots receive no new work/activation and never resume. New qualifications run independently. This iteration changes none of those rules, domain/event contracts or authentication semantics.

User action -> existing OnboardingService command -> service queue/Web Lock/latest state -> business facts/event -> `LocalOrchestrator.deliver` correlation, processed-ID and expected-work checks -> compiled CompanyOnboarding v2 or SkillQualification v2 rule -> completed/new WorkItems -> lifecycle evaluation -> safe Viz observation -> authoritative business durability -> isolated auxiliary persistence -> revision notification -> next participant reloads authoritative work. UI presentation cannot activate a company or repair eligibility.

Persisted waits, attempts and history survive refresh. Failed integrations require explicit Monitor retries; successful outcomes are not invented. Simulation-clock advancement drives reminders/escalation. Reload recovers saved waits, not a Temporal worker. There is no server, background worker, durable timer service, cross-device state or all-tabs-closed execution.

## 3. Information architecture and state presentation

The top business summary replaces repeated status strips. A contractor with work sees a business label and one Continue action; other available work is counted and accessible through Required actions. With no contractor work, the summary lists actual current next actions and their responsible teams. No future assignment is counted. If no recovery/publication action exists, it says Operations needs to review rather than inventing one.

Journey states use text plus symbols and semantic colors: Complete, Waiting on you, Waiting on another team, Requires correction, Blocked and Not yet started. An unapproved application does not imply future stages have started. Pending activation is an internal Operations responsibility. Completed onboarding remains historical Complete even after a new skill request or current eligibility loss. Supporting details retain current readiness, operational status, vendor reference, verification outcomes, every evidence version, skill reasons, screening decisions/responses and work statuses/outcomes with dates/owners. Raw internal record IDs, envelopes and correlation diagnostics are not primary contractor content.

The theme uses navy `#122331`, slate `#f3f6f8`, white surfaces, body ink `#17222c`, muted text `#526575`, blue action `#205f98`, border `#d8e0e6`. Success/warning/failure colors carry meaning rather than branding. Unity uses the existing locally installed Bahnschrift face with width 95 and weight 450; no scaling/transforms. Image proportions are preserved at 62px desktop / 36px mobile Contractor width; internal experience image sizing remains as before.

## 4. Persistence and three-tab continuity

No persistence changes in 3.9. IndexedDB `fieldwork-onboarding` database v2/business schema 4 uses `state/current`, `viz-control/current`, `viz-recordings` and append-only `viz-frames`. Normal business writes commit first, changed observer records/new frames follow in isolated transactions, then checkpoint control. Auxiliary failure preserves valid business durability and quarantines uncertainty with an explicit Capture issue/gap; healthy recordings continue. Authoritative storage/quota failure still rejects. No fabricated frames, replay/backfill or hidden retention.

Warm frame cache is epoch-scoped and immutable. Production reads and writes use `fieldwork-onboarding:commands:v1`; revision-only notifications on `fieldwork-onboarding:changes:v1` follow durability and lock release. Focus/visibility/pageshow recover missed notifications. Operations role/company/list scope and Contractor identity remain tab-local. Writes remain disabled without required browser coordination.

Save assembles one complete portable logical file, excluding sessions/browser internals. Load/Reset use one atomic transaction across every store, with existing preview/backup/confirmation, stale-review rejection, higher revision and new replacement epoch. Queued old-workspace commands reject. Original workspace formats 1 and 2 / Viz 1 and 2 remain supported; business schema stays 4. Frame 13, archives, causes, lineage and continued real workflow are preserved. See [`observer-storage.md`](observer-storage.md), [`workspace.md`](workspace.md), [`viz-recording.md`](viz-recording.md).

## 5. Executed verification

Windows, Node 24.13.1 / npm 11.8.0. Chromium production preview uses temporary 4173; no application uses 5173 for this work.

| Executed command                     | Actual result                                                                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                           | **110 passed, 0 failed**, 14 files; final recorded run 23.58 s                                                                                                                  |
| `npm run test:browser`               | **38 passed, 0 failed**, 14 spec files, one worker, final full run 3.0 minutes                                                                                                  |
| New seven-state/form Chromium checks | **2 passed**, 9.0 s in initial focused run; covers all seven states at both requested widths                                                                                    |
| `npm run build`                      | Passed TypeScript/Vite, 231 modules; current main JS 379.47 kB / gzip 110.95; main CSS 43.79 / gzip 9.67; lazy Viz 257.52 / 85.27, Workspace 11.11 / 3.98, Triggers 3.90 / 1.57 |
| `npm audit --audit-level=moderate`   | **0 vulnerabilities**; no new dependencies                                                                                                                                      |

[`src/contractorJourney.test.ts`](../src/contractorJourney.test.ts) uses normal business commands for seven requested conditions plus subsequent suspension. It tests actual parallel ownership, correction priority, Ready/Pending vs eligible, historical onboarding after new qualification/lost readiness and nonmutation of all facts/frames. [`tests/fixtures/contractorStates.ts`](../tests/fixtures/contractorStates.ts) produces real coherent portable review states without bypassing rules.

[`tests/browser/onboarding-first.spec.ts`](../tests/browser/onboarding-first.spec.ts) covers seven states × desktop/mobile, exact eligibility, parallel work, no page overflow, above-fold next action, independent native Enter/Space disclosures, visible ownership, correct historical completion/separate new skills, no internal activation controls, unchanged authoritative state during inspection, existing evidence form and actual next owned WorkItem. Representative computed contrast and keyboard focus checks run in the rendered page: 4.58:1 disabled (including hover), 6.04:1 muted body, 7.29:1 action-needed status, 6.39:1 complete status, 5.47:1 incomplete job status, 9.20:1 hovered primary action and 10.16:1 navigation. Keyboard focus uses a visible 3px outline. [`fishing-net.spec.ts`](../tests/browser/fishing-net.spec.ts) also verifies actual platform font, width 95/weight 450, wider rendered glyphs than 75 and no transform. [`branding.spec.ts`](../tests/browser/branding.spec.ts) retains full source-logo/favicons pixel/padding and aspect-ratio checks.

All prior domain, workflow, lifecycle, simulated login/privacy, role queues, concurrency, missed notification recovery, portable file restoration, observer failure isolation, triggers, Viz history and 80-step suites remain. Assertions explicitly inspect the new disclosure/section or updated business wording; business-state expectations are retained. No test was removed and no arbitrary sleep was added.

### Intermediate results, not hidden

The initial build failed because the partial activity-label lookup needed a typed Activity-keyed map; fixed before successful production checks. First regression run was **108/109**: a prior test expected the old “independent lifecycle” text; updated to the new separate-activity disclosure. With the new pure model test included, subsequent runs are **110/110**. First full browser result was **35/38**: the old 44px mobile logo assertion (now deliberately 36px, aspect ratio unchanged), old skill-description wording and former eligibility heading. The second full browser run was **37/38**: one assertion matched both a visible Plumbing record and a select option; narrowed to the record rather than weakening the lifecycle check. The final full browser run passed **38/38**. A screenshot-only follow-up passed **2/2 in 10.2 s** after returning expanded captures to the top of the page. No production source changed after the full successful run.

Visual review caught inherited `summary small { float:right }` and generic details padding interfering with new disclosure layout; reset only in the Contractor component. Layout/contrast/focus checks and final screenshots verify the correction. Shared foundational colors changed, not domain behavior.

## 6. Scale and known technical limits

The retained Chromium scale case runs 25 companies, 50 company/skill recordings, 650 initial frames and three tabs, continuing through 13 explicit activations to 663 frames. It is a regression, not a new performance claim for this UX slice.

Historical 3.8 before/after measurement: 78,070,018 -> 18,600,842 logical write bytes across those 13 commands (76.2% less); mean rendered three-tab round trip 265.60 -> 217.01 ms; full restore 2,374.96 -> 2,682.97 ms; complete readable export 10,204,083 bytes (9.73 MiB). These local single-run measurements are from 3.8, not rebenchmarked claims for 3.9. Full raw before/after, confounded earlier driver-polling samples and methodology remain in local Chet 3.8 artifacts and Git history.

Business facts/events still use one snapshot; metadata/seen identities grow; recorder scans scoped history; each tab caches full historical frames. Cold load/export/import process the complete workspace. No retention, compression, streaming, automatic gap repair or quota guarantee. UI file limit remains 50 MiB. Additional UI costs about 4.6 kB gzip main JS and 3.1 kB gzip main CSS relative to 3.8. No dependencies or backend were added.

## 7. Decisions, assumptions and remaining gaps

- **Implemented rules:** existing historical/current/operational separation, approved skill prerequisite, explicit activation, Ready AND Active jobs, no completed-root resumption or automatic unsuspension. Preserved in code and acceptance.
- **Presentation decisions:** correction-first recommended action; multiple legitimate actions can be completed in any order; actual Open work determines next ownership; historical six-section journey uses completed application facts; later qualification work remains separate. Details show present facts independently.
- **Provisional business assumptions:** company identity; sample HVAC/Plumbing; fictional evidence; current administration/vendor/profile/training sequence; reminder/escalation policies. No production policy expansion this iteration.
- **Architectural choices:** a pure Contractor display adapter and scoped component/styles over existing React application, shared foundational palette; no new persisted read model, auth layer, workflow or state store. Existing internal overview markup remains for Operations/Monitor.
- **Product review needed:** hierarchy/action wording; parallel-stage clarity; detail discoverability; the wider wordmark beside the original logo; 390px reading/scrolling. Do not propagate this layout to internal experiences before review.
- **Business questions unchanged:** initial qualification rejection recovery, suspension-removal administrative request/approval/audit, ongoing compliance/expiry/grace and post-activation admin. No Iteration 4 implementation.
- **Manual/untested:** non-Windows fallback rendering, screen-reader/browser combinations, actual OS file picker, Firefox/Safari, exhaustive accessibility audit, near-limit histories/quota/crash boundaries. Representative contrast and keyboard checks do not certify every pixel/control.
- **Known defects:** no remaining confirmed defect in the executed acceptance paths; the technical/manual limits above remain explicit. No confirmed business/lifecycle defect was discovered in the redesign.

## 8. Repository and publication

- `onboarding`, `C:\Users\david\Documents\Repositories\onboarding`; branch `main`, upstream `origin/main`; origin fetch/push `https://github.com/dblath/onboarding.git`.
- Starting published tip `c0177f6d3dc8ca9c79f4f123d0c558cb7db2e6e8`; 3.8 implementation `3df108fb29e316172a60c909e32c7ab0af312567`. Final 3.9 implementation/publication verification is recorded before delivery. No force-push, reset, reinitialization, credentials or deployment.
- HomeItem reference remains clean and read-only. Business, lifecycle, orchestration, authentication, persistence, workspace and Viz source/assets remain unchanged; only Contractor UI, theme/font styling, package version, tests and docs changed.
- Original Unity PNG SHA256 `88ef0146e47c4f25fbb95372945eca19b65e6598c7a8a43a8eb39a5af337d1a1`; no favicon derivations or image edits this iteration.
- Current docs: README, STATUS, [`contractor-experience.md`](contractor-experience.md), observer/workspace/recording/shared-browser and existing domain/process/event/rule docs. Earlier acceptance guides use historical UI wording.
- Local-only Chet: `docs/chet/iteration-3.9-status.md`, `acceptance-3.9.md`, `iteration-3.9-review.md`, `iteration-3.9-screenshots/`, portable seven-state review files and contrast results. Excluded through `.git/info/exclude`; never committed.

## 9. Manual acceptance and next work

Run **`npm run dev -- --port 5174 --strictPort`**. Same profile/exact origin in all tabs:

| View                | URL                                              |
| ------------------- | ------------------------------------------------ |
| Contractor Portal   | http://127.0.0.1:5174/#/contractor               |
| Operations          | http://127.0.0.1:5174/#/operations               |
| Monitor automations | http://127.0.0.1:5174/#/monitor?view=automations |
| Demo Workspace      | http://127.0.0.1:5174/#/monitor?view=workspace   |

Back up existing state before loading review scenarios. Via Demo Workspace preview/confirm any local `docs/chet/iteration-3.9-scenarios/contractor-*.json`, then sign into Contractor with `alex@example.com` / `123`. These are normal-command fixtures, not an extra product scenario catalog.

1. Submitted: Recruitment is reviewing; no contractor action, future stages not started.
2. Active work: documents and skill evidence require you in parallel; one Continue action leads to existing forms. Submit an item and watch its real team receive work across tabs.
3. Correction: insurance is clearly flagged; correction action takes priority, prior evidence/reason/version remains inspectable.
4. Waiting for teams: no contractor action; named reviews and owners explain what happens next.
5. Activation pending: all readiness prerequisites met, explicit pending Operations publication, Not eligible; no contractor publication control.
6. Eligible: publication makes company Active/Eligible, all original onboarding sections historical Complete.
7. Separate skill: Plumbing is a separate company activity; original onboarding remains Complete, current readiness/eligibility follow existing rules. Suspension removal remains unavailable.

At 1440px and 390px, inspect actions, keyboard navigation, independent disclosures, every evidence version and business messages. Four representative images are indexed in local `iteration-3.9-review.md`; remaining seven-state captures are available locally without a large embedded handoff. Use `npm test`, `npm run test:browser`, `npm run build`, `npm audit --audit-level=moderate`; install Chromium once if needed. Static output is `dist/`, no backend/env setup.

**Next: product review of Contractor only.** Highest-value next work is acceptance-driven polish, then an agreed internal-experience design slice. Do not redesign Operations/Monitor or begin Iteration 4 before that review. No persistent server is part of delivery; temporary test preview is stopped and port 5173 remains untouched.

Continuity: update this report from real code/tests each iteration, commit/push, verify remote/local/clean tree, and deliver detailed Chet artifacts locally only.
