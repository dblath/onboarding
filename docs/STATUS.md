# Unity fieldwork implementation status and context handoff

**Executive summary — Iteration 3.11: Onboarding UX Polish. 2026-10-18, America/Denver. Package 0.3.12.**

The accepted 3.10 role-first Operations and Contractor design is retained. Prominent environment banners are removed. Anonymous Contractor has one main application CTA, visible Email/Password sign-in labels and the original email/123/company-selection behavior. Request qualification is a solid blue primary action near company skills, retaining the exact Ready + Active visibility rule and existing command.

Normal copy across Contractor, Operations, Monitor, Automations, Viz, Recording Triggers and Demo Workspace now uses business or demo/test language. A discreet footer explains sample data, no real authentication/services and live browser storage. Test outcomes and Run test verification remain explicit and user-triggered. Raw history, event envelopes, attempts and selected recorded node JSON preserve original technical text. User-entered names and free text are not rewritten.

New display adapters are separate from the legacy label/message helpers imported by the recorder. Thus pinned definitions, recorded explanations/causes, frames, lineage and portable state remain unchanged. No workflow, readiness/eligibility, activation, ownership, login/session, persistence/coordination, logo, wordmark or font changes. No field service, scheduling, dispatch, Iteration 4 or designer work.

**Executed verification: 115/115 regression tests; 44/44 Chromium tests; production build passed; audit 0 vulnerabilities. Ready for manual polish acceptance.** Three representative desktop screenshots and additional mobile evidence, acceptance steps and full Chet report remain local-only under docs/chet. Stop for review.

## 1. Implemented / Partial / Not Implemented

| Capability                                                             | Status                | Actual boundary                                                                                                                                   |
| ---------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Role-owned working surface                                             | Implemented           | Company attention list, real business activity/count/due/escalation facts, immediate existing inline forms                                        |
| Role focus and safe selection                                          | Implemented           | Open owned work across roots; completion removes company; no stale substitution; existing tab-local role/scope preferences                        |
| Discovery and global totals                                            | Implemented           | All companies, all-role sidebar total, secondary global inventory; no cross-role execution                                                        |
| Business progress / full record                                        | Implemented           | Six parallel/prerequisite-aware areas; decisions, requirements, every evidence version, qualifications, messages/history                          |
| Monitor handoff                                                        | Implemented           | Automation company/activity links; company-context diagnostics; internal execution/retries only in Monitor                                        |
| Contractor cleanup                                                     | Implemented           | One anonymous application CTA; Email/Password labels; prominent qualification action; discreet environment/storage footer                         |
| Contractor onboarding product / simulated login                        | Implemented, retained | Next action/team, current eligibility, historical journey, later skills; anonymous apply, email + 123, duplicate-email choice, tab-local sign-out |
| Multi-tab / portable workspace                                         | Implemented, retained | IndexedDB authority, Web Locks, revision notifications, atomic Save/Load/Reset and legacy formats                                                 |
| Viz / observer isolation                                               | Implemented, retained | Opt-in triggers, independent recordings, exact frames/playback, group counts, compact maps and capture failure isolation                          |
| Desktop/mobile / keyboard                                              | Implemented           | 1440/390 working layouts, native disclosures and mobile company chooser                                                                           |
| Normal copy / raw inspection                                           | Implemented           | Business/demo/test labels in all normal views; original technical records and persisted contracts retained                                        |
| Formal accessibility / browser matrix                                  | Partial               | Representative Chromium checks; no formal certification or Firefox/Safari acceptance                                                              |
| Rejected initial skill / qualification-loss recovery                   | Partial               | Consistent state, documented unavailable recovery; no bypass                                                                                      |
| Monitor/Viz redesign                                                   | Not Implemented       | Excluded; existing diagnostic/automation views reused                                                                                             |
| Suspension removal, ongoing compliance, post-activation administration | Not Implemented       | Iteration 4 decisions remain open                                                                                                                 |
| Backend, real auth/integrations, Temporal service, designer            | Not Implemented       | Browser simulation only                                                                                                                           |

## 2. Architecture and source boundaries

- [src/App.tsx](../src/App.tsx): accepted shell, role/company/scope/selection and command runner retained; removes title-row application button and remaining environment banners, keeps live status in the common discreet footer.
- [src/ContractorAccess.tsx](../src/ContractorAccess.tsx): visible Email/Password labels and demo clarification. Same credential, duplicate-company and session logic. Main application CTA respects loading/unavailable state.
- [src/ContractorPortal.tsx](../src/ContractorPortal.tsx), [contractor.css](../src/contractor.css): qualification button changes from secondary to existing primary blue, with adequate spacing/minimum height and existing responsive/hover/focus/disabled behavior. Same visibility guard/use case.
- [src/presentation.ts](../src/presentation.ts): adds UI-only businessActivityLabel, businessMessage and businessText. Legacy activityLabel/simulationMessage outputs remain unchanged because recorded definitions/explanations depend on them. Known generated outcomes, review instructions and reminders translate; unknown free text is preserved. Controlled fixture labels/actors are adapted only when displayed.
- [src/TaskCard.tsx](../src/TaskCard.tsx), [OperationsWorkspace.tsx](../src/OperationsWorkspace.tsx), [OperationsWorkQueue.tsx](../src/OperationsWorkQueue.tsx), [EligibilityGuidance.tsx](../src/EligibilityGuidance.tsx): display adapters, Test outcomes, sample document labels, existing action handlers. Stored option values, role IDs, CSS abstractions and test IDs retained.
- [AutomationQueue.tsx](../src/AutomationQueue.tsx), [WorkflowMonitor.tsx](../src/WorkflowMonitor.tsx), [viz/JourneyMap.tsx](../src/viz/JourneyMap.tsx), [viz/TriggerManager.tsx](../src/viz/TriggerManager.tsx), [workspace/DemoWorkspace.tsx](../src/workspace/DemoWorkspace.tsx): normal copy/tooltip/accessible label updates. Explicit raw technical records stay verbatim; selected Viz node definition/state gains inspectable raw JSON. No Monitor layout redesign.
- Unchanged business/infra: application, domain, orchestration, companyLifecycle, IndexedDB/coordination/runtime/hook, workspace format/validation/scenario generation, Viz recorder/definitions/story/trigger semantics. Contractor identity hook and authentication logic unchanged; only its UI component copy/CTA state changes.

Detailed boundary/audit rationale: [presentation-language.md](presentation-language.md). Accepted design: [operations-experience.md](operations-experience.md), [contractor-experience.md](contractor-experience.md). HomeItem remains read-only; existing navy/blue/slate tokens and Unity width 95 / weight 450 retained. No dependency or font/asset changes.

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

No persistence/synchronization changes in 3.11. Live storage/revision status is now in the footer across all experiences. IndexedDB `fieldwork-onboarding`, database v2/business schema 4: `state/current`, `viz-control/current`, `viz-recordings`, append-only `viz-frames`. Business commits first; changed observer records/new frames persist separately, then checkpoint control. Auxiliary failures preserve valid business durability, report explicit capture gaps and isolate affected recordings; healthy captures continue. No fabricated replay/backfill or hidden retention.

Production reads/writes coordinate through `fieldwork-onboarding:commands:v1`; revision-only `fieldwork-onboarding:changes:v1` notifications follow durability/lock release. Tabs reload IndexedDB rather than executing notification events. Focus/visibility/pageshow recover missed notifications; stale reads cannot overwrite newer revisions. Role, scope, company and simulated identity remain tab-local. Missing coordination disables writes.

Save includes complete logical state and exact Viz frames/archives/causes/lineage, excluding sessions/browser internals. Load/Reset atomically replace all stores under the Web Lock with preview/backup/confirmation, stale-review rejection, higher revision and new epoch. Queued old-workspace commands reject; invalid company selections need explicit choice. Original portable workspace formats 1/2 and Viz 1/2 remain supported; business schema stays 4. See [`observer-storage.md`](observer-storage.md), [`workspace.md`](workspace.md), [`viz-recording.md`](viz-recording.md), [`shared-browser.md`](shared-browser.md).

## 5. Executed verification

Windows, Node 24.13.1 / npm 11.8.0. Chromium runs built production assets on temporary port 4173; port 5173 untouched.

| Command/check                    | Actual result                                                                                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm test                         | **115 passed, 0 failed**, 16 files; final run 28.38 s.                                                                                                          |
| npm run test:browser             | **44 passed, 0 failed**, 16 spec files, one worker; final full run 3.0 minutes.                                                                                 |
| New focused Chromium acceptance  | **3/3 passed**, 8.5 s; included again in full suite.                                                                                                            |
| npm run build                    | Passed TypeScript/Vite, 233 modules; main JS 395.13 kB / gzip 114.48; CSS 55.09 / 11.33; lazy Viz 257.80 / 85.36, Workspace 11.09 / 3.97, Triggers 3.91 / 1.57. |
| npm audit --audit-level=moderate | **0 vulnerabilities**, no dependency additions.                                                                                                                 |

[src/presentation.test.ts](../src/presentation.test.ts) adds four checks: frozen legacy recorder vocabulary, current labels/case variants/wait explanations, unknown free text/source preservation, and generated reminders/timer captions. [tests/browser/onboarding-polish.spec.ts](../tests/browser/onboarding-polish.spec.ts) adds three acceptance cases: one landing application CTA and proper sign-in types/labels; blue qualification CTA keyboard/hover/real lock-blocked disabled behavior and actual request; clean Operations work/disclosures; all six Monitor destinations and load/reset dialogs. Visible text, select labels, accessible names, tooltips and placeholders are audited case-insensitively. Explicit raw record regions are exceptions and compared to original state. Inspection snapshots remain equal; qualification creates one additional independent skill while completed onboarding stays frozen. Layouts checked at 1440/390.

All prior domain, lifecycle/suspension/rejection, UI, role queues, multi-tab concurrency/duplicates/missed notifications, auth privacy, legacy portable files, exact Frame 13/archive continuation, trigger/observer failure, 25-company/50-recording scale and 37/80-node suites retained. Existing selectors use new visible wording; serialized fixture values and ownership IDs stay unchanged. Original Unity image/favicons/font assertions remain.

Intermediate failures: first focused build caught a missing recursive-helper return annotation and an invalid Testing Library option; fixed. First new browser attempt: 0 passed / 3 failed. One text audit found a retained legacy agreement label in EligibilityGuidance, fixed through the display adapter. Other failures were test locator ambiguity (Plumbing option versus record) and a shrinking aria-expanded=false collection; corrected to exact record/stable disclosure controls. Next focused run passed 3/3. No arbitrary sleeps, removed tests or production rule changes.

## 6. Scale, limits and technical debt

Retained scale acceptance exercises 25 companies, 50 simultaneous company/skill recordings and 650 frames at restore across three live experiences. Historical 3.8 measurements: 78,070,018 → 18,600,842 logical write bytes over 13 commands (76.2% reduction); complete readable export 10,204,083 bytes (9.73 MiB). These are historical measurements, not new 3.10 performance claims.

The 3.10 readable local review file is **523,278 bytes** (about 511 KiB): 5 companies, 28 events, 11 Open WorkItems, 5 recordings and 24 frames. Business facts/events still use a snapshot. Observer metadata/processed identities and per-tab full historical caches grow. Cold load/export/import process all history. No retention, compression, streaming, automatic gap repair or quota guarantee; file limit 50 MiB. App retains legacy shared inspection markup for Monitor; Operations uses a separate presentation component rather than broad shell refactoring. Historical acceptance guides may retain older labels. No new dependency/backend.

## 7. Decisions, assumptions and gaps

- **Implemented rules:** historical/current/operational separation, approved skill prerequisite, explicit activation, Ready AND Active, no completed-root resumption/automatic unsuspension. Unchanged.
- **Presentation decisions:** role work first; records below actions; global inventory secondary; mobile company list collapses; native independent disclosures; actual due/escalation facts determine urgency.
- **Provisional assumptions:** company identity, sample HVAC/Plumbing, fictional evidence, current administration/vendor/profile/training sequence, reminder/escalation policies. No policy expansion.
- **Architecture choices:** display-only vocabulary separate from immutable recording helpers; faithful explicit raw records; known generated messages adapted without rewriting unknown free text. No new state store, queue or workflow.
- **Product input:** qualification CTA prominence, single application entry, clearer sign-in, demo/test language and discreet disclosure at both widths. 3.10 design is accepted; stop for focused polish review.
- **Business questions:** initial-skill rejection recovery, suspension-removal request/approval/audit, ongoing compliance/expiry/grace, post-activation administrative requests. No Iteration 4 work.
- **Untested/manual:** formal screen-reader/browser matrix, Firefox/Safari, non-Windows fonts, actual OS save picker, near-limit quota/crash boundaries. Representative checks are not exhaustive certification.
- **Known defects:** none confirmed in executed acceptance paths. Existing manual/browser/accessibility and lifecycle recovery limits remain explicit. Raw historical wording and user-entered text intentionally retain original language.

## 8. Repository and publication

- Repository onboarding, C:\Users\david\Documents\Repositories\onboarding; branch main/upstream origin/main; fetch/push https://github.com/dblath/onboarding.git.
- Starting published tip: 21470f980260dcbe8bedf30d28d6459dcc84230f. Previous 3.10 implementation: c559f3c0717abca69d30c90d465208edef8908e3.
- 3.11 commit/push pending final checks. No reset, force-push, reinitialization, credentials or deployment.
- Current changes are presentation components/helpers, narrow CTA CSS, tests, package version and docs. Domain/use cases/workflow transitions, persistence, recorder/pinned definitions and original branding assets remain untouched. Session/credential matching behavior unchanged despite UI copy changes in ContractorAccess.
- Chet material is excluded through .git/info/exclude and never tracked. Verify clean tree/local-remote SHA agreement and stopped temporary server after publication.
- Original Unity PNG SHA256: 88ef0146e47c4f25fbb95372945eca19b65e6598c7a8a43a8eb39a5af337d1a1. Logo, wordmark, fonts, theme and favicons unchanged.
- Docs: current STATUS/README, presentation-language, Operations/Contractor design notes, observer/workspace/recording/shared-browser and domain/process/event/rule catalogs. Detailed report/screenshots/acceptance remain local-only under docs/chet.

## 9. Manual acceptance and next work

Run **npm run dev -- --port 5174 --strictPort**. Same Chrome profile/exact origin:

| Experience | URL                                            |
| ---------- | ---------------------------------------------- |
| Contractor | http://127.0.0.1:5174/#/contractor             |
| Operations | http://127.0.0.1:5174/#/operations             |
| Monitor    | http://127.0.0.1:5174/#/monitor                |
| Workspace  | http://127.0.0.1:5174/#/monitor?view=workspace |

1. Anonymous Contractor: one main Start a new application CTA; no upper-right duplicate. Visible Email/Password labels and proper input types. Wrong password establishes no session; existing application/email/123 and duplicate-company behavior remain. Footer is discreet and truthful.
2. Qualification: back up state, load local docs/chet/iteration-3.9-scenarios/contractor-eligible.json through Workspace preview/confirmation, then sign in alex@example.com / 123. Alternatively complete the built-in Ready for activation scenario by explicitly publishing in Monitor. The company must be Ready + Active. Near company skills, Request qualification is solid blue, responsive and keyboard-focused. Choose Plumbing and request: one new qualification starts; completed onboarding remains closed. Suspended/not-ready companies still cannot request.
3. Operations: use existing local docs/chet/iteration-3.10-operations-review.json if useful. Recruitment shows Alpha/Beta; role-owned actions/counts/All companies behave as accepted. No environment banner. Compliance Gamma shows real insurance/license work, with Test outcomes and Run test verification. Complete work normally; cross-tab updates/global totals preserved.
4. Monitor: inspect Automations, Workflow monitor, Outbox, Journey Map, Recording Triggers and Demo Workspace/load/reset dialogs. Normal copy is business/demo/test wording. No external services or automatic integration execution. Expand raw history/envelopes/attempts or node execution references to verify original record text; these are deliberate technical exceptions.
5. At 1440/390 check button hierarchy, forms, visible labels/focus, footer, no horizontal overflow and unchanged Unity lettering/proportions. Review three desktop captures (landing, company skills, Operations); mobile evidence stays local. Detailed guide/screenshots in docs/chet/iteration-3.11-review.md.

Run npm test, npm run test:browser, npm run build and npm audit --audit-level=moderate. Static output dist/; no backend/environment setup. No persistent server included; leave 5173 untouched.

**Next: manual onboarding polish review only.** No field service, scheduling, dispatch, Iteration 4, backend/auth, workflow designer or Monitor redesign. Continue only with agreed acceptance feedback.

Continuity: update STATUS from actual code/tests each iteration, commit/push, verify remote/local/clean tree, deliver detailed Chet materials locally only.
