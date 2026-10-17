import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import {
  application,
  card,
  completion,
  evidence,
  nav,
  proceed,
  role,
  signIn,
  snapshot,
  synchronized,
  workspace,
} from "./helpers";
import { parseWorkspaceFile } from "../../src/workspace/format";

test.use({ viewport: { width: 1600, height: 1100 } });
function recordWriteMetrics() {
  const metrics: {
    revision: number;
    bytes: number;
    putCallMs: number;
    transactionMs: number;
    applicationCommitMs?: number;
  }[] = [];
  (window as unknown as { writeMetrics: typeof metrics }).writeMetrics =
    metrics;
  let applicationStart: number | undefined;
  document.addEventListener(
    "submit",
    (e) => {
      if (
        (e.target as HTMLFormElement).textContent?.includes(
          "Submit application",
        )
      )
        applicationStart = performance.now();
    },
    true,
  );
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args: Parameters<typeof put>) {
    const start = performance.now(),
      result = put.apply(this, args),
      putCallMs = performance.now() - start;
    if (this.name === "state") {
      const value = args[0],
        commandStart = applicationStart;
      applicationStart = undefined;
      const bytes = new TextEncoder().encode(JSON.stringify(value)).length;
      this.transaction.addEventListener("complete", () =>
        metrics.push({
          revision: value.revision,
          bytes,
          putCallMs,
          transactionMs: performance.now() - start,
          ...(commandStart === undefined
            ? {}
            : { applicationCommitMs: performance.now() - commandStart }),
        }),
      );
    }
    return result;
  };
}
async function trigger(page: Page, name: string, kind: string) {
  await nav(page, "Recording Triggers");
  await page.getByLabel("Trigger name", { exact: true }).fill(name);
  await page.getByLabel("Capture point", { exact: true }).selectOption(kind);
  await page.getByLabel("Enable this trigger", { exact: true }).check();
  await page
    .getByRole("button", { name: "Create trigger", exact: true })
    .click();
  await expect(page.getByRole("article", { name, exact: true })).toBeVisible();
}
async function restore(page: Page, buffer: Buffer) {
  await nav(page, "Demo Workspace");
  await page
    .getByLabel("Workspace JSON file")
    .setInputFiles({ name: "net.json", mimeType: "application/json", buffer });
  const dialog = page.getByRole("dialog", { name: "Load workspace?" });
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Confirm Load State", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
}

test("automatic journeys capture with Monitor closed, synchronize, filter, stop independently and round-trip trigger configuration", async ({
  context,
}, info) => {
  const first = await workspace(context, "contractor"),
    second = await workspace(context, "contractor");
  let monitor = await workspace(context, "monitor");
  const manager = await workspace(context, "monitor");
  await nav(monitor, "Recording Triggers");
  await expect(monitor.getByLabel("Enable this trigger")).not.toBeChecked();
  await trigger(monitor, "Application net", "application");
  await nav(manager, "Recording Triggers");
  await expect(
    manager.getByRole("article", { name: "Application net", exact: true }),
  ).toContainText("Enabled");
  await monitor.screenshot({
    path: info.outputPath("recording-triggers.png"),
    fullPage: true,
  });
  await monitor.close();
  await manager.close();
  await application(first, "Net Alpha", "alpha@example.com");
  await application(second, "Net Beta", "beta@example.com");
  await application(first, "Net Gamma", "gamma@example.com");
  monitor = await workspace(context, "monitor");
  await nav(monitor, "Journey Map");
  let state = await snapshot(monitor);
  expect(state.viz!.recordings).toHaveLength(3);
  expect(
    state.viz!.recordings.every(
      (r) => r.frames.length === 1 && r.status === "Recording",
    ),
  ).toBe(true);
  const alpha = state.viz!.recordings.find(
      (r) => r.companyName === "Net Alpha",
    )!,
    beta = state.viz!.recordings.find((r) => r.companyName === "Net Beta")!;
  await monitor.getByLabel("Recording", { exact: true }).selectOption(alpha.id);
  const opsA = await workspace(context, "operations"),
    opsB = await workspace(context, "operations");
  await opsA.getByLabel("Work queue company").selectOption(alpha.companyId);
  await opsB.getByLabel("Work queue company").selectOption(beta.companyId);
  await Promise.all([proceed(opsA), proceed(opsB)]);
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    "Frame 1 / 1",
  );
  await nav(second, "Required actions");
  await evidence(second, "Submit insurance evidence");
  state = await synchronized([monitor, first, second, opsA, opsB]);
  expect(
    state.viz!.recordings.find((r) => r.id === alpha.id)!.frames,
  ).toHaveLength(2);
  expect(
    state.viz!.recordings.find((r) => r.id === beta.id)!.frames,
  ).toHaveLength(3);
  expect(state.viz!.recordings.every((r) => r.status === "Recording")).toBe(
    true,
  );
  await monitor.screenshot({
    path: info.outputPath("multiple-live-recordings.png"),
    fullPage: true,
  });
  const untouched = await snapshot(monitor);
  await monitor.getByLabel("Recording company").selectOption(beta.companyId);
  await expect(monitor.locator(".recording-table tbody tr")).toHaveCount(1);
  await monitor.locator(".recording-table").getByRole("button").click();
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    "Frame 2 / 2",
  );
  await monitor.getByLabel("Visual history").fill("0");
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    "Frame 0 / 2",
  );
  await monitor
    .getByRole("button", { name: "Return to Live", exact: true })
    .click();
  expect(await snapshot(monitor)).toEqual(untouched);
  await monitor.getByLabel("Recording", { exact: true }).selectOption(alpha.id);
  await monitor
    .getByRole("button", { name: "Stop recording", exact: true })
    .click();
  await expect(
    monitor.getByText("Stopped · recorded history", { exact: true }),
  ).toBeVisible();
  const controls = await workspace(context, "monitor");
  await nav(controls, "Recording Triggers");
  const rule = controls.getByRole("article", {
    name: "Application net",
    exact: true,
  });
  await expect(rule).toContainText("3 occurrences");
  await rule.getByRole("button", { name: "Edit", exact: true }).click();
  await controls
    .getByLabel("Trigger name", { exact: true })
    .fill("Meeting net");
  await controls
    .getByRole("button", { name: "Save trigger", exact: true })
    .click();
  const renamed = controls.getByRole("article", {
    name: "Meeting net",
    exact: true,
  });
  await renamed.getByRole("button", { name: "Disable", exact: true }).click();
  await expect(renamed).toContainText("Disabled");
  await application(first, "No net", "none@example.com");
  await evidence(second, "Submit license evidence");
  state = await synchronized([monitor, first, second, controls]);
  expect(state.viz!.recordings).toHaveLength(3);
  expect(
    state.viz!.recordings.find((r) => r.id === beta.id)!.frames,
  ).toHaveLength(4);
  expect(
    state.viz!.recordings.find((r) => r.id === alpha.id)!.frames,
  ).toHaveLength(2);
  await nav(controls, "Demo Workspace");
  await controls
    .getByLabel("Scenario name", { exact: true })
    .fill("Fishing net meeting");
  const downloaded = controls.waitForEvent("download");
  await controls
    .getByRole("button", { name: "Download JSON", exact: true })
    .click();
  const download = await downloaded,
    path = info.outputPath("fishing-net-workspace.json");
  await download.saveAs(path);
  const buffer = await fs.readFile(path),
    file = parseWorkspaceFile(buffer.toString());
  expect(file.formatVersion).toBe(2);
  expect(file.state.viz!.triggers![0].enabled).toBe(false);
  await controls
    .getByRole("button", { name: "Reset Workspace", exact: true })
    .click();
  const reset = controls.getByRole("dialog", { name: "Reset workspace?" });
  await reset
    .getByLabel("Type RESET to permanently clear the workspace")
    .fill("RESET");
  await reset
    .getByRole("button", { name: "Permanently Reset Workspace", exact: true })
    .click();
  await expect(reset).not.toBeVisible();
  expect((await snapshot(controls)).viz).toBeUndefined();
  await restore(controls, buffer);
  await synchronized([monitor, controls, opsA, opsB, first, second]);
  state = await snapshot(controls);
  expect(state.viz).toEqual(file.state.viz);
  await monitor.reload();
  await nav(monitor, "Journey Map");
  await monitor.getByLabel("Show recordings").selectOption("history");
  await expect(monitor.locator(".recording-table tbody tr")).toHaveCount(1);
  await monitor.getByLabel("Show recordings").selectOption("current");
  await expect(monitor.locator(".recording-table tbody tr")).toHaveCount(2);
  await nav(controls, "Recording Triggers");
  await controls
    .getByRole("article", { name: "Meeting net", exact: true })
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await expect(controls.getByRole("article")).toHaveCount(0);
  expect((await snapshot(controls)).viz!.recordings).toHaveLength(3);
});

test("twelve simultaneous company and skill captures measure real IndexedDB writes and remain isolated", async ({
  context,
  browser,
}, info) => {
  await context.addInitScript(recordWriteMetrics);
  const baselineContext = await browser.newContext({
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1600, height: 1100 },
  });
  await baselineContext.addInitScript(recordWriteMetrics);
  const baselinePortal = await workspace(baselineContext, "contractor"),
    baselineOps = await workspace(baselineContext, "operations");
  for (let i = 1; i <= 10; i++)
    await application(baselinePortal, `Fleet ${i}`, `fleet${i}@example.com`);
  const baselineCompanies = (await snapshot(baselinePortal)).companies;
  for (const c of baselineCompanies.slice(0, 2)) {
    await baselineOps.getByLabel("Work queue company").selectOption(c.id);
    await proceed(baselineOps);
  }
  const baseline = await snapshot(baselinePortal);
  const baselineWrites = await Promise.all(
    [baselinePortal, baselineOps].map((p) =>
      p.evaluate(
        () => (window as unknown as { writeMetrics: unknown[] }).writeMetrics,
      ),
    ),
  );
  await baselineContext.close();
  const contractor = await workspace(context, "contractor"),
    monitor = await workspace(context, "monitor"),
    operations = await workspace(context, "operations");
  await trigger(monitor, "Fleet applications", "application");
  await trigger(monitor, "Fleet skills", "skill");
  const actionMs: number[] = [];
  for (let i = 1; i <= 10; i++) {
    const start = performance.now();
    await application(contractor, `Fleet ${i}`, `fleet${i}@example.com`);
    actionMs.push(performance.now() - start);
  }
  let state = await snapshot(monitor);
  expect(
    state.viz!.recordings.filter((r) => r.status === "Recording"),
  ).toHaveLength(10);
  await operations
    .getByLabel("Work queue company")
    .selectOption(state.companies[0].id);
  await proceed(operations);
  await operations
    .getByLabel("Work queue company")
    .selectOption(state.companies[1].id);
  await proceed(operations);
  state = await synchronized([contractor, monitor, operations]);
  expect(
    state.viz!.recordings.filter((r) => r.status === "Recording"),
  ).toHaveLength(12);
  expect(
    state.viz!.recordings.filter(
      (r) => r.definition.workflowName === "SkillQualification",
    ),
  ).toHaveLength(2);
  expect(state.viz!.triggers!.map((t) => t.fireCount)).toEqual([10, 2]);
  await nav(monitor, "Journey Map");
  await expect(monitor.locator(".recording-table tbody tr")).toHaveCount(12);
  await monitor.screenshot({
    path: info.outputPath("twelve-live-recordings.png"),
    fullPage: true,
  });
  for (const r of state.viz!.recordings) {
    const scoped = new Set(
      state.workflows
        .filter((w) => r.workflowIds.includes(w.id))
        .flatMap((w) => w.processedEventIds),
    );
    expect(r.seen.every((identity) => scoped.has(identity))).toBe(true);
  }
  const writes = await Promise.all(
    [contractor, monitor, operations].map((p) =>
      p.evaluate(
        () => (window as unknown as { writeMetrics: unknown[] }).writeMetrics,
      ),
    ),
  );
  const metrics = {
    companies: state.companies.length,
    simultaneousRecordings: 12,
    workflows: state.workflows.length,
    frames: state.viz!.recordings.reduce((n, r) => n + r.frames.length, 0),
    workspaceBytes: Buffer.byteLength(JSON.stringify(state)),
    prettyExportBytes: Buffer.byteLength(
      JSON.stringify(
        {
          format: "unity-fieldwork-workspace",
          formatVersion: 2,
          exportedAt: new Date().toISOString(),
          scenario: {
            name: "Fleet",
            description: "Twelve simultaneous recordings",
          },
          state,
        },
        null,
        2,
      ),
    ),
    baseline: {
      workspaceBytes: Buffer.byteLength(JSON.stringify(baseline)),
      companies: baseline.companies.length,
      workflows: baseline.workflows.length,
      writes: baselineWrites.flat(),
    },
    applicationUiRoundTripMs: actionMs,
    writes: writes.flat(),
  };
  await fs.writeFile(
    info.outputPath("fishing-net-metrics.json"),
    JSON.stringify(metrics, null, 2),
  );
  await info.attach("Actual browser storage and command measurements", {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });
});

test("anonymous application CTA leads on desktop and mobile; native condensed branding is rendered beside the intact source logo", async ({
  context,
}, info) => {
  const page = await workspace(context, "contractor");
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    const cta = page.getByRole("button", {
      name: "Start a new application",
      exact: false,
    });
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    expect(box!.y + box!.height).toBeLessThan(size.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`contractor-landing-${size.width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: info.outputPath("unity-typography.png"),
    fullPage: true,
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const doc = await cdp.send("DOM.getDocument");
  const node = await cdp.send("DOM.querySelector", {
    nodeId: doc.root.nodeId,
    selector: ".brand-caption strong",
  });
  const fonts = await cdp.send("CSS.getPlatformFontsForNode", {
    nodeId: node.nodeId,
  });
  expect(fonts.fonts.some((f) => /Bahnschrift/i.test(f.familyName))).toBe(true);
  const style = await page.locator(".brand-caption strong").evaluate((e) => ({
    weight: getComputedStyle(e).fontWeight,
    variation: getComputedStyle(e).fontVariationSettings,
    transform: getComputedStyle(e).transform,
  }));
  expect(style.weight).toBe("450");
  expect(style.variation).toContain("75");
  expect(style.transform).toBe("none");
  await page
    .getByRole("button", { name: "Start a new application", exact: false })
    .click();
  await expect(page.getByLabel("Fictional company name")).toBeVisible();
});

test("mid-workflow catalog triggers start at the committed Recruitment and readiness states, including pending activation", async ({
  context,
}, info) => {
  const portal = await workspace(context, "contractor"),
    ops = await workspace(context, "operations"),
    monitor = await workspace(context, "monitor");
  await application(portal, "Midpoint Services", "mid@example.com");
  await trigger(monitor, "Recruitment approved", "recruitment");
  await proceed(ops);
  let s = await synchronized([portal, ops, monitor]);
  expect(s.viz!.recordings).toHaveLength(1);
  expect(s.viz!.recordings[0].frames).toHaveLength(1);
  expect(s.viz!.recordings[0].frames[0].revision).toBe(s.revision);
  await nav(monitor, "Journey Map");
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    "Frame 0 / 0",
  );
  await nav(portal, "Required actions");
  await evidence(portal, "Submit license evidence");
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    "Frame 1 / 1",
  );
  // Restore the original, unmodified 3.6 file, then continue using ordinary activities.
  await restore(
    monitor,
    await fs.readFile("tests/fixtures/workspace-v1/frame-13-workspace.json"),
  );
  await trigger(monitor, "Ready for publication", "ready");
  await signIn(portal, "thirteen@example.com");
  await nav(portal, "Required actions");
  await completion(
    portal,
    "Complete initial training",
    "Complete initial training →",
  );
  s = await snapshot(monitor);
  await ops
    .locator(".application-row")
    .filter({ hasText: s.companies[0].name })
    .click();
  await role(ops, "Training");
  await ops.getByLabel("Work queue company").selectOption(s.companies[0].id);
  await completion(ops, "Confirm training completion", "Confirm training →");
  s = await synchronized([portal, ops, monitor]);
  const ready = s.viz!.recordings.at(-1)!;
  expect(ready.originLabel).toBe("Contractor ready");
  expect(ready.frames).toHaveLength(1);
  expect(ready.frames[0].nodes.PublishActivation.status).toBe("waiting");
  await nav(monitor, "Journey Map");
  await monitor.getByLabel("Recording", { exact: true }).selectOption(ready.id);
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    "Frame 0 / 0",
  );
  await monitor.screenshot({
    path: info.outputPath("readiness-trigger-frame-zero.png"),
    fullPage: true,
  });
  await nav(monitor, "Automations & Integrations");
  await card(monitor, "Publish contractor activation")
    .getByRole("button", {
      name: "Publish contractor activation →",
      exact: true,
    })
    .click();
  await expect(card(monitor, "Publish contractor activation")).toHaveCount(0);
  s = await synchronized([portal, ops, monitor]);
  expect(s.viz!.recordings.find((r) => r.id === ready.id)!.status).toBe(
    "Completed",
  );
  expect(s.viz!.recordings.find((r) => r.id === ready.id)!.frames).toHaveLength(
    2,
  );
  await nav(portal, "Your journey");
  await expect(portal.getByTestId("lifecycle-eligibility")).toHaveText(
    "Eligible",
  );
});
