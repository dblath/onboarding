# Contractor experience — Iteration 3.9

Iteration 3.13 retains this design and its business behavior. For completed onboarding, the existing Grow your company's skills section/form now precedes history, after company identity/current eligibility. Ready + Active visibility, skill choices and independent qualification commands remain. In-progress layout is unchanged. Anonymous landing removes the duplicate page heading/subtitle and reserves its original introductory footprint; the main-panel introduction/sign-in/CTA remain, and starting an application retains its contextual heading. The current neutral Unity mark and portable wordmark preserve semantic status colors. See [current evidence](STATUS.md).

The signed-in Contractor Portal answers: where does my company stand, what do I need to do, and who is working next? It presents existing facts and commands; it is not a new workflow projection or a new source of truth.

## Design principles

Cool slate surfaces, navy navigation, blue actions, readable forms, native disclosures and compact business statuses support a working application. The Contractor layout keeps the shared Unity fieldwork identity and presents company progress and available actions before detailed history.

## Three levels

1. **What matters now:** company identity/contact, plain-English headline, job eligibility, one recommended action with the count of other available actions, or the real next actions/owners when the contractor has no work. Corrections sort first. No assumed future WorkItems. New applications remain available through secondary navigation.
2. **Business journey:** Application review; Company documents and Skill qualification alongside each other; Company setup, Initial training and Activation with explicit prerequisite explanations. No invented percentage or numbered linear sequence. Text and icons distinguish Complete, Waiting on you, Waiting on another team, Requires correction, Blocked and Not yet started.
3. **Details when requested:** independent native disclosures for current readiness/operational facts, document reviews, qualification history, every submitted evidence version, decisions/reasons/responses and activity history. Current readiness is separate from historical completion. Messages remain intentional navigation. Raw event envelopes, internal record IDs, correlation and orchestration diagnostics remain internal Monitor content.

Required actions reuses the existing TaskCard forms and service commands. Only their Contractor success notices use business wording. No evidence fixtures, ownership, command payloads, sign-in rules or workflow transitions changed. Pending activation shows Operations ownership and never exposes the publication control to Contractor.

`contractorJourney` is a pure display adapter over current company/application/qualification/requirement facts and Open WorkItems. A completed application's six onboarding sections stay historical Complete after later qualification changes. New qualifications render under separate company activity. Current suspension/readiness still controls eligibility and the top warning; historical completion cannot override it.

## Theme and wordmark

`src/theme.css` adds shared blue/slate tokens and foundational controls. It changes shared colors and focus/disabled treatments in Operations/Monitor, not their layouts, queues or navigation. Viz execution colors remain semantically distinct and its CSS/recording implementation is unchanged. `src/contractor.css` scopes the new layout, denser records, disclosures and mobile styles to Contractor.

Unity text uses a bold system sans-serif stack on all platforms, without transformed lettering or a downloaded font. Navigation, breadcrumbs and presentation mode share this treatment. One neutral square SVG mark supplies the application images and browser icon, with proportional sizing.

## Verification and limits

`src/contractorJourney.test.ts` runs real business-command fixtures through submitted, active work, correction, waiting for teams, pending activation, eligible, separate skill and later suspension states. It verifies parallel work, historical completion/current readiness separation and nonmutation.

`tests/browser/onboarding-first.spec.ts` renders the seven requested states at 1440 × 1000 and 390 × 844, checks overflow and above-fold Continue, independently expands details with Enter/Space, verifies keyboard focus and computed text/background contrast, checks no internal activation control, preserves authoritative state during inspection, and executes the existing evidence form. `tests/browser/fishing-net.spec.ts` checks a rendered system font, bold weight, absence of transforms and no horizontal overflow. Existing lifecycle, multi-tab, login, branding asset/proportion, Save/Load, observer-failure and Viz suites remain.

This is not a formal accessibility audit. Contrast sampling covers representative body/status/action/navigation/disabled/disclosure text, not every pixel or every internal diagnostic. Native details provide keyboard behavior; labels/icons supplement color. Mobile journey sections intentionally stack and supporting history can be long when opened. Non-Windows font fallback, actual OS file-picker dialogs, assistive-technology combinations and business copy still require manual acceptance. The CSS keeps a scoped adaptation layer over the existing shared stylesheet rather than refactoring the whole application.

Actual executed counts, build, audit and publication: [STATUS](STATUS.md). Four representative screenshots plus the complete seven-state capture set and portable review fixtures remain local-only under `docs/chet/`.
