# Workflow Monitor — Iteration 3.12

## Iteration 3.13 cleanup

The 3.12 business-first structure below remains accepted. The existing Demo Workspace left-nav destination is labelled **Workspace**, retaining view=workspace and all portable-state functionality. Automations & Integrations aligns with peer labels; one actual separator follows the existing onboarding entry. No duplicate links.

`recordingSelection.ts` resolves actual availability: prefer matching workflow, then another capture for the same company; never an unrelated company fallback. A missing explicit/remembered identity stays unavailable. A company without capture offers “No recordings for this company” and All companies; “No recordings yet” is reserved for a globally empty collection. All capture sources/statuses remain selectable.

Defaults are pinned once in the presentation URL so the existing epoch-keyed renderer remount cannot adopt another workspace's recording. Explicit choices use epoch/company/workflow preferences in tab-local sessionStorage, excluded from exports. Monitor mounts a destination after matching route context arrives and gates Journey Map by its actual route; an old-context default cannot overwrite navigation. Selection does not execute capture/business commands or move another tab. Invalid previous company selection remains explicit on return to Viz.

Recording-browser/information/control/history surfaces, selected rows, lanes and completed-node illumination use blue/slate. Genuine success icons/badges/completed edges remain green; waits/errors retain amber/red. Original logo/wordmark, canvas geometry and recording contracts are unchanged. See [actual evidence](STATUS.md).

Monitor starts with an operational picture of onboarding. Contractor helps a company complete its work; Operations helps human teams act; Monitor explains progress and attention. Automations & Integrations executes explicit test integrations/retries/publication. Journey Map / Viz visualizes actual recordings. These are presentation responsibilities, not security boundaries.

## Business overview and journey selection

`src/monitorModel.ts` is a pure read projection of authoritative State. In progress counts Running CompanyOnboarding roots, not every skill workflow. Need attention counts companies with actual correction-required requirements/qualifications, latest failed attempts on Open WorkItems, pending activation publication, suspension, an unmet qualification after rejection/invalidation, or a recorded capture issue. Normal participant waiting is not a failure. Retry count excludes closed work and superseded failed attempts. Ready for activation requires domain readiness plus an Open PublishActivation WorkItem. Completed counts historical Completed applications. Recording now uses the existing recording-status function. There is no history-text classification, new queue, persisted read model or invented completion percentage.

`src/MonitorWorkspace.tsx` defaults to Active & attention companies; All companies explicitly exposes completed/history. Active includes Running company roots, Running independent qualifications and companies needing attention. Changing a filter does not substitute another company. Missing/stale selection has a useful chooser. At 390px Choose a company expands the list; at desktop it remains alongside the selected journey.

Company identity/status precedes a business-labelled company/initial-skill/independent-skill selector. Company work includes initial qualification work in parallel; an independently selected skill displays only its own Open work. Six existing prerequisite-aware company progress areas remain available. Independent qualifications list their current owners and a View qualification action, while completed company onboarding stays complete.

Attention uses actual requirements, qualifications, attempts and lifecycle facts. Ready/Pending explicitly explains that activation is unpublished and eligibility is unavailable. Failed work links to the exact automation; no retry or publication command appears in the business overview. Suspension/recovery limitations remain honest. Business chronology maps typed event payloads to readable changes, preserving committed array order (newest first); it does not interpret execution-history strings. The latest six changes are visible; earlier changes are disclosed separately without duplicating those six.

## Technical investigation and context

Technical execution inspection is collapsed on normal launch. The existing WorkflowMonitor retains definition/version/state, full rule/execution history and filters, original envelopes and IDs, correlation, attempts, expected events/waits, and all completed/pending WorkItems. Original raw records are not rewritten. Inner diagnostic panels remain independently expandable. Explicit `view=inspection` links open this investigation directly. Existing ingress demonstrations and clock/escalation tools remain behind the technical disclosure and require deliberate action.

Contextual routes:

| Intent               | Hash route                                                        |
| -------------------- | ----------------------------------------------------------------- |
| Business overview    | `#/monitor` or `#/monitor?view=onboarding&company=ID&workflow=ID` |
| Technical inspection | `#/monitor?view=inspection&company=ID&workflow=ID`                |
| Automation action    | `#/monitor?view=automations&company=ID&activity=ID&workflow=ID`   |
| Exact recording      | `#/monitor?view=journey&company=ID&workflow=ID&recording=ID`      |
| Portable workspace   | `#/monitor?view=workspace`                                        |

Recorded journeys lists every capture point for the company, including mid-workflow recordings. A recording link selects its exact recording and workflow. Without a recording ID, company/workflow context resolves to the latest matching recording. Missing linked recording stays unavailable; navigation does not create one. Initial contextual binding happens once per workspace/context so another tab starting capture does not move the viewer. Explicit recording selection updates presentation context and its URL only; it does not change the persisted active capture or any frames. A deliberate manual capture also puts the newly created recording in the presentation URL. After importing a workspace that removes the linked company, choosing a restored recording explicitly establishes the new context; later refresh/restore can retain that selection. Recording browser starts with the contextual company, with All companies still available for fleet investigation.

No graph canvas, map definition, recorder, triggers, lineage, cause, frame projection or observer-storage contracts change. Pan/zoom/grouping/playback and simultaneous recording/observer failure isolation are retained.

## Contractor refinements

Mobile Contractor navigation wraps instead of clipping the New application entry. The original image's proportional sizing and accepted wordmark remain intact.

`src/qualificationChoices.ts` mirrors the existing requestSkill duplicate guard. Approved or outstanding same-skill qualifications disable that choice with a reason; the first available choice is selected. When none remain, the selector and request button are disabled. Rejected/Invalidated qualifications permit a new request only through the existing Ready + Active visibility/command guard. A different approved skill must still support readiness where applicable. No recovery or suspension-removal policy is introduced.

## Evidence and limitations

`src/monitorModel.test.ts` checks fact-based summaries, independent workflow distinction, normal-wait classification and non-mutation. `src/qualificationChoices.test.ts` exercises the actual duplicate/rejected/invalidated command paths. `tests/fixtures/monitorStates.ts` builds review workspaces through normal commands; `tests/browser/monitor-business.spec.ts` covers all eight requested situations, raw diagnostics, exact mid-workflow recording selection, independent viewers/new captures, explicit retry/publication across tabs, qualification choices/requalification and 1440/390 layouts. Inspection compares complete authoritative snapshots, including Viz. Fresh-tab initialization is completed before the comparison because the existing initialization command increments revision.

Older execution-focused test helpers now explicitly open inspection. The product default is tested directly, not through that helper. Fleet-recording tests explicitly choose All companies where contextual navigation would otherwise filter them. Existing lifecycle, portable-workspace, synchronization, recorder and layout acceptance remains required; actual results are in [STATUS](STATUS.md).

No new dependency, font, asset, domain event, workflow transition, readiness, authentication or persistence change. The shared App still contains legacy presentation branches; this iteration adds a bounded Monitor presentation component rather than broad shell refactoring. Pure projection uses in-memory array scans, not a scalable server query layer. Long histories remain unbounded and portable-state/storage limits are unchanged. Formal accessibility, Firefox/Safari, non-Windows rendering and exhaustive device testing remain outside executed acceptance.

Detailed screenshots, normal-command review files and Chet handoff remain local-only under `docs/chet/`. Stop for product review; no Iteration 4, designer or field-service expansion.
