# Unity fieldwork implementation status and context handoff

**Executive summary - Iteration 3.5.1: Bring Viz to Life + Density First. 2026-10-16, America/Denver. Package 0.3.6.**

Implementation is ready for manual visual acceptance. Viz now uses compact **154 x 44 px ordinary activity nodes** with one short business label, a business-area accent, and separate execution symbols/fills. Details live in inspection. Compared with the former 216 x 108 cards, ordinary node area is reduced by **71%** through less content and better geometry. Labels use 13 px type (previously 14 px), with zoom for investigation. Joins use 184 x 44 nodes with counts; collapsed groups use 180 x 48. Two-level automatic layout combines short horizontal sequences with four aligned parallel lanes.

Recorded frame differences illuminate affected nodes/routes and drive a business explanation, next actions/owners, and a prominent readiness-join summary. Satisfied incoming dependencies stay green while a join waits on other requirements. A green 4/4 readiness count is distinct from the grouped Activation area's orange pending publication state. Follow changes is on by default; turning it off preserves the user's viewport. Read-only Play/Pause offers 0.5x, 1x and 2x speed. Historical review keeps recording in the background and indicates newer frames without moving the view.

All 37 existing map nodes fit in a **1600 x 1100** desktop presentation capture; grouped overview is legible, and expanded labels are investigated with zoom/branch focus. A clearly identified **80-step synthetic layout fixture** tests density/topology, not executable workflow capacity. Comparison captures and an actual browser-recorded playback video are local under docs/chet.

The existing recorder, pinned definitions, business rules, event contracts, IndexedDB persistence, Web Locks and BroadcastChannel behavior are unchanged. One originating application or skill request still records at a time, Frame 0 still begins at selection, and archived frames remain intact. Unity fieldwork's bold sans-serif identity and complete original logo/favicons are preserved. No dependencies added or upgraded; package version alone advances to 0.3.6 for the product iteration named 3.5.1.

Actual final checks: **73 regression tests passed, 0 failed; 24 Chromium browser tests passed, 0 failed (1.4 minutes); TypeScript/production build passed; audit 0 vulnerabilities.** No known remaining automated failure. Manual visual, mobile and assistive-technology acceptance remains outstanding. **Stop for product/visual review. No Iteration 4, designer, definition import or Save/Load State.**

## 1. Capability matrix

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Origin selection and Frame 0 | Implemented | Accepted ApplicationSubmitted/SkillRequested with actual correlated v2 instance; existing in-progress facts captured now, no earlier frames synthesized. Legacy unsupported versions explicitly disabled/rejected. |
| One active persisted recording | Implemented | Active ID, pinned definition, immutable frames and processed identities live in optional State.viz; previous frames stop growing on new selection. Archived playback does not change active capture. |
| Capture outside Monitor | Implemented | Commit-path observer, existing Web Lock and atomic IndexedDB save; verified with both Monitor tabs closed, service replacement, remount and refresh. |
| Causal journey isolation | Implemented | Correlation and processed IDs, explicit originatingApplicationId parent/initial-skill link, and existing causedByEventId policy links. Unrelated company and independent same-company origin do not append frames. No company-wide causal inference. |
| Visual workflow map | Implemented | Version-pinned company/initial-skill composition; 37-node expanded fixture, four distinct parallel lanes, real conditional/correction paths, joins, activation and completion; 9-node standalone qualification map. |
| Compact canvas and node inspection | Implemented | 154 x 44 activities, 13 px labels, independent area accent/state symbol and fill; pan/zoom/minimap, fit, blocker focus, keyboard selection and full details. Exact automation links; human links preserve existing identity/preferences. |
| Living read-only playback | Implemented | Recorded node/edge/join differences, business story/next owners, Play/Pause at 0.5x/1x/2x, first/back/forward/slider/Live, Follow changes toggle and background-capture notification. No state saves from presentation settings or playback. |
| Dense layout and executive joins | Implemented | Four aligned parallel lanes with local and macro Dagre layout; focused single-branch expansion, grouped overview; visible 3/4 then 4/4 readiness, blockers and owners outside nodes. Satisfied dependency inputs stay green. |
| Capture/render failure isolation | Implemented | Capture error reports a gap while valid business commands commit; error retained with affected recording. Renderer boundary preserves surrounding application navigation. Missing intermediate frames are never invented. |
| Unity fieldwork branding | Implemented | Bold sans-serif Unity, lowercase fieldwork, consistent breadcrumbs/titles; original 267 x 331 PNG, padded square favicons, proportional contain sizing. Simulation disclosure retained. |
| Automation operations | Implemented | Monitor default remains Automations & Integrations. Existing pending vendor/activation work, failed verifications, explicit retry, company/activity links and retained attempt history. No automatic execution. |
| Operations discovery | Implemented | Global Open-only parent/eight participant counts independent of role/company filters; system cards navigate to Monitor; human queues unchanged. Operations identity/preferences retained. |
| Contractor application and session | Implemented | Anonymous apply/confirmation; application email + 123; invalid credentials fail, duplicate email requires company choice; company-only workspace, sessionStorage sign-in/out. No actual authentication. |
| Onboarding and lifecycle | Implemented | Screening/correction, administration, skills, vendor, portal/training, explicit activation; historical completion stays closed; readiness derived; eligibility Ready AND Active; restored readiness never clears suspension. |
| Same-browser state coordination | Implemented | Shared IndexedDB snapshot, exclusive Web Locks, revision-only BroadcastChannel, focus/visibility recovery, duplicate/unrelated event protection. |
| Temporal/integration simulation | Partial | Persisted waits/attempts, injected timeout, explicit retries/time advancement and local outbox; no real Temporal, worker, service calls, automatic backoff or scheduler. |
| General graph/version scalability | Partial | Actual 37-node v2 flow and synthetic 80-step geometry tested, including no node overlap. No arbitrary workflow importer, v1 visualization, automatic transition extraction or general large-history/load guarantee. |
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
- `src/viz/JourneyMap.tsx`: React Flow canvas, group/edge aggregation, compact node rendering, selection/inspection, frame controls, tab-local follow/play/speed and presentation mode. Follow focus depends on the viewed recording/frame number, not background revision changes. No automatic refit on container resize or while Follow is off; explicit Fit map/Focus blockers remain available.
- `src/viz/layout.ts`: `layoutGroups`, shared area accents/groups; local sequence/lane layout plus macro layout. Correction back-edges are displayed but excluded from rank assignment. Skill is aligned with the administrative lanes, never serialized by the rendering.
- `src/viz/story.ts`: `compactLabel`, `frameStory`, `edgeStatus`; pure recorded-frame comparisons, business labels and next owners. Join-input edge colors derive from recorded source facts; saved edge states and frames are never rewritten. The same displayed-edge projection is used to identify changed routes.
- `src/viz/VizBoundary.tsx`: renderer errors remain inside Journey Map. `src/viz/viz.css`: node states/icons, lanes, layout/controls, presentation sizing and reduced-motion treatment.
- `src/App.tsx`, `src/presentation.ts`: retained Journey Map navigation and `#/monitor?view=journey`; default Monitor remains Automations & Integrations. Only App's iteration caption changes in 3.5.1. Existing roles and company session identity unchanged. `src/style.css` retains 3.5's bold sans-serif Unity wordmark; no branding asset or shared-style change in 3.5.1.

Existing runtime dependencies remain `@xyflow/react` 12.12.0 and `@dagrejs/dagre` 3.1.1. No dependency changes in 3.5.1. These are layout/presentation tools, never workflow execution infrastructure.

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
| `npm test` | **73 passed, 0 failed**, 9 files; final run 28.51 seconds. Retains all 70 baseline cases and adds 3 presentation cases. |
| `npm run test:browser` | **24 passed, 0 failed**, 9 spec files, one Chromium worker; final run 1.4 minutes. All 22 retained cases plus 2 new storytelling/layout cases. |
| `npm run build`, also inside browser command | TypeScript/Vite passed; 218 modules. Main JS 327.29 kB / gzip 96.90; lazy JourneyMap JS 252.26 kB / gzip 83.94; CSS 24.00 + 28.60 kB before gzip. |
| `npm audit --audit-level=moderate` | **0 vulnerabilities**. No dependency additions/upgrades. |
| Protected source/assets | Recorder, pinned-definition adapter, types/contracts, application/domain, orchestration/lifecycle, migrations, all persistence/concurrency/reload code and Unity PNGs have no diff against the 3.5 baseline. App change is only the iteration caption. Original logo SHA256 remains 88ef0146e47c4f25fbb95372945eca19b65e6598c7a8a43a8eb39a5af337d1a1. |

Evidence:

- `src/viz/presentation.test.ts` (3): actual 37-node and synthetic 80-node non-overlapping geometry, correct activity dimensions/aligned lanes; pure diff/story/owner generation without mutation; satisfied join inputs green while another dependency waits, with saved frames unchanged.
- `tests/browser/viz-story.spec.ts` (2): live three-tab actions; changed business story and routes; manually zoomed viewport retained with Follow off; Follow on focuses the changed region; historical frame and viewport remain stable during new capture with newer-frame indication; timed Play/Pause/speed/manual step/Live; full persisted workspace equality before/after playback/focus settings; reduced-motion CSS; 80-step synthetic test-only recording, 80 minimap nodes and actual 154 x 44 boxes/13 px labels. Records an actual Chromium playback video.
- `tests/browser/viz.spec.ts` (3 retained, extended): real 37-node journey, four independent branches, timeout red then retry recovery, visible 3/4 join then 4/4 readiness/downstream publication, exact ten-frame node-state comparisons, concurrent selection, origin isolation, archived playback, closed-Monitor recording, refresh, keyboard selection and pan/zoom/minimap. Expanded screenshot checks now use normal **1600 x 1100** dimensions and require all 37 nodes inside the canvas, no node overlap, minimum rendered width over 60 px and all minimap nodes. This is topology-at-fit evidence, not a claim all labels are readable at fit. Grouped overview is the primary storytelling view.
- `src/viz/recorder.test.ts` (8 unchanged): capture scope/version pinning, in-progress Frame 0/no prehistory, retries and immutable frames, independent origins/archiving, duplicate protection, capture-gap isolation and cancelled activation facts.
- All retained participant/domain/lifecycle/concurrency regression cases and 19 non-Viz browser cases passed, including global work totals after completing work, explicit activation eligibility in three tabs, duplicate event protection, missed-notification recovery, simulated login and diagnostic panels.
- `tests/browser/branding.spec.ts`: all three exact titles/breadcrumbs, bold sans-serif Unity, intact desktop/mobile logo proportions, served favicons and original-pixel transparent padding preservation passed.

Development evidence: focused original Viz browser run **3/3 passed**, then two focused expanded runs **5/5 passed** before the final full **24/24** run. First regression run after the initial two presentation cases **72/72 passed**, followed by final **73/73** after adding the join-edge regression. No browser/regression assertion failure occurred in these 3.5.1 runs. Early development build attempts caught a missing Follow prop and Dagre generic types; corrected before successful builds. Screenshot review caught a vertically displaced skill lane and led to aligned macro ranks/top edges. These are resolved development findings. Prior 3.5 development failures remain documented in its local historical handoff.

Artifacts copied before any further test run: local-only `docs/chet/iteration-3.5.1-screenshots/` contains normal-desktop grouped/37-node expanded/80-step fit and zoom detail, changed-route, red failure/recovery, 3/4 wait and 4/4 readiness, historical playback, all three Unity experiences, plus original 3.5 comparison captures and `viz-playback.webm`. PNGs are actual browser captures, not edited images. Normal desktop captures were visually reviewed. Comparison baselines retain their original sizes (old expanded 2560 x 2400; old grouped full-page), so they are geometry/context comparisons, not pixel-diff tests. Native tab-strip favicon capture is not newly claimed; favicon assets remain byte-identical and browser serving/pixel tests passed.

## 5. Decisions, limitations and review boundary

- Origins supported are the two actual workflow-start event types, not arbitrary event-envelope selection. Only v2 execution definitions are visualized; older unsupported versions stay available in diagnostics. Stored graph metadata is version-pinned. Future transition changes require updating/testing the adapter; this is not a universal automatic graph extractor or designer.
- Frame granularity is atomic committed visual state, possibly with multiple causes. Events that do not change projected visual content need not produce a frame. No pre-selection history, fabricated global causation, or reversal of live business state.
- Group overview is the launch layout for legibility. Full 37-node fit shows topology/state patterns at ordinary desktop size; zoom or focus a branch for readable investigation. The 13 px source label font is unchanged by zoom; fit scales the whole map. The synthetic 80-step fixture demonstrates geometry only, not actual 80-activity execution or arbitrary graph scalability. Human action links may require selecting the role/company in their workspace; automation links remain exact company/WorkItem links.
- Same browser/profile/origin only. Close old versions of this application before using Viz: older code cannot record new changes. A different port is a different browser workspace. No transfer/export/Save/Load is provided.
- Retention is currently unbounded and stored in the existing whole snapshot; very long recordings, repeated correction loops and many archives can increase write/serialization cost and quota use. No pruning/deletion UI, quota recovery, mixed-version capture guarantee, cross-device synchronization or production durability claim. Capture gaps are explicit; missing frames are not reconstructed.
- Domain State now contains a typed optional auxiliary visualization extension; no policy reads it. Separating large recordings into an object store within the same transaction is a possible future architecture discussion, not implemented here. Existing mutable models/string IDs, service/orchestrator business mutations, no runtime schema validation and whole-snapshot storage remain debt.
- Reduced-motion treatment is browser-tested for node and edge animations; viewport focus uses immediate repositioning for all users. Keyboard node inspection remains covered. Broad screen-reader/mobile certification, physical crash/sleep recovery, quota/eviction, very large histories, arbitrary definition versions and hosted deployment remain untested. No coverage/lint/load-test claims. No remaining failure observed in final runs; manual visual acceptance is pending.

Before further work, validate visual hierarchy, lane readability, grouped vs expanded navigation, the join explanation, failure recovery and ten-frame playback with Chet. Remaining business decisions are unchanged: suspension-removal request/approval/evidence/audit, initial rejection/sole-invalidation recovery, ongoing compliance/expiry/grace periods and post-activation administrative changes; initial completion currently follows activation acknowledgement. **Do not begin Iteration 4, Save/Load State or additional Viz features before this acceptance.**

## 6. Repository and handoff continuity

- Repository `onboarding`: `C:\Users\david\Documents\Repositories\onboarding`; branch `main`, upstream `origin/main`.
- Origin fetch/push `https://github.com/dblath/onboarding.git`. No reinitialization, history rewrite, force-push or deployment.
- Iteration 3.5.1 baseline: `ab4a64bbe825079e31585836790fd10171af3dd5`; prior 3.5 implementation `8bc1e7c69f4e1846b76a1441e7c6eb25df968879`. Implementation **`cbfe4e90610516f099a85e27fd01a7c503dad0bb`** (Make Viz compact and bring recorded workflow progress to life) was committed and pushed to origin/main on 2026-10-16. `git ls-remote` verified the exact implementation SHA and the working tree was clean after push. This publication record receives a documentation-only follow-up commit; final tip/remote agreement is recorded in delivery and the local Chet handoff. No Chet files or screenshots are staged or published.
- Prior implementations: 3.1 `04567dc532b0a509c6ae94e91fd4ff47f5843c25`; 3.2 `4cc625d833ca827c6e4febf4a6f227df78d4cd32`; 3.3 `c0918e7125806d8f3f1439be948c05b57f70095a`; branding `cbd352fa5ea884b67e71ed42ebf2d38f59d02036`; 3.4 `7d1bc73ffa0ece37c5718dbad5f6d890ef17cea6`.
- Run `npm install` if needed, then **`npm run dev -- --port 5174 --strictPort`**. Port 5173 was released at the user's request and was not used for this iteration's server. A different application's use of that port was left untouched. No persistent 3.5.1 dev server was started; automated preview servers stop with their test runs.
- Suggested review URLs: `http://127.0.0.1:5174/#/contractor`, `/#/operations`, `/#/monitor`, `/#/monitor?view=journey`. Keep all three on the exact same origin. A fresh port starts its own browser workspace.
- Production: `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 4174 --strictPort`; same hash routes. Static dist, no backend/environment variables. Browser tests use isolated temporary preview port 4173, never 5173.
- Checks: `npm test`, `npm run test:browser`, `npm run build`, `npm audit --audit-level=moderate`; Chromium prerequisite `npx playwright install chromium` if needed.
- Docs: README, STATUS, asset derivations, existing domain/process/event/rule/assumption/shared-browser docs. Earlier acceptance walkthroughs retain historical UI locations; current local `docs/chet/acceptance-3.5.1.md` supersedes those UI steps.
- Chet reports, acceptance steps and screenshots stay **local only** under `docs/chet/`, excluded through `.git/info/exclude`; never stage/commit/push them. Test artifacts remain ignored.

Every iteration: update STATUS from actual code/executed evidence, commit/push, verify remote/local SHA and clean tree, report failures as well as passes, and request manual acceptance. This report is current; prior reports remain historical evidence.
