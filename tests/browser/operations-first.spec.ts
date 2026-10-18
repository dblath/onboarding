import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { operationsState } from "../fixtures/operationsState";
import { nav, snapshot, signIn, workspace, card, application } from "./helpers";

async function load(context: Parameters<typeof workspace>[0]) {
  const file = await operationsState(),
    monitor = await workspace(context, "monitor");
  await nav(monitor, "Demo Workspace");
  await monitor.getByLabel("Workspace JSON file").setInputFiles({
    name: "operations.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  const dialog = monitor.getByRole("dialog", { name: "Load workspace?" });
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Confirm Load State", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  return { file, monitor };
}
test("work-first Operations covers Recruitment, Compliance, correction, empty roles and discovery at desktop and mobile", async ({
  context,
}, info) => {
  const { file } = await load(context);
  await fs.writeFile(
    info.outputPath("operations-review.json"),
    JSON.stringify(file, null, 2),
  );
  const ops = await workspace(context, "operations");
  await ops.setViewportSize({ width: 1440, height: 1000 });
  const global = file.state.workItems.filter((t) => t.status === "Open").length;
  await expect(ops.locator(".ops-company-row")).toHaveCount(2);
  await expect(card(ops, "Review application")).toBeVisible();
  await expect(ops.getByTestId("queue-total")).toHaveText(String(global));
  expect((await card(ops, "Review application").boundingBox())!.y).toBeLessThan(
    460,
  );
  await ops.screenshot({
    path: info.outputPath("recruitment-1440.png"),
    fullPage: true,
  });
  for (const width of [1440, 390]) {
    await ops.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    expect(
      await ops.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 390) {
      await ops.screenshot({
        path: info.outputPath("recruitment-390.png"),
        fullPage: true,
      });
      await expect(card(ops, "Review application")).toBeVisible();
      await ops.getByRole("button", { name: /Choose a company/ }).click();
      await ops
        .locator(".ops-company-row")
        .filter({ hasText: "Beta Services" })
        .click();
      await expect(ops.locator(".ops-company-heading")).toContainText(
        "Beta Services",
      );
      await ops.getByRole("button", { name: /Choose a company/ }).click();
      await ops
        .locator(".ops-company-row")
        .filter({ hasText: "Alpha Services" })
        .click();
    }
  }
  await ops.setViewportSize({ width: 1440, height: 1000 });
  await card(ops, "Review application")
    .getByRole("button", { name: "Record decision →", exact: true })
    .click();
  await expect(ops.locator(".ops-company-row")).toHaveCount(1);
  await expect(ops.locator(".ops-company-row")).toContainText("Beta Services");
  await expect(card(ops, "Review application")).toHaveCount(0); // no substitution
  await expect(
    ops.getByRole("heading", { name: "Choose the next company to work with" }),
  ).toBeVisible();
  await ops.getByLabel("Internal role").selectOption("Compliance");
  await expect(ops.locator(".ops-company-row")).toHaveCount(2);
  await expect(ops.locator(".ops-company-row.selected")).toHaveCount(0);
  await ops
    .locator(".ops-company-row")
    .filter({ hasText: "Gamma Services" })
    .click();
  await expect(ops.getByTestId("queue-visible-count")).toHaveText(
    "2 open for Compliance",
  );
  await ops.screenshot({
    path: info.outputPath("compliance-1440.png"),
    fullPage: true,
  });
  const verification = card(ops, "Review insurance");
  await verification
    .getByRole("button", { name: "Run test verification →", exact: true })
    .click();
  await expect(verification).toHaveCount(0);
  await expect(ops.getByTestId("queue-visible-count")).toHaveText(
    "1 open for Compliance",
  );
  const documents = ops.getByTestId("ops-stage-administration");
  await documents.locator("summary").focus();
  await ops.keyboard.press("Enter");
  await expect(documents).toHaveAttribute("open", "");
  await ops.getByTestId("ops-stage-skills").locator("summary").focus();
  await ops.keyboard.press("Space");
  await expect(documents).toHaveAttribute("open", "");
  await expect(ops.getByTestId("ops-stage-skills")).toHaveAttribute("open", "");
  await ops.keyboard.press("Space");
  await expect(ops.getByTestId("ops-stage-administration")).toContainText(
    "expired",
  );
  await expect(ops.getByTestId("ops-stage-administration")).toContainText(
    "Contractor",
  );
  await ops.evaluate(() => scrollTo(0, 0));
  await ops.screenshot({
    path: info.outputPath("progress-details-1440.png"),
    fullPage: true,
  });
  await ops.setViewportSize({ width: 390, height: 844 });
  await ops.evaluate(() => scrollTo(0, 0));
  expect(
    await ops.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await ops.screenshot({
    path: info.outputPath("compliance-390.png"),
    fullPage: true,
  });
  await ops.getByLabel("Internal role").selectOption("Finance");
  await expect(
    ops.getByText("No active work for Finance.", { exact: true }),
  ).toBeVisible();
  await ops.setViewportSize({ width: 1440, height: 1000 });
  await ops.screenshot({
    path: info.outputPath("empty-finance-1440.png"),
    fullPage: true,
  });
  await ops.getByRole("button", { name: "All companies", exact: true }).click();
  await expect(ops.locator(".ops-company-row")).toHaveCount(5);
  await ops
    .locator(".ops-company-row")
    .filter({ hasText: "Gamma Services" })
    .click();
  await expect(card(ops, "Verify license")).toHaveCount(0);
  await expect(
    ops.getByText("No Finance action is needed for this company.", {
      exact: true,
    }),
  ).toBeVisible();
  const before = await snapshot(ops);
  await ops.getByTestId("ops-stage-skills").locator("summary").click();
  expect(await snapshot(ops)).toEqual(before);
});

test("activation and technical inspection deep links preserve Operations preferences and publication updates all three experiences", async ({
  context,
}) => {
  const { monitor } = await load(context),
    ops = await workspace(context, "operations"),
    portal = await workspace(context, "contractor");
  await ops.getByLabel("Internal role").selectOption("Training");
  await ops.getByRole("button", { name: "All companies", exact: true }).click();
  await ops
    .locator(".ops-company-row")
    .filter({ hasText: "Sierra Services" })
    .click();
  await expect(ops.getByRole("note")).toContainText(
    "awaiting publication by Operations",
  );
  await expect(
    ops.getByRole("button", {
      name: "Publish contractor activation →",
      exact: true,
    }),
  ).toHaveCount(0);
  await signIn(portal, "sierra@example.com");
  await expect(portal.getByTestId("lifecycle-eligibility")).toHaveText(
    "Not eligible",
  );
  const preferences = await ops.evaluate(() =>
    Object.fromEntries(Object.entries(sessionStorage)),
  );
  const inspect = ops.getByRole("link", {
    name: "Inspect in Workflow Monitor ↗",
    exact: true,
  });
  await monitor.goto("/" + (await inspect.getAttribute("href")));
  await expect(
    monitor.getByRole("heading", { name: "Sierra Services", exact: true }),
  ).toBeVisible();
  await expect(monitor.getByLabel("Workflow instance")).toBeVisible();
  const automate = ops.getByRole("note").getByRole("link", {
    name: "Open Automations & Integrations",
    exact: true,
  });
  await monitor.goto("/" + (await automate.getAttribute("href")));
  await card(monitor, "Publish contractor activation")
    .getByRole("button", {
      name: "Publish contractor activation →",
      exact: true,
    })
    .click();
  await expect(portal.getByTestId("lifecycle-eligibility")).toHaveText(
    "Eligible",
  );
  await expect(ops.locator(".ops-company-heading")).toContainText(
    "Eligible for jobs",
  );
  expect(
    await ops.evaluate(() =>
      Object.fromEntries(Object.entries(sessionStorage)),
    ),
  ).toEqual(preferences);
  await expect(ops.getByLabel("Internal role")).toHaveValue("Training");
});

test("Contractor cleanup removes only the eyebrow and prominent strip while retaining discreet simulation disclosure and live synchronization", async ({
  context,
}) => {
  const portal = await workspace(context, "contractor");
  await expect(portal.locator(".demo-banner")).toHaveCount(0);
  await expect(portal.locator("footer")).toContainText(
    "No real authentication or external services",
  );
  await expect(
    portal.getByRole("button", {
      name: "Start a new application",
      exact: false,
    }),
  ).toBeVisible();
  await application(portal, "Clean Portal");
  await expect(portal.getByText("YOUR COMPANY", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    portal.getByRole("heading", { name: "Clean Portal", exact: true }),
  ).toBeVisible();
  await expect(portal.getByTestId("sync-status")).toContainText("Live");
  await expect(portal.locator(".demo-banner")).toHaveCount(0);
});
