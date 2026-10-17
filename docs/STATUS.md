# Unity fieldwork implementation status and context handoff

**Executive summary — Iteration 3.10: Onboarding Operations First. 2026-10-17, America/Denver. Package 0.3.11.**

Operations now leads with the selected role's companies and actual actions. My active work lists only companies with Open work owned by that role, across company and skill workflow roots. Selecting a company immediately exposes its existing forms. Completing its last owned action removes it and clears the stale selection without choosing another company. All companies remains explicit investigation; global Work queue totals still include every participant.

Six-area business progress, review decisions, evidence versions, qualifications, current readiness and business history are independently expandable below the work. Contextual automation and technical-inspection links lead to the existing Monitor. Automation execution/retries remain explicitly user-triggered there. Contractor receives only the requested eyebrow/strip removal, with discreet fictional-data/authentication and storage clarification retained in the footer.

No business policy, workflow transition, event contract, identity, persistence, synchronization, portable workspace or Viz semantics changed. Monitor/Viz layouts and the supplied Unity image/favicons remain unchanged. The accepted navy/blue/slate foundation and Unity width 95 / weight 450 are retained. Ready/Pending stays Not eligible until publication; completed onboarding never resumes and regained qualifications never remove suspension.

**Executed verification: 111/111 regression tests; 41/41 Chromium tests; production build passed; audit 0 vulnerabilities. Ready for manual Operations product acceptance.** Representative screenshots, additional mobile captures, a coherent portable review fleet and detailed Chet handoff remain local-only under `docs/chet/`. Stop for Operations product review; Monitor redesign and Iteration 4 remain deferred.

## 1. Implemented / Partial / Not Implemented

| Capability                                                             | Status                | Actual boundary                                                                                                                                   |
| ---------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role-owned working surface                                             | Implemented           | Company attention list, real business activity/count/due/escalation facts, immediate existing inline forms                                        |
| Role focus and safe selection                                          | Implemented           | Open owned work across roots; completion removes company; no stale substitution; existing tab-local role/scope preferences                        |
| Discovery and global totals                                            | Implemented           | All companies, all-role sidebar total, secondary global inventory; no cross-role execution                                                        |
| Business progress / full record                                        | Implemented           | Six parallel/prerequisite-aware areas; decisions, requirements, every evidence version, qualifications, messages/history                          |
| Monitor handoff                                                        | Implemented           | Automation company/activity links; company-context diagnostics; internal execution/retries only in Monitor                                        |
| Contractor cleanup                                                     | Implemented           | Requested eyebrow/strip removal only; discreet clarification/live browser-storage footer                                                          |
| Contractor onboarding product / simulated login                        | Implemented, retained | Next action/team, current eligibility, historical journey, later skills; anonymous apply, email + 123, duplicate-email choice, tab-local sign-out |
| Multi-tab / portable workspace                                         | Implemented, retained | IndexedDB authority, Web Locks, revision notifications, atomic Save/Load/Reset and legacy formats                                                 |
| Viz / observer isolation                                               | Implemented, retained | Opt-in triggers, independent recordings, exact frames/playback, group counts, compact maps and capture failure isolation                          |
| Desktop/mobile / keyboard                                              | Implemented           | 1440/390 working layouts, native disclosures and mobile company chooser                                                                           |
| Formal accessibility / browser matrix                                  | Partial               | Representative Chromium checks; no formal certification or Firefox/Safari acceptance                                                              |
| Rejected initial skill / qualification-loss recovery                   | Partial               | Consistent state, documented unavailable recovery; no bypass                                                                                      |
| Monitor/Viz redesign                                                   | Not Implemented       | Excluded; existing diagnostic/automation views reused                                                                                             |
| Suspension removal, ongoing compliance, post-activation administration | Not Implemented       | Iteration 4 decisions remain open                                                                                                                 |
| Backend, real auth/integrations, Temporal service, designer            | Not Implemented       | Browser simulation only                                                                                                                           |

## 2. Architecture and source boundaries

- [`src/OperationsWorkspace.tsx`](../src/OperationsWorkspace.tsx): pure `operationsAttention` groups Open owned WorkItems; working company list/actions/global discovery; `CompanyRecord` exposes six-area facts/history. No persisted UI workflow projection.
- [`src/App.tsx`](../src/App.tsx): existing authoritative hook, role/company/scope preferences, selection protection and command runner; new Operations component/header; Contractor footer indicator; company-context Monitor inspection route.
- [`src/operations.css`](../src/operations.css): scoped Operations working geometry/forms/disclosures and 390px company list. Legacy global metrics are hidden for Operations; Monitor keeps its layout.
- [`src/contractorJourney.ts`](../src/contractorJourney.ts): existing pure facts/prerequisite adapter reused for internal progress. [`ContractorPortal.tsx`](../src/ContractorPortal.tsx) only loses the requested eyebrow. Existing Contractor forms/navigation remain.
- [`src/TaskCard.tsx`](../src/TaskCard.tsx): optional Operations business notices and Simulation options disclosure. Existing validation/commands unchanged; technical retry signpost goes to Monitor.
- [`src/presentation.ts`](../src/presentation.ts): company-context `view=inspection` URL/parser beside existing automation links.
- Unchanged business/infra: [`application.ts`](../src/application.ts), [`domain.ts`](../src/domain.ts), [`orchestration.ts`](../src/orchestration.ts), [`companyLifecycle.ts`](../src/companyLifecycle.ts), [`indexedDbRepository.ts`](../src/indexedDbRepository.ts), coordination/runtime/hook, simulated identity, `src/workspace/*` and `src/viz/*`.

Design decisions: [`operations-experience.md`](operations-experience.md), prior [`contractor-experience.md`](contractor-experience.md). HomeItem `C:\Users\david\Documents\Repositories\homeitemV2fe`, commit `c9a357c82301275d773504fd3c9141831e03857d`, remains read-only/clean. Its accepted foundation supplies palette/control hierarchy; no business/API/editor model or font dependency copied.

### Domain, use cases, workflow and events

The company remains the business identity, including one-person companies. Typed records cover company/application, screening decisions/responses, administrative requirements, versioned evidence, qualifications, WorkItems, workflow instances/history, business events, integration attempts and outbox. They are explicit records/policies, rather than fully encapsulated DDD aggregate/value-object classes. Commands update related records atomically.

Ready requires approved administration, portal setup, confirmed initial training and at least one approved skill. Eligible requires Ready AND Active. Onboarding completion is historical. Losing the only approved skill removes readiness and suspends an Active company. Regaining qualification never removes suspension. Completed CompanyOnboarding roots receive no new work or activation and never resume. Additional qualifications run independently. All invariants remain unchanged.

User action → existing `TaskCard` handler → `OnboardingService` use case (`recordScreeningDecision`, `submitEvidence`, `executeActivity`, `decideSkill`, `completeParticipantTask`, `invalidateSkill`) → service queue/Web Lock/latest state → domain facts/business event → `LocalOrchestrator.deliver` correlation, processed identity and expected-work checks → compiled CompanyOnboarding v2 / SkillQualification v2 rule → completed/new WorkItems → lifecycle evaluation → safe Viz observation → authoritative business durability → isolated auxiliary persistence → revision notification → next participant reloads authoritative work. Queries/display adapters derive from those facts; UI cannot activate a company or repair eligibility itself.

Persisted waits/attempts/history survive refresh. Timeouts record failed attempts while work remains Open; retries require explicit Monitor actions. Simulation-clock advancement drives reminders/escalation. Reload recovers saved waits, not a Temporal worker. No server, real external service, background durable timer, cross-device state or all-tabs-closed execution. Catalogs: [`processes.md`](processes.md), [`events.md`](events.md), [`rules.md`](rules.md), [`domain.md`](domain.md).

## 3. Operations behavior and disclosure

Fresh Operations defaults to My active work; an explicitly saved All companies preference remains honored. Left counts are role-specific; the sidebar parent includes all roles and never shrinks on role/company selection. Rows aggregate relevant workflow roots and exclude completed/cancelled work. Completing a last task clears selection without choosing another company; useful empty states offer discovery.

Human role navigation retains ownership semantics. Secondary All participants / Contractor inventory replaces the working surface while open and keeps original execution-role checks. Return to my work returns to the selected role. All companies exposes records without other teams' forms. At mobile width Choose a company collapses the list, prioritizing working forms.

Progress areas are Application review, Company documents, Skill qualification, Company setup, Initial training and Activation. Documents/skills remain parallel; downstream prerequisites are explicit without invented percentages. Historical completion remains separate from readiness/suspension. Company facts expose all four lifecycle values; main identity has one concise business status. Decisions, evidence versions, requirement/qualification outcomes, owners and dated completed/cancelled work remain inspectable. Technical IDs, envelopes, attempts and correlation stay in Monitor.

Ready/Pending has a company-level publication link. Contractor sees the responsible team without execution controls. Failed integrations remain Open with a Monitor retry signpost. No automatic activity or production-state shortcut.

## 4. Persistence and three-tab continuity

No persistence/synchronization changes in 3.10. IndexedDB `fieldwork-onboarding`, database v2/business schema 4: `state/current`, `viz-control/current`, `viz-recordings`, append-only `viz-frames`. Business commits first; changed observer records/new frames persist separately, then checkpoint control. Auxiliary failures preserve valid business durability, report explicit capture gaps and isolate affected recordings; healthy captures continue. No fabricated replay/backfill or hidden retention.

Production reads/writes coordinate through `fieldwork-onboarding:commands:v1`; revision-only `fieldwork-onboarding:changes:v1` notifications follow durability/lock release. Tabs reload IndexedDB rather than executing notification events. Focus/visibility/pageshow recover missed notifications; stale reads cannot overwrite newer revisions. Role, scope, company and simulated identity remain tab-local. Missing coordination disables writes.

Save includes complete logical state and exact Viz frames/archives/causes/lineage, excluding sessions/browser internals. Load/Reset atomically replace all stores under the Web Lock with preview/backup/confirmation, stale-review rejection, higher revision and new epoch. Queued old-workspace commands reject; invalid company selections need explicit choice. Original portable workspace formats 1/2 and Viz 1/2 remain supported; business schema stays 4. See [`observer-storage.md`](observer-storage.md), [`workspace.md`](workspace.md), [`viz-recording.md`](viz-recording.md), [`shared-browser.md`](shared-browser.md).

## 5. Executed verification

Windows, Node 24.13.1 / npm 11.8.0. Chromium uses temporary production preview 4173; port 5173 remains untouched.

| Command/check                      | Actual result                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                         | **111 passed, 0 failed**, 15 files; final run 26.72 s                                                                                                               |
| `npm run test:browser`             | **41 passed, 0 failed**, 15 spec files, one worker; final full run 2.9 minutes                                                                                      |
| New Operations Chromium acceptance | All **3 new cases passed** in the final full suite, including mobile chooser/keyboard and Contractor cleanup; initial focused run 2/2, 7.7 s                        |
| `npm run build`                    | Passed TypeScript/Vite, 233 modules; main JS 394.73 kB / gzip 114.18; main CSS 55.01 / 11.32; lazy Viz 257.52 / 85.27, Workspace 11.11 / 3.98, Triggers 3.90 / 1.57 |
| `npm audit --audit-level=moderate` | **0 vulnerabilities**; no dependency additions                                                                                                                      |

[`operationsWorkspace.test.ts`](../src/operationsWorkspace.test.ts) checks Open/owned grouping across company/skill roots and nonmutation. [`tests/fixtures/operationsState.ts`](../tests/fixtures/operationsState.ts) creates five coherent companies through legitimate commands: Alpha/Beta Recruitment; Gamma insurance/license across two roots; Delta insurance; Sierra Ready/Pending publication. Initial global Open count: 11.

[`operations-first.spec.ts`](../tests/browser/operations-first.spec.ts) covers all eight requested conditions: Recruitment, completion without substitution, parallel Compliance ownership, correction reason/evidence/history, empty Finance, cross-team progress, activation handed to Monitor with three-tab eligibility update, and investigation without cross-role forms. Also covers 1440/390 layouts, overflow, desktop action placement, mobile company selection, independent Enter/Space disclosures, nonmutating inspection, contextual diagnostics and Contractor cleanup.

Retained suites cover lifecycle rejection/invalidation/suspension, real cross-tab command concurrency/duplicates, missed notifications, simulated login/privacy, global counts, portable validation/atomic replacement/legacy files, exact Viz playback/continuation, triggers, observer failures, large histories and 37/80-node maps. [`branding.spec.ts`](../tests/browser/branding.spec.ts) checks intact source-logo/favicons/proportions; fishing-net retains native font width/weight checks. Business/state assertions remain; tests explicitly select companies and disclosures instead of removed tabs/scopes. No arbitrary sleeps or tests removed.

**Intermediate failures:** an early JSX build edit was corrected before successful builds. First regression run **106/110** reflected old marketing/repeated-company assertions and a stale DOM query; after adaptation/new grouping test, full run **111/111**. A browser run stopped at its failure limit with **25 passed, 6 failed, 10 not run**. Failures were removed scope-dropdown lookups, Fleet 1/Fleet 10 substring ambiguity, correction tests assuming automatic company reselection, a disclosure selector matching text inside another area's history, and the newly disclosed timeout checkbox. A subsequent full run was **40 passed, 1 failed**: the alternate-outcome restore test also needed explicit company selection after its prior task disappeared and the workspace was replaced. Tests now choose exact companies/sections and open Simulation options while preserving state assertions and production selection protection. Exploratory interrupted runs are not counted as successful full-suite verification.

## 6. Scale, limits and technical debt

Retained scale acceptance exercises 25 companies, 50 simultaneous company/skill recordings and 650 frames at restore across three live experiences. Historical 3.8 measurements: 78,070,018 → 18,600,842 logical write bytes over 13 commands (76.2% reduction); complete readable export 10,204,083 bytes (9.73 MiB). These are historical measurements, not new 3.10 performance claims.

The 3.10 readable local review file is **523,278 bytes** (about 511 KiB): 5 companies, 28 events, 11 Open WorkItems, 5 recordings and 24 frames. Business facts/events still use a snapshot. Observer metadata/processed identities and per-tab full historical caches grow. Cold load/export/import process all history. No retention, compression, streaming, automatic gap repair or quota guarantee; file limit 50 MiB. App retains legacy shared inspection markup for Monitor; Operations uses a separate presentation component rather than broad shell refactoring. Historical acceptance guides may retain older labels. No new dependency/backend.

## 7. Decisions, assumptions and gaps

- **Implemented rules:** historical/current/operational separation, approved skill prerequisite, explicit activation, Ready AND Active, no completed-root resumption/automatic unsuspension. Unchanged.
- **Presentation decisions:** role work first; records below actions; global inventory secondary; mobile company list collapses; native independent disclosures; actual due/escalation facts determine urgency.
- **Provisional assumptions:** company identity, sample HVAC/Plumbing, fictional evidence, current administration/vendor/profile/training sequence, reminder/escalation policies. No policy expansion.
- **Architecture choices:** pure display grouping/model reuse over existing service/repository; no new state store, queue or workflow. Technical links select company diagnostics rather than a particular historical event.
- **Product input:** role/company/action hierarchy, desktop/mobile density, global discovery clarity, progress/record discoverability and correction ownership wording. Review Operations before Monitor design work.
- **Business questions:** initial-skill rejection recovery, suspension-removal request/approval/audit, ongoing compliance/expiry/grace, post-activation administrative requests. No Iteration 4 work.
- **Untested/manual:** formal screen-reader/browser matrix, Firefox/Safari, non-Windows fonts, actual OS save picker, near-limit quota/crash boundaries. Representative checks are not exhaustive certification.
- **Known defects:** no remaining confirmed defect in executed acceptance paths. Manual/browser/accessibility and lifecycle-recovery limits above remain explicit. No business/lifecycle change used to resolve presentation issues.

## 8. Repository and publication

- `onboarding`, `C:\Users\david\Documents\Repositories\onboarding`; `main`, upstream `origin/main`; origin fetch/push `https://github.com/dblath/onboarding.git`.
- Starting published tip `192fbbef28771425e69d8332fbbe7cc4ae22efb3`; previous 3.9 implementation `640f394cdb66a6e54b5e4fd49871a52561081ee4`.
- **3.10 commit/push pending final verification.** Changes: UI/styles, presentation links, tests/fixtures, package version, README/docs. No force-push/reset/reinitialization, secrets or deployment.
- Before delivery verify local HEAD equals `git ls-remote origin refs/heads/main`, clean tree/upstream, protected source/assets unchanged and HomeItem clean. Chet is excluded via `.git/info/exclude` and never tracked.
- Original Unity PNG SHA256 `88ef0146e47c4f25fbb95372945eca19b65e6598c7a8a43a8eb39a5af337d1a1`; no image/favicon/font edits.
- Docs: README, STATUS, Operations/Contractor design notes, observer/workspace/recording/shared-browser and domain/process/event/rule catalogs. Detailed handoff/materials local-only under `docs/chet/`.

## 9. Manual acceptance and next work

Run **`npm run dev -- --port 5174 --strictPort`**. Same Chrome profile/exact origin:

| View                | URL                                              |
| ------------------- | ------------------------------------------------ |
| Operations          | http://127.0.0.1:5174/#/operations               |
| Contractor          | http://127.0.0.1:5174/#/contractor               |
| Monitor automations | http://127.0.0.1:5174/#/monitor?view=automations |
| Demo Workspace      | http://127.0.0.1:5174/#/monitor?view=workspace   |

Back up existing state. Demo Workspace → Load/preview/confirm local `docs/chet/iteration-3.10-operations-review.json`. This is a normal-command review fixture, not an additional product scenario catalog. Fresh Operations shows Alpha/Beta Recruitment; existing tabs may retain an explicit role/scope—choose Recruitment / My active work.

1. Recruitment: only Alpha/Beta, one review each; global badge initially 11. Select Alpha, Proceed. Alpha leaves Recruitment, no replacement selected; next participants receive real work. Beta remains.
2. Compliance: Gamma has insurance/license reviews across two roots; Delta has insurance. Only owned forms appear. Verify Gamma's expired insurance: correction goes to Contractor, Gamma retains license review. Expand Company documents for reason, evidence/version and work ownership/history.
3. Finance/Training: no work in review fleet; useful empty state. All companies permits Gamma inspection without Compliance forms. Inspect progress, readiness, qualifications, messages/history; technical link opens existing Monitor for that company.
4. Sierra: All companies → Sierra. Ready with publication outstanding, Not eligible. Sign into Contractor `sierra@example.com` / `123`; same blocker. Follow automation link; publish explicitly in Monitor. Eligibility updates in all three tabs. No automatic publication.
5. At 1440/390 review inline forms, company chooser, role controls, independent keyboard disclosures, complete Unity image and global navigation. Anonymous/signed-in Contractor lacks eyebrow/prominent strip; footer still clarifies simulation/storage. Existing forms/sign-in remain functional.

Representative screenshots: Recruitment, Compliance, expanded business details and empty Finance; additional mobile captures remain local. Detailed manual steps/index under `docs/chet/`. Checks: `npm test`, `npm run test:browser`, `npm run build`, `npm audit --audit-level=moderate`; install Chromium once with `npx playwright install chromium`. Static output `dist/`; no backend/environment setup.

**Next: manual Operations product review only.** Apply acceptance-driven polish, then agree any Monitor design slice separately. Do not start Monitor/Viz redesign, Iteration 4 or a workflow designer. No persistent server is part of delivery; leave port 5173 untouched.

Continuity: update this report from actual code/results each iteration, commit/push, verify remote/local/clean tree, deliver detailed Chet materials locally only.
