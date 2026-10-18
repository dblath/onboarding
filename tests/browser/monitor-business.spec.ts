import { test, expect, type Page } from "@playwright/test";
import { monitorStates } from "../fixtures/monitorStates";
import { contractorStates } from "../fixtures/contractorStates";
import {
  createWorkspaceFile,
  type WorkspaceFile,
} from "../../src/workspace/format";
import { testService } from "../../src/testing";
import { businessEventLabel, monitorSummary } from "../../src/monitorModel";
import { card, signIn, snapshot, synchronized, workspace } from "./helpers";

async function navigate(page: Page, name: string) {
  await page
    .getByRole("navigation")
    .getByRole("button", {
      name: name === "Demo Workspace" ? "Workspace" : name,
      exact: true,
    })
    .click();
}
async function load(page: Page, file: WorkspaceFile) {
  await navigate(page, "Demo Workspace");
  await page.getByLabel("Workspace JSON file").setInputFiles({
    name: "monitor-review.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  const dialog = page.getByRole("dialog", { name: "Load workspace?" });
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Confirm Load State", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await navigate(page, "Workflow monitor");
  await expect(
    page.getByRole("region", { name: "Onboarding overview", exact: true }),
  ).toBeVisible();
}
async function choose(page: Page, name: string) {
  const toggle = page.getByRole("button", { name: /Choose a company/ });
  if (await toggle.isVisible()) await toggle.click();
  await page
    .locator(".mon-company-row")
    .filter({ has: page.getByText(name, { exact: true }) })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}
async function fits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test("business Monitor projects six lifecycle situations, parallel owners and full diagnostics without writes at 1440/390", async ({
  context,
}, info) => {
  test.setTimeout(120000);
  const page = await context.newPage();
  await page.goto("/#/monitor");
  await expect(
    page.getByRole("heading", { name: "Workflow Monitor", exact: true }),
  ).toBeVisible();
  const files = await monitorStates();
  for (const key of [
    "submitted",
    "parallel",
    "correction",
    "failure",
    "activation",
    "independent",
  ] as const) {
    const file = files[key];
    await load(page, file);
    const name =
      key === "parallel" ? "Gamma Services" : file.state.companies[0].name;
    await choose(page, name);
    const before = await snapshot(page);
    for (const [metric, value] of Object.entries(monitorSummary(before))) {
      if (metric !== "captureIssues")
        await expect(page.getByTestId(`monitor-${metric}`)).toHaveText(
          String(value),
        );
    }
    const tech = page.locator(".mon-technical");
    await expect(tech).not.toHaveAttribute("open");
    await expect(
      page.getByRole("heading", { name: "Execution history", exact: true }),
    ).not.toBeVisible();
    const work = page.getByRole("region", { name: "Current work and waits" });
    const attention = page.getByRole("region", {
      name: "Needs attention",
      exact: true,
    });
    if (key === "submitted") {
      await expect(work).toContainText("Recruitment");
      await expect(attention).toContainText("No intervention is required");
    }
    if (key === "parallel") {
      await expect(work).toContainText("Compliance");
      await expect(work).toContainText("Contractor");
      await expect(work.locator(".mon-work li")).toHaveCount(4);
      await page
        .getByLabel("Journey attention filter")
        .selectOption("attention");
      await expect(page.locator(".mon-company-row")).toHaveCount(1);
      await page.getByLabel("Journey attention filter").selectOption("all");
      await choose(page, name);
    }
    if (key === "correction")
      await expect(attention).toContainText(
        "Insurance correction · Contractor",
      );
    if (key === "failure") {
      await expect(attention).toContainText("retry available");
      await expect(
        attention.getByRole("link", { name: /Review and retry/ }),
      ).toHaveAttribute("href", /view=automations.*activity=/);
      await expect(attention.getByRole("button")).toHaveCount(0);
    }
    if (key === "activation") {
      await expect(attention).toContainText("not yet eligible for jobs");
      await expect(
        attention.getByRole("link", { name: /Open activation publication/ }),
      ).toHaveAttribute("href", /workflow=/);
    }
    if (key === "independent") {
      await expect(page.locator(".mon-status")).toContainText(
        "Onboarding complete · additional qualification underway",
      );
      await expect(page.locator(".mon-independent")).toContainText("Plumbing");
      await page
        .getByRole("button", { name: "View qualification", exact: true })
        .click();
      await expect(
        page
          .getByLabel("Onboarding journey", { exact: true })
          .locator("option:checked"),
      ).toContainText("Plumbing independent qualification");
      await expect(work).toContainText("separate from company onboarding");
      await expect(work.locator(".mon-work li")).toHaveCount(1);
      await page
        .getByLabel("Onboarding journey", { exact: true })
        .selectOption(
          before.workflows.find((w) => w.definitionId === "CompanyOnboarding")!
            .id,
        );
    }
    // All disclosure/selection/filter/chronology operations are presentation-only.
    await page.locator(".mon-progress summary").first().click();
    const allChanges = page.locator(".mon-more summary");
    if (await allChanges.count()) await allChanges.click();
    const events = before.events.filter(
      (e) => e.companyId === before.companies.find((c) => c.name === name)!.id,
    );
    const chronology = page.getByRole("region", {
      name: "Business chronology",
    });
    await expect(chronology).toContainText(
      businessEventLabel(events[0], before)!,
    );
    await tech.locator(":scope > summary").click();
    await expect(
      page.getByRole("heading", { name: "Execution history", exact: true }),
    ).toBeVisible();
    const root = before.workflows.find(
      (w) =>
        w.companyId === events[0].companyId &&
        w.definitionId === "CompanyOnboarding",
    )!;
    await expect(page.locator(".timeline li")).toHaveCount(root.history.length);
    for (const title of [
      "Expected events & owners",
      "Correlation",
      "Activity attempts",
      "Completed & pending work",
    ]) {
      await page.getByRole("button", { name: title, exact: false }).click();
    }
    await expect(page.locator(".correlation")).toContainText(root.id);
    await page.locator(".monitor details > summary").first().click();
    await expect(
      page.locator('[data-raw-records="Event envelope"]').first(),
    ).toContainText(root.correlationId);
    await tech.locator(":scope > summary").click();
    expect(await snapshot(page)).toEqual(before);
    await page.locator(".mon-progress details[open] > summary").click();
    if (await allChanges.count()) await allChanges.click();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await fits(page);
      if (width === 390) {
        await choose(page, name);
        await page.locator(".mon-technical > summary").focus();
        await page.keyboard.press("Enter");
        await expect(tech).toHaveAttribute("open", "");
        await fits(page);
        await page.keyboard.press("Enter");
      }
      if (
        (key === "parallel" && width === 1440) ||
        (key === "activation" && width === 1440) ||
        (key === "independent" && width === 390)
      ) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({
          path: info.outputPath(`${key}-${width}.png`),
          fullPage: true,
        });
      }
    }
    expect(await snapshot(page)).toEqual(before);
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
});

test("Monitor recording links select the exact mid-workflow journey without changing capture, frames or another viewer", async ({
  context,
}, info) => {
  const page = await context.newPage();
  await page.goto("/#/monitor");
  const file = (await monitorStates()).recordings;
  await load(page, file);
  await choose(page, file.state.companies[0].name);
  await expect(page.locator(".mon-recording")).toHaveCount(3);
  const second = await context.newPage();
  await second.goto("/#/monitor");
  const before = await synchronized([page, second]);
  const mid = before.viz!.recordings.find(
    (r) =>
      before.events.find((e) => e.eventId === r.originEventId)?.eventType ===
      "ScreeningDecisionRecorded",
  )!;
  const child = before.viz!.recordings.find(
    (r) =>
      before.events.find((e) => e.eventId === r.originEventId)?.eventType ===
      "SkillRequested",
  )!;
  await page.locator(`.mon-recording[href*="recording=${mid.id}"]`).click();
  await expect(page.getByLabel("Recording", { exact: true })).toHaveValue(
    mid.id,
  );
  await expect(page.getByTestId("viz-frame-number")).toHaveText("Frame 0 / 0");
  await page.getByLabel("Recording", { exact: true }).selectOption(child.id);
  await navigate(page, "Workflow monitor");
  await expect(
    page.getByLabel("Onboarding journey", { exact: true }),
  ).toHaveValue(child.workflowId);
  await page.locator(`.mon-recording[href*="recording=${mid.id}"]`).click();
  await second.goto(
    `/#/monitor?view=journey&company=${mid.companyId}&workflow=${child.workflowId}&recording=${child.id}`,
  );
  await expect(second.getByLabel("Recording", { exact: true })).toHaveValue(
    child.id,
  );
  await page.getByRole("button", { name: "Expand all", exact: true }).click();
  await expect(page.locator(".react-flow__node-journey")).toHaveCount(37);
  await page.screenshot({
    path: info.outputPath("contextual-mid-workflow.png"),
    fullPage: false,
  });
  expect(await synchronized([page, second])).toEqual(before);
  // A deliberate new capture in another tab must not move this existing contextual view.
  await second
    .getByLabel("Originating event", { exact: true })
    .selectOption(before.events[0].eventId);
  await second
    .getByRole("button", { name: "Track journey", exact: true })
    .click();
  await expect(second.getByTestId("viz-frame-number")).toHaveText(
    "Frame 0 / 0",
  );
  const after = await synchronized([page, second]);
  expect(after.viz!.recordings).toHaveLength(4);
  await expect(second).toHaveURL(
    new RegExp(`recording=${after.viz!.activeRecordingId}`),
  );
  await expect(page.getByLabel("Recording", { exact: true })).toHaveValue(
    mid.id,
  );
  expect(after.events).toEqual(before.events);
  expect(after.workflows).toEqual(before.workflows);
  expect(after.viz!.recordings.find((r) => r.id === mid.id)).toEqual(mid);
});

test("business attention links preserve activity context; only explicit Automations actions retry or publish across tabs", async ({
  context,
}) => {
  const monitor = await context.newPage();
  await monitor.goto("/#/monitor");
  const files = await monitorStates();
  await load(monitor, files.failure);
  await choose(monitor, files.failure.state.companies[0].name);
  const before = await snapshot(monitor);
  const failed = before.workItems.find(
    (t) =>
      t.status === "Open" &&
      before.attempts.some(
        (a) => a.workItemId === t.id && a.status === "Failed",
      ),
  )!;
  await monitor
    .getByRole("link", { name: /Review and retry in Automations/ })
    .click();
  await expect(monitor).toHaveURL(
    new RegExp(
      `company=${failed.companyId}.*activity=${failed.id}.*workflow=${failed.workflowId}`,
    ),
  );
  await expect(monitor.locator(".automation-selected")).toHaveAttribute(
    "data-activity",
    failed.id,
  );
  expect(await snapshot(monitor)).toEqual(before);
  await monitor
    .locator(".automation-selected")
    .getByRole("button", { name: /Retry activity/ })
    .click();
  await expect(
    monitor.locator(`.automation-item[data-activity="${failed.id}"]`),
  ).toHaveCount(0);
  expect((await snapshot(monitor)).attempts.length).toBe(
    before.attempts.length + 1,
  );
  await load(monitor, files.activation);
  await choose(monitor, files.activation.state.companies[0].name);
  const contractor = await workspace(context, "contractor");
  await signIn(contractor, "alex@example.com");
  const ops = await workspace(context, "operations");
  const ready = await synchronized([monitor, contractor, ops]);
  await expect(contractor.getByTestId("lifecycle-eligibility")).toContainText(
    "Not eligible",
  );
  await monitor
    .getByRole("link", { name: /Open activation publication/ })
    .click();
  expect(await snapshot(monitor)).toEqual(ready);
  await card(monitor, "Publish contractor activation")
    .getByRole("button", { name: /Publish contractor activation/ })
    .click();
  await expect(card(monitor, "Publish contractor activation")).toHaveCount(0);
  await expect(contractor.getByTestId("lifecycle-eligibility")).toHaveText(
    "Eligible",
  );
  await synchronized([monitor, contractor, ops]);
  await navigate(monitor, "Workflow monitor");
  await expect(monitor.getByTestId("monitor-completed")).toHaveText("1");
  await expect(monitor.locator(".mon-company-row")).toHaveCount(0);
  await monitor
    .getByRole("button", { name: "All companies", exact: true })
    .click();
  await choose(monitor, ready.companies[0].name);
  await expect(monitor.locator(".mon-status")).toContainText(
    "eligible for jobs",
  );
});

test("390px Contractor nav remains reachable and qualification choices block duplicates but allow rejected/invalidated requalification", async ({
  context,
}, info) => {
  const monitor = await context.newPage();
  await monitor.goto("/#/monitor");
  const { files, states } = await contractorStates();
  await load(monitor, files.eligible);
  const portal = await workspace(context, "contractor");
  await portal.setViewportSize({ width: 390, height: 844 });
  await signIn(portal, "alex@example.com");
  const before = await synchronized([monitor, portal]);
  await portal.evaluate(() => scrollTo(0, 0));
  for (const button of await portal
    .getByRole("navigation")
    .getByRole("button")
    .all()) {
    const box = (await button.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await expect(button).toBeInViewport();
  }
  await portal.getByRole("button", { name: /New application/ }).click();
  await expect(portal.getByLabel("Fictional company name")).toBeVisible();
  await navigate(portal, "Your journey");
  expect(await snapshot(portal)).toEqual(before);
  const choice = portal.getByLabel("Add another company skill");
  await expect(choice.locator('option[value="HVAC"]')).toHaveJSProperty(
    "disabled",
    true,
  );
  await expect(choice.locator('option[value="HVAC"]')).toHaveText(
    "HVAC — already approved",
  );
  await expect(choice).toHaveValue("Plumbing");
  await portal.screenshot({
    path: info.outputPath("contractor-mobile-nav-choices.png"),
    fullPage: true,
  });
  await portal.getByRole("button", { name: /Request qualification/ }).click();
  await expect(choice).toBeDisabled();
  await expect(
    portal.getByRole("button", { name: /Request qualification/ }),
  ).toBeDisabled();
  const pending = await synchronized([portal, monitor]);
  expect(pending.qualifications).toHaveLength(before.qualifications.length + 1);
  expect(pending.workflows[0]).toEqual(before.workflows[0]);

  // Both recovery fixtures are made through unmodified normal commands, retaining another approved skill.
  let state = structuredClone(states.eligible);
  const service = testService({
    load: async () => structuredClone(state),
    save: async (s) => {
      state = structuredClone(s);
    },
  });
  const company = state.companies[0].id;
  const review = async (approve: boolean) => {
    const task = (a: string) =>
      state.workItems.find((t) => t.activity === a && t.status === "Open")!.id;
    await service.submitEvidence(task("SubmitLicense"), "Valid demo document");
    await service.executeActivity(task("VerifyLicense"));
    await service.decideSkill(
      task("ApproveSkill"),
      approve,
      "Qualification review complete.",
    );
  };
  await service.requestSkill(company, "Plumbing");
  await review(false);
  const rejected = createWorkspaceFile(
    state,
    "Rejected independent skill",
    "Ready and Active company can request again.",
  );
  await service.requestSkill(company, "Plumbing");
  await review(true);
  await service.invalidateSkill(
    state.qualifications.find(
      (q) => q.skill === "Plumbing" && q.status === "Approved",
    )!.id,
    "Approval withdrawn for review.",
  );
  const invalidated = createWorkspaceFile(
    state,
    "Invalidated independent skill",
    "Original approved HVAC retains readiness and activation.",
  );
  for (const file of [rejected, invalidated]) {
    await load(monitor, file);
    // The same company remains present; the existing tab-local session is retained.
    await synchronized([portal, monitor]);
    await expect(choice).toHaveValue("Plumbing");
    await expect(choice.locator('option[value="Plumbing"]')).toHaveJSProperty(
      "disabled",
      false,
    );
    await portal.getByRole("button", { name: /Request qualification/ }).click();
    await expect(choice).toBeDisabled();
    const after = await synchronized([portal, monitor]);
    expect(after.qualifications.length).toBe(
      file.state.qualifications.length + 1,
    );
    expect(after.workflows[0]).toEqual(file.state.workflows[0]);
  }
  await fits(portal);
});
