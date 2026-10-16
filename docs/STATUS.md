# Unity fieldwork implementation status and context handoff

**Executive summary - Iteration 3.5: The Vizualizinator (Viz). 2026-10-16, America/Denver. Package 0.3.5.**

Viz is implemented as a first-class **Journey Map** inside Workflow Monitor. Select an accepted application or skill-request event and explicitly Track journey: Frame 0 captures its current state, without reconstructing earlier visual history. Subsequent relevant committed changes append compact immutable frames. One originating event is actively recorded across the workspace; switching starts a new Frame 0 and archives the previous recording for playback.

Recording runs inside the existing application command lock/save, independently of mounted React views. It persists with IndexedDB state and continues when Monitor is closed. Same-company independent skill requests remain separate journeys. The version-pinned company adapter has **37 nodes: 16 activity types plus decisions, waits, joins, route outcomes, origin and completion**. Skill qualification has 9 nodes. These counts do not represent 37 independently scheduled activities.

The map provides parallel lanes, group overview/expansion, pan/zoom, fit, minimap, blocker focus, node details, presentation view and read-only playback. Four-prerequisite readiness joins name incomplete dependencies and owners. Timeout attempts turn the affected activity red; explicit existing retries update it. Automation execution remains solely in the 3.4 Monitor queue. No domain rules or workflow transitions changed.

Shared Unity text now uses a bold clean sans-serif system stack, consistently in sidebar, breadcrumb and Viz presentation branding. Unity remains capitalized, fieldwork lowercase. Original logo/favicons are unchanged, intact and proportionally rendered. No custom font dependency.

Actual verification: **70 regression tests passed, 0 failed; production build passed; dependency audit reported 0 vulnerabilities**. **22 Chromium browser tests passed, 0 failed**. The prior 3.4 work-count synchronization fix remains covered. The earlier eligibility incident remains resolved by explicit publication, as manually confirmed by the tester. **Stop for Chet's visual and functional acceptance. No Iteration 4, workflow designer or Save/Load State.**

## 1. Capability matrix

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Origin selection and Frame 0 | Implemented | Accepted ApplicationSubmitted/SkillRequested with actual correlated v2 instance; existing in-progress facts captured now, no earlier frames synthesized. Legacy unsupported versions explicitly disabled/rejected. |
| One active persisted recording | Implemented | Active ID, pinned definition, immutable frames and processed identities live in optional State.viz; previous frames stop growing on new selection. Archived playback does not change active capture. |
| Capture outside Monitor | Implemented | Commit-path observer, existing Web Lock and atomic IndexedDB save; verified with both Monitor tabs closed, service replacement, remount and refresh. |
| Causal journey isolation | Implemented | Correlation and processed IDs, explicit originatingApplicationId parent/initial-skill link, and existing causedByEventId policy links. Unrelated company and independent same-company origin do not append frames. No company-wide causal inference. |
| Visual workflow map | Implemented | Version-pinned company/initial-skill composition; 37-node expanded fixture, four distinct parallel lanes, real conditional/correction paths, joins, activation and completion; 9-node standalone qualification map. |
| Canvas and node inspection | Implemented | Pan/zoom, fit, minimap, blocker focus, independently collapsible groups; business labels, status icons/colors, owners, waits/failures and saved event references. Automation links retain exact work context; human links open existing participant workspace without impersonation. |
| Immutable visual playback | Implemented | First/back/forward/slider/Return to Live, frame count and contributing event/attempt/transition; entire map state comes from that frame. Live recording continues during rewind. |
| Capture/render failure isolation | Implemented | Capture error reports a gap while valid business commands commit; error retained with affected recording. Renderer boundary preserves surrounding application navigation. Missing intermediate frames are never invented. |
| Unity fieldwork branding | Implemented | Bold sans-serif Unity, lowercase fieldwork, consistent breadcrumbs/titles; original 267 x 331 PNG, padded square favicons, proportional contain sizing. Simulation disclosure retained. |
| Automation operations | Implemented | Monitor default remains Automations & Integrations. Existing pending vendor/activation work, failed verifications, explicit retry, company/activity links and retained attempt history. No automatic execution. |
| Operations discovery | Implemented | Global Open-only parent/eight participant counts independent of role/company filters; system cards navigate to Monitor; human queues unchanged. Operations identity/preferences retained. |
| Contractor application and session | Implemented | Anonymous apply/confirmation; application email + 123; invalid credentials fail, duplicate email requires company choice; company-only workspace, sessionStorage sign-in/out. No actual authentication. |
| Onboarding and lifecycle | Implemented | Screening/correction, administration, skills, vendor, portal/training, explicit activation; historical completion stays closed; readiness derived; eligibility Ready AND Active; restored readiness never clears suspension. |
| Same-browser state coordination | Implemented | Shared IndexedDB snapshot, exclusive Web Locks, revision-only BroadcastChannel, focus/visibility recovery, duplicate/unrelated event protection. |
| Temporal/integration simulation | Partial | Persisted waits/attempts, injected timeout, explicit retries/time advancement and local outbox; no real Temporal, worker, service calls, automatic backoff or scheduler. |
| General graph/version scalability | Partial | Current v2 adapters and real 37-node fixture tested. No arbitrary workflow importer, v1 visualization, universal automatic transition extraction or arbitrary 50+ node/load guarantee. |
| Qualification recovery / full DDD / production durability | Partial | Consistent waits/suspension and existing pending qualification completion; mutable interfaces, whole-snapshot persistence and service/orchestrator mutations remain. |
| Administrative requests, suspension removal, ongoing compliance | Not Implemented | No request/approval/removal bypass, renewal/expiry lifecycle or recurring scheduler. Iteration 4 deferred. |
| Backend, real identity, jobs, cross-device sync, designer, Save/Load State | Not Implemented | Outside this iteration. |

## 2. Architecture and source map

### Viz projection and recording

- `src/viz/types.ts`: versioned MapDefinition, compact VisualNode/VisualFrame, FrameCause, VizRecording and VizState. Frames contain visual status/explanations/counts and event/WorkItem references, not copies of companies, evidence, workflows or the workspace.
- `src/viz/definition.ts`: `mapDefinition` explicitly adapts the compiled CompanyOnboarding v2 / SkillQualification v2 transitions. Activity membership is checked against `definition.activities` / `skillDefinition.activities`. Each recording pins the full adapter definition and version so future UI changes cannot silently replace its graph. Conditional routes are possible paths; neutral nodes never claim execution.
- `src/viz/recorder.ts`: `originatingEvents`, `originWorkflow`, `lineage`, `project`, `startRecording`, `captureCommittedVisuals`, `safelyCaptureVisuals`. Explicit initial-skill linkage composes the company journey; an independent SkillRequested never joins merely because company IDs match.
- `src/application.ts`: minimal integration seam: `startVizRecording(originEventId)` uses existing `change`; `safelyCaptureVisuals(s)` runs after a successful command action and before the existing atomic save/revision publication. No rendering library is imported by the recorder or application service.
- `src/domain.ts`: only a type import and optional auxiliary `State.viz` property. Business entities, policies and event envelope contracts unchanged. Workspace remains snapshot schema 4; IndexedDB database/store version unchanged. Existing schema-4 snapshots need no destructive migration and keep visualization state on reload.
- `src/viz/JourneyMap.tsx`: React Flow canvas, Dagre layout, expanded lane backgrounds, group aggregation, selectors, node inspection and frame playback. Lazy-loaded from App; canvas fitting waits for its actual viewport update and adapts to container size. Presentation mode retains intact Unity branding and Simulation disclosure.
- `src/viz/VizBoundary.tsx`: renderer errors remain inside Journey Map. `src/viz/viz.css`: node states/icons, lanes, layout/controls, presentation sizing and reduced-motion treatment.
- `src/App.tsx`, `src/presentation.ts`: Journey Map navigation and `#/monitor?view=journey`; default Monitor remains Automations & Integrations. Existing roles and company session identity unchanged. `src/style.css`: only shared Unity wordmark typography changes; existing non-brand hero heading typography retained.

New runtime dependencies: `@xyflow/react` 12.12.0 and `@dagrejs/dagre` 3.1.1, 22 packages added including transitive dependencies; no new backend or font. Renderer/layout guidance: [React Flow layout documentation](https://reactflow.dev/learn/layouting/layouting), [Dagre documentation](https://github.com/dagrejs/dagre/wiki). Graph libraries are layout/presentation tools, never workflow execution infrastructure.

### Event ordering, causation and frame semantics

Existing envelopes have stable eventId, eventVersion, correlationId, company/application/qualification identity, but **no universal causation ID or global sequence field**. Readiness/suspension payloads already include causedByEventId. Viz uses persisted event-array order, not timestamps (many simulation events share the same clock), accepted workflow processed IDs/correlations, explicit application/qualification linkage, and the existing policy cause links. Attempts have separate stable IDs; timer history entries use workflow ID plus append-only history position.

One frame represents **one atomic committed visual change**, and lists every newly relevant contributing business event/attempt/transition in that commit. A command can emit several events before it commits; Viz does not invent intermediate uncommitted states. It does not backfill a historical movie from old event logs. Frame 0 can reference real earlier evidence/events explaining current facts, but there are no pre-selection visual frames.

Processed identities and last visual state prevent repeat frames on duplicate event delivery, notifications and initialization. Only relevant new inputs can trigger a projection; unrelated origins do not change the selected recording. Independent approved skills may satisfy the existing readiness dependency, but their journeys are never attached to the graph. Completed onboarding nodes remain historical; Viz does not redefine current operational eligibility.

Capture is part of the same lock/transaction and snapshot revision as the business change. BroadcastChannel still sends only revision metadata after commit; listeners reload, never record or execute transitions. Capture exceptions produce an explicit gap notice while business processing continues. Missing intermediate states are not reconstructed later. Frames are append-only by implementation and tested for immutability; no API mutates prior frames. Playback/toggles/layout do not save business or visualization state.

### Retained domain and workflow architecture

- `src/domain.ts`: company/application/requirements/evidence/qualifications, WorkItems, attempts, workflow/history/events/outbox; `isReady`, `isJobEligible`, `readinessChecks`, `companyLifecycleCorrelation` remain authoritative. Company is the business identity, including a one-person company.
- `src/application.ts`: OnboardingService commands/queries and IntegrationPort/Repository/IndexedDbRepository. Existing executeActivity/retryActivity validate persisted Open work and reject work on completed company workflows.
- `src/orchestration.ts`: explicit compiled company/skill transitions, correlation/duplicate guards, scheduling and readiness evaluation; unchanged this iteration. CompanyOnboarding v2 / SkillQualification v2; event envelopes version 1.
- `src/companyLifecycle.ts`: current readiness/operational publication and suspension outside completed company execution; never reinstates suspension or schedules reactivation. Unchanged.
- `src/migration.ts`: schema 2/3 to 4 repair preserves events/history, historical completion and suspension; no 3.5 business migration. Unchanged.
- `src/AutomationQueue.tsx`, `OperationsWorkQueue.tsx`, `EligibilityGuidance.tsx`, `TaskCard.tsx`: retained 3.4 discovery, authoritative work counts, deep links and explicit execution. No second automation queue or execution controls in Viz.
- `src/LifecycleStatus.tsx`, `ContractorAccess.tsx`, `WorkflowMonitor.tsx`, `DiagnosticPanel.tsx`: retained lifecycle separation, company session, execution diagnostics and six initially collapsed keyboard-accessible supporting panels.

Readiness = administrative approval AND portal setup AND initial training AND at least one approved company skill. Eligibility additionally requires Active. Successful initial activation acknowledges historical completion. Sole-approval loss suspends an Active company; readiness restoration leaves Suspended/Not eligible. Initial rejection and recovery limitations remain consistent and explicit. No Iteration 4 shortcut.

## 3. Persistence, synchronization and simulation

User action -> existing use case -> exclusive command Web Lock -> latest load/migration -> validate and update domain/events/workflows/attempts -> selected Viz projection, if relevant -> one atomic snapshot/revision save -> lock release -> revision-only BroadcastChannel -> authoritative reload in all experiences.

IndexedDB `fieldwork-onboarding`, database version 1, store `state`, key `current`, snapshot schema 4. Optional Viz format version 1 coexists with current business state. Web Lock `fieldwork-onboarding:commands:v1`; channel `fieldwork-onboarding:changes:v1`. Per-tab command ordering and stale-read protection unchanged. Notifications, focus, pageshow and visible visibilitychange recover missed reloads. Missing required capabilities disables writes.

Contractor ID remains in tab-local `fieldwork:contractor:session`; Operations role/company and Monitor company preferences are independent. Viz's active recording is intentionally workspace-wide, not a tab identity. Viewing archived frames is tab-local and read-only; remount/refresh returns to the persisted active recording's latest frame. Company names and existing stored enum values/IDs are not renamed.

Persisted waits and failed attempts survive refresh. Simulated integrations remain user-triggered, with an immediate injected timeout and explicit retry of the same WorkItem. Timers/reminders/escalations require manual simulation time advancement. No real Temporal replay, automatic worker recovery/backoff/dispatcher, wall-clock scheduler, external services or messages.

## 4. Actual verification

Windows, Node v24.13.1, npm 11.8.0, 2026-10-16:

| Command/check | Actual result |
| --- | --- |
| `npm test` | **70 passed, 0 failed**, 8 files, including 8 new Viz recorder cases. |
| `npm run test:browser` | **22 passed, 0 failed**, one Chromium worker, final run 1.3 minutes. A prior complete run passed 21/21 before the additional canvas case. |
| `npm run build`, also inside browser command | TypeScript/Vite passed; 216 modules. Main JS 327.28 kB, lazy JourneyMap JS 245.24 kB; CSS 24.00 + 26.63 kB before gzip. |
| `npm audit --audit-level=moderate` | **0 vulnerabilities**. |
| Protected-source and asset diff | Orchestration, company lifecycle, migrations, coordination, browser coordination, runtime, authoritative reload code and all Unity PNGs unchanged. Application changed only for recording seam/API; domain changed only for optional auxiliary state type. |

Evidence:

- `src/viz/recorder.test.ts` (8): real in-progress Frame 0/no prehistory; catalog coverage/version pinning; parallel progression, 3/4 join, failure without a business event, retry and more than ten immutable frames; unrelated companies/duplicates/initialization; renderer absence and service replacement; independent same-company origins/archived recordings; reached-but-cancelled activation work; unsupported versions/invalid selection; actual correction/decline routes; capture-gap isolation without rolling back business work.
- `tests/browser/viz.spec.ts` (3): three live experiences; Frame 0 after work is underway; projection while view unmounted and with both Monitor tabs closed; parallel branches, red timeout/retry, orange Training join then activation, other-company and same-company independent requests, exact backward/forward comparison of every node for ten frames, live capture during playback, archived selection, reload persistence, duplicate revision notifications/event ingress and concurrent selection with one active recording. Additional canvas case exercises pan/zoom/minimap/fit/blocker focus/groups and keyboard node details without a save. Expanded screenshots verify all 37 nodes are within canvas bounds, non-overlapping, at minimum rendered width, with 37 minimap nodes.
- `tests/browser/branding.spec.ts`: exact three-experience naming, bold sans-serif Unity in sidebar/breadcrumb, desktop/mobile logo proportions, contain sizing, served favicon dimensions and exact preservation of original pixels in transparent padding.
- Retained regression: application (10), iteration2 (23), coordination (5), lifecycle (10), participant UI (4), portal UX (4), work visibility (6). Retained 19 browser tests cover lifecycle audit scenarios, happy/correction/retry paths, global counts, explicit publication eligibility, contested writes, duplicate protection, visibility recovery, capability failure, company/session isolation and independent diagnostics.

Intermediate failures are documented: the first Viz browser attempt timed out on an exact originating-event label and was interrupted during the remaining case; explicit accessible selector labels fixed it. Focused Viz runs then passed. Screenshot review found an unsettled fit animation and presentation clipping; fit scheduling/layout and presentation sizing were corrected and bounds/size checks added. One focused run had 1 pass/1 failure on the fitting indicator; corrected fitting passed 2/2 afterward. One production-build attempt caught a test close-tab block inserted in the wrong test scope; moved before the successful production/browser runs. An intermediate full browser run finished 21 passed / 1 failed on the newly added canvas check. That check initially used incorrect casing for the library Zoom In label and a click instead of the supported minimap drag gesture; corrected locators/gesture exposed and then verified a real keyboard inspection issue after expansion, now handled explicitly. A remaining exact-label assertion omitted its visible arrow suffix and was corrected. The focused interaction case then passed 1/1, followed by the full 22/22 run. Final results above supersede these development attempts.

Prior iteration evidence: 3.4 finished 62 regression / 19 browser passes, build passed, audit zero; branding follow-up had 59/60 regression and 17/17 browser. The old count assertion was corrected in 3.4 using waitFor, with no arbitrary sleeps. Current verification is independently executed.

Screenshots from isolated fictional production-build browser tests: Frame 0, full 37-node parallel graph, red failure, orange 3-of-4 waiting join, and historical playback. Revised Unity typography is visible in application chrome/presentation view. Durable copies and the complete handoff are in local-only `docs/chet/iteration-3.5-screenshots/`. Visual inspection was performed; Chet's visual/functional acceptance is still required. No new native tab-strip screenshot is claimed; favicon binaries remain identical and browser pixel/serving checks pass.

## 5. Decisions, limitations and review boundary

- Origins supported are the two actual workflow-start event types, not arbitrary event-envelope selection. Only v2 execution definitions are visualized; older unsupported versions stay available in diagnostics. Stored graph metadata is version-pinned. Future transition changes require updating/testing the adapter; this is not a universal automatic graph extractor or designer.
- Frame granularity is atomic committed visual state, possibly with multiple causes. Events that do not change projected visual content need not produce a frame. No pre-selection history, fabricated global causation, or reversal of live business state.
- Group overview is the launch layout for legibility; full expansion exposes 37 nodes with optional zoom/pan/presentation. Larger screenshots are review artifacts, not proof of arbitrary 50+ node/large-history scalability. Human action links preserve existing identity/preferences and may require selecting the responsible role/company in that workspace; automation links are exact company/WorkItem deep links.
- Same browser/profile/origin only. Close old versions of this application before using Viz: older code cannot record new changes. A different port is a different browser workspace. No transfer/export/Save/Load is provided.
- Retention is currently unbounded and stored in the existing whole snapshot; very long recordings, repeated correction loops and many archives can increase write/serialization cost and quota use. No pruning/deletion UI, quota recovery, mixed-version capture guarantee, cross-device synchronization or production durability claim. Capture gaps are explicit; missing frames are not reconstructed.
- Domain State now contains a typed optional auxiliary visualization extension; no policy reads it. Separating large recordings into an object store within the same transaction is a possible future architecture discussion, not implemented here. Existing mutable models/string IDs, service/orchestrator business mutations, no runtime schema validation and whole-snapshot storage remain debt.
- Reduced-motion CSS exists; broad screen-reader/mobile certification, physical crash/sleep recovery, quota/eviction, large histories, arbitrary definition versions and hosted deployment remain untested. No coverage/lint/load-test claims. No remaining automated failure was observed in final runs; this is not a zero-defects claim; manual review remains pending.

Before further work, validate visual hierarchy, lane readability, grouped vs expanded navigation, the join explanation, failure recovery and ten-frame playback with Chet. Remaining business decisions are unchanged: suspension-removal request/approval/evidence/audit, initial rejection/sole-invalidation recovery, ongoing compliance/expiry/grace periods and post-activation administrative changes; initial completion currently follows activation acknowledgement. **Do not begin Iteration 4, Save/Load State or additional Viz features before this acceptance.**

## 6. Repository and handoff continuity

- Repository `onboarding`: `C:\Users\david\Documents\Repositories\onboarding`; branch `main`, upstream `origin/main`.
- Origin fetch/push `https://github.com/dblath/onboarding.git`. No reinitialization, history rewrite, force-push or deployment.
- Iteration 3.5 baseline `1f9c197eb816ec23a5ba7305f137f536d4bda3bb`. Implementation `8bc1e7c69f4e1846b76a1441e7c6eb25df968879` (Add Viz journey recording, interactive maps and visual playback) was committed and pushed to origin/main on 2026-10-16. `git ls-remote` verified that exact implementation SHA and the working tree was clean after push. This publication record receives a separate documentation commit; final tip/remote agreement and clean-tree verification are recorded in the delivery and local Chet handoff. No Chet files or screenshots were staged/published.
- Prior implementations: 3.1 `04567dc532b0a509c6ae94e91fd4ff47f5843c25`; 3.2 `4cc625d833ca827c6e4febf4a6f227df78d4cd32`; 3.3 `c0918e7125806d8f3f1439be948c05b57f70095a`; branding `cbd352fa5ea884b67e71ed42ebf2d38f59d02036`; 3.4 `7d1bc73ffa0ece37c5718dbad5f6d890ef17cea6`.
- Run `npm install` if needed, then **`npm run dev -- --port 5174 --strictPort`**. Port 5173 was released at the user's request and was not used for this iteration's server. A different application's use of that port was left untouched. No persistent 3.5 dev server was started; automated preview servers stop with their test runs.
- Suggested review URLs: `http://127.0.0.1:5174/#/contractor`, `/#/operations`, `/#/monitor`, `/#/monitor?view=journey`. Keep all three on the exact same origin. A fresh port starts its own browser workspace.
- Production: `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 4174 --strictPort`; same hash routes. Static dist, no backend/environment variables. Browser tests use isolated temporary preview port 4173, never 5173.
- Checks: `npm test`, `npm run test:browser`, `npm run build`, `npm audit --audit-level=moderate`; Chromium prerequisite `npx playwright install chromium` if needed.
- Docs: README, STATUS, asset derivations, existing domain/process/event/rule/assumption/shared-browser docs. Earlier acceptance walkthroughs retain historical UI locations; current local `docs/chet/acceptance-3.5.md` supersedes those UI steps.
- Chet reports, acceptance steps and screenshots stay **local only** under `docs/chet/`, excluded through `.git/info/exclude`; never stage/commit/push them. Test artifacts remain ignored.

Every iteration: update STATUS from actual code/executed evidence, commit/push, verify remote/local SHA and clean tree, report failures as well as passes, and request manual acceptance. This report is current; prior reports remain historical evidence.
