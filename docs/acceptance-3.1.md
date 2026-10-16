# Iteration 3.1 manual acceptance

**Status: ready for manual acceptance testing; manual sign-off is pending.** Automated evidence: 52 regression tests, 11 Chromium browser tests and the production build pass. No suspension removal or administrative request/approval process is implemented; those belong to Iteration 4.

## Setup and URLs

From `C:\Users\david\Documents\Repositories\onboarding`, run `npm install` if needed, then `npm run dev`. Use the existing dev server if it is already serving port 5173. Close older application tabs before opening the updated version. Do not clear IndexedDB just to upgrade; snapshot schema 4 migrates supported old data under the existing shared lock.

Open three Chrome tabs using the **same profile and exact origin**:

1. Contractor Portal: http://127.0.0.1:5173/#/contractor
2. Operations: http://127.0.0.1:5173/#/operations
3. Workflow Monitor: http://127.0.0.1:5173/#/monitor

Do not mix `localhost` and `127.0.0.1`, ports or schemes. If Vite prints another port, use that same origin for every tab. The default URLs above are the acceptance target. Use fictional data and a different company name for each scenario. **Select that company in all three tabs** when existing companies are already present.

Every experience displays four separate values: **Onboarding history / Current readiness / Operational status / Job eligibility**. Monitor also distinguishes the selected workflow's execution history from company lifecycle signals outside that execution.

## A. Happy path and the activation gate

Create company **3.1 Happy HVAC** in Contractor using `alex@example.com`, initial skill HVAC.

1. Operations → Recruitment → Work queue → Review application → Proceed → Record decision.
2. Contractor → Required actions → submit Valid demo document for insurance, fictional financial pack, agreement and license.
3. Operations → Compliance → run insurance and license verification.
4. Operations → Finance → run financial verification.
5. Operations → Contractor Relations → run agreement execution, then Run vendor provisioning in the system activity panel.
6. Operations → Field Manager → approve HVAC → Record skill decision.
7. Contractor → Required actions → check confirmation and complete portal setup, then check confirmation and complete initial training.
8. Operations → Training → confirm training.
9. **Before running activation:** all tabs must show **In progress / Ready / Pending / Not eligible**. Readiness alone must not show job eligibility.
10. Operations → Run activation publication in the scheduled system activity panel.
11. All tabs must show **Completed / Ready / Active / Eligible**. Contractor → Your journey says Eligible to receive jobs. Monitor's Company onboarding instance says Completed · Onboarding complete and has no pending work/waits.

Record the completed CompanyOnboarding instance ID and its history/work list for comparison in later scenarios. Initial completion remains recorded at the existing final activation-publication step; its historical completion is then immutable.

## B. Initial skill rejected

Create **3.1 Rejected HVAC**. Follow A through training, except Field Manager chooses **Reject** with reason `Demo practical assessment failed` instead of approving HVAC. Do not attempt the activation step, since it must not exist.

Expected in all tabs: **In progress / Not ready / Pending / Not eligible**. Company onboarding remains Running and waits for ContractorReadinessChanged after the company setup branch is finished; the rejected skill execution is completed. No activation work, onboarding restart or recovery shortcut appears. The notice explains that qualification recovery is deferred to Iteration 4. Refreshing preserves this state.

## C. Last approved skill invalidated after completion

Create **3.1 Sole Approval** and complete A. Do not request another skill.

1. Operations → Compliance → Overview → HVAC → enter `Demo approval withdrawn` under Invalidation reason → Invalidate skill approval.
2. All tabs must automatically show **Completed / Not ready / Suspended / Not eligible**.
3. Contractor's application history remains Completed with the same completion time. Its current-readiness and job-eligibility labels must not say Ready/Eligible.
4. Monitor's CompanyOnboarding instance ID, Completed status, execution history, processed-event list and work remain unchanged. No activation work is created.
5. Monitor's separate **Company lifecycle signals · outside workflow execution** shows ContractorReadinessChanged · Not ready and ContractorSuspended.
6. Refresh all three tabs. These four values persist. No remove-suspension button, reactivation activity or new qualification request is available for this suspended company. Recovery is intentionally deferred to Iteration 4.

## D. Previously pending skill approved after suspension

Create **3.1 Pending Plumbing** and complete A with HVAC approved.

1. Contractor → Your journey → Add another company skill → Plumbing → Request qualification. Leave its license task pending.
2. Operations → Compliance → Overview → invalidate the existing HVAC approval with a reason. Confirm **Completed / Not ready / Suspended / Not eligible** in every tab.
3. Contractor → Required actions → submit Valid demo document for the already-requested Plumbing license.
4. Operations → Compliance → Work queue → verify the Plumbing license.
5. Operations → Field Manager → approve Plumbing.
6. All tabs must now show **Completed / Ready / Suspended / Not eligible**. The portal says Ready, but operationally suspended, and explains the future administrative request/approval requirement.
7. CompanyOnboarding remains the same completed instance. Its execution history/work/processed IDs do not grow; it has no activation task, no Reactivation pending stage and no new wait.
8. The separate company signal stream records restored readiness. There is still only the original initial activation publication.
9. Refresh or reopen a tab. Suspension and ineligibility persist. No action in 3.1 can remove that suspension.

This is the critical regression: **restored qualifications are not permission to reactivate**.

## E. Another existing approval preserves eligibility

Create **3.1 Two Approvals** and complete A. Request and fully approve Plumbing **before** invalidating HVAC. Then invalidate HVAC.

Expected: **Completed / Ready / Active / Eligible**, because Plumbing remains approved. Do not create a suspension, restart onboarding or create another activation task. Completed onboarding history remains unchanged.

## F. Readiness lost before initial activation

Create **3.1 Before Activation** and follow A only through Training confirmation, stopping at **In progress / Ready / Pending / Not eligible**.

Invalidate HVAC in Operations → Compliance → Overview before running activation.

Expected: **In progress / Not ready / Pending / Not eligible**. The existing activation task is Cancelled, not successfully completed. No ContractorActivated event is produced and onboarding does not become completed. Operational status is Pending because this company was never Active. Monitor records cancellation within the still-running initial workflow.

## Acceptance notes

- Use normal participant controls only; no direct state edits or developer shortcuts.
- Cross-tab state changes should appear without refresh. Refresh is a separate persistence check, not how a participant receives the next task.
- If an old Iteration 3 workspace has invalid reactivation work, migration marks it Cancelled and normalizes current wait/stage metadata while retaining original events and execution history. Historical evidence of suspension prevents an earlier automatic reactivation from silently leaving the company Active.
- First-skill recovery, requalification after losing the only approval, new administrative requests and suspension removal remain unavailable until Iteration 4. Their absence is an expected limitation, not permission to reset the company.
- Record pass/fail, company name, instance ID, observed four-value state and any unexpected work/history change. Manual acceptance has not yet been signed off by the product team.
