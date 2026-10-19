# Unity branding acceptance

Run `npm ci`, then `npm run dev -- --port 5174 --strictPort`. Open the Contractor, Operations and Monitor routes on that same origin. Alternatively use the portable package described in [Mac setup](mac-setup.md).

1. Navigation and headers show the neutral orange U mark with Unity fieldwork. Browser titles identify each experience. No former tagline appears.
2. The browser tab uses the same scalable square mark. Reopen the tab if an older icon is cached. The mark remains recognisable at small sizes and is never stretched.
3. At 1440px and 390px, check proportional images, readable bold sans-serif text, no horizontal overflow and balanced navigation. Desktop sidebar images are at most 80px wide; Contractor uses 62px desktop and 36px mobile.
4. Check Viz presentation mode: the same mark and bold system wordmark appear without altering map controls or playback.
5. Existing application/sign-in, participant work, integrations, workspace import/export and cross-tab updates continue to work. Simulation password is `123`.

The image is a new code-native square SVG with an orange rounded U path, transparent background and no embedded text or metadata. It is shared by application chrome and favicon; no image derivation step or installed font is required. No provenance document is placed in the public asset directory.

Current automated evidence and limitations: [STATUS](STATUS.md). Review screenshots and the detailed handoff remain local-only under `docs/chet/`. Actual macOS rendering and native file dialogs require acceptance on a Mac.
