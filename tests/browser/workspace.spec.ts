import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import {
  application,
  card,
  completion,
  evidence,
  inspectCompany,
  nav,
  role,
  signIn,
  snapshot,
  synchronized,
  verify,
  workspace,
} from "./helpers";
import { frame13Workspace } from "../fixtures/workspace";
import {
  parseWorkspaceFile,
  type WorkspaceFile,
} from "../../src/workspace/format";
import { isReady, isJobEligible } from "../../src/domain";

test.use({ viewport: { width: 1600, height: 1100 } });
async function demo(page: Page) {
  await nav(page, "Demo Workspace");
  await expect(
    page.getByRole("region", { name: "Demo Workspace" }),
  ).toBeVisible();
}
async function upload(page: Page, file: unknown) {
  await page.getByLabel("Workspace JSON file").setInputFiles({
    name: "workspace.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
}
async function confirm(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Load workspace?" });
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Confirm Load State", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
}
async function download(page: Page, path: string, button = "Save State") {
  const waiting = page.waitForEvent("download");
  await page.getByRole("button", { name: button, exact: true }).click();
  const file = await waiting;
  await file.saveAs(path);
  return {
    name: file.suggestedFilename(),
    file: parseWorkspaceFile(await fs.readFile(path, "utf8")),
  };
}

test("file round trip restores exact Frame 13 and archive across tabs, resets invalid selections, then continues the real workflow", async ({
  context,
}, testInfo) => {
  await context.addInitScript(() =>
    Object.defineProperty(window, "showSaveFilePicker", {
      value: undefined,
      configurable: true,
    }),
  );
  const contractor = await workspace(context, "contractor"),
    operations = await workspace(context, "operations"),
    monitor = await workspace(context, "monitor"),
    viz = await workspace(context, "monitor");
  await application(contractor, "Original Company");
  await nav(operations, "Overview");
  const originalCompany = (await snapshot(operations)).companies[0].id;
  await expect
    .poll(() =>
      operations.evaluate(() =>
        sessionStorage.getItem("fieldwork:operations:company"),
      ),
    )
    .toBe(originalCompany);
  await nav(viz, "Journey Map");
  await viz
    .getByLabel("Originating event", { exact: true })
    .selectOption((await snapshot(viz)).events[0].eventId);
  await viz.getByRole("button", { name: "Track journey" }).click();
  const fixture = await frame13Workspace();
  await demo(monitor);
  await upload(monitor, fixture);
  await expect(monitor.getByRole("dialog")).toContainText("Frame 13");
  const beforeCancel = await snapshot(monitor);
  await monitor
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  expect(await snapshot(monitor)).toEqual(beforeCancel);
  await upload(monitor, fixture);
  await confirm(monitor);
  await synchronized([contractor, operations, monitor, viz]);
  await expect(
    contractor.getByRole("button", { name: "Sign In", exact: true }),
  ).toBeVisible();
  expect(
    await contractor.evaluate(() =>
      sessionStorage.getItem("fieldwork:contractor:session"),
    ),
  ).toBeNull();
  await expect(
    operations.getByText(
      "The previously selected company is unavailable in this view.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(operations.getByTestId("lifecycle-eligibility")).toHaveCount(0);
  await expect(viz.getByTestId("viz-frame-number")).toHaveText("Frame 13 / 13");
  await viz
    .getByRole("button", { name: "Presentation view", exact: true })
    .click();
  await viz.getByRole("button", { name: "Fit map", exact: true }).click();
  await expect(viz.getByTestId("viz-canvas")).toHaveAttribute(
    "data-fitting",
    "false",
  );
  await viz.screenshot({
    path: testInfo.outputPath("viz-restored-frame-13.png"),
    animations: "disabled",
  });
  await viz
    .getByRole("button", { name: "Exit presentation", exact: true })
    .first()
    .click();
  const stable = await snapshot(monitor);
  await viz.getByLabel("Visual history").fill("3");
  await expect(viz.getByTestId("viz-frame-number")).toHaveText("Frame 3 / 13");
  await viz.getByLabel("Visual history").fill("13");
  await viz.getByRole("button", { name: "Return to Live" }).click();
  await viz
    .getByLabel("Recording", { exact: true })
    .selectOption(fixture.state.viz!.recordings[0].id);
  await expect(viz.getByTestId("viz-frame-number")).toHaveText("Frame 0 / 0");
  await expect(
    viz.getByText("Stopped · recorded history", { exact: true }),
  ).toBeVisible();
  await viz
    .getByLabel("Recording", { exact: true })
    .selectOption(fixture.state.viz!.activeRecordingId);
  await expect(viz.getByTestId("viz-frame-number")).toHaveText("Frame 13 / 13");
  expect(await snapshot(monitor)).toEqual(stable);
  await monitor
    .getByLabel("Scenario name", { exact: true })
    .fill("Activation meeting");
  await monitor
    .getByLabel("Description", { exact: true })
    .fill("Saved at exactly Frame 13, with an archive and attempt history.");
  const saved = await download(
    monitor,
    testInfo.outputPath("frame-13-workspace.json"),
  );
  expect(saved.name).toBe("unity-fieldwork-activation-meeting.json");
  expect(saved.file.state.viz).toEqual(fixture.state.viz);
  expect(saved.file.state).not.toHaveProperty("workspaceEpoch");
  await monitor.screenshot({
    path: testInfo.outputPath("workspace-saved.png"),
    fullPage: true,
  });
  await monitor
    .getByRole("button", { name: "Reset Workspace", exact: true })
    .click();
  const reset = monitor.getByRole("dialog", { name: "Reset workspace?" });
  await expect(
    reset.getByRole("button", { name: "Permanently Reset Workspace" }),
  ).toBeDisabled();
  await reset
    .getByLabel("Type RESET to permanently clear the workspace")
    .fill("RESET");
  await reset
    .getByRole("button", { name: "Permanently Reset Workspace" })
    .click();
  await expect(reset).not.toBeVisible();
  await synchronized([contractor, operations, monitor, viz]);
  expect((await snapshot(monitor)).companies).toEqual([]);
  expect((await snapshot(monitor)).viz).toBeUndefined();
  await upload(monitor, saved.file);
  await confirm(monitor);
  await synchronized([contractor, operations, monitor, viz]);
  const restored = await snapshot(monitor);
  expect({
    ...restored,
    workspaceEpoch: undefined,
    revision: saved.file.state.revision,
  }).toEqual({ ...saved.file.state, workspaceEpoch: undefined });
  await expect(viz.getByTestId("viz-frame-number")).toHaveText("Frame 13 / 13");
  await viz.reload();
  await nav(viz, "Journey Map");
  await expect(viz.getByTestId("viz-frame-number")).toHaveText("Frame 13 / 13");
  await signIn(contractor, "thirteen@example.com");
  await nav(contractor, "Required actions");
  await completion(
    contractor,
    "Complete initial training",
    "Complete initial training →",
  );
  await operations
    .getByRole("button", { name: "All companies", exact: true })
    .click();
  await operations
    .locator(".application-row")
    .filter({ hasText: "Frame Thirteen Services" })
    .click();
  await role(operations, "Training");
  await completion(
    operations,
    "Confirm training completion",
    "Confirm training →",
  );
  await nav(monitor, "Automations & Integrations");
  await card(monitor, "Publish contractor activation")
    .getByRole("button", { name: "Publish contractor activation →" })
    .click();
  await expect(viz.getByTestId("viz-frame-number")).toHaveText("Frame 16 / 16");
  const complete = await snapshot(viz);
  expect(isJobEligible(complete.companies[0], complete.qualifications)).toBe(
    true,
  );
  expect(complete.viz!.recordings[0]).toEqual(fixture.state.viz!.recordings[0]);
  expect(complete.viz!.recordings[1].frames.slice(0, 14)).toEqual(
    fixture.state.viz!.recordings[1].frames,
  );
  await demo(monitor);
  await upload(monitor, saved.file);
  await confirm(monitor);
  await expect(viz.getByTestId("viz-frame-number")).toHaveText("Frame 13 / 13");
  expect((await snapshot(monitor)).events).toEqual(saved.file.state.events);
});

test("prepared scenarios preview without writes, export coherent state and support alternate outcomes after reload", async ({
  context,
}, testInfo) => {
  await context.addInitScript(() =>
    Object.defineProperty(window, "showSaveFilePicker", {
      value: undefined,
      configurable: true,
    }),
  );
  const monitor = await workspace(context, "monitor");
  await demo(monitor);
  const before = await snapshot(monitor);
  await monitor.screenshot({
    path: testInfo.outputPath("demo-workspace.png"),
    fullPage: true,
  });
  await monitor
    .getByRole("button", {
      name: "Preview Awaiting contractor documents",
      exact: true,
    })
    .click();
  expect(await snapshot(monitor)).toEqual(before);
  await monitor.keyboard.press("Escape");
  expect(await snapshot(monitor)).toEqual(before);
  const files: Record<string, WorkspaceFile> = {};
  for (const [key, name] of [
    ["documents", "Awaiting contractor documents"],
    ["failure", "Verification failure"],
    ["activation", "Ready for activation"],
  ]) {
    await monitor
      .getByRole("button", { name: `Preview ${name}`, exact: true })
      .click();
    if (key === "activation")
      await monitor.screenshot({
        path: testInfo.outputPath("workspace-load-preview.png"),
      });
    await confirm(monitor);
    const s = await snapshot(monitor);
    expect(isReady(s.companies[0], s.qualifications)).toBe(
      key === "activation",
    );
    expect(isJobEligible(s.companies[0], s.qualifications)).toBe(false);
    files[key] = (
      await download(
        monitor,
        testInfo.outputPath(`scenario-${key}.json`),
        "Download JSON",
      )
    ).file;
  }
  await upload(monitor, files.failure);
  const downloadWait = monitor.waitForEvent("download");
  await monitor
    .getByRole("dialog")
    .getByRole("button", { name: "Save current workspace first" })
    .click();
  const backup = await downloadWait;
  await backup.saveAs(testInfo.outputPath("before-replace-backup.json"));
  expect(
    parseWorkspaceFile(
      await fs.readFile(
        testInfo.outputPath("before-replace-backup.json"),
        "utf8",
      ),
    ).state.events,
  ).toEqual(files.activation.state.events);
  await confirm(monitor);
  await nav(monitor, "Automations & Integrations");
  await expect(
    card(monitor, "Review insurance").getByRole("button", {
      name: "↻ Retry activity →",
    }),
  ).toBeVisible();
  await card(monitor, "Review insurance")
    .getByRole("button", { name: "↻ Retry activity →" })
    .click();
  await expect(card(monitor, "Review insurance")).toHaveCount(0);
  expect((await snapshot(monitor)).attempts.at(-1)!.status).toBe("Succeeded");
  await demo(monitor);
  await upload(monitor, files.documents);
  await confirm(monitor);
  const contractor = await workspace(context, "contractor"),
    operations = await workspace(context, "operations");
  await signIn(contractor, "alex@example.com");
  await nav(contractor, "Required actions");
  await evidence(
    contractor,
    "Submit license evidence",
    "Expired demo document",
  );
  await role(operations, "Compliance");
  await verify(operations, "Verify license");
  expect((await snapshot(monitor)).qualifications[0].status).toBe(
    "Correction required",
  );
  await upload(monitor, files.documents);
  await confirm(monitor);
  await expect(card(contractor, "Submit license evidence")).toBeVisible();
  await evidence(contractor, "Submit license evidence");
  await inspectCompany(operations, "Summit Field Services");
  await verify(operations, "Verify license");
  expect((await snapshot(monitor)).qualifications[0].status).toBe(
    "Awaiting approval",
  );
});

test("invalid files, stale reviews and aborted IndexedDB transactions leave the entire current workspace unchanged", async ({
  context,
}) => {
  await context.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof put>) {
      const result = put.apply(this, args);
      if ((window as unknown as { abortRestore: boolean }).abortRestore) {
        (window as unknown as { abortRestore: boolean }).abortRestore = false;
        this.transaction.abort();
      }
      return result;
    };
  });
  const monitor = await workspace(context, "monitor"),
    contractor = await workspace(context, "contractor");
  await demo(monitor);
  const file = await frame13Workspace(),
    initial = await snapshot(monitor);
  await monitor.getByLabel("Workspace JSON file").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{broken"),
  });
  await expect(monitor.getByRole("alert")).toContainText(
    "not valid workspace JSON",
  );
  expect(await snapshot(monitor)).toEqual(initial);
  const incompatible = { ...file, formatVersion: 99 };
  await upload(monitor, incompatible);
  await expect(monitor.getByRole("alert")).toContainText("unsupported");
  expect(await snapshot(monitor)).toEqual(initial);
  const damaged = structuredClone(file);
  damaged.state.workItems[0].workflowId = "missing";
  await upload(monitor, damaged);
  await expect(monitor.getByRole("alert")).toContainText("reference");
  expect(await snapshot(monitor)).toEqual(initial);
  await upload(monitor, file);
  await application(contractor, "Changed during review");
  const changed = await snapshot(monitor);
  const dialog = monitor.getByRole("dialog");
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Confirm Load State", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("changed while");
  expect(await snapshot(monitor)).toEqual(changed);
  await dialog
    .getByRole("button", { name: "Refresh replacement review" })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Confirm Load State", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await monitor.evaluate(() => {
    (window as unknown as { abortRestore: boolean }).abortRestore = true;
  });
  await dialog
    .getByRole("button", { name: "Confirm Load State", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  expect(await snapshot(monitor)).toEqual(changed);
  await dialog
    .getByRole("button", { name: "Confirm Load State", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  expect((await snapshot(monitor)).events).toEqual(file.state.events);
  const high = structuredClone(file);
  high.state.revision = 10000;
  await upload(monitor, high);
  await confirm(monitor);
  await synchronized([monitor, contractor]);
  expect((await snapshot(contractor)).revision).toBeGreaterThan(10000);
  const final = await snapshot(monitor);
  await contractor.evaluate(() => {
    const c = new BroadcastChannel("fieldwork-onboarding:changes:v1");
    c.postMessage({ type: "committed", revision: 1 });
    c.close();
  });
  await monitor.reload();
  await demo(monitor);
  expect((await snapshot(monitor)).events).toEqual(final.events);
  expect((await snapshot(monitor)).viz).toEqual(final.viz);
});

test("File System Access save uses the picker, handles cancellation and write failure without state mutation", async ({
  context,
}) => {
  await context.addInitScript(() => {
    const w = window as unknown as {
      saveMode: string;
      savedJSON: string;
      pickerOptions: unknown;
      aborted: number;
      showSaveFilePicker: (options: unknown) => Promise<unknown>;
    };
    w.saveMode = "success";
    w.aborted = 0;
    w.showSaveFilePicker = async (options) => {
      w.pickerOptions = options;
      if (w.saveMode === "cancel")
        throw new DOMException("Cancelled", "AbortError");
      return {
        createWritable: async () => ({
          write: async (blob: Blob) => {
            if (w.saveMode === "fail") throw new Error("Disk write failed");
            w.savedJSON = await blob.text();
          },
          close: async () => {},
          abort: async () => {
            w.aborted++;
          },
        }),
      };
    };
  });
  const monitor = await workspace(context, "monitor");
  await demo(monitor);
  await monitor
    .getByLabel("Scenario name", { exact: true })
    .fill("Native save");
  const before = await snapshot(monitor);
  await monitor
    .getByRole("button", { name: "Save State", exact: true })
    .click();
  await expect(
    monitor.getByRole("status").filter({ hasText: "Saved: Native save" }),
  ).toBeVisible();
  const saved = await monitor.evaluate(() => ({
    json: (window as unknown as { savedJSON: string }).savedJSON,
    options: (window as unknown as { pickerOptions: { suggestedName: string } })
      .pickerOptions,
  }));
  expect(parseWorkspaceFile(saved.json).state).toEqual(before);
  expect(saved.options.suggestedName).toBe("unity-fieldwork-native-save.json");
  await monitor.evaluate(() => {
    (window as unknown as { saveMode: string }).saveMode = "cancel";
  });
  await monitor
    .getByRole("button", { name: "Save State", exact: true })
    .click();
  await expect(
    monitor.getByRole("status").filter({ hasText: "Save cancelled" }),
  ).toBeVisible();
  expect(await snapshot(monitor)).toEqual(before);
  await monitor.evaluate(() => {
    (window as unknown as { saveMode: string }).saveMode = "fail";
  });
  await monitor
    .getByRole("button", { name: "Save State", exact: true })
    .click();
  await expect(monitor.getByRole("alert")).toContainText("Disk write failed");
  expect(
    await monitor.evaluate(
      () => (window as unknown as { aborted: number }).aborted,
    ),
  ).toBe(1);
  expect(await snapshot(monitor)).toEqual(before);
});
