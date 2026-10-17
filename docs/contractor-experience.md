# Contractor experience — Iteration 3.9

The signed-in Contractor Portal answers: where does my company stand, what do I need to do, and who is working next? It presents existing facts and commands; it is not a new workflow projection or a new source of truth.

## HomeItem reference, read-only

Inspected `C:\Users\david\Documents\Repositories\homeitemV2fe`, commit `c9a357c82301275d773504fd3c9141831e03857d`. No files, dependencies or processes in that repository were changed. Source references:

- `src/app/App.tsx`: compact application identity, restrained navy navigation, small contextual/status chrome.
- `src/styles/global.css`: cool slate `#f3f6f8`, white surfaces, ink `#17222c`, blue actions `#205f98` / hover `#174a77`, border `#d8e0e6`, deliberate typography, status dots, 38px-plus controls, responsive stacking. Our muted text is slightly darker (`#526575`) for small-text contrast.
- `src/features/catalog/CatalogPage.tsx`: clear page heading/action hierarchy and compact business statuses; discovery and inspection have distinct purposes.
- `src/features/editor/HomeItemWorkspace.tsx` and global styles: on-demand lifecycle/version/technical menus and inspection sections, native disclosure, readable forms, narrow-screen single-column behavior.

Adopted the palette, borders, working-product hierarchy, concise status-plus-symbol treatments, clear primary/secondary controls and progressive disclosure. The Contractor layout retains Unity's sidebar and its complete orange logo. It does not copy HomeItem's horizontal navigation literally, split-pane editor tree, catalog tables, Designer/Approver roles, dirty-state model, business lifecycle, API layer or component hierarchy. A contractor journey needs a business overview and actions rather than an authoring workbench.

## Three levels

1. **What matters now:** company identity/contact, plain-English headline, job eligibility, one recommended action with the count of other available actions, or the real next actions/owners when the contractor has no work. Corrections sort first. No assumed future WorkItems. New applications remain available through secondary navigation.
2. **Business journey:** Application review; Company documents and Skill qualification alongside each other; Company setup, Initial training and Activation with explicit prerequisite explanations. No invented percentage or numbered linear sequence. Text and icons distinguish Complete, Waiting on you, Waiting on another team, Requires correction, Blocked and Not yet started.
3. **Details when requested:** independent native disclosures for current readiness/operational facts, document reviews, qualification history, every submitted evidence version, decisions/reasons/responses and activity history. Current readiness is separate from historical completion. Messages remain intentional navigation. Raw event envelopes, internal record IDs, correlation and orchestration diagnostics remain internal Monitor content.

Required actions reuses the existing TaskCard forms and service commands. Only their Contractor success notices use business wording. No evidence fixtures, ownership, command payloads, sign-in rules or workflow transitions changed. Pending activation shows Operations ownership and never exposes the publication control to Contractor.

`contractorJourney` is a pure display adapter over current company/application/qualification/requirement facts and Open WorkItems. A completed application's six onboarding sections stay historical Complete after later qualification changes. New qualifications render under separate company activity. Current suspension/readiness still controls eligibility and the top warning; historical completion cannot override it.

## Theme and wordmark

`src/theme.css` adds shared blue/slate tokens and foundational controls. It changes shared colors and focus/disabled treatments in Operations/Monitor, not their layouts, queues or navigation. Viz execution colors remain semantically distinct and its CSS/recording implementation is unchanged. `src/contractor.css` scopes the new layout, denser records, disclosures and mobile styles to Contractor.

Unity text keeps the existing local Bahnschrift face at weight 450. Its `wdth` axis changes from 75 to **95**, with matching `font-stretch: 95%`; no `scaleX`, transformed lettering or new font dependency. Fallback is Bahnschrift/Segoe UI/sans-serif rather than a deliberately condensed fallback. The complete original PNG and transparent-padded favicons are byte-for-byte unchanged. The Contractor chrome displays the image at 62px desktop / 36px mobile width with proportional height; other experiences retain their sizing.

## Verification and limits

`src/contractorJourney.test.ts` runs real business-command fixtures through submitted, active work, correction, waiting for teams, pending activation, eligible, separate skill and later suspension states. It verifies parallel work, historical completion/current readiness separation and nonmutation.

`tests/browser/onboarding-first.spec.ts` renders the seven requested states at 1440 × 1000 and 390 × 844, checks overflow and above-fold Continue, independently expands details with Enter/Space, verifies keyboard focus and computed text/background contrast, checks no internal activation control, preserves authoritative state during inspection, and executes the existing evidence form. `tests/browser/fishing-net.spec.ts` checks actual native font selection, width-axis settings, greater rendered glyph width and absence of transforms. Existing lifecycle, multi-tab, login, branding pixel/proportion, Save/Load, observer-failure and Viz suites remain.

This is not a formal accessibility audit. Contrast sampling covers representative body/status/action/navigation/disabled/disclosure text, not every pixel or every internal diagnostic. Native details provide keyboard behavior; labels/icons supplement color. Mobile journey sections intentionally stack and supporting history can be long when opened. Non-Windows font fallback, actual OS file-picker dialogs, assistive-technology combinations and business copy still require manual acceptance. The CSS keeps a scoped adaptation layer over the existing shared stylesheet rather than refactoring the whole application.

Actual executed counts, build, audit and publication: [STATUS](STATUS.md). Four representative screenshots plus the complete seven-state capture set and portable review fixtures remain local-only under `docs/chet/`.
