# Onboarding language — Iteration 3.11

Normal onboarding UI uses business labels and demo/test wording where needed. Prominent environment banners are removed. Every experience retains the discreet footer: “Demo environment · Sample data only · No real authentication or external services.” Live browser-storage/revision status moves to that footer; it still updates across tabs.

## Display adapters, not contract changes

`src/presentation.ts` retains the exact existing `activityLabel` and `simulationMessage` implementations because Viz definition/recording creation already imports them. Changing their outputs would change newly pinned definitions and recorded explanations. New UI-only `businessActivityLabel`, `businessMessage` and `businessText` adapters handle current display. Recorder, definition adapter, causes, frame semantics, persisted facts and export/import formats remain unchanged.

`businessActivityLabel` translates known activities, including contractor agreement and company profile. `businessMessage` translates recognized system outcomes, review instructions, waiting explanations and generated reminders/escalations. Unknown free text remains unchanged. `businessText` is used for controlled labels, fixture descriptions and integration actors. It must not be applied to company names, scenario names, user decisions or other arbitrary free text. User content may legitimately contain any word; this iteration does not rewrite it.

Legacy stored fixture values, role identifier `Simulation`, command/event names, CSS classes and test IDs remain intact. Visible option labels can say “sample document” while the original option value remains `Valid demo document`. Integration execution is still explicitly user-triggered, makes no external call and presents Test outcomes/Run test verification. No new automatic behavior.

## Faithful technical inspection

Workflow Monitor's execution history, raw event envelopes and activity-attempt records preserve original text. Journey Map's Recording scope & causation preserves causes. Events & execution references additionally exposes the selected original node definition/state as JSON. These explicit raw regions carry `data-raw-records` for acceptance tests; ordinary labels and explanations outside them use display adapters. Raw records are neither scrubbed nor edited on import/export.

## Focused UX changes

- Operations keeps the accepted 3.10 role-owned company/action structure, discovery and global totals, without the prominent environment strip.
- Contractor landing keeps its one primary Start a new application button and secondary existing-company sign-in. The duplicate title-row button is removed. Email/Password remain visible labels with original input types; credentials and duplicate-company selection are unchanged.
- Request qualification uses the established solid blue primary style, shared hover/focus/disabled states and mobile stacking. The exact original Ready + Active visibility rule and existing request command are retained. The skill section has one primary action.
- Application CTA respects the existing unavailable/loading state. No authentication/session behavior or business policy changed.

## Evidence and boundaries

`src/presentation.test.ts` freezes legacy helper outputs and checks current labels, generated messages, case variants, unknown free text and source-record preservation. `tests/browser/onboarding-polish.spec.ts` scans visible ordinary text, option labels, accessible names, placeholders and tooltips across Contractor, Operations and all six Monitor destinations plus load/reset dialogs. Explicit raw regions are exceptions and are checked against saved source text. It tests keyboard focus, hover, actual lock-blocked disabled behavior, 1440/390 layout, unchanged inspection snapshots, an actual new qualification and an unchanged completed onboarding root.

All prior workflow, lifecycle, multi-tab, portable workspace and observer suites remain. No new font, asset, dependency, field service, scheduling, dispatch, Iteration 4 or Monitor redesign. Final executed counts/publication are in [STATUS](STATUS.md). User-generated wording and raw technical history are intentional exceptions to the normal UI vocabulary audit.
