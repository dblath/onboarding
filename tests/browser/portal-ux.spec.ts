import { test, expect } from "@playwright/test";
import {
  application,
  card,
  nav,
  proceed,
  role,
  signIn,
  snapshot,
  synchronized,
  workspace,
} from "./helpers";

test("anonymous application confirms before login; failed credentials, reload and sign-out preserve business state", async ({
  context,
}, testInfo) => {
  const contractor = await workspace(context, "contractor");
  const operations = await workspace(context, "operations");
  await contractor.setViewportSize({ width: 1440, height: 1000 });
  await contractor.screenshot({
    path: testInfo.outputPath("contractor-anonymous.png"),
    fullPage: true,
  });
  await contractor.getByRole("button", { name: "＋ New application" }).click();
  await contractor
    .getByLabel("Fictional company name")
    .fill("Summit Portal Demo");
  await contractor.getByLabel("Demo contact name").fill("Alex Demo");
  await contractor.getByLabel("Demo email").fill("alex@example.com");
  await contractor
    .getByRole("button", { name: "Submit application →" })
    .click();
  await expect(
    contractor.getByRole("heading", { name: "Application submitted" }),
  ).toBeVisible();
  await expect(contractor.getByLabel("Application email")).toHaveValue(
    "alex@example.com",
  );
  await expect(contractor.getByTestId("lifecycle-onboarding")).toHaveCount(0);
  await expect(
    contractor.getByRole("button", { name: "Required actions" }),
  ).toHaveCount(0);
  await expect(card(operations, "Review application")).toBeVisible();
  const submitted = await snapshot(operations);
  await contractor.getByLabel("Demo password", { exact: true }).fill("wrong");
  await contractor
    .getByRole("button", { name: "Sign In", exact: true })
    .click();
  await expect(contractor.getByRole("alert")).toContainText(
    "Incorrect demo password",
  );
  expect(
    await contractor.evaluate(() =>
      sessionStorage.getItem("fieldwork:contractor:session"),
    ),
  ).toBeNull();
  await contractor.getByLabel("Application email").fill("unknown@example.com");
  await contractor.getByLabel("Demo password", { exact: true }).fill("123");
  await contractor
    .getByRole("button", { name: "Sign In", exact: true })
    .click();
  await expect(contractor.getByRole("alert")).toContainText("No company found");
  expect(await snapshot(contractor)).toEqual(submitted);
  await signIn(contractor, "ALEX@example.com");
  await expect(
    contractor.getByRole("heading", {
      name: "Summit Portal Demo",
      exact: true,
    }),
  ).toBeVisible();
  await contractor.screenshot({
    path: testInfo.outputPath("contractor-signed-in.png"),
    fullPage: true,
  });
  expect(
    await contractor
      .locator(".stats")
      .evaluate((node) => node.getBoundingClientRect().bottom),
  ).toBeLessThanOrEqual(168);
  const session = await contractor.evaluate(() =>
    Object.fromEntries(Object.entries(sessionStorage)),
  );
  expect(session["fieldwork:contractor:session"]).toBe(
    submitted.companies[0].id,
  );
  expect(Object.keys(session).some((key) => /password/i.test(key))).toBe(false);
  expect(await snapshot(contractor)).toEqual(submitted);
  await contractor.reload();
  await expect(
    contractor.getByRole("heading", {
      name: "Summit Portal Demo",
      exact: true,
    }),
  ).toBeVisible();
  const beforeSignOut = await snapshot(contractor);
  await contractor.getByRole("button", { name: "Sign Out" }).click();
  await expect(
    contractor.getByRole("heading", { name: "Sign in to your company" }),
  ).toBeVisible();
  await expect(
    contractor.getByText("Summit Portal Demo", { exact: true }),
  ).toHaveCount(0);
  await expect(contractor.getByTestId("lifecycle-onboarding")).toHaveCount(0);
  expect(await snapshot(contractor)).toEqual(beforeSignOut);
  await contractor.reload();
  await expect(
    contractor.getByRole("heading", { name: "Sign in to your company" }),
  ).toBeVisible();
});

test("duplicate emails require a company choice; independent contractor tabs never move internal or other contractor sessions", async ({
  context,
}) => {
  const first = await workspace(context, "contractor");
  const operations = await workspace(context, "operations");
  const monitor = await workspace(context, "monitor");
  await application(first, "Alpha Company");
  await application(first, "Beta Company");
  await application(first, "Other Company", "other@example.com");
  await first.getByRole("button", { name: "Sign Out" }).click();
  await first.getByLabel("Application email").fill("alex@example.com");
  await first.getByLabel("Demo password", { exact: true }).fill("123");
  await first.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    first.getByRole("heading", { name: "Choose your company" }),
  ).toBeVisible();
  await expect(
    first.getByRole("button", { name: "Continue to company" }),
  ).toBeDisabled();
  await expect(
    first.getByLabel("Company for this sign in").locator("option"),
  ).toHaveCount(3);
  await expect(first.getByTestId("lifecycle-onboarding")).toHaveCount(0);
  expect(
    await first.evaluate(() =>
      sessionStorage.getItem("fieldwork:contractor:session"),
    ),
  ).toBeNull();
  const s = await snapshot(operations);
  const alpha = s.companies.find(
    (company) => company.name === "Alpha Company",
  )!;
  await first.getByLabel("Company for this sign in").selectOption(alpha.id);
  await first.getByRole("button", { name: "Continue to company" }).click();
  await expect(
    first.getByRole("heading", { name: "Alpha Company", exact: true }),
  ).toBeVisible();
  const second = await workspace(context, "contractor");
  await expect(
    second.getByRole("heading", { name: "Sign in to your company" }),
  ).toBeVisible();
  await signIn(second, "alex@example.com", "Beta Company");
  await operations
    .getByRole("button")
    .filter({ hasText: "Other Company" })
    .click();
  await role(operations, "Finance");
  await monitor
    .getByRole("button")
    .filter({ hasText: "Other Company" })
    .click();
  const before = await synchronized([first, second, operations, monitor]);
  await expect(first.getByText("Beta Company", { exact: true })).toHaveCount(0);
  await expect(second.getByText("Alpha Company", { exact: true })).toHaveCount(
    0,
  );
  for (const page of [first, second]) {
    await expect(page.getByText("Other Company", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByText("other@example.com", { exact: true }),
    ).toHaveCount(0);
  }
  await first.getByRole("button", { name: "Sign Out" }).click();
  await second.reload();
  await expect(
    second.getByRole("heading", { name: "Beta Company", exact: true }),
  ).toBeVisible();
  await expect(operations.getByLabel("Internal role")).toHaveValue("Finance");
  for (const page of [operations, monitor])
    await expect(
      page.getByRole("heading", { name: "Other Company", exact: true }),
    ).toBeVisible();
  // Existing workspace initialization increments revision once on reload.
  // Authentication itself must not alter any company/workflow/event facts.
  expect(await snapshot(monitor)).toEqual({
    ...before,
    revision: before.revision + 1,
  });
});

test("monitor diagnostics launch closed, update while hidden, expand independently by keyboard and reset on reload", async ({
  context,
}, testInfo) => {
  const contractor = await workspace(context, "contractor");
  const operations = await workspace(context, "operations");
  const monitor = await workspace(context, "monitor");
  await monitor.setViewportSize({ width: 1440, height: 1000 });
  await operations.setViewportSize({ width: 1440, height: 1000 });
  await application(contractor, "Summit Monitor Demo");
  const titles = [
    "Expected events & owners",
    "Correlation",
    "Activity attempts",
    "Completed & pending work",
    "Event ingress demonstrations",
    "Timer & escalation lab",
  ];
  for (const title of titles)
    await expect(
      monitor.getByRole("button", { name: title, exact: true }),
    ).toHaveAttribute("aria-expanded", "false");
  await expect(
    monitor.getByRole("heading", { name: "Execution history" }),
  ).toBeVisible();
  await expect(
    monitor.getByRole("heading", { name: "Business event envelopes" }),
  ).toBeVisible();
  await proceed(operations);
  await synchronized([contractor, operations, monitor]);
  const before = await snapshot(monitor);
  const expected = monitor.getByRole("button", {
    name: "Expected events & owners",
    exact: true,
  });
  const content = monitor.locator(
    `[id="${await expected.getAttribute("aria-controls")}"]`,
  );
  const root = before.workflows.find(
    (workflow) => workflow.definitionId === "CompanyOnboarding",
  )!;
  for (const wait of root.awaitedEvents)
    await expect(content).toContainText(wait.eventType);
  await expect(content).toBeHidden();
  await expected.focus();
  await monitor.keyboard.press("Enter");
  const correlation = monitor.getByRole("button", {
    name: "Correlation",
    exact: true,
  });
  await correlation.focus();
  await monitor.keyboard.press("Space");
  await expect(expected).toHaveAttribute("aria-expanded", "true");
  await expect(correlation).toHaveAttribute("aria-expanded", "true");
  await expect(content).toBeVisible();
  await expect(content.locator(".wait-row")).toHaveCount(
    root.awaitedEvents.length,
  );
  for (const wait of root.awaitedEvents)
    await expect(
      content.getByText(wait.eventType, { exact: true }).first(),
    ).toBeVisible();
  await expected.click();
  await expect(expected).toHaveAttribute("aria-expanded", "false");
  await expect(correlation).toHaveAttribute("aria-expanded", "true");
  expect(await snapshot(monitor)).toEqual(before);
  await monitor.reload();
  for (const title of titles)
    await expect(
      monitor.getByRole("button", { name: title, exact: true }),
    ).toHaveAttribute("aria-expanded", "false");
  for (const page of [monitor, operations]) {
    expect(
      await page
        .locator(".stats")
        .evaluate((node) => node.getBoundingClientRect().bottom),
    ).toBeLessThanOrEqual(168);
  }
  await monitor.screenshot({
    path: testInfo.outputPath("workflow-monitor.png"),
    fullPage: true,
  });
  await operations.screenshot({
    path: testInfo.outputPath("operations-compact.png"),
    fullPage: true,
  });
  expect(await snapshot(monitor)).toEqual({
    ...before,
    revision: before.revision + 1,
  });
  await nav(contractor, "Required actions");
  await expect(card(contractor, "Submit insurance evidence")).toBeVisible();
});
