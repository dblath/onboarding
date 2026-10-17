# Unity fieldwork implementation status and context handoff

**Executive summary - Iteration 3.6: Demo Workspace. 2026-10-16, America/Denver. Package 0.3.7.**

Demo Workspace is a first-class Workflow Monitor view with Save State, Load State, Reset Workspace, and three prepared business scenarios. Export captures the entire logical workspace under the existing command lock into one named, versioned JSON file. Chrome's native save picker is used when available; conventional download is also available. Tab-local sign-ins and local replacement identity are excluded. IndexedDB remains the live repository.

Load validates supported versions, every record shape, references, key current lifecycle invariants, and Viz topology/lineage/causes before showing a preview. Replacement needs confirmation, offers a current-state backup, and commits atomically under the existing Web Lock. A stale preview is rejected. Reset needs typed RESET confirmation and clears all business collections and Viz together. Failed validation or an aborted storage transaction leaves current state unchanged.

Imported records and recorded history are preserved. Local revision is rebased above both current and imported revisions; a fresh replacement identity invalidates queued old-workspace commands. All tabs reload through the existing revision channel. Invalid company selections require an explicit choice; removed contractor identities sign out, with no company substitution. Restored Viz opens the persisted active journey at its latest recorded frame. **Exact Frame 13 + archived recording + failed attempt history was saved, reset, loaded, stepped to Frame 3 and back, then continued through actual training/activation to Frame 16 without duplicate events or reopened workflows.**

Actual final checks: **87/87 regression tests, 28/28 Chromium browser tests, production build passed, audit 0 vulnerabilities.** The final full browser run completed in 1.6 minutes. Iteration 3.5.1 remains the accepted Viz baseline, pending hands-on feedback. Demo Workspace is ready for manual acceptance. **Stop here; no Iteration 4 or workflow designer.**

## 1. Capability matrix

| Capability | Status | Actual implementation |
| --- | --- | --- |
| Demo Workspace Monitor view | Implemented | Navigation plus `#/monitor?view=workspace`; compact save form, current metrics/active frame, scenario cards, native confirmation dialogs. |
| Save State / own scenarios | Implemented | Consistent locked snapshot, name/description, useful JSON filename, all authoritative business/visual state; native picker and explicit Download JSON fallback. Saving does not increment state revision or append a frame. |
| Load State | Implemented | File selection, bounded JSON parsing, strict format/schema/reference validation, scenario/company summary, backup offer, explicit replace confirmation, stale-review rejection and atomic whole-state restore. |
| Reset Workspace | Implemented | Typed RESET confirmation; clears companies, applications, evidence, requirements, qualifications, work, processes, events, attempts, outbox and Viz together; fresh clock and local revision/identity. |
| Prepared business scenarios | Implemented | Awaiting contractor documents; Verification failure with explicit retry; Ready for activation with publication outstanding and Not eligible. Generated through the actual service/orchestrator/integrations/recorder in an isolated repository. |
| Viz restoration / continuation | Implemented | Active origin, pinned map, all frames/causes, archives, lineage and seen identities preserved; historical stepping, Live, refresh and continued real work verified. No event replay or invented frames on restore. |
| Cross-tab replacement | Implemented | Existing exclusive lock, atomic IndexedDB put and post-commit revision notifications; monotonic rebase, replacement epoch, stale queued-action guard and invalid selection cleanup. |
| Viz recording / storytelling | Implemented | One origin at a time; Frame 0 starts at selection; 37-node v2 company/initial-skill graph and 9-node qualification graph; compact nodes, joins, independent lanes, highlights, follow mode, read-only timed playback, zoom/minimap/inspection. |
| Contractor and participant work | Implemented | Anonymous application, email + 123 simulated company sign-in, duplicate-email company choice, scoped portal, independent human queues, global Open-only role counts, Monitor automation queue and exact work links. |
| Lifecycle separation | Implemented | Historical onboarding completion, derived readiness and operational status remain separate. Jobs require Ready + Active. Qualification recovery never clears an existing suspension. |
| Three browser experiences / branding | Implemented | Contractor Portal, Onboarding Operations and Workflow Monitor; shared IndexedDB/revision sync, independent tab preferences, intact Unity logo/favicons and bold sans-serif Unity fieldwork typography. |
| Portable format coverage | Partial | Format 1, application schema 4, Viz 1 and supported pinned v2 maps. No automatic import migration of older or unknown files; strict rejection preserves current state. Files up to 50 MiB. |
| Temporal / external integrations | Partial | Persisted waits, attempts, explicit timeout/retry/time advance; no real Temporal service, live external integrations, automatic worker/dispatcher or scheduler. |
| Production durability / general scale | Partial | Whole-snapshot IndexedDB and unbounded recordings; current examples and synthetic 80-node geometry tested, not long-history or near-limit load performance. |
| Suspension removal / ongoing compliance / administrative requests | Not Implemented | Iteration 4 business lifecycle remains deferred. No recovery shortcut, recurring expiry/renewal scheduler or post-activation request workflow. |
| Real identity, backend, jobs, designer, arbitrary graph import | Not Implemented | Outside this slice. Simulated sign-in remains demonstration-only, not a security boundary. |

## 2. Architecture and domain

### New workspace boundary

- `src/workspace/format.ts`: `WorkspaceFile`, `createWorkspaceFile`, `parseWorkspaceFile`, `validateWorkspace`, `workspaceFilename`, `workspaceSummary`. Strict runtime field/enumeration/date/identity checks, supported versions, duplicate/reference ownership checks, current readiness/administrative consistency, no Open work on completed workflows, supported pinned map structure, complete ordered frames, scoped causes/event/work references, archive metadata, active lineage/seen identities and latest visual consistency. Validation does not repair state or replay events. It is not cryptographic provenance or a full reconstruction of every historical business decision.
- `src/application.ts`: `saveWorkspace`, `restoreWorkspace`, `resetWorkspace`, private `replaceWorkspace`. A shared `enqueue` retains per-service command ordering. Save obtains a snapshot under the existing coordinator lock. Restore validates/clones before queuing, checks the preview revision under lock, and uses one existing repository save. It bypasses business `change`, migration and capture. Both restore/reset publish only after a successful commit and lock release.
- `src/domain.ts`: optional `State.workspaceEpoch` is local replacement metadata, never read by business rules. Existing snapshot schema stays 4. Export omits this field; restore/reset always create a fresh UUID.
- `src/workspace/scenarios.ts`: `buildScenario` uses a private in-memory Repository and single-owner coordinator with the real OnboardingService, LocalOrchestrator, SimulatedIntegrations and Viz recorder. It never writes to the live workspace. Generated state is validated before preview. Prepared scenarios get fresh IDs on each preview; reloading a saved file preserves its IDs exactly.
- `src/workspace/DemoWorkspace.tsx`, `workspace.css`: file IO, editable name/description, preview/backup/confirmation, typed reset, three scenario cards, accessible native dialogs and compact shared branding. Native save picker is invoked before awaiting storage to retain the browser user gesture. Blob download URLs are limited to the latest download and cleaned on view/page exit.
- `src/App.tsx`, `presentation.ts`: first-class view and deep link, iteration/navigation labeling, remembrance of the initially displayed internal company, explicit invalid-company selection state, and Viz error-boundary remount on workspace replacement. `ContractorAccess.tsx` removes a vanished company session only after authoritative load; valid existing sessions are retained. `OperationsWorkQueue.tsx` exposes an unavailable prior company filter rather than silently showing another company.

The recorder's execution code is unchanged. `src/viz/recorder.ts` only exports the existing pure `causes` query so import validation can reuse authoritative correlation logic. Import also handles JSON object-key ordering: when a valid active frame has exactly equal values but different key order, its live comparison objects are aligned with the pure projection. All recorded values, numbers, causes, IDs and archives are preserved; no frame is appended and no business command is replayed. This avoids false changes in the existing recorder's JSON comparison and is regression-tested.

No runtime dependency added. Development-only `@types/node` 24.19.2 and transitive `undici-types` 7.24.6 support the browser tests' real downloaded-file IO. Existing React Flow 12.12.0 / Dagre 3.1.1 remain presentation tools. Package 0.3.7 corresponds to product Iteration 3.6.

### Retained responsibilities and invariants

`domain.ts` defines company, application, administrative requirements/evidence, company-owned skill qualifications, WorkItems, attempts, workflow/history, business event envelopes and outbox. Company remains the business identity, including a one-person company. These are mutable interfaces and explicit policies, not a fully isolated DDD aggregate implementation. One command snapshot transaction can update multiple related records.

`OnboardingService` remains the application command/query boundary. Existing commands include application submission/screening/information, evidence, integration execution/retry, skill decisions/invalidation/requests, participant completion, time advancement, ingress and Viz selection. `getState`, application/work queue/workflow queries read authoritative state. Current business handlers are unchanged by this iteration.

`orchestration.ts` holds compiled CompanyOnboarding v2 / SkillQualification v2 transitions, correlation, duplicate/expected-event checks, scheduling, history/waits and readiness evaluation. `companyLifecycle.ts` handles readiness/operational publication and suspension independently of completed company execution. `migration.ts` retains existing local schema 2/3-to-4 upgrades; file import deliberately does not run migration. Event envelopes remain version 1. `WorkflowMonitor.tsx` and diagnostic panels preserve history, rule/event/correlation inspection; `AutomationQueue.tsx` remains the sole UI home for explicit automated execution/retries.

Business action -> existing use case -> exclusive command lock/latest load -> domain validation/state -> business event envelope -> `LocalOrchestrator.deliver` correlation/duplicate/rule checks -> completed/current work and next WorkItem -> saved Viz projection, if relevant -> atomic snapshot/revision -> notification -> next participant. Rules remain: admin approval AND portal setup AND initial training confirmed AND at least one approved skill = Ready; Ready AND Active = Eligible. Initial activation requires explicit publication. Completed onboarding never resumes or receives new work. Last-approved-skill loss suspends an Active company; regaining readiness leaves it Suspended.

Waits and failed attempts persist as data. Timeout is injected explicitly; retry is an explicit existing command. Reminder/escalation clocks advance only on user simulation time controls. Restore recreates no workers/timers and executes no activities. The user continues pending work through its existing participant/automation UI.

## 3. Portable format and synchronization

File envelope: `format: unity-fieldwork-workspace`, `formatVersion: 1`, `exportedAt`, `scenario: {name, description}`, `state`. State includes every business collection, workflow/execution/integration history, clock and complete optional Viz state. Name is 1-120 characters; description up to 2000. Export uses readable UTF-8 JSON; filename is a safe `unity-fieldwork-<scenario>.json`. No browser database files, file handles, passwords or sessionStorage are exported.

Live storage remains IndexedDB `fieldwork-onboarding`, database version 1, store `state`, key `current`, application schema 4. Lock: `fieldwork-onboarding:commands:v1`. Channel: `fieldwork-onboarding:changes:v1`, revision metadata only. `IndexedDbRepository.save` remains one atomic readwrite put; transaction abort rejects. Notifications never carry replacement data or run transitions. Existing `useWorkspace` stale-read protection and focus/pageshow/visibility reload remain intact.

Replacement revision = `max(current.revision, imported.revision) + 1`, with safe-integer checking. Reset uses the same mechanism. Recorded frame revisions remain original; only the current local snapshot revision changes. This preserves a monotonic high-water mark even for older files or a file with a higher foreign revision. A fresh local epoch marks every replacement/reset. Commands capture the observed epoch when queued and reject under lock if the workspace has since been replaced. Reads adopt epochs only at nondecreasing revisions. Competing confirmations against the same preview revision cannot both commit. Re-review is required after any intervening change.

Removed company selections are cleared to an explicit choose-company state that survives refresh; Operations role is retained. Invalid contractor company IDs are removed, not replaced by another company. Valid IDs remain selected without importing a login. Viz remounts at the persisted active recording's latest frame; old playback cursor/viewport/follow settings are tab-local and not portable. Active originating-event identity and all recording content are portable.

## 4. Actual verification and saved sizes

Windows, Node 24.13.1 / npm 11.8.0, 2026-10-16:

| Check | Actual result |
| --- | --- |
| `npm test` | **87 passed, 0 failed**, 10 files; final run 25.85 seconds. Baseline 73 retained plus 14 workspace cases. |
| `npm run test:browser` | **28 passed, 0 failed**, 10 spec files, one Chromium worker; final run **1.6 minutes**. Baseline 24 retained plus 4 workspace cases. A preceding full run also passed 28/28. |
| `npm run build`, including inside browser command | TypeScript/Vite passed, 222 modules. Main JS 345.69 kB (gzip 102.21), lazy Workspace JS 10.56 kB (3.84), lazy Viz JS 252.26 kB (83.94). Main/Viz/Workspace CSS 24.00 / 28.60 / 1.72 kB before gzip. |
| `npm audit --audit-level=moderate` | **0 vulnerabilities**. |
| Protected behavior/assets | No changes to orchestration, lifecycle policy, migration, lock/bus implementation, authoritative reload, workflow/map definitions, Viz rendering/types or original Unity assets. Recorder change is an export modifier on its existing pure cause query only. |

New evidence:

- `src/workspace/workspace.test.ts` (14): all three legitimate prepared scenarios/policies; exact Frame 13 with archive, failed/successful attempts and waiting work; save/reset/load/continue to eligibility with original frames/events retained; export lock consistency/no write; IndexedDB replacement/fresh-service retry; malformed input, stale review, failed save/reset without data loss; stale and already-queued old-tab command rejection; atomic clear and fresh application; reordered JSON keys; two competing confirmed replacements with only one winner; a set of damaged business/visual references and unsupported versions rejected before writes.
- `tests/browser/workspace.spec.ts` (4): actual JSON download and file-input import; Frame 13 -> 3 -> 13 -> Live; archive inspection; all-tab revision convergence; invalid company/session cleanup; typed reset; refresh and continuation through training/publication to Frame 16; reloading original file restores original events/history; built-in scenario previews/cancellation/export and backup; failed integration retry; expired vs valid license outcomes after reloading the original scenario; invalid JSON/version/reference rejection; stale confirmation with re-review; actual IndexedDB transaction abort and safe retry; import revision 10000/stale notification; native save API contract/cancellation/write failure via a browser API mock.
- Retained `viz/recorder.test.ts`, `viz/presentation.test.ts`, application/iteration2/lifecycle/coordination/portal/UI/work visibility regressions all pass. All retained Chromium lifecycle, activation/global totals, identity, concurrency/recovery, branding, 37-node/full playback and 80-step layout tests pass.

Development failures were resolved, not omitted: the first build of the new browser file lacked Node type declarations; added the development types and interrupted its stale-build browser attempt. The first complete focused browser run finished **2 passed / 2 failed**: Description's populated textarea needed a stable accessible label; a retry assertion read storage before the asynchronous task completed. The next run finished **3 passed / 1 failed** because the test tried Training work without explicitly selecting the restored company after intentional selection invalidation. Corrected the label and state-based waits/navigation; two focused runs then passed **4/4**, followed by three full **28/28** runs. No arbitrary test sleeps or speculative lifecycle changes. Early unit runs passed 10/10, 11/11 and 83 total before 86/86 full runs. Final review added a case preserving legitimate company/scenario names that happen to be reserved object-property words; those free-text values are kept distinct from identity/dictionary-key checks. Final total is 14 workspace cases / 87 regression tests.

Representative actual readable JSON exports from final isolated production-build browser tests:

| Workspace | Bytes | KiB | Open work | Recordings / frames | Latest active frame |
| --- | ---: | ---: | ---: | --- | ---: |
| Awaiting contractor documents | 60,296 | 58.88 | 4 | 1 / 2 | 1 |
| Verification failure | 89,337 | 87.24 | 4 | 1 / 4 | 3 |
| Ready for activation | 294,148 | 287.25 | 1 | 1 / 16 | 15 |
| Frame 13 with archive + attempt history | 289,357 | 282.58 | 1 | 2 / 15 | 13 |

Files, hashes/count manifest, screenshots of the new view/preview/restored Frame 13 and full handoff are local-only under `docs/chet/iteration-3.6-scenarios/`, `iteration-3.6-screenshots/`, `iteration-3.6-status.md` and `acceptance-3.6.md`. Captures were visually inspected. Native OS picker clicks/disk dialogs were not automated: native API behavior was mocked, while conventional download and actual file re-import were exercised end-to-end. Manual native-picker acceptance is outstanding.

## 5. Decisions, limitations and next review

- Supported file contract is deliberately strict. Unknown versions/fields, invalid references, unsupported maps or inconsistent current state fail without mutation. No silent repair, partial merge, arbitrary definition import or import migration. Validation preserves legitimate historical completion/suspension and explicit capture-gap metadata; it cannot prove the provenance of an externally edited, otherwise coherent snapshot.
- Replacement is whole-workspace, across all same-origin tabs, not a per-company operation. The confirmation revision intentionally becomes stale even for an intervening initialization write; re-review protects newer work. Close older application builds before demonstrations: they do not implement the new queued-command epoch guard. Existing current-build tabs synchronize automatically.
- Prepared scenarios are generated on preview through real commands in isolation and validated before use. The live workspace changes only after confirmation. Own scenarios are named files, not a separate in-app scenario database. Save fields and playback/view settings are presentation state; saved file metadata is portable, browser sessions are not.
- Viz histories/archives remain unbounded inside the whole snapshot. JSON generation, validation, cloning and IndexedDB serialization have memory/main-thread/write costs; Save holds the coordination lock for a consistent export. No compression, streaming, pruning UI, near-50-MiB stress test, quota/eviction recovery, physical crash/sleep certification or cross-device live sync. File transfer can move a saved workspace between browsers; subsequent live changes remain local to each browser/origin.
- File limit is **50 MiB**, checked before reading an input and before writing an export. Current representative files are below 0.3 MiB; that is not a production-scale guarantee. Disk, permissions and storage failures surface without replacing current workspace; native picker UI and broader mobile/screen-reader acceptance remain manual. No remaining automated failure observed, not a zero-defects claim.
- Domain models/string IDs, whole-snapshot storage, manual map adapter versioning and lack of production authentication/backend remain technical debt. Separating large Viz recordings into transactional stores or defining future file migrations is a later architecture decision.

Manual acceptance should validate native Save/Load with personally prepared scenarios, confirmation/backup language, three-tab selection behavior, exact recorded-history restoration and the demonstration sequence: load -> playback -> real alternate decision -> reload original. Highest-value next work is feedback-driven polish or fixes after this acceptance, not a new lifecycle. Business decisions remain suspension-removal request/approval/audit, initial rejection/sole-skill-invalidation recovery, ongoing compliance/expiry/grace periods and post-activation administrative requests. **Do not start Iteration 4 or a workflow designer.**

## 6. Repository, run commands and continuity

- Repository `onboarding`: `C:\Users\david\Documents\Repositories\onboarding`; branch `main`, upstream `origin/main`.
- Origin fetch/push: `https://github.com/dblath/onboarding.git`. Baseline **`fdda93b7dd5fa331a017cc338fc54dbab4225212`** is the accepted 3.5.1 delivery. Iteration 3.6 implementation **`919e3b56fb09e89b7797541177b5ef01417ceb1e`** (Add portable Demo Workspace with validated atomic restore and prepared scenarios) was committed and pushed on 2026-10-16. `git ls-remote` verified exact remote/local agreement and the working tree was clean after push. This publication record receives a documentation-only follow-up; final tip and verification are in delivery and the local Chet handoff. No Chet files were staged/published. No reset, force-push, reinitialization or deployment.
- No persistent app server was started. Test preview on 4173 stops after the suite. Port 5173 remains untouched. Review: `npm install` if needed, then **`npm run dev -- --port 5174 --strictPort`**.
- Exact review URLs: `http://127.0.0.1:5174/#/contractor`, `http://127.0.0.1:5174/#/operations`, `http://127.0.0.1:5174/#/monitor?view=workspace`, `http://127.0.0.1:5174/#/monitor?view=journey`. Keep all live tabs on the exact same origin. A different port/profile has different IndexedDB state; a saved file can now be imported there intentionally.
- Production: `npm run build`; `npm run preview -- --host 127.0.0.1 --port 4174 --strictPort`. Deploy static `dist/`, no backend/environment variables. Hash routes and relative assets remain supported.
- Checks: `npm test`, `npm run test:browser`, `npm run build`, `npm audit --audit-level=moderate`; `npx playwright install chromium` if the browser binary is missing.
- Documentation: README, STATUS, `docs/workspace.md`, domain/events/processes/rules/assumptions/shared-browser docs and asset derivations. Earlier acceptance documents retain historical UI locations; current 3.6 manual review is in local-only `docs/chet/acceptance-3.6.md`.
- Unity source PNG is unchanged: SHA256 `88ef0146e47c4f25fbb95372945eca19b65e6598c7a8a43a8eb39a5af337d1a1`. The original aspect ratio and padded favicon assets remain intact, with retained browser pixel/proportion tests.
- Chet reports, exported scenarios and screenshots stay local under `docs/chet/`, excluded through `.git/info/exclude`; never commit/push that directory. Test artifacts remain ignored.

Every iteration: update STATUS from actual code/executed evidence, commit/push, verify local/remote SHA and clean tree, deliver the local Chet handoff, record limitations and request manual acceptance.
