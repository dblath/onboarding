# Onboarding Operations — Iteration 3.10

Operations now starts with the selected team's work: find the company, see the action, complete it. The Contractor Portal's accepted navy/blue/slate foundation supplies the shared visual language. Monitor and Viz retain their existing layouts.

## Work and discovery

`OperationsWorkspace.tsx` renders a two-column working surface at desktop width. The left list uses the existing App network filter: My active work includes only companies with **Open WorkItems owned by the selected internal role**, across all workflow roots. Each row shows the business activity, role-owned count, actual due date and escalation flag where present. Dates compare against the simulation clock, not an invented urgency score.

Selecting a company shows its owned forms immediately. Existing `TaskCard` handlers call the same service commands. Completion refreshes the authoritative list; the previous Iteration 3.8 selection protection clears a company when its last owned task disappears, without silently substituting a different company. An explicit All companies option supports investigation and keeps forms restricted to the selected role.

At 390px the company list is available through Choose a company, while the working action takes priority. The role selector, scope buttons and company identity remain available. Native form controls retain their original validation and command behavior.

The expandable Work queue sidebar retains all-role totals. Selecting a human participant selects that execution role. All participants and Contractor show the existing global inventory as an explicit secondary discovery mode; it replaces the main working grid while open, rather than duplicating forms. Return to my work returns to the selected team's working surface. Global count semantics are unchanged.

## Business progress and records

The pure `contractorJourney.ts` adapter is reused for company/application facts and the six business areas: Application review, Company documents, Skill qualification, Company setup, Initial training and Activation. Operations adapts the captions to the selected internal team. Documents and skills remain parallel; prerequisites are described without a fabricated percentage or numbered linear sequence.

Independent native disclosures expose screening decisions/responses, requirements and review outcomes, every evidence version, initial/additional qualifications and reasons, setup/training facts, activity ownership and dated completed/cancelled history. Company facts & readiness keeps historical onboarding, current readiness, operational status and eligibility distinct. Messages & activity history exposes the existing company outbox and business work history. Compliance's existing approved-skill invalidation command remains available in qualification details; no recovery or suspension-removal shortcut is introduced.

Ready/Pending activation remains Not eligible. A company-level note links directly to its pending automation in Monitor. Internal attempts, event envelopes, correlation and execution history are accessed through contextual Monitor links, rather than copied into Operations. The new `view=inspection&company=...` Monitor link selects the existing diagnostic view and company; it does not change workflow or observer state. Automated execution and retries remain explicitly user-triggered there.

## Presentation boundaries

- `src/App.tsx`: shell, existing role/company/scope preferences, authoritative workspace hook and route wiring.
- `src/OperationsWorkspace.tsx`: business presentation and pure role-owned attention grouping.
- `src/operations.css`: scoped Operations geometry, controls, disclosures and responsive layout.
- `src/TaskCard.tsx`: optional Operations business notices, compact technical-failure signpost, timeout injection under Simulation options. Existing commands, attempts and Monitor controls are preserved.
- `src/presentation.ts`: contextual inspection URL parsing alongside existing automation links.
- `src/ContractorPortal.tsx`: only removal of YOUR COMPANY eyebrow. App moves Contractor's prominent simulation strip into a discreet footer clarification/live-storage indicator for both anonymous and signed-in views.

No domain, lifecycle, workflow definition, event contract, authentication, persistence, synchronization, portable workspace or Viz recorder changes. No dependency, font or logo asset changes. Unity retains the prior native width 95 / weight 450 treatment and the unmodified supplied image/favicons.

## Evidence and limits

`src/operationsWorkspace.test.ts` checks pure grouping across company and skill roots without mutation. `tests/fixtures/operationsState.ts` creates a five-company review fleet through normal business commands, including parallel Compliance work and Ready/Pending activation. `tests/browser/operations-first.spec.ts` exercises work completion without substitution, correction/history, role-only execution, empty roles, global counts, 1440/390 layouts, keyboard disclosures, mobile company selection, contextual Monitor navigation, three-tab publication and the Contractor cleanup.

Retained browser tests select the new company list and disclosures instead of the removed Overview tabs/redundant scope selector. Existing state, event, recording and concurrency assertions remain. Actual executed results are in [STATUS](STATUS.md).

This is still a browser simulation. There is no formal accessibility certification, broad browser/device acceptance, server, real authentication or live integration. Deep links select a company and the existing Monitor diagnostics; they do not select an individual historical event. Historical acceptance guides may describe older UI labels. Detailed product-review fixtures, screenshots and handoff stay local-only under `docs/chet/`.
