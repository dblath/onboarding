import { test, expect } from "@playwright/test";
import {
  application,
  card,
  initialReadiness,
  nav,
  inspectCompany,
  snapshot,
  synchronized,
  workspace,
} from "./helpers";

test("Operations discovers automations without executing them; deep links preserve preferences and publication updates three tabs", async ({
  context,
}, testInfo) => {
  const contractor = await workspace(context, "contractor");
  const operations = await workspace(context, "operations");
  const monitor = await workspace(context, "monitor");
  await initialReadiness(contractor, operations);
  await inspectCompany(operations, "Summit Three Tabs");
  const other = await workspace(context, "contractor");
  await application(other, "Other Company Demo", "other@example.com");
  const state = await snapshot(operations);
  const company = state.companies.find((c) => c.email === "alex@example.com")!;
  const activity = state.workItems.find(
    (t) => t.activity === "PublishActivation" && t.companyId === company.id,
  )!;
  const preferences = await operations.evaluate(() => ({
    role: sessionStorage.getItem("fieldwork:operations:role"),
    company: sessionStorage.getItem("fieldwork:operations:company"),
  }));
  if (
    (await operations
      .getByRole("button", { name: "Work queue", exact: true })
      .getAttribute("aria-expanded")) !== "true"
  )
    await nav(operations, "Work queue");
  await expect(operations.getByTestId("queue-total")).toHaveText("2");
  await expect(operations.getByTestId("queue-count-Simulation")).toHaveText(
    "1",
  );
  await operations
    .getByRole("button", { name: "All participants work" })
    .click();
  await operations.getByLabel("Work queue company").selectOption(company.id);
  await expect(
    operations.getByRole("button", { name: "Publish contractor activation →" }),
  ).toHaveCount(0);
  const deepLink = await operations
    .getByRole("link", { name: "Open automation action" })
    .getAttribute("href");
  expect(deepLink).toContain(`company=${company.id}&activity=${activity.id}`);
  await operations
    .getByRole("button", { name: "Automations & Integrations work" })
    .click();
  await expect(operations).toHaveURL(/#\/monitor\?view=automations&company=/);
  await expect(operations.getByLabel("Automations company")).toHaveValue(
    company.id,
  );
  await operations.goto("/#/operations");
  await expect(operations.getByLabel("Internal role")).toHaveValue(
    preferences.role!,
  );
  expect(
    await operations.evaluate(() =>
      sessionStorage.getItem("fieldwork:operations:company"),
    ),
  ).toBe(preferences.company);
  await nav(operations, "Overview");
  await inspectCompany(operations, "Summit Three Tabs");
  await expect(
    operations
      .getByTestId("eligibility-guidance")
      .getByRole("link", { name: "Open Automations & Integrations" }),
  ).toHaveAttribute("href", deepLink!);
  await nav(contractor, "Your journey");
  await expect(
    contractor.getByText("Demo verification passed.", { exact: true }),
  ).toHaveCount(0);
  await expect(
    contractor
      .locator("#contractor-requirements")
      .getByText("Test verification passed.", { exact: true }),
  ).toHaveCount(3);
  await expect(contractor.getByTestId("eligibility-guidance")).toContainText(
    "awaiting publication",
  );
  await expect(
    contractor.getByRole("link", { name: "Open Automations & Integrations" }),
  ).toHaveCount(0);
  await expect(
    contractor.getByRole("button", { name: "Publish contractor activation →" }),
  ).toHaveCount(0);
  await monitor.goto("/" + deepLink);
  await expect(monitor.getByTestId("automation-item")).toBeFocused();
  await monitor.reload();
  await expect(monitor.getByTestId("automation-item")).toBeFocused();
  await expect(monitor.getByLabel("Automations company")).toHaveValue(
    company.id,
  );
  await expect(monitor.getByTestId("automation-item")).toContainText(
    "Waiting for external service",
  );
  const before = await snapshot(monitor);
  expect(before.events).toEqual(state.events);
  expect(before.workItems).toEqual(state.workItems);
  for (const [name, page] of Object.entries({
    contractor,
    operations,
    monitor,
  })) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: testInfo.outputPath(`iteration-3.4-${name}.png`),
      fullPage: true,
    });
  }
  await card(monitor, "Publish contractor activation")
    .getByRole("button", { name: "Publish contractor activation →" })
    .click();
  await expect(monitor.getByTestId("automation-item")).toHaveCount(0);
  await expect(operations.getByTestId("queue-total")).toHaveText("1");
  for (const page of [contractor, operations, monitor])
    await expect(page.getByTestId("lifecycle-eligibility")).toHaveText(
      "Eligible",
    );
  // The selected completed activity remains visible via its deep link, without a second execution control.
  await expect(
    monitor
      .getByTestId("automation-history-item")
      .filter({ hasText: "Publish contractor activation" }),
  ).toContainText("Test integration succeeded");
  await expect(
    monitor.getByRole("button", { name: "Publish contractor activation →" }),
  ).toHaveCount(0);
  const after = await synchronized([contractor, operations, monitor]);
  expect(
    after.events.filter((e) => e.eventType === "ContractorActivated"),
  ).toHaveLength(1);
});

test("Monitor launches in automations, handles unavailable links and keeps diagnostics separate", async ({
  page,
}) => {
  await page.goto("/#/monitor");
  await expect(
    page.getByRole("region", { name: "Automations & Integrations" }),
  ).toBeVisible();
  await expect(
    page.getByText("Demo integrations · user-triggered only."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Correlation", exact: true }),
  ).toHaveCount(0);
  await page.goto(
    "/#/monitor?view=automations&company=missing&activity=missing",
  );
  await expect(page.getByRole("alert")).toContainText(
    "linked company is unavailable",
  );
  await expect(page.getByText(/linked activity is unavailable/)).toBeVisible();
  await expect(page.getByTestId("automation-item")).toHaveCount(0);
  await page.getByLabel("Automations company").selectOption("");
  await expect(page).toHaveURL(/#\/monitor\?view=automations$/);
  await nav(page, "Workflow monitor");
  await expect(
    page.getByRole("region", { name: "Automations & Integrations" }),
  ).toHaveCount(0);
});
