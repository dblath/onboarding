import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { automationOperationsState } from "../fixtures/automationOperations";
import {
  card,
  nav,
  role,
  signIn,
  snapshot,
  synchronized,
  workspace,
} from "./helpers";

async function load(context: BrowserContext) {
  const file = await automationOperationsState(),
    monitor = await workspace(context, "monitor");
  await nav(monitor, "Demo Workspace");
  await monitor.getByLabel("Workspace JSON file").setInputFiles({
    name: "operations-ai.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  const dialog = monitor.getByRole("dialog", { name: "Load workspace?" });
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Confirm Load State", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await nav(monitor, "Automations & Integrations");
  await monitor.getByLabel("Automations company").selectOption("");
  const ops = await workspace(context, "operations");
  await ops.setViewportSize({ width: 1440, height: 1000 });
  await nav(ops, "Work queue");
  return { file, monitor, ops };
}
async function automations(ops: Page) {
  await ops
    .getByRole("button", {
      name: "Automations & Integrations work",
      exact: true,
    })
    .click();
  await expect(ops).toHaveURL(/#\/operations$/);
  await expect(ops.getByLabel("Internal role")).toHaveValue("Simulation");
}
async function select(ops: Page, name: string) {
  const toggle = ops.getByRole("button", { name: /Choose a company/ });
  if (await toggle.isVisible()) await toggle.click();
  await ops.locator(".ops-company-row").filter({ hasText: name }).click();
}

test("A&I is an aligned Operations participant, defaults to owned active companies and remains read-only until an explicit run, at desktop and mobile", async ({
  context,
}, info) => {
  const { file, monitor, ops } = await load(context);
  const before = await synchronized([ops, monitor]);
  const total = before.workItems.filter((t) => t.status === "Open").length;
  await ops.getByRole("button", { name: "All companies", exact: true }).click();
  await automations(ops);
  await expect(
    ops.getByRole("button", { name: "My active work", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(ops.locator(".ops-company-row")).toHaveCount(2);
  expect(
    await ops.locator(".ops-company-row strong").allTextContents(),
  ).toEqual(["Sierra Services", "Echo Services"]);
  expect(await ops.locator(".ops-role-count").allTextContents()).toEqual([
    "1",
    "1",
  ]);
  await expect(ops.getByTestId("queue-total")).toHaveText(String(total));
  await expect(ops.getByTestId("queue-count-Simulation")).toHaveText("2");
  await select(ops, "Sierra Services");
  await expect(card(ops, "Publish contractor activation")).toBeVisible();
  await expect(
    ops.getByText("Onboarding at a glance", { exact: true }),
  ).toBeVisible();
  await expect(
    ops.getByText("Messages & activity history", { exact: true }),
  ).toBeVisible();
  const group = ops.getByRole("group", { name: "Work queue participants" });
  for (const width of [1440, 390]) {
    await ops.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const starts = await group
      .locator(".participant-label")
      .evaluateAll((labels) =>
        labels.map((label) => label.getBoundingClientRect().left),
      );
    expect(Math.max(...starts) - Math.min(...starts)).toBeLessThan(1);
    const divider = group.getByRole("separator");
    await expect(divider).toHaveCount(1);
    const contractor = await group
      .getByRole("button", { name: "Contractor work", exact: true })
      .boundingBox();
    const ai = await group
      .getByRole("button", {
        name: "Automations & Integrations work",
        exact: true,
      })
      .boundingBox();
    const line = await divider.boundingBox();
    expect(line!.y).toBeGreaterThan(contractor!.y + contractor!.height);
    expect(line!.y).toBeLessThan(ai!.y);
    expect(
      await ops.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await ops.evaluate(() => window.scrollTo(0, 0));
    await ops.screenshot({
      path: info.outputPath(`operations-ai-${width}.png`),
      fullPage: true,
    });
  }
  const inspected = await snapshot(ops);
  expect(inspected).toEqual(before);
  await ops.getByRole("button", { name: "All companies", exact: true }).click();
  await expect(ops.locator(".ops-company-row")).toHaveCount(
    file.state.companies.length,
  );
  await ops.reload();
  await expect(ops.getByLabel("Internal role")).toHaveValue("Simulation");
  await expect(
    ops.getByRole("button", { name: "All companies", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await ops.getByLabel("Internal role").selectOption("Recruitment");
  await ops.getByLabel("Internal role").selectOption("Simulation");
  await expect(
    ops.getByRole("button", { name: "My active work", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(ops.locator(".ops-company-row")).toHaveCount(2);
  await expect(ops.getByTestId("queue-total")).toHaveText(String(total));
});

test("canonical verification and A&I runs synchronize both surfaces, failures remain retryable and publication updates Contractor and Viz", async ({
  context,
}, info) => {
  const { monitor, ops } = await load(context);
  const contractor = await workspace(context, "contractor");
  await signIn(contractor, "sierra@example.com");
  await expect(contractor.getByTestId("lifecycle-eligibility")).toHaveText(
    "Not eligible",
  );
  await automations(ops);
  await select(ops, "Echo Services");
  const vendor = card(ops, "Create vendor record");
  await vendor.getByText("Test outcomes", { exact: true }).click();
  await vendor.getByRole("checkbox").check();
  await vendor
    .getByRole("button", { name: "Create vendor record →", exact: true })
    .click();
  await expect(
    vendor.getByRole("button", { name: "↻ Retry activity →", exact: true }),
  ).toBeVisible();
  await expect(vendor.getByRole("status")).toContainText(
    "Retry the same action here or in Workflow Monitor",
  );
  await expect(
    card(monitor, "Create vendor record").getByRole("button", {
      name: "↻ Retry activity →",
      exact: true,
    }),
  ).toBeVisible();
  await expect(ops.getByTestId("queue-count-Simulation")).toHaveText("2");
  await ops.screenshot({
    path: info.outputPath("operations-ai-retry.png"),
    fullPage: true,
  });
  await card(monitor, "Create vendor record")
    .getByRole("button", { name: "↻ Retry activity →", exact: true })
    .click();
  await expect(vendor).toHaveCount(0);
  await expect(
    ops.locator(".ops-company-row").filter({ hasText: "Echo Services" }),
  ).toHaveCount(0);
  await expect(ops.getByTestId("queue-count-Simulation")).toHaveText("1");
  await expect(
    monitor
      .getByTestId("automation-history-item")
      .filter({ hasText: "Create vendor record" })
      .filter({ hasText: "Echo Services" }),
  ).toContainText("Attempt 2: Succeeded");

  // Verification ownership remains Compliance; completion is visible in Monitor history.
  await role(ops, "Compliance");
  await select(ops, "Delta Services");
  await card(ops, "Review insurance")
    .getByRole("button", { name: "Run test verification →", exact: true })
    .click();
  await expect(card(ops, "Review insurance")).toHaveCount(0);
  await expect(
    monitor
      .getByTestId("automation-history-item")
      .filter({ hasText: "Delta Services" }),
  ).toContainText("Review insurance");
  await select(ops, "Gamma Services");
  const license = card(ops, "Verify license");
  await license.getByText("Test outcomes", { exact: true }).click();
  await license.getByRole("checkbox").check();
  await license
    .getByRole("button", { name: "Run test verification →", exact: true })
    .click();
  await expect(
    card(monitor, "Verify license").getByRole("button", {
      name: "↻ Retry activity →",
      exact: true,
    }),
  ).toBeVisible();
  await expect(ops.getByTestId("queue-count-Compliance")).toHaveText("2");
  await expect(ops.getByTestId("queue-count-Simulation")).toHaveText("1");
  await card(monitor, "Verify license")
    .getByRole("button", { name: "↻ Retry activity →", exact: true })
    .click();
  await expect(license).toHaveCount(0);
  await expect(ops.getByTestId("queue-count-Compliance")).toHaveText("1");

  await automations(ops);
  await select(ops, "Sierra Services");
  const before = await synchronized([ops, monitor, contractor]);
  const sierra = before.companies.find((c) => c.name === "Sierra Services")!;
  const recording = before.viz!.recordings.find(
    (r) => r.companyId === sierra.id,
  )!;
  await expect(card(monitor, "Publish contractor activation")).toBeVisible();
  // Fail from Monitor, then retry the very same system WorkItem from Operations.
  await card(monitor, "Publish contractor activation")
    .getByRole("checkbox")
    .check();
  await card(monitor, "Publish contractor activation")
    .getByRole("button", {
      name: "Publish contractor activation →",
      exact: true,
    })
    .click();
  await card(ops, "Publish contractor activation")
    .getByRole("button", { name: "↻ Retry activity →", exact: true })
    .click();
  await expect(card(monitor, "Publish contractor activation")).toHaveCount(0);
  await expect(card(ops, "Publish contractor activation")).toHaveCount(0);
  await expect(ops.locator(".ops-company-row")).toHaveCount(0);
  await expect(ops.getByTestId("queue-count-Simulation")).toHaveText("0");
  await expect(contractor.getByTestId("lifecycle-eligibility")).toHaveText(
    "Eligible",
  );
  const after = await synchronized([ops, monitor, contractor]);
  expect(
    after.companies.find((c) => c.id === sierra.id)!.activationStatus,
  ).toBe("Active");
  expect(
    after.events.filter(
      (e) => e.eventType === "ContractorActivated" && e.companyId === sierra.id,
    ),
  ).toHaveLength(1);
  const continued = after.viz!.recordings.find((r) => r.id === recording.id)!;
  expect(continued.frames.slice(0, recording.frames.length)).toEqual(
    recording.frames,
  );
  expect(continued.frames.length).toBeGreaterThan(recording.frames.length);
  expect(continued.status).toBe("Completed");
  for (const t of after.workItems.filter(
    (t) => t.activity === "CreateVendor" || t.activity === "PublishActivation",
  )) {
    expect(t.owner).toBe("Simulation");
  }
  const total = after.workItems.filter((t) => t.status === "Open").length;
  await expect(ops.getByTestId("queue-total")).toHaveText(String(total));
  await monitor.screenshot({
    path: info.outputPath("monitor-shared-history.png"),
    fullPage: true,
  });
});

test("contested Operations and Monitor publication completes once and rejects the stale command", async ({
  context,
}) => {
  const { monitor, ops } = await load(context);
  await automations(ops);
  await select(ops, "Sierra Services");
  const before = await synchronized([ops, monitor]);
  const task = before.workItems.find(
    (t) => t.activity === "PublishActivation" && t.status === "Open",
  )!;
  for (const page of [ops, monitor])
    await expect(card(page, "Publish contractor activation")).toBeVisible();
  await monitor.evaluate(
    () =>
      new Promise<void>((acquired) => {
        void navigator.locks.request(
          "fieldwork-onboarding:commands:v1",
          async () => {
            await new Promise<void>((release) => {
              (
                window as unknown as { releaseReviewLock: () => void }
              ).releaseReviewLock = release;
              acquired();
            });
          },
        );
      }),
  );
  try {
    await Promise.all(
      [ops, monitor].map((page) =>
        card(page, "Publish contractor activation")
          .getByRole("button", {
            name: "Publish contractor activation →",
            exact: true,
          })
          .click(),
      ),
    );
    await expect
      .poll(() =>
        monitor.evaluate(
          async () => (await navigator.locks.query()).pending?.length,
        ),
      )
      .toBe(2);
  } finally {
    await monitor.evaluate(() =>
      (
        window as unknown as { releaseReviewLock: () => void }
      ).releaseReviewLock(),
    );
  }
  for (const page of [ops, monitor])
    await expect(card(page, "Publish contractor activation")).toHaveCount(0);
  const after = await synchronized([ops, monitor]);
  expect(
    after.events.filter((e) => e.eventType === "ContractorActivated"),
  ).toHaveLength(1);
  expect(after.attempts.filter((a) => a.workItemId === task.id)).toHaveLength(
    1,
  );
  expect(
    after.workItems.find((t) => t.id === task.id)!.completionHistory,
  ).toHaveLength(1);
  expect(
    (
      await Promise.all(
        [ops, monitor].map((p) => p.getByRole("alert").allTextContents()),
      )
    )
      .flat()
      .join(" "),
  ).toContain("This work item is no longer available for this action.");
  await expect(ops.getByTestId("queue-count-Simulation")).toHaveText("1");
});
