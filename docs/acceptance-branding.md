# Unity branding manual acceptance

Run `npm run dev`, then open:

- Contractor Portal: http://127.0.0.1:5173/#/contractor
- Onboarding Operations: http://127.0.0.1:5173/#/operations
- Workflow Monitor: http://127.0.0.1:5173/#/monitor

For production verification, run `npm run build` followed by `npm run preview -- --host 127.0.0.1 --port 4174`; use the same routes at http://127.0.0.1:4174. If that port is already serving this build, use the existing preview. Keep all three tabs on the same exact origin to share state. No backend is needed.

1. Each experience shows the complete Unity portrait logo, including its text, in navigation and a compact copy in the header. Proportions match the original; there is no crop or stretching. Unity / Fieldwork demo titles identify the selected experience.
2. Each actual browser tab shows the Unity icon. Hard refresh or reopen a tab if the browser retains an older cached icon. The entire logo is retained within a square canvas; small text is naturally difficult to read at tab-icon size.
3. Narrow the window: the navigation image scales proportionally to 44px wide, without dominating the navigation. Restore desktop width: it is at most 80px wide.
4. Existing routes, application/sign-in, participant work and Monitor interaction still function. Signing in uses an existing company email and demo password `123`. No business rules or stored company data were changed by branding.

Asset provenance and derivations: [assets README](../public/assets/README.md). Actual test evidence and the unresolved timing-sensitive work-count UI assertion: [STATUS](STATUS.md). Automated browser checks passed 17/17; full regression checks passed 59/60. Visual acceptance is requested separately from these automated results.

Screenshots and the Chet handoff are local-only under `docs/chet/`; they are intentionally absent from GitHub. Iteration 4 has not started.
