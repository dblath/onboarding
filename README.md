# Unity fieldwork - Contractor onboarding, Iteration 3.11

End-to-end product discovery prototype: contractor application, screening, administrative approvals, independent skill qualification, vendor provisioning, portal, training, readiness and activation. Browser-only persistence and simulated integrations. Simulated company sign-in uses the application email and password 123. No backend, real authentication or live services.

Unity branding uses the complete original logo across all three experiences. The square favicons add transparent padding and preserve its proportions. See [asset derivations](public/assets/README.md) and [branding acceptance](docs/acceptance-branding.md). Current verification, including the corrected asynchronous count-test wait, is recorded in [STATUS](docs/STATUS.md).

Iteration 3.11 polishes the accepted Contractor/Operations design: prominent environment strips are removed, anonymous application has one main CTA, sign-in uses visible Email/Password labels, and Request qualification is a solid blue primary action with its existing Ready + Active rule. Normal UI uses business/demo/test language; discreet environment/storage information remains in the footer. Original historical records remain faithful in explicit technical inspection. No business, workflow, recording, persistence, login behavior, logo or wordmark changes. See [presentation boundaries](docs/presentation-language.md).

Historical onboarding completion, current readiness and operational status are separate. Job eligibility requires Ready AND Active. Restoring qualifications never removes a suspension. [Operations queue acceptance](docs/acceptance-3.3.md) / [Iteration 3.2 UX acceptance](docs/acceptance-3.2.md) / [Lifecycle acceptance](docs/acceptance-3.1.md) · [Current status](docs/STATUS.md).

## Contractor experience

Signed-in Contractor leads with company identity, a clear next action or next team, job eligibility, and a compact business onboarding journey. Documents and qualification run alongside one another; setup, training and activation explain their prerequisites. Readiness/operational facts, reviews, evidence versions, qualification decisions and activity history are independently expandable. Completed onboarding remains historical; additional skills are separate company activities. Existing actions, simulated login and shared workspace behavior are preserved. Iteration 3.10 removes only the YOUR COMPANY eyebrow and prominent simulation strip; fictional-data/authentication clarification and browser-storage status remain in the footer. Unity retains wider native lettering and slim strokes; original logo/favicons remain unchanged. See [Contractor design](docs/contractor-experience.md).

## Operations experience

Operations now uses the same navy/blue/slate foundation. My active work lists companies with Open work owned by the selected role; selecting a company reveals the existing action forms immediately. Rows show actual task counts, business activities and due/escalation facts. Completing the last owned action removes that company and clears its selection without choosing another company. All companies supports explicit investigation while preserving role execution limits. At mobile width, Choose a company exposes the list without crowding the working form.

A compact six-area business progress overview sits below the actions, with independent disclosures for requirements, evidence versions, decisions, qualification records, readiness and activity/messages. Work queue navigation retains all-role totals and secondary global inventory. Pending automation has a company/activity link to Monitor; technical inspection has a company-context Monitor link. Automations and retries still execute only there. No workflow, business, persistence or recorder changes; Monitor/Viz layouts are unchanged. See [Operations design and boundaries](docs/operations-experience.md).

## Demo Workspace

Workflow Monitor -> Demo Workspace (`#/monitor?view=workspace`) provides Save State, Load State, Reset Workspace, and three prepared business scenarios. Name and describe your own scenario, then save the full logical workspace as versioned JSON. Chrome's save picker is used when available; Download JSON is always available. IndexedDB remains live storage; sign-ins and tab preferences are not exported.

Load validates and previews the file before explicit replacement confirmation, offers a current-state backup, and restores atomically across tabs. Reset requires typing RESET. If another tab changes state during review, refresh the replacement review before confirming. Removed company selections require an explicit choice; no different company is silently signed in or substituted. Viz's active journey, pinned map, frames, causes, archives and processed identities restore together and continue through the existing workflow commands. No activities execute automatically.

Prepared scenarios use Summit Field Services, contractor email `alex@example.com`, simulation password `123`: Awaiting contractor documents, Verification failure, Ready for activation. The last remains Not eligible until you explicitly publish activation in Monitor -> Automations & Integrations. Scenarios are generated through real business commands in isolation, then validated before preview. Saved files preserve exact IDs/history when reloaded. New exports use workspace format 2 / Viz 2; original 3.6 format 1 / Viz 1 files remain supported through an explicit metadata upgrade. Business state stays schema 4; maximum file size is 50 MiB. See [portable workspace design](docs/workspace.md) and [actual status/results](docs/STATUS.md).

## Viz - Journey Map

Workflow Monitor includes Recording Triggers (`#/monitor?view=triggers`): name and explicitly enable a catalog rule to catch new applications, Recruitment approval, readiness, or skill requests. Matching and Frame 0 happen inside the committed command pipeline, including when Monitor is closed. Equivalent rules share one automatic recording per event/workflow scope and retain all matched rule names. No triggers are enabled on upgrade; no historical events are replayed. See [recording semantics](docs/viz-recording.md).

Journey Map supports independent simultaneous recordings, a filterable company/trigger/state browser, manual capture, individual Stop and automatic completion when the tracked root completes. Viewing and playback are local presentation state and never stop other captures. Group/expand real company and initial-skill lanes, inspect blockers, pan/zoom, or use presentation view. The v2 company adapter has 37 map nodes, including 16 activity types and their decisions/joins/routes; a standalone skill map has 9. No earlier visual history is synthesized. No commands run when every application tab is closed.

Shared Unity wordmark text uses a native sans-serif with wider lettering and slim strokes; the original logo/favicons are unchanged. The anonymous portal leads with Start a new application; sign-in remains secondary. The logical State.viz contract is unchanged; IndexedDB now stores business facts separately from incremental observer metadata and append-only frames. Auxiliary capture-storage failure reports a gap while valid business work and healthy recordings continue. Load/Reset remain atomic across all stores. See [observer storage](docs/observer-storage.md) and [STATUS](docs/STATUS.md) for actual results and limits. React Flow and Dagre remain presentation/layout dependencies. Chet review instructions/screenshots remain local-only in docs/chet.

Operations Contractor network defaults to **My active work**: companies with Open WorkItems owned by the selected role, with that role's count. **All companies** supports discovery without allowing another role's execution. Finishing the last owned task removes the company and clears its stale detail selection. Global work totals still include all participants. Collapsed Viz groups show unfinished applicable activity stages from the selected historical frame; correction loops, conditional routes and prerequisite join counts remain distinct. The 25-company/50-recording scale case starts with 650 frames and progresses across three tabs. Publication writes fell 76% in the measured sample; import remains a full-history operation.

Iteration 3.5.1 adds compact 154 x 44 activity nodes, independent business-area accents and execution symbols/fills, two-level automatic lane layout, changed-route illumination, a business change/next-owner summary, visible join counts, Follow changes, and Play/Pause with 0.5x/1x/2x playback. Turn Follow changes off to preserve your viewport. Rewinding keeps recording in the background and shows newer-frame availability. Details remain in node inspection. The recorder, pinned definitions, business rules, persistence and event contracts are unchanged. A clearly labeled 80-step synthetic layout fixture is test-only, not an executable workflow.

## Run

Node.js 24 recommended (validated with 24.13.1).

```sh
npm install
npm run dev -- --port 5174 --strictPort
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Vite prints the local URL, for this review http://127.0.0.1:5174/. Deploy `dist/` on any static host; relative asset paths support subdirectories and hash routes need no SPA rewrite. No environment variables or backend. Target Chrome on localhost or HTTPS; Web Locks and BroadcastChannel are required. Missing capabilities disable writes with an explanation.

`npm test` retains domain, workflow and React UI regressions using jsdom/fake-indexeddb. `npm run test:browser` builds production assets and runs Playwright with a temporary preview server on port 4173. Multiple pages in one Chromium context share the origin and IndexedDB. Install the Chromium test binary once as above. Screenshots and failure traces go to ignored `test-results/`.

## Three-tab walkthrough

Open these in three Chrome tabs in the same profile and exact origin (do not mix localhost/127.0.0.1, ports or schemes):

| Tab | URL                                | Experience                                                                    |
| --- | ---------------------------------- | ----------------------------------------------------------------------------- |
| 1   | http://127.0.0.1:5174/#/contractor | Contractor Portal: Your journey, Required actions, Messages                   |
| 2   | http://127.0.0.1:5174/#/operations | Onboarding Operations: internal role, human work queues, automation discovery |
| 3   | http://127.0.0.1:5174/#/monitor    | Workflow Monitor: automations, integrations, execution diagnostics            |

Operations company records link to Monitor diagnostics and pending automation; Monitor retains links to the other experiences. Internal role and company selection are in sessionStorage for that tab/experience. Contractor and Monitor have no role selector. Contractor has no worker controls, monitor tools, ingress tests, timers or internal outbox.

Submit in Tab 1. Tab 2 receives Recruitment work; Tab 3 opens Automations & Integrations; choose Workflow monitor to inspect execution diagnostics. Sign in to Contractor with the application email and simulation password 123, choosing a company if the email matches several. Proceed in Recruitment; Tab 1 receives evidence requests. Submit an expired license, verify as Compliance in Tab 2, and watch correction work appear in Tab 1 and its trace in Tab 3. Replace with valid evidence and verify again. Field Manager approves the skill. Finish administration, vendor, portal and training as below. All tabs reach Ready without refreshing; revision indicators converge on the committed revision.

Each tab reloads authoritative state on change notification and again on focus, visibility return and pageshow, recovering missed notifications. No tab runs a background workflow dispatcher.

## Happy-path walkthrough

Use fictional names and example.com emails. Document submission uses predefined fictional fixtures, with no file upload, bank account, tax ID or identity number fields.

1. **Contractor:** New application, select HVAC or Plumbing, submit. Sign in using that email and simulation password 123; duplicate emails require an explicit company choice.
2. **Recruitment:** Select the company in My active work, then record Proceed in Your actions. Administrative and skill work start in parallel.
3. **Contractor:** Submit three administrative packs and license evidence. Choose Valid simulated document.
4. **Compliance:** Run insurance and license verification.
5. **Finance:** Run fictional financial verification.
6. **Contractor Relations:** Run simulated agreement execution.
7. In **Operations**, Work queue -> Automations & Integrations opens the Monitor automation queue. After administrative approvals, explicitly run **Create vendor record** there. Simulations make no external calls.
8. **Field Manager:** Approve skill; this can occur before or after administration.
9. **Contractor:** Complete portal setup, then initial training.
10. **Training:** Confirm initial training.
11. Policy derives **Ready** while operational status remains Pending and jobs remain Not eligible. In **Workflow Monitor -> Automations & Integrations**, explicitly run **Publish contractor activation**. Historical onboarding becomes Completed, operational status Active, and jobs Eligible.

Contractor → Your journey and Operations → Overview show relevant facts, requirements, skills, notes and evidence versions. Required actions and Work queue show participant work. Operations Work queue expands participant counts across all companies. Its parent count always includes every open item, regardless of role/company filtering; completed/cancelled work is excluded. Automations & Integrations navigates to Monitor for vendor setup and activation publication; individual work cards and eligibility guidance carry company/activity context. Operations has no system execution controls. Contractor work is visible there but completed in the signed-in portal. Workflow Monitor opens with pending automations and failed verification retries across companies; its Workflow monitor view selects company/skill executions independently. Supporting diagnostics, ingress tools and timers launch collapsed; expand their title buttons to use them. Status, history and event activity stay visible. These are separate views, not access control. Contractor sign-in stores only a company ID in tab-local sessionStorage. Sign Out changes no business facts. Anonymous visitors see application confirmation and sign-in, not existing company records.

## Exception and operations scenarios

| Scenario                      | UI behavior                                                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screening information request | Recruitment requests details with a reason; Contractor responds; review resumes on the same instance.                                                                       |
| Decline                       | Required reason; close without administrative/skill work.                                                                                                                   |
| Missing prerequisite          | Leave any administrative approval missing: no vendor. Leave training or first skill incomplete: no readiness.                                                               |
| Expired license               | Submit Expired simulated document; Compliance verifies; Contractor receives a specific replacement task; submit Valid and verify again. Same qualification, retained v1/v2. |
| Other corrections             | Expired/incomplete insurance, financial or agreement evidence repeats the same correction/review pattern without losing other approvals.                                    |
| Failure / recovery            | Inject a timeout on any simulated integration. Failed attempt persists, no business outcome; retry in Monitor -> Automations & Integrations continues the same task.        |
| Durable waiting               | Refresh while work is open; return to its company/persona. Evidence, events, waits, tasks, attempts and history persist.                                                    |
| Timer / escalation            | Workflow monitor → Advance 3 days → Advance 2 days. Outbox shows reminders and escalations for overdue human work.                                                          |
| Skill expansion               | After activation, Contractor → Overview → Add another company skill. Independent workflow, no repeated company setup.                                                       |
| Skill rejection               | Field Manager rejects with reason. Only that skill closes; another approval preserves readiness.                                                                            |
| Readiness reevaluation        | Compliance → Overview → Invalidate approval with reason. Sole approval lost → Not ready and Suspended. Another approval → still Ready.                                      |
| Event protection              | Workflow monitor → redeliver last event or unrelated correlation; no business/work/history mutation.                                                                        |

## Architecture

- `src/domain.ts`: company facts, company-owned qualifications, requirements, evidence, work, typed events, known definitions and policies.
- `src/companyLifecycle.ts`: company readiness/operational policy outside completed onboarding; no suspension removal.
- `src/LifecycleStatus.tsx`: four distinct lifecycle values shared by all experiences.
- `src/application.ts`: use cases/queries, repository and integration ports, simulated integrations, command serialization, IndexedDB adapter.
- `src/orchestration.ts`: orchestration port and bounded browser adapter. Explicit CompanyOnboarding v2 and SkillQualification v2 transitions, correlation, deduplication, expected-work validation and history.
- `src/migration.ts`: versioned Iteration 1 snapshot migration.
- `src/coordination.ts`: command coordination and notification port; unavailable default rejects writes.
- `src/browserCoordination.ts`: exclusive Web Locks and revision-only BroadcastChannel notifications.
- `src/runtime.ts`: production repository/service/coordinator wiring.
- `src/useWorkspace.ts`: authoritative reload on notification/focus/visibility/pageshow; older reads cannot replace a newer revision.
- `src/experiences.ts`: hash routes and internal role catalog.
- `src/App.tsx`, `TaskCard.tsx`, `WorkflowMonitor.tsx`: presentation only; business actions go through use cases, never direct readiness/workflow setters.

A command acquires the database's exclusive Web Lock, reloads the latest snapshot, evaluates business events, increments revision, and atomically saves facts, tasks, attempts, outbox and history. After transaction completion and lock release it publishes only `{type: 'committed', revision}`. Receiving tabs reload IndexedDB; notifications never execute transitions or supply domain state. Invalid commands and duplicate/unrelated events do not save, increment revision or notify. Technical timeouts save failed attempts without successful business events. The shared lock coordinates all tabs; a local queue preserves call order in a tab.

Ingress checks company/application/qualification, correlation and expected open work. Business events, activity attempts, human completion records and orchestration history are distinct. IntegrationPort represents worker/external-system execution; OrchestrationPort is replaceable. No activity HTTP APIs or general-purpose workflow engine.

This illustrates Temporal concepts; it is not Temporal or production durability.

## Existing data

Database `fieldwork-onboarding`, store/key and origin stay unchanged. Migration persists on opening and retains company/application/qualification IDs, responses, business events, workflow/correlation IDs, review work and history. Running company instances upgrade to v2 with a migration trace; planned placeholders become actionable tasks. Existing free-text skills remain usable; new requests use HVAC/Plumbing. Closed declines retain historical v1.

Later-stage facts were not completable in Iteration 1; the new participant process establishes them rather than inferring approvals from planned work. Browser data is scoped to scheme/host/port: keep the same origin.

Iteration 3 introduced snapshot schema 3 and a shared revision. Iteration 3.1 uses schema 4: legacy application Ready becomes historical Completed, invalid open work on completed company executions is Cancelled, and historical suspension is retained. Original events and execution history are preserved. Migration runs only under the shared lock, never during ordinary reads. Opening an experience commits initialization and increments the revision without replaying workflows.

## Product handoff

- [Domain UML](docs/domain.md)
- [Company and skill processes](docs/processes.md)
- [Event catalog](docs/events.md)
- [Rule catalog](docs/rules.md)
- [Assumptions and unresolved questions](docs/assumptions.md)
- [Shared-browser architecture and test coverage](docs/shared-browser.md)

## Limits

Concurrent tabs on the same exact origin/profile are supported. There is no cross-browser/profile/device synchronization. Close tabs running any older release before using the latest release: old code does not understand the current schema/lifecycle rules. Browser data can be cleared/evicted. Fixtures determine verification, not real document/legal/financial rules. No live training, actual signature, portal account, external messages, automatic expiry or reinstatement journey. Timers run on simulated time advancement only. A rejected first skill leaves company onboarding waiting; recovery policy remains a discovery question.

No real authentication, payments, backend, hosted persistence, C#/.NET or hosting deployment. Simulation sign-in is not a security boundary. Source is published at https://github.com/dblath/onboarding on main.

Operations Overview and Contractor Your journey explain unsatisfied requirements, next participants, pending activation and suspension. Zero work for one role does not mean all company work is complete. Ready remains Not eligible until explicit activation publication in Workflow Monitor -> Automations & Integrations. [Current status](docs/STATUS.md). Detailed Iteration 3.4 acceptance and screenshots are local-only under docs/chet; older acceptance documents retain historical UI locations.
