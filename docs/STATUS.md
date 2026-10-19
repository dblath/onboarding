# Unity fieldwork implementation status

**2026-10-19 — Neutral branding and Mac portability. Package 0.3.17.**

Unity fieldwork keeps its name and accepted onboarding experience. A neutral orange square SVG mark replaces the former image and tab icons. Navigation, breadcrumbs and Viz presentation use bold system sans-serif typography. The root README now contains the requested generic sign-in/storage disclosure. Current documentation and public assets no longer expose organization-specific branding, repository addresses, machine paths or unrelated project provenance.

A portable archive contains the production application, a read-only local static launcher, start instructions and bundled dependency license notices. IndexedDB remains authoritative; no business, workflow, lifecycle, event, observer or workspace-format contracts changed. Actual macOS rendering and native file dialogs still require acceptance on a Mac. No Iteration 4 work.

## Capability matrix

| Capability                                                   | Status                    | Evidence / boundary                                                                                                       |
| ------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Neutral mark / scalable tab icon                             | Implemented               | One transparent 64-square SVG, no raster text or metadata; proportional application images                                |
| Portable brand typography                                    | Implemented               | Shared bold system stack; no installed font or downloaded font dependency                                                 |
| Current first-party reference cleanup                        | Implemented               | Includes source, README, STATUS, acceptance/design documents, public assets, generated output and local delivery material |
| Portable static package                                      | Implemented               | ZIP allowlist, relative paths, Node 24+ loopback launcher, complete runtime dependency notices                            |
| Mac execution                                                | Partial                   | Portable code/scripts and native optional dependencies reviewed; no physical Mac execution                                |
| Contractor / Operations / Monitor                            | Implemented, retained     | Anonymous application, company sign-in, role-owned work, shared automations, monitoring                                   |
| Company lifecycle                                            | Implemented, retained     | Historical completion, derived current readiness, separate operational state, explicit activation                         |
| Workspace and Viz                                            | Implemented, retained     | Atomic replacement, exact recorded frames/lineage, continued workflows and read-only inspection                           |
| Initial skill rejection recovery / reinstatement             | Partial / Not Implemented | Existing consistent waiting/suspension behavior; no recovery shortcut                                                     |
| Backend / real authentication / live integrations / designer | Not Implemented           | Browser-only simulation; intentionally outside scope                                                                      |

## Architecture and protected boundaries

- [App.tsx](../src/App.tsx), [JourneyMap.tsx](../src/viz/JourneyMap.tsx), [style.css](../src/style.css), [viz.css](../src/viz/viz.css): presentation references, neutral branding, portable typography and removal of an internal iteration label. Existing discreet environment disclosure remains.
- [unity-mark.svg](../public/assets/unity-mark.svg): new code-native rounded orange U, shared by all application images and favicon. The former three raster assets and public provenance note were removed. Public assets are copied verbatim, so documentation is kept outside that directory.
- [vite.config.ts](../vite.config.ts): retains relative build base; gathers license notices for the 18 dependencies actually present in emitted chunks. Virtual modules are excluded from filesystem lookups. Notices are emitted as THIRD-PARTY.txt with no local paths.
- [serve.mjs](../scripts/serve.mjs): static GET/HEAD only, loopback binding, correct content types, no-store responses and path containment. No business API or application data writes.
- [package.mjs](../scripts/package.mjs): dependency-free standard ZIP generation; portable relative paths; allowlisted application assets, launcher, start guide and notices. No source metadata, private handoffs, sessions, dependency folder or test output is shipped.
- Package versions, resolutions, integrity and license fields remain unchanged. Nineteen optional sponsorship metadata entries were removed from the dependency lock; no package was added or upgraded. Node 24+ is explicit because packaging uses its built-in checksum API.

Existing domain/application boundaries remain in [domain.ts](../src/domain.ts), [application.ts](../src/application.ts), [orchestration.ts](../src/orchestration.ts), [indexedDbRepository.ts](../src/indexedDbRepository.ts) and [coordination.ts](../src/coordination.ts). Company is the business identity. Qualifications belong to the company independently of onboarding.

Readiness derives from current administrative approvals, profile, confirmed training and at least one approved skill. Job eligibility requires readiness plus Active operational status. Completed onboarding stays historical and completed workflows never resume. Losing the last approved skill can suspend eligibility; later qualification approval does not remove suspension. Reinstatement needs the future administrative approval lifecycle.

Business actions still follow existing TaskCard/use-case commands, domain changes, business events, correlation, rules and activities/WorkItems. Canonical Simulation-owned work is executed explicitly through the same commands in Operations and Monitor. Viewing, selecting or recording playback executes nothing.

IndexedDB remains the authority. Web Locks serialize commands and workspace replacement; revision-only BroadcastChannel messages invalidate per-tab views. Replacement rebases revision and epoch, rejects stale commands/reviews and clears missing selections without silently choosing another company. Sign-in and view preferences remain tab-local. Database, channel, lock and workspace-format identifiers were not renamed. Legacy exported fixtures remain byte-for-byte unchanged.

Viz capture definitions, frames, causes, archives, lineage and processed identities remain intact. Business durability remains independent of observer capture failures. This is a local workflow simulation: timers advance with the simulation clock, attempts/retries are explicit, and no worker runs while all tabs are closed.

## Validation

Final regression, browser and production/package checks passed. Ready for branding review; actual Mac acceptance remains pending.

| Executed check                 | Actual result                                                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| npm test                       | 125 passed / 0 failed; 20 files; latest completed run 35.59 s                                                                            |
| Final full Chromium run        | 56 passed / 0 failed; 4.1 min; production assets                                                                                         |
| Initial full Chromium run      | 55 passed / 1 failed; 5.0 min; obsolete absolute landing-coordinate assertion                                                            |
| Intermediate full Chromium run | 53 passed / 3 failed; 4.3 min; unnecessary disclosure wording change restored to accepted copy                                           |
| Production/package build       | Passed; 238 modules; 18 dependency notice sections; portable ZIP 238,080 bytes, 12 files                                                 |
| Dependency audit               | 0 vulnerabilities                                                                                                                        |
| Clean-install dry run          | Passed; lock compatible with npm ci; no dependency installation performed                                                                |
| Import path casing             | 311 relative imports checked; 0 missing/case mismatches                                                                                  |
| Mac native optional packages   | Both ARM64 and x64 build dependencies present in lock                                                                                    |
| Extracted package smoke        | Passed scenario load, three experiences, company sign-in, explicit publication, synchronized eligibility/queue and restored Viz Frame 16 |

New [portable.test.ts](../src/portable.test.ts) covers real static HTTP/HEAD/assets, rejected writes/traversal and compressed UTF-8 ZIP round trips. [branding.spec.ts](../tests/browser/branding.spec.ts) checks all experiences at 1440/390, proportional images, portable bold typography, favicon response/rasterization and the public/build asset boundary. [fishing-net.spec.ts](../tests/browser/fishing-net.spec.ts) checks actual rendered glyphs without requiring one platform's font.

The landing test previously asserted a global Y coordinate measured with the former portrait logo. The new square mark shifts mobile navigation height by 8.625px; the accepted gap below the header remains 93px. [ux-cleanup.spec.ts](../tests/browser/ux-cleanup.spec.ts) now checks that relative gap. No production spacing workaround or arbitrary sleep was introduced.

An early license collector build failed on a virtual module identifier. It now skips virtual modules and the production/package build passes. An exploratory package smoke assertion initially searched a phrase split across separate elements; it was corrected to assert the existing eligibility test ID, with no product change. A temporary footer wording change failed three established vocabulary checks; accepted disclosure wording was restored and those tests were preserved.

## Reference audit and artifact handling

Current first-party text, filenames, public/build assets, scenario fixtures, current screenshots and extracted archive are reviewed. The completed scan found zero restricted references in the audited scope, including all 12 decompressed archive entries. It also inspected 103 current PNG screenshots and found no text or EXIF metadata chunks. Detailed file counts are recorded in the local audit report. Images require visual inspection as well as text scans; the sole source image is now an inspectable text-free SVG. New desktop/mobile branding and Viz presentation screenshots were visually reviewed. Required license notices contain no restricted matches either.

Git configuration/history and third-party dependency contents remain intact by request and are excluded from delivery. Required license notices are retained without redaction. Historical local handoffs, screenshots, bundled source snapshots and archives were moved intact outside the current project: 374 files, 86,418,682 bytes, under Documents / Unity fieldwork archives / 2026-10-19-local-handoffs. They are private history, remain unsanitized, and are not part of this application or delivery. No unrelated tracked work existed at the start.

Current screenshots, package smoke evidence and detailed handoff are local-only under docs/chet/fingerprint-cleanup-2026-10-19. That directory remains excluded from version control. Do not add the historical archive back to a delivery.

## Run and manual acceptance

See [Mac setup](mac-setup.md) and [branding acceptance](acceptance-branding.md).

From source: npm ci, npm run build, then npm start -- 5174. For development: npm run dev -- --port 5174 --strictPort. Portable distribution: extract release/unity-fieldwork.zip, enter its unity-fieldwork directory, then run node serve.mjs app 5174. Node 24+ and current Chrome are required for this release's supported demonstration path.

Use the same Chrome profile and exact origin for /#/contractor, /#/operations and /#/monitor. Save State on the original computer and explicitly Load State on the Mac; browser data and tab-local sessions do not transfer automatically. Keep exported scenarios as backups. Do not open the HTML directly or change ports during a demonstration expecting the same browser workspace.

Validate the new mark, tab icon and typography on desktop/mobile and Viz presentation. Apply/sign in, load a prepared scenario, publish activation explicitly, check all three views, replay restored history and exercise both native Save and download fallback. Actual macOS dialogs, Safari/Firefox, assistive technologies and exhaustive device/zoom combinations remain untested. Browser quotas, large histories, first-skill recovery and reinstatement limitations remain unchanged.

## Publication and next work

Branch main; existing repository configuration and history retained. Validation is complete; publication is pending. No force-push or history replacement. Final revision and synchronization evidence are reported separately from the portable package.

Stop for branding and Mac UX acceptance. No Iteration 4, business policy changes or workflow designer.

Domain references: [domain](domain.md), [processes](processes.md), [events](events.md), [rules](rules.md), [shared browser](shared-browser.md), [observer storage](observer-storage.md), [Viz](viz-recording.md), [workspace](workspace.md). Existing contractor/Viz cleanup and Operations participant behavior remain the accepted baseline.
