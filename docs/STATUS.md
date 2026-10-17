# Unity fieldwork implementation status and context handoff

**Executive summary — Iteration 3.8: Focus the Work, Show the Progress, Protect the Observer. 2026-10-16, America/Denver. Package 0.3.9.**

Operations Contractor network now defaults to companies with Open WorkItems owned by the selected role. Each company shows that role's count; All companies remains explicit discovery. Completing the last owned task removes the company and clears stale details without substituting another company. Global queue totals retain all participants, and discovery cannot execute another role's work.

Collapsed Viz groups show unfinished applicable activity stages from the selected immutable frame. Counts distinguish optional routes, correction/reverification and prerequisite joins; history rewind changes the count to that frame's facts. Existing compact geometry, symbols, inspection, lanes and playback remain.

IndexedDB now commits authoritative business facts independently of auxiliary Viz persistence. Changed recording metadata and newly appended frames use isolated transactions; old frames and unchanged recording metadata are not rewritten. Capture-storage failure reports an explicit gap, preserves valid business durability and permits healthy captures to continue. Confirmed Load/Reset remain atomic across every store. Original 3.6 and 3.7 portable files remain supported without replay or regenerated frames.

**Executed verification: 109/109 regression tests; 36/36 Chromium tests in the full run; production build passed; audit 0 vulnerabilities.** A final presentation-only adjustment was followed by another 109/109 regression run and 3/3 focused Chromium checks. Separate clean before/after scale checks each passed. At 25 companies, 50 mixed-root recordings and 650 initial frames, 13 activation actions wrote 76.2% fewer logical bytes. Mean driver round trip improved 266 to 217 ms; full import was slower in this sample. This is measured prototype improvement, not unlimited storage or latency assurance.

**Implementation complete; ready for manual product acceptance.** No Iteration 4, designer, new business rules, automatic integration execution or backend. Full Chet report, raw measurements, saved workspaces, screenshots and acceptance steps are local-only under `docs/chet/`.

## 1. Capability matrix

| Capability                                                            | Status          | Evidence / boundary                                                                                                            |
| --------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Role-scoped Contractor network                                        | Implemented     | Open owned WorkItems only, company aggregation across roots, role counts, automatic cross-tab updates                          |
| All companies discovery                                               | Implemented     | Explicit persisted tab preference, inspect every company, other roles' work remains read-only                                  |
| Safe selection and global counts                                      | Implemented     | Last task removes company; stale detail cleared; no substitute; global counts retain human/automated open work                 |
| Collapsed group remaining stages                                      | Implemented     | Selected-frame-only counts; optional/declined routes, correction/reverification, Complete/Blocked/indeterminate wording        |
| Compact 37-node and 80-step layouts                                   | Implemented     | Existing geometry preserved; join prerequisite ratios remain separate; inspection reconciles group count                       |
| Incremental observer storage                                          | Implemented     | Business-only row, changed metadata, append-only frame keys, immutable warm cache; no normal historical-frame rewrites         |
| Auxiliary capture failure isolation                                   | Implemented     | Per-record/control failures fault-tested; valid business commits survive; healthy recording continues; explicit persistent gap |
| Atomic Load/Reset and legacy migration                                | Implemented     | Single all-store replacement, rollback on failure; v1 database and original 3.6/3.7 files preserved                            |
| Full portable workspace Save                                          | Implemented     | One logical file with business state, triggers, all recordings/frames/causes/lineage; sessions excluded                        |
| Recording Triggers and independent journeys                           | Implemented     | Four opt-in catalog points, exact identity/root matching, no import/history retrigger, independent stop/completion             |
| Contractor onboarding and three experiences                           | Implemented     | Anonymous application, company sign-in, evidence/reviews, skill, vendor, portal, training, readiness, explicit activation      |
| Readiness / historical completion / operational state                 | Implemented     | Separate facts, Ready AND Active eligibility; no completed-root resumption or automatic unsuspension                           |
| Large-history scalability                                             | Partial         | 25 companies/50 recordings/650–663 frames measured; cold loading, metadata, facts snapshot and per-tab memory still grow       |
| Initial rejection / sole-skill-loss recovery                          | Partial         | State remains consistent; some recovery paths await approved lifecycle design; no suspension removal shortcut                  |
| Native file-picker experience                                         | Partial         | API contract/cancellation/write-failure tests and real download/upload; OS dialog interaction remains manual                   |
| Automatic capture repair / retention                                  | Not Implemented | Explicit gap is preserved; no backfill, replay, compression, pruning or silent frame loss                                      |
| Ongoing compliance / post-activation admin / suspension removal       | Not Implemented | Iteration 4 remains out of scope                                                                                               |
| Real identity, live integrations, Temporal service, backend, designer | Not Implemented | Browser simulation; integrations explicitly user-triggered                                                                     |

## 2. Application boundaries and source references

- [`src/App.tsx`](../src/App.tsx): experience routes, tab preferences, role-owned network and selection safety. `roleCount`, `network`, `chooseNetworkScope` derive discovery directly from authoritative state. Queue remains visible without a company detail selection.
- [`src/OperationsWorkQueue.tsx`](../src/OperationsWorkQueue.tsx), [`src/TaskCard.tsx`](../src/TaskCard.tsx): global discovery/filtering versus selected-role execution. `executionRole` gates human forms; other owners show ownership guidance. System actions remain in [`AutomationQueue.tsx`](../src/AutomationQueue.tsx).
- [`src/application.ts`](../src/application.ts): service commands/queries and repository/integration ports. `change` owns queue, shared lock, latest load, epoch check, business use case, safe Viz projection, save and notification. `getState` coordinates assembled reads. `replaceWorkspace` uses atomic repository replacement. Observer administration reports unsaved storage changes honestly.
- [`src/indexedDbRepository.ts`](../src/indexedDbRepository.ts): new storage boundary. `prepare`, `load`, `save`, `replace`, `assembleStoredWorkspace`; original class export remains available from application.ts. Details: [`observer-storage.md`](observer-storage.md).
- [`src/domain.ts`](../src/domain.ts), [`orchestration.ts`](../src/orchestration.ts), [`companyLifecycle.ts`](../src/companyLifecycle.ts): business records, compiled workflow rules/correlation and readiness/operational policy. **Unchanged this iteration.**
- [`src/viz/groupProgress.ts`](../src/viz/groupProgress.ts): pure selected-frame applicability/counts. [`JourneyMap.tsx`](../src/viz/JourneyMap.tsx) renders compact counts and inspection. [`recorder.ts`](../src/viz/recorder.ts), [`triggers.ts`](../src/viz/triggers.ts), [`definition.ts`](../src/viz/definition.ts): unchanged recording semantics, matching and pinned maps.
- [`src/workspace/format.ts`](../src/workspace/format.ts), [`DemoWorkspace.tsx`](../src/workspace/DemoWorkspace.tsx), [`scenarios.ts`](../src/workspace/scenarios.ts): unchanged portable validation, preview/backup/confirmation and normal-command named scenarios.

### Domain model and invariants

The company is the business identity, including a one-person company. Records include company/application, screening, administrative approvals, versioned evidence, company-owned qualifications, WorkItems, workflow instances/history, business events, integration attempts and outbox. These are typed records and explicit policies rather than fully encapsulated DDD aggregates/value-object classes. A service command can atomically update several related business records.

Ready requires administrative approval, portal setup, confirmed initial training and at least one approved skill. Eligible requires Ready AND Active. Completed onboarding is historical. Initial activation requires explicit publication in Monitor. Losing the last approved skill removes readiness and suspends an Active company; later approval cannot remove suspension. A completed CompanyOnboarding instance receives no new work or activation and cannot resume.

CompanyOnboarding v2 and SkillQualification v2 remain compiled definitions. No domain events, workflow transitions, authentication rules or readiness contracts changed. The UI's role gate is presentation control within the existing simulation, not a backend authorization boundary.

### Business action to next participant

User form -> existing OnboardingService command -> service queue and Web Lock -> latest business facts -> typed business event -> `LocalOrchestrator.deliver` correlation/processed-ID and expected-work checks -> compiled rule -> complete/create WorkItems -> lifecycle policy -> safe auxiliary recording projection -> business durability -> isolated auxiliary durability -> revision-only notification -> other tabs reload authoritative work.

Examples: Recruitment screening emits its decision and creates parallel administration/initial qualification work; contractor evidence submission completes the submission task and creates the appropriate review; review failures preserve attempts and waiting work; successful prerequisites lead to vendor/portal/training and then explicit activation publication. Monitor owns simulated system execution and failed integration retries. Contractors see pending activation but cannot execute it.

Waiting is persisted work plus workflow expectation/history. Technical failures persist attempts without a successful business outcome; retry is an explicit command. Reminder/escalation uses explicit simulation-clock advancement, not a background timer. Refresh recovers persisted waits and history. There is no Temporal server, worker process, durable background timer or automatic execution when all tabs are closed. Duplicate/unrelated ingress cannot transition work.

## 3. Role discovery and Viz presentation decisions

The left list counts only `status === Open` and `owner === selected role`, across all workflows for each company. Completed/cancelled work, future activities and someone else's assignments are excluded. All companies is a deliberate tab-local preference; first launch defaults to My active work. Role changes recompute the list. A filtered or removed selected company is cleared explicitly; opening all companies does not silently replace it. Work queue parent totals remain all open human/contractor/automated work, regardless of selection.

Group counts mean **unfinished currently applicable activity stages**, not historical attempts or every future command. Gateways/routes are excluded. Before screening determines the branch, groups say Decision pending or Route pending. Declined branches say Not required. An unreached optional information request is excluded. Replacement evidence makes its verification stage required again once, even while the preceding verification remains correctly recorded as completed. Cancellation can show Blocked rather than Complete. Future business decisions may add stages; the count is not a guarantee that no future work can arise.

Only pinned definition and selected frame are read. No current company state leaks into rewind. Ordinary nodes remain 154 × 44; collapsed groups remain 180 × 48. Icons/state fills, business-area accents, pan/zoom/minimap, expansion and playback remain. Prerequisite join ratios such as 3/4 are a separate signal. No business or recorder changes were introduced to produce the counts.

## 4. Persistence, synchronization and failure policy

IndexedDB `fieldwork-onboarding` is now database **version 2**; business schema remains **4**, portable format **2**, Viz **2**. Original format 1/Viz 1 still imports. Stores:

| Store                                       | Responsibility                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `state` / `current`                         | Authoritative business facts/revision/epoch; no Viz history               |
| `viz-control` / `current`                   | Triggers, default hint, recording order and expected metadata checkpoints |
| `viz-recordings` / recording ID             | Changed metadata, pinned map, processed identities and frame count        |
| `viz-frames` / [recording ID, frame number] | Immutable appended frames                                                 |

An ordinary command commits business facts first. Each changed recording then saves its metadata plus new frames in its own transaction; unchanged metadata and old frames are skipped. Control checkpoints distinguish successful observation from a missing/failed phase. Auxiliary failure does not undo a valid business write. A failed recording retains last saved frames and reports Capture issue; other recordings continue. Control-wide failure reports a workspace gap, may retain old trigger settings/counts, and conservatively quarantines uncertain running captures. Trigger administration does not claim an unsaved change succeeded. No automatic backfill/resume invents the missing history.

The business store can still fail or exhaust shared origin quota; such a command rejects and publishes nothing. Cold migration also requires successful storage. The original single-row layout migrates atomically under the lock, preserving exact frames. Close older-build tabs before database upgrade; a blocked upgrade gives an explicit explanation.

Warm repositories cache frozen historical frame objects by replacement epoch and load only new frame ranges. Metadata comparison baselines are separately cloned. All production assembled reads take the same command lock, so they do not display the intermediate observer phase. The lock remains `fieldwork-onboarding:commands:v1`; BroadcastChannel remains `fieldwork-onboarding:changes:v1`, revision only after durability attempts/lock release. Focus, visibility and pageshow recover missed notifications. Sessions/roles/selections remain tab-local.

Load and Reset intentionally use a single transaction across **all four stores**, with existing preview, backup, confirmation, stale-review rejection and replacement epoch. Revision rebases to `max(local, imported) + 1`; queued old-epoch commands reject. Failed replacement leaves all stores unchanged. Imported events never fire triggers or reopen completed roots. Save assembles one complete logical file under the lock, including all histories and triggers, excluding sessions and storage checkpoints.

Compatibility evidence: four unchanged original 3.6 files in [`tests/fixtures/workspace-v1`](../tests/fixtures/workspace-v1/README.md), plus the untouched original 3.7 file in [`workspace-v2`](../tests/fixtures/workspace-v2/README.md). Frame 13, archive bytes, causes, lineage and continuation are tested. Current-version clients are required for cross-tab guarantees; mixed older builds are not supported.

## 5. Actual test and build evidence

Windows, Node 24.13.1, npm 11.8.0; Chromium production preview on temporary port 4173. Port 5173 was untouched.

| Executed command                                           | Actual result                                                                                                                                                                                             |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                                                 | **109 passed, 0 failed**, 13 files. Final run 27.27 s, including the explicit declined-route assertion.                                                                                                   |
| `npm run test:browser`                                     | **36 passed, 0 failed**, 13 specs, one worker, 2.6 minutes, rerun after the final UI adjustment. Includes larger-scale and all retained previous suites.                                                  |
| `npx playwright test tests/browser/focus-progress.spec.ts` | Final UI follow-up **3 passed, 0 failed**, 9.9 s.                                                                                                                                                         |
| Clean scale comparison, current build                      | **1 passed**, 32.6 s including fixture generation; 30.5 s case.                                                                                                                                           |
| Clean scale comparison, archived published 3.7 build       | **1 passed**, 13.2 s including server; 11.7 s case; same saved fixture without regeneration.                                                                                                              |
| `npm run build`                                            | Passed TypeScript/Vite, 227 modules. Final main JS 360.00 kB / gzip 106.38; lazy Viz 257.52 / 85.28; Workspace 11.11 / 3.98; trigger manager 3.90 / 1.57. Main/Viz/Workspace CSS 26.01 / 29.70 / 1.72 kB. |
| `npm audit --audit-level=moderate`                         | **0 vulnerabilities**; no dependency additions.                                                                                                                                                           |

An additional screenshot-only 80-step check passed 1/1 in 3.6 s after the full run, recording both collapsed counts and expanded geometry.

New regression evidence: [`src/observerPersistence.test.ts`](../src/observerPersistence.test.ts), seven cases cover actual frame/control/business-store failure injection, healthy continuation, atomic replacement rollback, original database migration/Frame 13, original 3.7 continuation/reset, append-only keys and no unrelated metadata rewrites. [`src/viz/groupProgress.test.ts`](../src/viz/groupProgress.test.ts), two cases cover actual workflow progress, decisions, corrections, failures, history and exact synthetic 80-step activity counts.

New browser evidence: [`focus-progress.spec.ts`](../tests/browser/focus-progress.spec.ts), three cases cover role-owned left list, all-company discovery/read-only ownership, role changes, completion/cross-tab removal and global totals; real correction/reverification/failure/retry/history counts; actual frame-add storage failure with durable business progress, healthy capture and refresh-persistent gap. [`scale-workspace.spec.ts`](../tests/browser/scale-workspace.spec.ts) exercises 25 companies and concurrent mixed roots across three tabs, publication completion, original frames, playback and actual export. [`scaleWorkspace.ts`](../tests/fixtures/scaleWorkspace.ts) builds coherent facts through normal service commands, including corrections, failed attempts and retries.

Retained suites cover lifecycle/domain/orchestration, login/anonymous application, queue counts/deep links, integration execution, shared locks, duplicate event handling, fallback synchronization, exact original workspace restoration, trigger matching/isolation and compact Viz/accessibility/80-step geometry. Existing Operations assertions now explicitly choose All companies when inspecting a company with no owned work. No regression tests were removed. Task completion waits identify the actual WorkItem rather than a heading that can retarget another company. The timer UI test waits for completion of the first clock advance before clicking the next enabled action; no arbitrary sleeps.

### Intermediate failures and corrections

Initial role-filter runs were 95/100 and 96/100 because prior UI tests assumed broad discovery by default. Subsequent 105/107 and 106/107 runs exposed a missing re-verification stage count and a second timer click before the first operation completed; corrected logic and synchronization. A 107/109 run after metadata optimization exposed shared mutable comparison baselines; independent clones fixed the repository issue. Two TypeScript test-prop/query errors were fixed before the successful build.

One focused browser invocation mistakenly continued after a failed build and ran stale assets; its three failures/seven planned cases were not accepted as evidence. With a successful build, six of seven passed; the remaining test was corrected to retry through Monitor, the existing execution home. An early full browser run was 33/35 because the test reader returned an empty object for an absent database row, masking missing-capability no-write assertions; the reader now preserves absence. Final full result is 36/36. First performance instrumentation repeatedly copied all frames through the driver inside timed waits and distorted latency; those raw results remain in Chet's artifacts, and the clean repeated method is reported below. No speculative business changes were used to make tests pass.

## 6. Before/after scale measurements

The workload is **25 companies, 50 recordings**: 25 running CompanyOnboarding roots and 25 completed initial SkillQualification roots, **650 frames**. It contains legitimate evidence corrections, failed simulated integrations/retries and completed skills, created using normal commands. Thirteen explicit activation publications across Monitor, Operations and Contractor tabs produce **663 frames**, 38 completed recordings and 12 still running. Existing historical frames are preserved. Same saved input is loaded into each build.

Before is an isolated `git archive` of published 3.7 `acc7bc8b76a716c9e510e3d89c0ed73acdd40bd0`, built with existing installed dependencies; no checkout/reset or local work overwrite. After uses 3.8. Counters reset after import. Native put/add instrumentation records logical UTF-8 bytes and call/transaction durations. Thirteen action timings await rendered revisions in all three tabs, without driver copies of all frames. State-serialization samples count schema-4 comparison JSON calls, not every metadata JSON operation. Transaction timings include size instrumentation overhead; these are local single-run samples, not physical disk usage or service-level guarantees.

| Measurement                                                      | Published 3.7               | Iteration 3.8               |
| ---------------------------------------------------------------- | --------------------------- | --------------------------- |
| Logical compact workspace after actions                          | 6,070,306 bytes             | 6,070,306 bytes             |
| Readable portable export                                         | 10,204,083 bytes (9.73 MiB) | 10,204,083 bytes (9.73 MiB) |
| Logical write bytes, 13 normal commits                           | 78,070,018                  | **18,600,842 (76.2% less)** |
| State-comparison serialization, 26 calls, mean / max             | 13.70 / 20.10 ms            | 3.20 / 4.60 ms              |
| Native business put, mean / max                                  | 17.20 / 22.10 ms            | 3.02 / 3.90 ms              |
| Business put to transaction complete, mean / max                 | 63.39 / 81.50 ms            | 15.10 / 18.40 ms            |
| Driver action through three-tab revision convergence, mean / max | 265.60 / 310.92 ms          | 217.01 / 284.90 ms          |
| Four playback seeks, mean / max                                  | 71.22 / 76.37 ms            | 53.43 / 58.86 ms            |
| File parse/validation/preview                                    | 884.32 ms                   | 920.43 ms                   |
| Confirmed full restore through three-tab convergence             | 2,374.96 ms                 | 2,682.97 ms                 |
| Complete readable export/download                                | 431.67 ms                   | 341.65 ms                   |

After writes comprise 13 business rows (18,259,397 bytes), 13 changed metadata rows (161,369), **13 new frames only** (118,508), and 13 controls (61,568). Zero historical frame rewrites. The business snapshot is still about 1.4 MB at this workload. Multiple auxiliary transactions replace one full-history transaction; cold replacement remains all-store and was slower here. Export size does not shrink because history is preserved.

The earlier driver-polling sample measured round trips 3,979.96 -> 4,661.15 ms and put-to-transaction-complete 67.85 -> 287.66 ms, despite lower bytes/serialization. It copied full workspace snapshots repeatedly while timing, unlike normal UI; retained as a confounded result rather than concealed. The clean rerun above uses the exact same saved input and rendered revision signals on both builds. Measurements vary with browser/machine load. Near-50-MiB workspaces and physical quota limits remain uncharacterized.

Raw before/after, summary, historical polling results, starting/final JSON and screenshots are local under `docs/chet/iteration-3.8-*`. Test benchmark is committed for reproducibility; baseline source/config and delivered artifacts are local-only.

## 7. Decisions, limits and open business questions

- **Implemented rules:** separate historical completion/current readiness/operational status; approved skill prerequisite; explicit activation; Ready AND Active eligibility; no completed-root resumption; no automatic suspension removal. This iteration preserves all of them.
- **Provisional business assumptions:** company as identity; HVAC/Plumbing sample skills; fictional document fixtures; current approval/vendor/portal/training sequence; simulation reminders/escalation. These are prototype policies, not a complete production business specification.
- **Architecture decisions:** incremental auxiliary rows behind the existing Repository; business-first durability; per-record transactions plus explicit control checkpoints; immutable epoch-scoped warm caches; all-store atomic replacement; no replay-based repair. Auxiliary computation still happens under the lock before business save. This isolates ordinary projection/storage failures, not arbitrary browser resource exhaustion.
- **Remaining technical debt:** business facts/events still use a whole snapshot; metadata/pinned maps/processed-ID arrays grow; recorder still scans scoped history; each tab caches complete history; cold load/export/import process full logical state. No retention, compression, streaming, history repair, background execution or backend. More auxiliary transactions and conservative quarantine are deliberate tradeoffs.
- **Migration limits:** close older-build tabs; migration requires storage space and may fail safely. Shared-origin quota can block business writes. Read-only degraded browsers cannot offer normal concurrency guarantees. No cross-browser/device synchronization.
- **Business decisions requiring input:** initial rejected-skill recovery; approved request/approval/audit for suspension removal; ongoing compliance/expiry/grace; company administrative changes after activation. No Iteration 4 shortcut was introduced.
- **Manual/untested:** actual OS picker dialog, non-Windows typography fallback, Firefox/Safari, exhaustive crash termination at every commit boundary, near-limit/quota pressure and low-memory devices. Injected failures and checkpoint detection are tested; this is not exhaustive crash recovery or a formal accessibility audit.
- **Known defects:** no remaining confirmed defect in executed acceptance paths. The limits above and product acceptance remain open. Unrecoverable missed recording history is explicitly labeled, not manufactured.

## 8. Repository and publication

- Repository `onboarding`: `C:\Users\david\Documents\Repositories\onboarding`; branch `main`, upstream `origin/main`.
- Origin fetch/push: `https://github.com/dblath/onboarding.git`. Starting published tip `acc7bc8b76a716c9e510e3d89c0ed73acdd40bd0`; previous 3.7 implementation `7826fd54c203833b2688bfcd8afb228f6531135d`.
- Publication: **3.8 implementation `3df108fb29e316172a60c909e32c7ab0af312567` committed and pushed on 2026-10-16.** `git ls-remote origin refs/heads/main` matched local HEAD exactly; `git status --short` was empty and upstream was `origin/main`. This publication record is a documentation-only follow-up; final tip is recorded in delivery and the local Chet report. No force-push, reinitialization, reset, deployment or credentials.
- Publication checks: Prettier and staged/working diff checks passed. `git ls-files docs/chet` was empty; compatibility JSON and original Unity hashes matched their recorded values. No persistent listener remained on 4173 or 5174. Port 5173 was untouched.
- Documentation: this report; README; [`observer-storage.md`](observer-storage.md), [`viz-recording.md`](viz-recording.md), [`workspace.md`](workspace.md), [`shared-browser.md`](shared-browser.md); existing domain/events/process/rules/assumption docs and asset derivations remain relevant. Earlier iteration acceptance docs describe historical UI locations.
- Local-only handoff: `docs/chet/iteration-3.8-status.md`, `acceptance-3.8.md`, `iteration-3.8-screenshots/`, before/after/performance-summary JSON and full workspace examples. Excluded through `.git/info/exclude`; never stage/push this directory.
- Original Unity PNG/favicons, image proportions and business/workflow/event definitions unchanged. Original PNG SHA256 `88ef0146e47c4f25fbb95372945eca19b65e6598c7a8a43a8eb39a5af337d1a1`.

## 9. Manual acceptance and next work

Start **`npm run dev -- --port 5174 --strictPort`**; same Chrome profile and exact origin for all tabs:

| Experience            | URL                                            |
| --------------------- | ---------------------------------------------- |
| Contractor Portal     | http://127.0.0.1:5174/#/contractor             |
| Operations            | http://127.0.0.1:5174/#/operations             |
| Monitor / Journey Map | http://127.0.0.1:5174/#/monitor?view=journey   |
| Recording Triggers    | http://127.0.0.1:5174/#/monitor?view=triggers  |
| Demo Workspace        | http://127.0.0.1:5174/#/monitor?view=workspace |

1. Back up existing state. Submit two fictional applications. Recruitment's My active work shows both, with owned Open counts. Proceed one: it disappears from Recruitment, details clear, other roles' global work stays counted. All companies finds both without assigning another role's forms to Recruitment. Select Compliance/Finance/Training and verify only their Open work; a role with none offers Show all companies.
2. Enable the new-application trigger before submitting another application. In Journey Map select its recording: before decision, route counts are indeterminate. Proceed and inspect compact counts. Submit expired insurance: submission/review stages progress; rejected evidence requires replacement plus review again. Complete replacement and retry a simulated verification failure. Counts reconcile on expansion. Rewind to earlier frames and confirm historical counts, then return Live. Join ratios remain separate.
3. Monitor -> Demo Workspace: load Ready for activation, confirm replacement. Company is Ready, Pending, Not eligible. Explicitly publish activation in Monitor -> Automations & Integrations; all tabs become eligible. Operations My active work can be empty; use All companies to inspect company status. No automatic activation.
4. Load local `docs/chet/iteration-3.8-scale-start.json` via preview/confirmation: 25 companies, 50 recordings, 650 frames. Explore company and skill histories, publish one activation, Save State, reload original and verify exact starting history. Also exercise original 3.6 Frame 13 and original 3.7 files. No imported events create new captures.
5. Save your workspace, Reset with typed confirmation, load it back. All three tabs synchronize; removed selections require explicit choice. Native OS save-picker appearance is a manual check. Capture failure is exercised by fault-injection tests, not a new product failure button.

Run checks with `npm test`, `npm run test:browser`, `npm run build`, `npm audit --audit-level=moderate`; install Chromium once with `npx playwright install chromium` if needed. Static output is `dist/`; no backend/env setup. Tests stop their temporary preview server; no persistent app server is part of delivery and port 5173 remains reserved.

**Next: manual acceptance of role discovery, compact historical counts and observer failure wording.** Highest-value next work is acceptance-driven fixes and explicit agreement on retention/recovery expectations before larger histories. Lifecycle design questions need product decisions before Iteration 4. Stop here for review; no designer or unrelated features.

Continuity standard: update STATUS from actual code/tests at every iteration; commit/push; verify SHA/remote/clean tree; deliver detailed Chet report and review artifacts locally only.
