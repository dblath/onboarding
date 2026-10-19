# Run Unity fieldwork on a Mac

Use Node.js 24 LTS or newer and current Google Chrome. Safari and other browsers have not been accepted for this release. No account with a source hosting provider, backend service or installed font is needed.

## Portable application

Extract the supplied `unity-fieldwork.zip`. Open Terminal in the extracted `unity-fieldwork` directory and run:

```sh
node serve.mjs app 5174
```

Keep Terminal open. Press Ctrl+C to stop the server. If 5174 is occupied, choose another available port. Do not double-click the HTML file: local HTTP hosting provides the consistent origin needed for shared browser state.

Open these in three Chrome tabs in the same profile:

- http://127.0.0.1:5174/#/contractor
- http://127.0.0.1:5174/#/operations
- http://127.0.0.1:5174/#/monitor

The server reads static assets only, binds to loopback, and makes no application data writes. It is intended for local demonstrations, not public hosting.

## From source

In the source project directory, install dependencies on this Mac rather than copying a dependency folder from another computer:

```sh
npm ci
npm run build
npm start -- 5174
```

For development, use `npm run dev -- --port 5174 --strictPort`. To create the portable archive, use `npm run package`. To run checks, use `npm test`, `npx playwright install chromium`, `npm run test:browser` and `npm audit --audit-level=moderate`.

## Move your demonstration workspace

On the original computer, use Monitor / Workspace / Save State. On the Mac, use Load State, inspect the preview, then explicitly confirm replacement. Browser storage is not automatically transferred between computers. Sign in again with the application email and simulation password `123`; tab-local sessions are not exported.

All tabs must use the exact same host, port, scheme and browser profile. Changing the port creates a different browser workspace. Keep Web Locks and BroadcastChannel available; the application disables writes if required coordination is unavailable. Browser data may be cleared or evicted, so retain exported scenarios.

The native save picker is used when available; a conventional download is available otherwise. Actual macOS appearance and native file dialogs still require hands-on acceptance. This application uses simulated sign-in and integrations. Workspace data is stored locally in your browser. Simulation sign-in is not a security boundary.

## Mac acceptance checklist

1. Start the extracted application; confirm all three routes, tab icon, proportional mark and readable bold sans-serif branding.
2. Load a saved scenario and verify company state, history and Viz frames. Return to Live, complete an existing action and confirm updates across all tabs.
3. Apply anonymously, sign in and out, complete an owned task, execute an integration and exercise its existing retry path.
4. Save and reload a workspace using the native dialog, then exercise the download fallback. Cancellation must leave current state intact.
5. Check narrow-screen controls, Viz presentation mode and browser refresh. No automatic activity execution or recording should be caused by inspection.
