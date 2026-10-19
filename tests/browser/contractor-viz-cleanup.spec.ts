import { test, expect, type Page } from "@playwright/test";
import { contractorStates } from "../fixtures/contractorStates";
import { frame13Workspace } from "../fixtures/workspace";
import { type WorkspaceFile } from "../../src/workspace/format";
import { journeyMapLink } from "../../src/presentation";
import { nav, signIn, snapshot, workspace } from "./helpers";

async function load(page: Page, file: WorkspaceFile) {
  await nav(page, "Demo Workspace");
  await page.getByLabel("Workspace JSON file").setInputFiles({
    name: "cleanup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  const dialog = page.getByRole("dialog", { name: "Load workspace?" });
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Confirm Load State", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
}

test("contractor copy addresses an external company and removes only the duplicated application-review row", async ({
  context,
}, info) => {
  const monitor = await workspace(context, "monitor"),
    portal = await workspace(context, "contractor");
  const { files } = await contractorStates();
  await load(monitor, files.submitted);
  await signIn(portal, "alex@example.com");
  const before = await snapshot(portal);
  await expect(
    portal.getByRole("heading", { name: "You're moving forward", exact: true }),
  ).toBeVisible();
  await expect(
    portal.getByRole("region", { name: "What matters now" }),
  ).toContainText("Unity is taking care of the next steps");
  await expect(portal.locator(".contractor-waiting-list")).toHaveCount(0);
  await expect(
    portal.getByRole("region", { name: "What matters now" }),
  ).not.toContainText("Review your application");
  await expect(portal.getByTestId("journey-application")).toContainText(
    "With Unity",
  );
  await expect(portal.locator(".contractor-product")).not.toContainText(
    "Waiting on another team",
  );
  for (const width of [1440, 390]) {
    await portal.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    expect(
      await portal.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await portal.screenshot({
      path: info.outputPath(`contractor-cleanup-${width}.png`),
      fullPage: true,
    });
  }
  expect(await snapshot(portal)).toEqual(before);
  await load(monitor, files["waiting-team"]);
  await expect(portal.getByRole("list", { name: "With Unity" })).toContainText(
    "Compliance",
  );
  await expect(portal.getByTestId("journey-administration")).toContainText(
    "With Unity",
  );
  await expect(portal.locator(".contractor-product")).not.toContainText(
    "Waiting on another team",
  );
});

test("Viz keeps controls next to the map, expands only through pills and clears blocker focus without writes", async ({
  context,
}, info) => {
  const monitor = await workspace(context, "monitor"),
    file = await frame13Workspace();
  await load(monitor, file);
  const recording = file.state.viz!.recordings.find(
    (r) => r.id === file.state.viz!.activeRecordingId,
  )!;
  await monitor.goto(
    "/" +
      journeyMapLink(recording.companyId, recording.workflowId, recording.id),
  );
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    "Frame 13 / 13",
  );
  await monitor.getByLabel("Follow changes", { exact: true }).uncheck();
  const before = await snapshot(monitor);
  const details = monitor.locator(".viz-context");
  await expect(details).not.toHaveAttribute("open", "");
  for (const width of [1440, 390]) {
    await monitor.setViewportSize({
      width,
      height: width === 390 ? 844 : 1000,
    });
    // Follow is off intentionally; explicitly fit the resized review viewport.
    await monitor.getByRole("button", { name: "Fit map", exact: true }).click();
    await expect(monitor.getByTestId("viz-canvas")).toHaveAttribute(
      "data-fitting",
      "false",
    );
    const controls = await monitor.getByLabel("Visual playback").boundingBox();
    const pills = await monitor.getByLabel("Logical groups").boundingBox();
    const canvas = await monitor.getByTestId("viz-canvas").boundingBox();
    expect(pills!.y - (controls!.y + controls!.height)).toBeLessThanOrEqual(12);
    expect(canvas!.y - (pills!.y + pills!.height)).toBeLessThanOrEqual(2);
    expect(
      await monitor.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await monitor.screenshot({
      path: info.outputPath(`viz-cleanup-${width}.png`),
      fullPage: true,
    });
  }
  await monitor.setViewportSize({ width: 1600, height: 1100 });
  await monitor
    .getByRole("button", { name: "Presentation view", exact: true })
    .click();
  await monitor.getByTestId("viz-node-group:Enablement").click();
  const inspector = monitor.getByRole("region", {
    name: "Selected journey step",
  });
  await expect(
    inspector.getByRole("button", { name: "Expand group", exact: true }),
  ).toHaveCount(0);
  const count = await monitor.locator(".react-flow__node").count();
  await inspector.locator(".viz-detail-step").first().click();
  await expect(monitor.locator(".react-flow__node")).toHaveCount(count);
  await expect(
    monitor.getByRole("button", { name: "+ Enablement", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    inspector.getByText("Responsible participant", { exact: true }),
  ).toBeVisible();
  await monitor
    .getByRole("button", { name: "+ Enablement", exact: true })
    .click();
  await expect
    .poll(() => monitor.locator(".react-flow__node").count())
    .toBeGreaterThan(count);
  await monitor
    .getByRole("button", { name: "Close node details", exact: true })
    .click();
  await monitor
    .getByRole("button", { name: "Expand all", exact: true })
    .click();
  await expect(monitor.locator(".react-flow__node")).toHaveCount(37);
  await monitor.getByRole("button", { name: "Fit map", exact: true }).click();
  await expect(monitor.getByTestId("viz-canvas")).toHaveAttribute(
    "data-fitting",
    "false",
  );
  const viewport = monitor.locator(".react-flow__viewport"),
    fullMap = await viewport.getAttribute("style");
  await monitor
    .getByRole("button", { name: "Focus blockers", exact: true })
    .click();
  const clear = monitor.getByRole("button", {
    name: "Clear blocker focus",
    exact: true,
  });
  await expect(clear).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => viewport.getAttribute("style")).not.toBe(fullMap);
  await clear.focus();
  await monitor.keyboard.press("Space");
  await expect(
    monitor.getByRole("button", { name: "Focus blockers", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(viewport).toHaveAttribute("style", fullMap!);
  await monitor
    .getByRole("button", { name: "Focus blockers", exact: true })
    .click();
  await monitor.getByRole("button", { name: "Fit map", exact: true }).click();
  await expect(
    monitor.getByRole("button", { name: "Focus blockers", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await monitor
    .getByRole("button", { name: "Group overview", exact: true })
    .click();
  await monitor
    .getByRole("button", { name: "Focus blockers", exact: true })
    .click();
  await monitor.getByRole("button", { name: "Fit View", exact: true }).click();
  await expect(
    monitor.getByRole("button", { name: "Focus blockers", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(monitor.getByTestId("viz-canvas")).toHaveAttribute(
    "data-fitting",
    "false",
  );
  await monitor.screenshot({
    path: info.outputPath("viz-cleanup-presentation.png"),
    fullPage: false,
  });
  await monitor
    .getByRole("button", { name: "Exit presentation", exact: true })
    .first()
    .click();
  await details.locator("summary").first().focus();
  await monitor.keyboard.press("Enter");
  await expect(monitor.getByTestId("viz-story")).toBeVisible();
  await expect(monitor.getByTestId("viz-frame-cause")).toBeVisible();
  expect(await snapshot(monitor)).toEqual(before);
});
