# Fieldwork — Contractor onboarding, Iteration 3.3

End-to-end product discovery prototype: contractor application, screening, administrative approvals, independent skill qualification, vendor provisioning, portal, training, readiness and activation. Browser-only persistence and simulated integrations. Demo company sign-in uses the application email and password 123. No backend, real authentication or live services.

Historical onboarding completion, current readiness and operational status are separate. Job eligibility requires Ready AND Active. Restoring qualifications never removes a suspension. [Operations queue acceptance](docs/acceptance-3.3.md) / [Iteration 3.2 UX acceptance](docs/acceptance-3.2.md) / [Lifecycle acceptance](docs/acceptance-3.1.md) · [Current status](docs/STATUS.md).

## Run

Node.js 24 recommended (validated with 24.13.1).

```sh
npm install
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Vite prints the local URL, normally http://127.0.0.1:5173/. Deploy `dist/` on any static host; relative asset paths support subdirectories and hash routes need no SPA rewrite. No environment variables or backend. Target Chrome on localhost or HTTPS; Web Locks and BroadcastChannel are required. Missing capabilities disable writes with an explanation.

`npm test` retains domain, workflow and React UI regressions using jsdom/fake-indexeddb. `npm run test:browser` builds production assets and runs Playwright with a temporary preview server on port 4173. Multiple pages in one Chromium context share the origin and IndexedDB. Install the Chromium test binary once as above. Screenshots and failure traces go to ignored `test-results/`.

## Three-tab walkthrough

Open these in three Chrome tabs in the same profile and exact origin (do not mix localhost/127.0.0.1, ports or schemes):

| Tab | URL                                | Experience                                                                |
| --- | ---------------------------------- | ------------------------------------------------------------------------- |
| 1   | http://127.0.0.1:5173/#/contractor | Contractor Portal: Your journey, Required actions, Messages               |
| 2   | http://127.0.0.1:5173/#/operations | Onboarding Operations: internal role, work queue, approvals, provisioning |
| 3   | http://127.0.0.1:5173/#/monitor    | Workflow Monitor: instances, events, rules, retry, timers                 |

Operations and Monitor have links to open the other experiences in new tabs. Internal role and company selection are in sessionStorage for that tab/experience. Contractor and Monitor have no role selector. Contractor has no worker controls, monitor tools, ingress tests, timers or internal outbox.

Submit in Tab 1. Tab 2 receives Recruitment work; Tab 3 shows the instance automatically. Sign in to Contractor with the application email and demo password 123, choosing a company if the email matches several. Proceed in Recruitment; Tab 1 receives evidence requests. Submit an expired license, verify as Compliance in Tab 2, and watch correction work appear in Tab 1 and its trace in Tab 3. Replace with valid evidence and verify again. Field Manager approves the skill. Finish administration, vendor, portal and training as below. All tabs reach Ready without refreshing; revision indicators converge on the committed revision.

Each tab reloads authoritative state on change notification and again on focus, visibility return and pageshow, recovering missed notifications. No tab runs a background workflow dispatcher.

## Happy-path demo

Use fictional names and example.com emails. Document submission uses predefined fictional fixtures, with no file upload, bank account, tax ID or identity number fields.

1. **Contractor:** New application, select HVAC or Plumbing, submit. Sign in using that email and demo password 123; duplicate emails require an explicit company choice.
2. **Recruitment:** Work queue → Proceed. Administrative and skill work start in parallel.
3. **Contractor:** Submit three administrative packs and license evidence. Choose Valid demo document.
4. **Compliance:** Run insurance and license verification.
5. **Finance:** Run fictional financial verification.
6. **Contractor Relations:** Run simulated agreement execution.
7. In **Operations**, run scheduled **vendor provisioning** under Work queue -> System Activities after all administrative approvals. The panel represents a worker and is available to internal roles.
8. **Field Manager:** Approve skill; this can occur before or after administration.
9. **Contractor:** Complete portal setup, then initial training.
10. **Training:** Confirm initial training.
11. Policy derives **Ready** while operational status remains Pending and jobs remain Not eligible. In **Operations**, open Work queue -> System Activities and run initial activation publication. Historical onboarding becomes Completed, operational status Active, and jobs Eligible.

Contractor → Your journey and Operations → Overview show relevant facts, requirements, skills, notes and evidence versions. Required actions and Work queue show participant work. Operations Work queue expands participant counts across all companies. Its parent count always includes every open item, regardless of role/company filtering; completed/cancelled work is excluded. Select System Activities for vendor setup and activation publication. Contractor work is visible there but completed in the signed-in portal. Workflow Monitor selects company/skill instances independently. Supporting diagnostics, ingress tools and timers launch collapsed; expand their title buttons to use them. Status, history and event activity stay visible. These are separate views, not access control. Contractor sign-in stores only a company ID in tab-local sessionStorage. Sign Out changes no business facts. Anonymous visitors see application confirmation and sign-in, not existing company records.

## Exception and operations demos

| Scenario                      | UI behavior                                                                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screening information request | Recruitment requests details with a reason; Contractor responds; review resumes on the same instance.                                                                  |
| Decline                       | Required reason; close without administrative/skill work.                                                                                                              |
| Missing prerequisite          | Leave any administrative approval missing: no vendor. Leave training or first skill incomplete: no readiness.                                                          |
| Expired license               | Submit Expired demo document; Compliance verifies; Contractor receives a specific replacement task; submit Valid and verify again. Same qualification, retained v1/v2. |
| Other corrections             | Expired/incomplete insurance, financial or agreement evidence repeats the same correction/review pattern without losing other approvals.                               |
| Failure / recovery            | Inject a timeout on any simulated integration. Failed attempt persists, no business outcome; Retry continues the same task.                                            |
| Durable waiting               | Refresh while work is open; return to its company/persona. Evidence, events, waits, tasks, attempts and history persist.                                               |
| Timer / escalation            | Workflow monitor → Advance 3 days → Advance 2 days. Outbox shows reminders and escalations for overdue human work.                                                     |
| Skill expansion               | After activation, Contractor → Overview → Add another company skill. Independent workflow, no repeated company setup.                                                  |
| Skill rejection               | Field Manager rejects with reason. Only that skill closes; another approval preserves readiness.                                                                       |
| Readiness reevaluation        | Compliance → Overview → Invalidate approval with reason. Sole approval lost → Not ready and Suspended. Another approval → still Ready.                                 |
| Event protection              | Workflow monitor → redeliver last event or unrelated correlation; no business/work/history mutation.                                                                   |

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

No real authentication, payments, backend, hosted persistence, C#/.NET or hosting deployment. Demo sign-in is not a security boundary. Source is published at https://github.com/dblath/onboarding on main.


Operations Overview and Contractor Your journey explain unsatisfied requirements, next participants, pending activation and suspension. Zero work for one role does not mean all company work is complete. Ready remains Not eligible until Operations explicitly publishes activation. [Current queue acceptance and investigation](docs/acceptance-3.3.md).
