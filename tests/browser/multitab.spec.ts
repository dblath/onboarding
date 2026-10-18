import { expect, test } from "@playwright/test";
import {
  application,
  card,
  completion,
  evidence,
  nav,
  inspectCompany,
  proceed,
  role,
  snapshot,
  synchronized,
  verify,
  workspace,
  systemActivities,
} from "./helpers";

test("three simultaneous experiences complete correction, independent branches and activation without refresh", async ({
  context,
}, testInfo) => {
  // One context shares origin, IndexedDB, locks and BroadcastChannel across all three pages.
  const contractor = await workspace(context, "contractor"),
    operations = await workspace(context, "operations"),
    monitor = await workspace(context, "monitor");
  const errors: string[] = [];
  for (const p of [contractor, operations, monitor])
    p.on("pageerror", (e) => errors.push(e.message));
  await expect(contractor.getByLabel("Internal role")).toHaveCount(0);
  await expect(
    contractor.getByRole("button", { name: "Advance 3 days" }),
  ).toHaveCount(0);
  await expect(
    contractor.getByRole("button", { name: "Redeliver last event" }),
  ).toHaveCount(0);
  await expect(
    contractor.getByRole("navigation").getByRole("button"),
  ).toHaveText(["New application", "Sign In"]);
  await application(contractor);
  await expect(card(operations, "Review application")).toBeVisible();
  await expect(
    monitor.getByRole("heading", { name: "Watch the work move." }),
  ).toBeVisible();
  await proceed(operations);
  await nav(contractor, "Required actions");
  await expect(card(contractor, "Submit license evidence")).toBeVisible();
  await evidence(
    contractor,
    "Submit license evidence",
    "Expired demo document",
  );
  await role(operations, "Compliance");
  await verify(operations, "Verify license");
  await expect(card(contractor, "Submit license evidence")).toContainText(
    "expired",
  );
  await expect(monitor.getByLabel("Workflow instance")).toHaveCount(1);
  const skillOption = monitor
    .getByLabel("Workflow instance")
    .locator("option")
    .filter({ hasText: "HVAC qualification" });
  await monitor
    .getByLabel("Workflow instance")
    .selectOption((await skillOption.getAttribute("value")) as string);
  await expect(
    monitor.getByText("Evidence correction", { exact: false }).first(),
  ).toBeVisible();
  await evidence(contractor, "Submit license evidence");
  await role(operations, "Compliance");
  await expect(card(operations, "Verify license")).toBeVisible();
  await verify(operations, "Verify license");
  await role(operations, "Field Manager");
  await card(operations, "Approve skill qualification")
    .getByRole("button", { name: "Record skill decision →" })
    .click();
  await expect(card(operations, "Approve skill qualification")).toHaveCount(0);
  for (const name of [
    "Submit insurance evidence",
    "Submit fictional tax / banking pack",
    "Submit contractor agreement",
  ])
    await evidence(contractor, name);
  await role(operations, "Compliance");
  await verify(operations, "Review insurance");
  await role(operations, "Finance");
  await verify(operations, "Verify fictional financial pack");
  await role(operations, "Contractor Relations");
  await verify(operations, "Review contractor agreement");
  // The contractor must never see worker controls even when shared state contains pending system work.
  await systemActivities(operations);
  await expect(card(operations, "Create vendor record")).toBeVisible();
  await expect(
    contractor.getByText("Workflow-scheduled system activities"),
  ).toHaveCount(0);
  await expect(
    contractor.getByRole("button", { name: "Create vendor record →" }),
  ).toHaveCount(0);
  await card(operations, "Create vendor record")
    .getByRole("button", { name: "Create vendor record →" })
    .click();
  await completion(
    contractor,
    "Complete company profile",
    "Complete portal setup →",
  );
  await completion(
    contractor,
    "Complete initial training",
    "Complete initial training →",
  );
  await role(operations, "Training");
  await completion(
    operations,
    "Confirm training completion",
    "Confirm training →",
  );
  await systemActivities(operations);
  await expect(card(operations, "Publish contractor activation")).toBeVisible();
  await card(operations, "Publish contractor activation")
    .getByRole("button", { name: "Publish contractor activation →" })
    .click();
  await expect(card(operations, "Publish contractor activation")).toHaveCount(
    0,
  );
  await nav(contractor, "Your journey");
  await nav(operations, "Overview");
  await inspectCompany(operations, "Summit Three Tabs");
  await expect(
    contractor.getByRole("heading", { name: "You're ready for your next job" }),
  ).toBeVisible();
  await expect(operations.locator(".ops-company-heading")).toContainText(
    "Eligible for jobs",
  );
  const rootOption = monitor
    .getByLabel("Workflow instance")
    .locator("option")
    .filter({ hasText: "Company onboarding" });
  await monitor
    .getByLabel("Workflow instance")
    .selectOption((await rootOption.getAttribute("value")) as string);
  await expect(
    monitor.getByText("Completed · Onboarding complete"),
  ).toBeVisible();
  await expect(
    monitor
      .locator("summary")
      .filter({ hasText: "ContractorReadinessChanged" }),
  ).toBeVisible();
  const s = await synchronized([contractor, operations, monitor]);
  expect(s.companies[0].activationStatus).toBe("Active");
  expect(s.workflows.every((w) => w.status === "Completed")).toBe(true);
  expect(
    s.evidence.filter((e) => e.qualificationId).map((e) => e.version),
  ).toEqual([1, 2]);
  expect(errors).toEqual([]);
  for (const page of [contractor, operations, monitor])
    await page.evaluate(() => window.scrollTo(0, 0));
  await contractor.screenshot({
    path: testInfo.outputPath("contractor-ready.png"),
    fullPage: true,
  });
  await operations.screenshot({
    path: testInfo.outputPath("operations-ready.png"),
    fullPage: true,
  });
  await monitor.screenshot({
    path: testInfo.outputPath("monitor-completed.png"),
    fullPage: true,
  });
});

test("near-simultaneous commands preserve both changes and a contested transition executes once", async ({
  context,
}) => {
  const contractor = await workspace(context, "contractor"),
    first = await workspace(context, "operations"),
    second = await workspace(context, "operations"),
    monitor = await workspace(context, "monitor");
  await application(contractor);
  await expect(card(first, "Review application")).toBeVisible();
  await expect(card(second, "Review application")).toBeVisible();
  // Hold the actual origin-scoped lock until both participant commands are queued.
  // This makes the contention deterministic without bypassing either UI/use case.
  await monitor.evaluate(
    () =>
      new Promise<void>((acquired) => {
        void navigator.locks.request(
          "fieldwork-onboarding:commands:v1",
          async () => {
            await new Promise<void>((release) => {
              (
                window as unknown as { releaseDemoLock: () => void }
              ).releaseDemoLock = release;
              acquired();
            });
          },
        );
      }),
  );
  // Click both stale copies of the same task. Exactly one screening transition may commit.
  await Promise.all([
    card(first, "Review application")
      .getByRole("button", { name: "Record decision →" })
      .click(),
    card(second, "Review application")
      .getByRole("button", { name: "Record decision →" })
      .click(),
  ]);
  await monitor.evaluate(() =>
    (window as unknown as { releaseDemoLock: () => void }).releaseDemoLock(),
  );
  await expect(card(first, "Review application")).toHaveCount(0);
  await expect(card(second, "Review application")).toHaveCount(0);
  let s = await synchronized([contractor, first, second, monitor]);
  expect(
    s.events.filter((e) => e.eventType === "ScreeningDecisionRecorded"),
  ).toHaveLength(1);
  expect(
    s.workItems.filter((t) => t.activity === "SubmitInsurance"),
  ).toHaveLength(1);
  await nav(contractor, "Required actions");
  await evidence(contractor, "Submit insurance evidence");
  await evidence(contractor, "Submit fictional tax / banking pack");
  await role(first, "Compliance");
  await role(second, "Finance");
  await Promise.all([
    verify(first, "Review insurance"),
    verify(second, "Verify fictional financial pack"),
  ]);
  s = await synchronized([contractor, first, second, monitor]);
  expect(s.requirements.filter((r) => r.status === "Verified")).toHaveLength(2);
  expect(
    s.events.filter((e) => e.eventType === "InsuranceReviewCompleted"),
  ).toHaveLength(1);
  expect(
    s.events.filter((e) => e.eventType === "FinancialReviewCompleted"),
  ).toHaveLength(1);
  expect(
    s.workItems.filter(
      (t) =>
        t.status === "Open" &&
        ["ReviewInsurance", "ReviewFinancial"].includes(t.activity),
    ),
  ).toHaveLength(0);
  // Internal selections are private to each tab, and other experiences have no role selector.
  await expect(first.getByLabel("Internal role")).toHaveValue("Compliance");
  await expect(second.getByLabel("Internal role")).toHaveValue("Finance");
  await expect(contractor.getByLabel("Internal role")).toHaveCount(0);
  await expect(monitor.getByLabel("Internal role")).toHaveCount(0);
  await second.reload();
  await expect(second.getByLabel("Internal role")).toHaveValue("Finance");
  await expect(second.getByTestId("sync-status")).toContainText("Live");
  const before = await synchronized([contractor, first, second, monitor]);
  await monitor
    .getByRole("button", { name: "Event ingress demonstrations" })
    .click();
  await monitor.getByRole("button", { name: "Redeliver last event" }).click();
  await expect(
    monitor.getByText(
      "✓ Duplicate event ignored. No work or history was duplicated.",
    ),
  ).toBeVisible();
  await monitor
    .getByRole("button", { name: "Deliver unrelated correlation" })
    .click();
  await expect(
    monitor.getByText(
      "✓ Unrelated correlation rejected. The workflow did not advance.",
    ),
  ).toBeVisible();
  expect(await snapshot(monitor)).toEqual(before);
});

test("failed activities retry from Monitor, persist on refresh and resume every experience", async ({
  context,
}) => {
  const contractor = await workspace(context, "contractor"),
    operations = await workspace(context, "operations"),
    monitor = await workspace(context, "monitor");
  await application(contractor);
  await proceed(operations);
  await nav(contractor, "Required actions");
  await evidence(contractor, "Submit license evidence");
  await role(operations, "Compliance");
  const task = card(operations, "Verify license");
  await task.getByText("Test outcomes", { exact: true }).click();
  await task.getByRole("checkbox").check();
  await task.getByRole("button", { name: "Run test verification →" }).click();
  await nav(monitor, "Automations & Integrations");
  await expect(card(monitor, "Verify license")).toContainText(
    "Technical failure",
  );
  await monitor.reload();
  await expect(card(monitor, "Verify license")).toContainText(
    "Technical failure",
  );
  await card(monitor, "Verify license")
    .getByRole("button", { name: "↻ Retry activity →" })
    .click();
  await expect(card(operations, "Verify license")).toHaveCount(0);
  await expect(card(monitor, "Verify license")).toHaveCount(0);
  await role(operations, "Field Manager");
  await expect(card(operations, "Approve skill qualification")).toBeVisible();
  await nav(monitor, "Workflow monitor");
  await monitor.getByRole("button", { name: "Timer & escalation lab" }).click();
  await monitor.getByRole("button", { name: "Advance 3 days" }).click();
  await monitor.getByRole("button", { name: "Advance 2 days" }).click();
  await nav(monitor, "Outbox");
  await expect(
    monitor.getByText(/Escalation: Contractor has overdue work/).first(),
  ).toBeVisible();
  await contractor.reload();
  await nav(contractor, "Required actions");
  await expect(card(contractor, "Submit insurance evidence")).toBeVisible();
  const reopened = await workspace(context, "monitor");
  await synchronized([contractor, operations, monitor, reopened]);
  const s = await snapshot(reopened);
  expect(s.attempts.map((a) => a.status)).toEqual(["Failed", "Succeeded"]);
  expect(s.outbox.some((m) => m.kind === "Escalation")).toBe(true);
});
