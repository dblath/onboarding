import { test, expect, type Page } from "@playwright/test";
import { contractorStates } from "../fixtures/contractorStates";
import { operationsState } from "../fixtures/operationsState";
import { buildScenario } from "../../src/workspace/scenarios";
import type { WorkspaceFile } from "../../src/workspace/format";
import { nav, workspace, signIn, snapshot, synchronized } from "./helpers";

async function load(page: Page, file: WorkspaceFile) {
  await nav(page, "Demo Workspace");
  await page.getByLabel("Workspace JSON file").setInputFiles({
    name: "polish.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  const dialog = page.getByRole("dialog", { name: "Load workspace?" });
  await copyAudit(page);
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Confirm Load State", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
}

/** Normal text/accessible labels/tooltips; explicit raw technical records are faithful exceptions. */
async function copyAudit(page: Page) {
  const matches = await page.evaluate(() => {
    const found: string[] = [];
    const forbidden = /simulat(?:ion|ed|or|ing|e)/i;
    const visible = (el: Element) =>
      (el.closest("option")?.closest("select") ?? el).checkVisibility({
        checkVisibilityCSS: true,
      });
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    while (walker.nextNode()) {
      const el = walker.currentNode.parentElement;
      if (
        el &&
        !el.closest("[data-raw-records],script,style") &&
        visible(el) &&
        forbidden.test(walker.currentNode.textContent ?? "")
      )
        found.push(walker.currentNode.textContent!.trim());
    }
    for (const el of document.querySelectorAll(
      "[aria-label],[title],[placeholder]",
    )) {
      if (!el.closest("[data-raw-records]") && visible(el))
        for (const key of ["aria-label", "title", "placeholder"])
          if (forbidden.test(el.getAttribute(key) ?? ""))
            found.push(`${key}: ${el.getAttribute(key)}`);
    }
    return found;
  });
  expect(matches).toEqual([]);
}

test("one anonymous application CTA, persistent sign-in labels and prominent qualification CTA preserve the existing command", async ({
  context,
}, info) => {
  const portal = await workspace(context, "contractor");
  for (const width of [1440, 390]) {
    await portal.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await expect(portal.locator(".title-row button")).toHaveCount(0);
    await expect(portal.locator("main .portal-marquee-cta")).toHaveCount(1);
    await expect(portal.getByLabel("Email", { exact: true })).toHaveAttribute(
      "type",
      "email",
    );
    await expect(
      portal.getByLabel("Password", { exact: true }),
    ).toHaveAttribute("type", "password");
    await copyAudit(portal);
    await portal.screenshot({
      path: info.outputPath(`landing-${width}.png`),
      fullPage: true,
    });
  }
  const { files } = await contractorStates(),
    monitor = await workspace(context, "monitor");
  await load(monitor, files.eligible);
  await signIn(portal, "alex@example.com");
  const original = await synchronized([portal, monitor]);
  const section = portal.getByRole("region", {
    name: "Separate company activities",
  });
  const cta = section.getByRole("button", {
    name: "＋ Request qualification",
    exact: true,
  });
  await expect(section.locator("button.primary")).toHaveCount(1);
  for (const width of [1440, 390]) {
    await portal.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await expect(cta).toHaveClass("primary");
    const background = await cta.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(background).toBe("rgb(32, 95, 152)");
    await portal.getByLabel("Add another company skill").focus();
    await portal.keyboard.press("Tab");
    await expect(cta).toBeFocused();
    expect(
      await cta.evaluate((el) => getComputedStyle(el).outlineStyle),
    ).not.toBe("none");
    await cta.hover();
    expect(
      await cta.evaluate((el) => getComputedStyle(el).backgroundColor),
    ).not.toBe(background);
    await portal.mouse.move(0, 0);
    expect(
      await portal.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await copyAudit(portal);
    await portal.evaluate(() => scrollTo(0, 0));
    await portal.screenshot({
      path: info.outputPath(`qualifications-${width}.png`),
      fullPage: true,
    });
  }
  expect(await snapshot(portal)).toEqual(original);
  await portal.getByLabel("Add another company skill").selectOption("Plumbing");
  // Hold the existing command lock to observe the real pending/disabled state without sleeps.
  await monitor.evaluate(
    () =>
      new Promise<void>((resolve) => {
        void navigator.locks.request(
          "fieldwork-onboarding:commands:v1",
          () =>
            new Promise<void>((release) => {
              (
                window as unknown as { releasePolishLock: () => void }
              ).releasePolishLock = release;
              resolve();
            }),
        );
      }),
  );
  try {
    await cta.click();
    await expect(cta).toBeDisabled();
  } finally {
    await monitor.evaluate(() =>
      (
        window as unknown as { releasePolishLock: () => void }
      ).releasePolishLock(),
    );
  }
  await expect(
    section
      .locator(".contractor-record-row strong")
      .filter({ hasText: /^Plumbing$/ }),
  ).toBeVisible();
  const after = await synchronized([portal, monitor]);
  expect(after.qualifications).toHaveLength(original.qualifications.length + 1);
  expect(
    after.events.filter((e) => e.eventType === "SkillRequested"),
  ).toHaveLength(
    original.events.filter((e) => e.eventType === "SkillRequested").length + 1,
  );
  expect(
    after.workflows.find((w) => w.id === original.workflows[0].id),
  ).toEqual(original.workflows[0]);
});

test("Operations keeps role work and supporting records clean at both widths without presentation writes", async ({
  context,
}, info) => {
  const monitor = await workspace(context, "monitor");
  await load(monitor, await operationsState());
  const ops = await workspace(context, "operations");
  const before = await synchronized([ops, monitor]);
  for (const width of [1440, 390]) {
    await ops.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await expect(ops.locator(".demo-banner")).toHaveCount(0);
    await expect(ops.locator(".ops-company-row")).toHaveCount(2);
    await copyAudit(ops);
    await ops.screenshot({
      path: info.outputPath(`operations-${width}.png`),
      fullPage: true,
    });
  }
  await ops.setViewportSize({ width: 1440, height: 1000 });
  await ops.getByLabel("Internal role").selectOption("Compliance");
  await ops
    .locator(".ops-company-row")
    .filter({ hasText: "Gamma Services" })
    .click();
  for (const details of await ops
    .locator(".ops-stage,.ops-disclosure,.ops-simulation-options")
    .all()) {
    if ((await details.getAttribute("open")) === null)
      await details.locator("summary").first().click();
  }
  await copyAudit(ops);
  expect(await snapshot(ops)).toEqual(before);
});

test("all Monitor views and workspace dialogs use test vocabulary while raw attempts and pinned recordings remain intact", async ({
  context,
}) => {
  const monitor = await workspace(context, "monitor");
  await load(monitor, await buildScenario("failure"));
  const before = await snapshot(monitor);
  for (const view of [
    "Automations & Integrations",
    "Workflow monitor",
    "Outbox",
    "Recording Triggers",
    "Journey Map",
    "Demo Workspace",
  ]) {
    await nav(monitor, view);
    if (view === "Workflow monitor") {
      for (const control of await monitor
        .locator(".diagnostic-panel button[aria-expanded]")
        .all())
        if ((await control.getAttribute("aria-expanded")) === "false")
          await control.click();
      await expect(
        monitor.locator('[data-raw-records="Activity attempt"]').first(),
      ).toHaveText(before.attempts[0].technicalError!);
    }
    if (view === "Journey Map") {
      await expect(monitor.getByTestId("viz-canvas")).toBeVisible();
      await monitor
        .getByRole("button", { name: "Expand all", exact: true })
        .click();
      await monitor.getByTestId("viz-node-ReviewInsurance").click();
      await monitor
        .getByRole("region", { name: "Selected journey step" })
        .getByText("Events & execution references", { exact: true })
        .click();
      const raw = JSON.parse(
        await monitor.locator('[data-raw-records="Recorded step"]').innerText(),
      );
      expect(raw.state.explanation).toBe(
        before.viz!.recordings[0].frames.at(-1)!.nodes.ReviewInsurance
          .explanation,
      );
    }
    await copyAudit(monitor);
    if (view === "Demo Workspace") {
      await monitor
        .getByRole("button", { name: "Reset Workspace", exact: true })
        .click();
      await copyAudit(monitor);
      await monitor.keyboard.press("Escape");
    }
  }
  expect(await snapshot(monitor)).toEqual(before);
});
