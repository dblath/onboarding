import { test, expect, type Page } from "@playwright/test";
import {
  card,
  evidence,
  initialReadiness,
  nav,
  inspectCompany,
  publishInitialActivation,
  role,
  snapshot,
  synchronized,
  verify,
  workspace,
} from "./helpers";

async function states(
  pages: Page[],
  onboarding: string,
  readiness: string,
  operational: string,
  eligibility: string,
) {
  for (const page of pages) {
    if (page.url().includes("#/operations"))
      await inspectCompany(page, "Summit Three Tabs");
    await expect(page.getByTestId("lifecycle-onboarding")).toHaveText(
      onboarding,
    );
    await expect(page.getByTestId("lifecycle-readiness")).toHaveText(readiness);
    await expect(page.getByTestId("lifecycle-operational")).toHaveText(
      operational,
    );
    await expect(page.getByTestId("lifecycle-eligibility")).toHaveText(
      eligibility,
    );
  }
  await synchronized(pages);
}
async function invalidate(operations: Page) {
  await role(operations, "Compliance");
  await nav(operations, "Overview");
  await inspectCompany(operations, "Summit Three Tabs");
  await operations
    .getByLabel("Invalidation reason")
    .fill("Demo: approval withdrawn");
  await operations
    .getByRole("button", { name: "Invalidate skill approval" })
    .click();
  await expect(
    operations.getByRole("button", { name: "Invalidate skill approval" }),
  ).toHaveCount(0);
}
test("initial rejection leaves consistent onboarding and no activation or recovery shortcut", async ({
  context,
}) => {
  const contractor = await workspace(context, "contractor"),
    operations = await workspace(context, "operations"),
    monitor = await workspace(context, "monitor"),
    pages = [contractor, operations, monitor];
  await initialReadiness(contractor, operations, false);
  await states(pages, "In progress", "Not ready", "Pending", "Not eligible");
  await expect(
    contractor.getByText(/The initial skill was rejected/),
  ).toBeVisible();
  await expect(card(operations, "Publish contractor activation")).toHaveCount(
    0,
  );
  const s = await snapshot(monitor),
    root = s.workflows.find((w) => w.definitionId === "CompanyOnboarding")!;
  expect(root.status).toBe("Running");
  expect(root.waitingFor).toBe("ContractorReadinessChanged");
  expect(s.workItems.filter((t) => t.status === "Open")).toHaveLength(0);
  await contractor.reload();
  await expect(
    contractor.getByRole("button", { name: "＋ Request qualification" }),
  ).toHaveCount(0);
  await states(pages, "In progress", "Not ready", "Pending", "Not eligible");
});

test("completed onboarding stays frozen through last-skill invalidation and later approval of a pending skill", async ({
  context,
}, testInfo) => {
  const contractor = await workspace(context, "contractor"),
    operations = await workspace(context, "operations"),
    monitor = await workspace(context, "monitor"),
    pages = [contractor, operations, monitor];
  await initialReadiness(contractor, operations);
  await states(pages, "In progress", "Ready", "Pending", "Not eligible");
  await nav(contractor, "Your journey");
  await expect(
    contractor.getByRole("heading", {
      name: "Ready; initial activation pending",
    }),
  ).toBeVisible();
  await publishInitialActivation(operations);
  await states(pages, "Completed", "Ready", "Active", "Eligible");
  const before = await snapshot(monitor),
    completed = before.workflows.find(
      (w) => w.definitionId === "CompanyOnboarding",
    )!;
  await contractor
    .getByLabel("Add another company skill")
    .selectOption("Plumbing");
  await contractor
    .getByRole("button", { name: "＋ Request qualification" })
    .click();
  await expect(
    contractor.getByText("Additional company skill · independent lifecycle"),
  ).toBeVisible();
  await invalidate(operations);
  await states(pages, "Completed", "Not ready", "Suspended", "Not eligible");
  await expect(
    contractor.getByRole("heading", {
      name: "Not ready; onboarding remains completed",
    }),
  ).toBeVisible();
  await expect(
    monitor
      .getByTestId("company-lifecycle-signals")
      .locator("summary")
      .filter({ hasText: "ContractorSuspended" }),
  ).toBeVisible();
  await nav(contractor, "Required actions");
  await evidence(contractor, "Submit license evidence");
  await role(operations, "Compliance");
  await nav(operations, "Work queue");
  await verify(operations, "Verify license");
  await role(operations, "Field Manager");
  const decision = card(operations, "Approve skill qualification");
  await decision
    .getByRole("button", { name: "Record skill decision →" })
    .click();
  await expect(decision).toHaveCount(0);
  await states(pages, "Completed", "Ready", "Suspended", "Not eligible");
  await nav(contractor, "Your journey");
  await expect(
    contractor.getByRole("heading", {
      name: "Ready, but operationally suspended",
    }),
  ).toBeVisible();
  await expect(
    contractor.getByText(
      /Removing it requires a separate administrative request and approval in Iteration 4/,
    ),
  ).toBeVisible();
  await expect(
    contractor.getByRole("button", { name: "＋ Request qualification" }),
  ).toHaveCount(0);
  await expect(card(operations, "Publish contractor activation")).toHaveCount(
    0,
  );
  await expect(
    monitor.getByText("Completed · Onboarding complete"),
  ).toBeVisible();
  await expect(
    monitor
      .getByTestId("company-lifecycle-signals")
      .locator("summary")
      .filter({ hasText: "ContractorReadinessChanged · Ready" }),
  ).toBeVisible();
  let s = await synchronized(pages);
  expect(s.workflows.find((w) => w.id === completed.id)).toEqual(completed);
  expect(s.workItems.filter((t) => t.workflowId === completed.id)).toEqual(
    before.workItems.filter((t) => t.workflowId === completed.id),
  );
  expect(
    s.events.filter((e) => e.eventType === "ContractorActivated"),
  ).toHaveLength(1);
  await Promise.all(pages.map((page) => page.reload()));
  await nav(monitor, "Workflow monitor");
  await states(pages, "Completed", "Ready", "Suspended", "Not eligible");
  s = await snapshot(monitor);
  expect(s.workflows.find((w) => w.id === completed.id)).toEqual(completed);
  for (const page of pages)
    await expect(
      page.getByRole("button", {
        name: /remove suspension|reactivate|resume onboarding/i,
      }),
    ).toHaveCount(0);
  await contractor.evaluate(() => window.scrollTo(0, 0));
  await contractor.screenshot({
    path: testInfo.outputPath("ready-but-suspended.png"),
    fullPage: true,
  });
});

test("readiness loss before first activation cancels the pending activity and does not complete onboarding", async ({
  context,
}) => {
  const contractor = await workspace(context, "contractor"),
    operations = await workspace(context, "operations"),
    monitor = await workspace(context, "monitor"),
    pages = [contractor, operations, monitor];
  await initialReadiness(contractor, operations);
  await states(pages, "In progress", "Ready", "Pending", "Not eligible");
  await invalidate(operations);
  await expect(operations.getByTestId("queue-total")).toHaveText("0");
  await expect(operations.getByTestId("queue-count-Simulation")).toHaveText(
    "0",
  );
  await states(pages, "In progress", "Not ready", "Pending", "Not eligible");
  await expect(card(operations, "Publish contractor activation")).toHaveCount(
    0,
  );
  const s = await snapshot(monitor);
  expect(
    s.workItems.find((t) => t.activity === "PublishActivation")!.status,
  ).toBe("Cancelled");
  expect(
    s.events.filter((e) => e.eventType === "ContractorActivated"),
  ).toHaveLength(0);
});
