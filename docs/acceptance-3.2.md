# Iteration 3.2 manual UX acceptance

**Ready for manual UX acceptance; product sign-off is pending.** This release changes presentation and demo sign-in only. Iteration 4 has not started.

## Setup and URLs

Run `npm ci` if needed, then `npm run dev -- --port 5174 --strictPort`. Close older application tabs. Keep existing IndexedDB data; no migration or reset is required for 3.2. Open these in the same Chrome profile and exact origin:

- Contractor Portal: http://127.0.0.1:5174/#/contractor
- Operations: http://127.0.0.1:5174/#/operations
- Workflow Monitor: http://127.0.0.1:5174/#/monitor

If Vite prints another port, use it consistently. Do not mix localhost and 127.0.0.1. Use fictional company names and example.com emails. Existing application emails work. Legacy company selection does not automatically sign anyone in. A 3.2 demo session survives reload in that tab until Sign Out or the browser discards sessionStorage.

## A. Anonymous application and demo login

1. Open a fresh Contractor tab without an opener, or Sign Out. Expect apply/sign-in controls, with no company list, lifecycle values or outstanding work. The simulation and shared-browser strip remains visible.
2. Choose New application. Submit `3.2 Portal Demo`, contact `Alex Demo`, email `portal32@example.com`, skill HVAC, without signing in.
3. Expect Application submitted, the submitted company/email and instructions to sign in with password **123**. Do not show onboarding status or required actions yet. Operations receives Recruitment work and Monitor shows the workflow.
4. Enter a wrong password and Sign In. Expect an error and no session. Try `unknown32@example.com` with 123: expect an unknown-email message and no session.
5. Sign in with `portal32@example.com` and 123. Expect only that company, its journey, required actions, qualifications, readiness and contractor messages. Email matching ignores surrounding whitespace and case. No identity service or password persistence is involved.
6. Refresh: retain the session. Sign Out: return to the anonymous screen with no company information. Operations and Monitor retain their selections and workflow state. Refresh again: stay anonymous.

## B. Duplicate emails and tab independence

1. Submit two applications named `3.2 Alpha` and `3.2 Beta` using `shared32@example.com`. Submitting another application from a signed-in tab returns that tab to confirmation and requires a new sign-in.
2. Sign in with that email and 123. Expect Choose your company, an empty selection and disabled Continue to company. Do not silently enter either company.
3. Choose Alpha and continue: see Alpha only. Options include short IDs to distinguish identical names. Sign out and sign in again to choose Beta.
4. Open an independent Contractor tab and sign in as Alpha while the first stays with Beta. Change the Operations role/company and Monitor company separately: neither contractor session moves. Sign out in one Contractor tab: the other remains signed in. Refresh that other tab: retain its company.
5. Open Required actions and Messages: no other company's work, counts or notifications appear. These are presentation restrictions in a shared-browser demo, not security enforcement.

## C. Existing onboarding and synchronization

1. Sign in to scenario A's company. In Operations, Recruitment records Proceed. Contractor evidence requests arrive without refresh.
2. Continue the [lifecycle walkthrough](acceptance-3.1.md), signing in with the relevant email and 123 immediately after every new submission. Existing correction, reviews, vendor, portal, training, skill and initial activation controls remain available.
3. Before activation expect In progress / Ready / Pending / Not eligible; after publication expect Completed / Ready / Active / Eligible.
4. Invalidate the sole approval after completion: Completed / Not ready / Suspended / Not eligible. Later approve an already pending skill: Completed / Ready / Suspended / Not eligible. No suspension-removal shortcut exists.

## D. Monitor diagnostic panels

1. Select a company with workflows. All six supporting sections start collapsed: Expected events & owners, Correlation, Activity attempts, Completed & pending work, Event ingress demonstrations, Timer & escalation lab. Titles and right-pointing `>` chevrons remain visible. Status, execution history, business events and company lifecycle signals remain outside the panels.
2. Expand Expected events & owners and Correlation. Both stay open and chevrons point down. Collapse either without changing the other.
3. Tab to a panel title. Enter and Space toggle it with visible focus and accurate expanded state for assistive technology.
4. Leave Expected events & owners collapsed. Perform the next action in another tab. Reopen it: see current waits/owners. Toggling must not create events, tasks, history or revision increments. Reload retains the pre-existing workspace initialization/revision increment without altering business facts.
5. Reload Monitor, or leave its workflow view and return: all diagnostics start collapsed again. Event envelope rows also launch closed and remain individually expandable.
6. Expand Event ingress demonstrations before duplicate/unrelated delivery tests. Expand Timer & escalation lab before advancing time. Failed-activity retry remains directly available outside diagnostic panels.

## E. Compact headers and acceptance record

At desktop size, primary actions and metrics sit close to the top. Preserve identity, experience name, brand messaging, simulation disclosure and live revision strip. At the automated 1440x1000 viewport, the top through the metrics bottom is 165 px, down from 419 px (about 61%). Anonymous Contractor has no company metrics by design.

Check normal zoom, long company names and your preferred narrower window. Desktop Chromium automation is evidence, not exhaustive responsive or assistive-technology certification. Record pass/fail, company/email, viewport and unexpected behavior. Return UX feedback before the next iteration. Do not begin Iteration 4.
