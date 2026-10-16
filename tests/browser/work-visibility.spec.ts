import { test, expect, type Page } from "@playwright/test";
import {
  application,
  card,
  completion,
  evidence,
  nav,
  proceed,
  role,
  snapshot,
  synchronized,
  systemActivities,
  verify,
  workspace,
} from "./helpers";

async function participant(page: Page, name: string) {
  const parent = page
    .getByRole("navigation")
    .getByRole("button", { name: "Work queue", exact: true });
  if ((await parent.getAttribute("aria-expanded")) !== "true")
    await parent.click();
  await page.getByRole("button", { name: `${name} work`, exact: true }).click();
}
test("role and company filters preserve global totals, and completed work updates every Operations tab", async ({
  context,
}) => {
  const contractor = await workspace(context, "contractor"),
    first = await workspace(context, "operations"),
    second = await workspace(context, "operations");
  await application(contractor, "Alpha Work");
  await application(contractor, "Beta Work");
  await participant(first, "Recruitment");
  await participant(second, "Finance");
  for (const page of [first, second]) {
    await expect(page.getByTestId("queue-total")).toHaveText("2");
    await expect(page.getByTestId("queue-count-Recruitment")).toHaveText("2");
  }
  const queue = first.getByRole("region", { name: "Operations work queue" });
  await expect(queue.getByTestId("queue-item")).toHaveCount(2);
  for (const role of [
    "Recruitment",
    "Compliance",
    "Finance",
    "Contractor Relations",
    "Field Manager",
    "Training",
    "Contractor",
  ]) {
    await participant(first, role);
    await expect(first.getByTestId("queue-total")).toHaveText("2");
  }
  await participant(first, "Recruitment");
  const s = await snapshot(first),
    beta = s.companies.find((company) => company.name === "Beta Work")!;
  await first.getByLabel("Work queue company").selectOption(beta.id);
  await expect(queue.getByTestId("queue-item")).toHaveCount(1);
  await expect(queue.getByTestId("queue-item")).toContainText("Beta Work");
  await expect(first.getByTestId("queue-total")).toHaveText("2");
  await queue.getByRole("button", { name: "Record decision →" }).click();
  for (const page of [first, second]) {
    await expect(page.getByTestId("queue-total")).toHaveText("5");
    await expect(page.getByTestId("queue-count-Recruitment")).toHaveText("1");
    await expect(page.getByTestId("queue-count-Contractor")).toHaveText("4");
  }
  await participant(first, "Contractor");
  await expect(queue.getByTestId("queue-item")).toHaveCount(4);
  await expect(
    queue.getByRole("link", { name: "Open Contractor Portal ↗" }),
  ).toHaveCount(4);
  await expect(
    queue.getByRole("button", { name: "Submit evidence →" }),
  ).toHaveCount(0);
  await first.getByLabel("Work queue company").selectOption("");
  await participant(first, "All participants");
  await expect(queue.getByTestId("queue-item")).toHaveCount(5);
  const alphaReview = queue
    .getByTestId("queue-item")
    .filter({ hasText: "Alpha Work" });
  await alphaReview.getByLabel("Screening outcome").selectOption("Decline");
  await alphaReview
    .getByLabel("Reason / requested information")
    .fill("Demo company withdrew");
  await alphaReview.getByRole("button", { name: "Record decision →" }).click();
  for (const page of [first, second]) {
    await expect(page.getByTestId("queue-total")).toHaveText("4");
    await expect(page.getByTestId("queue-count-Recruitment")).toHaveText("0");
  }
  await expect(second.getByLabel("Internal role")).toHaveValue("Finance");
  await synchronized([contractor, first, second]);
  const after = await snapshot(first);
  expect(
    after.workItems.filter((task) => task.status === "Completed"),
  ).toHaveLength(2);
  expect(after.workItems.filter((task) => task.status === "Open")).toHaveLength(
    4,
  );
});

test("vendor and activation are discovered in Operations and executed in Monitor; Ready stays ineligible until explicit publication", async ({
  context,
}, testInfo) => {
  const contractor = await workspace(context, "contractor"),
    operations = await workspace(context, "operations"),
    monitor = await workspace(context, "monitor");
  await application(contractor, "Activation Visibility Demo");
  await proceed(operations);
  await nav(contractor, "Required actions");
  for (const label of [
    "Submit insurance evidence",
    "Submit fictional tax / banking pack",
    "Submit simulated agreement",
    "Submit license evidence",
  ])
    await evidence(contractor, label);
  await role(operations, "Compliance");
  await verify(operations, "Review insurance");
  await verify(operations, "Verify license");
  await role(operations, "Finance");
  await verify(operations, "Verify fictional financial pack");
  await role(operations, "Contractor Relations");
  await verify(operations, "Execute simulated agreement");
  await expect(
    operations.getByText("No open work for this participant", { exact: false }),
  ).toBeVisible();
  await expect(
    operations.getByRole("link", { name: "Open Automations & Integrations" }),
  ).toBeVisible();
  await nav(contractor, "Your journey");
  await expect(contractor.getByTestId("eligibility-guidance")).toContainText(
    "Set up the company vendor record",
  );
  await expect(contractor.getByTestId("eligibility-guidance")).toContainText(
    "Operations",
  );
  const vendorLink = operations.getByRole("link", {
    name: "Open Automations & Integrations",
  });
  await monitor.goto("/" + (await vendorLink.getAttribute("href")));
  await expect(monitor.getByTestId("automation-item")).toContainText(
    "Activation Visibility Demo",
  );
  await card(monitor, "Create vendor record")
    .getByRole("button", { name: "Create vendor record →" })
    .click();
  await expect(operations.getByTestId("queue-count-Simulation")).toHaveText(
    "0",
  );
  await role(operations, "Field Manager");
  await card(operations, "Approve skill qualification")
    .getByRole("button", { name: "Record skill decision →" })
    .click();
  await nav(contractor, "Required actions");
  await completion(
    contractor,
    "Complete simulated portal setup",
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
  await nav(contractor, "Your journey");
  await expect(contractor.getByTestId("lifecycle-readiness")).toHaveText(
    "Ready",
  );
  await expect(contractor.getByTestId("lifecycle-operational")).toHaveText(
    "Pending",
  );
  await expect(contractor.getByTestId("lifecycle-eligibility")).toHaveText(
    "Not eligible",
  );
  await expect(contractor.getByTestId("eligibility-guidance")).toContainText(
    "All requirements are complete. Contractor activation is awaiting publication by Operations.",
  );
  await participant(operations, "Training");
  await expect(operations.getByTestId("queue-count-Training")).toHaveText("0");
  await expect(operations.getByTestId("queue-count-Simulation")).toHaveText(
    "1",
  );
  await expect(operations.getByTestId("queue-total")).toHaveText("1");
  await nav(operations, "Overview");
  const activationLink = operations
    .getByTestId("eligibility-guidance")
    .getByRole("link", { name: "Open Automations & Integrations" });
  await monitor.goto("/" + (await activationLink.getAttribute("href")));
  await expect(monitor.getByTestId("automation-item")).toBeFocused();
  const before = await snapshot(operations);
  expect(
    before.workItems
      .filter((task) => task.status === "Open")
      .map((task) => task.activity),
  ).toEqual(["PublishActivation"]);
  expect(
    before.events.filter((event) => event.eventType === "ContractorActivated"),
  ).toHaveLength(0);
  await operations.setViewportSize({ width: 1440, height: 1000 });
  await operations.evaluate(() => window.scrollTo(0, 0));
  await operations.screenshot({
    path: testInfo.outputPath("operations-pending-activation.png"),
    fullPage: true,
  });
  await contractor.setViewportSize({ width: 1440, height: 1000 });
  await contractor.evaluate(() => window.scrollTo(0, 0));
  await contractor.screenshot({
    path: testInfo.outputPath("contractor-activation-blocker.png"),
    fullPage: true,
  });
  await card(monitor, "Publish contractor activation")
    .getByRole("button", { name: "Publish contractor activation →" })
    .click();
  await expect(operations.getByTestId("queue-total")).toHaveText("0");
  await nav(monitor, "Workflow monitor");
  for (const page of [contractor, operations, monitor])
    await expect(page.getByTestId("lifecycle-eligibility")).toHaveText(
      "Eligible",
    );
  await expect(contractor.getByTestId("eligibility-guidance")).toHaveCount(0);
  const after = await synchronized([contractor, operations, monitor]);
  expect(
    after.events.filter((event) => event.eventType === "ContractorActivated"),
  ).toHaveLength(1);
  expect(
    after.workflows.find(
      (workflow) => workflow.definitionId === "CompanyOnboarding",
    )!.status,
  ).toBe("Completed");
});
