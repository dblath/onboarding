# Operations work visibility - Iteration 3.3 manual acceptance

Package 0.3.3. No lifecycle, domain-rule, event-contract or synchronization changes. No Iteration 4 implementation.

## Setup

Run `npm run dev` in the repository; use the same Chrome profile and exact origin in all tabs:

- Operations: http://127.0.0.1:5173/#/operations
- Contractor: http://127.0.0.1:5173/#/contractor
- Monitor: http://127.0.0.1:5173/#/monitor

Keep existing data and close older app tabs. Sign in to Contractor with the application email and demo password 123. Duplicate-email companies require explicit selection. Company and role filters are local UI preferences; they do not perform business actions.

## A. Discover work across roles and companies

1. Submit two fictional companies, such as Queue Alpha and Queue Beta. Open Operations twice. Click Work queue: it expands All participants plus Recruitment, Compliance, Finance, Contractor Relations, Field Manager, Training, Contractor and System Activities. Click again to collapse.
2. The parent badge always equals every open WorkItem across all participants and companies. Eight participant counts sum to that total; All participants repeats the total and is not an extra participant. Completed/cancelled work and activity attempts do not count.
3. Select Finance or another role. Expect only that role's work in the main queue; parent and participant counts stay unchanged. The header's internal-role preference remains separate when viewing Contractor/System Activities. A pending-system callout may signpost other Operations work without adding those items to the selected role list.
4. Default Work queue company is All companies, even when the company summary above has a selected company. Each item has company name, email and short ID. Choose a company in the queue filter or the left company list to narrow the list; counts stay global. Clear the filter to restore all companies.
5. Complete a Recruitment review. Its role count falls; successor work may cause the global total to stay level or increase. For an isolated two-new-company case: initial total 2; Proceed on one company -> Recruitment 1 + Contractor 4 = total 5; Decline the other with a reason -> Recruitment 0 + Contractor 4 = total 4. Other pre-existing companies add their open work to these totals.
6. Expect the second Operations tab to update counts automatically without adopting the first tab's role/company filter. Contractor and Monitor also receive the business changes without refresh.
7. Contractor-role items are visible with company context but are completed in the signed-in Contractor Portal, not by impersonating a contractor from Operations.

## B. Vendor setup and pending activation

1. Follow the onboarding happy path in [3.2 UX acceptance](acceptance-3.2.md), using [3.1 lifecycle steps](acceptance-3.1.md). After administrative approvals, select System Activities in Operations to find vendor provisioning. A participant with no remaining work still sees a Show pending System Activities callout when system work exists in the company filter.
2. Expect a vendor item with the correct company name. Run vendor provisioning explicitly. The system count decreases and contractor portal-setup work appears; the global total may be unchanged because one item hands off to another.
3. Finish skill approval, portal, induction and Training confirmation. Stop before activation publication. Contractor must show In progress / Ready / Pending / Not eligible. Required actions may be zero, but Operations still has one activation action for that company.
4. Contractor Your journey and Operations Overview explain: **All requirements are complete. Contractor activation is awaiting publication by Operations.** The blocker panel says Suspended: No and Activation publication: Pending with Operations.
5. In Operations Overview choose View Operations action, or use Work queue -> System Activities. The existing activation publication appears with company context. A blocker shortcut scopes the queue to that company. No publication occurs by opening/filtering the queue.
6. Run activation publication explicitly. Expect Completed / Ready / Active / Eligible in all tabs, and the open system/parent counts decrease appropriately. Only this explicit business action activates the company.

## C. Other blockers and lifecycle protection

- Before administration/portal/training/skill approval, Your journey or Operations Overview lists each unsatisfied readiness requirement and available next actions with their owners. Future prerequisites explain their dependency rather than claiming they are scheduled work.
- From Required actions or Work queue, See eligibility requirements and next actions opens the selected company's Overview. Operations blocker buttons open the appropriate role and company filter. Contractor buttons expose only its own portal actions.
- Invalidate the sole skill approval after completion: onboarding stays Completed, readiness becomes Not ready and operations Suspended. The panel explicitly says suspended. Restoring an existing pending qualification gives Ready but remains Suspended/Not eligible; no reactivation shortcut exists.
- Repeat pre-activation invalidation from 3.1 scenario F: cancelled publication no longer contributes to System Activities or the parent count. Do not count historical activity attempts as work.
- Ready/Pending with no open publication is shown as needing Operations review, not falsely described as an available activation action. This is a diagnostic message, not a new repair workflow.

## Investigation and acceptance

The automated reproduction reaches Ready/Pending/Not eligible with zero contractor/Training work and exactly one open activation publication. Publishing it explicitly produces Eligible, preserving the lifecycle. No lifecycle defect was reproduced. The original tester's exact company/snapshot has not been identified; do not infer its state from this reproduction. Provide its company name/email and observed four-state values if it differs.

Record pass/fail, company, role/filter, displayed counts, four-state values and unexpected behavior. The final handoff includes executed tests/build results and local screenshots. Manual acceptance is pending; stop here before Iteration 4.
