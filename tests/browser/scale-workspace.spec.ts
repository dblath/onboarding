import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { scaleWorkspace } from "../fixtures/scaleWorkspace";
import { nav, snapshot, synchronized, workspace, card } from "./helpers";
import { parseWorkspaceFile } from "../../src/workspace/format";

test("large real workspace measures observer durability, history, import/export and playback across three tabs", async ({
  context,
}, info) => {
  test.setTimeout(240000);
  await context.addInitScript(() => {
    const samples: {
        store: string;
        bytes: number;
        putMs: number;
        transactionMs: number;
        transactionId: number;
        operation: string;
      }[] = [],
      serializations: { ms: number; bytes: number }[] = [];
    Object.assign(window, {
      storageSamples: samples,
      serializationSamples: serializations,
    });
    const stringify = JSON.stringify;
    JSON.stringify = function (...args: Parameters<typeof stringify>) {
      const start = performance.now(),
        result = stringify.apply(JSON, args);
      if (args[0]?.schemaVersion === 4 && args[0]?.companies)
        serializations.push({
          ms: performance.now() - start,
          bytes: result.length,
        });
      return result;
    } as typeof stringify;
    const transactions = new WeakMap<IDBTransaction, number>();
    let nextTransaction = 0;
    for (const operation of ["put", "add"] as const) {
      const put = IDBObjectStore.prototype[operation];
      IDBObjectStore.prototype[operation] = function (
        ...args: Parameters<typeof put>
      ) {
        const start = performance.now(),
          result = put.apply(this, args),
          putMs = performance.now() - start;
        const store = this.name,
          bytes = new TextEncoder().encode(stringify(args[0])).length;
        if (!transactions.has(this.transaction))
          transactions.set(this.transaction, ++nextTransaction);
        const transactionId = transactions.get(this.transaction)!;
        this.transaction.addEventListener("complete", () =>
          samples.push({
            store,
            bytes,
            putMs,
            transactionMs: performance.now() - start,
            transactionId,
            operation,
          }),
        );
        return result;
      };
    }
  });
  const file = process.env.UNITY_SCALE_WORKSPACE
    ? parseWorkspaceFile(
        await fs.readFile(process.env.UNITY_SCALE_WORKSPACE, "utf8"),
      )
    : await scaleWorkspace();
  await fs.writeFile(
    info.outputPath("large-workspace-start.json"),
    JSON.stringify(file),
  );
  const frameCount = file.state.viz!.recordings.reduce(
    (n, r) => n + r.frames.length,
    0,
  );
  expect(frameCount).toBeGreaterThanOrEqual(500);
  expect(
    file.state.viz!.recordings.filter((r) => r.status === "Recording").length,
  ).toBeGreaterThanOrEqual(12);
  const monitor = await workspace(context, "monitor"),
    operations = await workspace(context, "operations"),
    contractor = await workspace(context, "contractor");
  await nav(monitor, "Demo Workspace");
  const importStart = performance.now();
  await monitor.getByLabel("Workspace JSON file").setInputFiles({
    name: "scale.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  const dialog = monitor.getByRole("dialog", { name: "Load workspace?" });
  await expect(dialog).toBeVisible();
  const validationPreviewMs = performance.now() - importStart;
  await dialog.getByRole("checkbox").check();
  const restoreStart = performance.now();
  await dialog
    .getByRole("button", { name: "Confirm Load State", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await synchronized([monitor, operations, contractor]);
  const restoreMs = performance.now() - restoreStart;
  await Promise.all(
    [monitor, operations, contractor].map((p) =>
      p.evaluate(() => {
        (
          window as unknown as { storageSamples: unknown[] }
        ).storageSamples.length = 0;
        (
          window as unknown as { serializationSamples: unknown[] }
        ).serializationSamples.length = 0;
      }),
    ),
  );
  await nav(monitor, "Automations & Integrations");
  // Fleet benchmark deliberately executes across companies, beyond Monitor's contextual company.
  await monitor.getByLabel("Automations company").selectOption("");
  const actionMs: number[] = [];
  for (let i = 0; i < 13; i++) {
    const task = card(monitor, "Publish contractor activation").first();
    const before = Number(
        await monitor.getByTestId("sync-status").getAttribute("data-revision"),
      ),
      start = performance.now();
    await task
      .getByRole("button", {
        name: "Publish contractor activation →",
        exact: true,
      })
      .click();
    await Promise.all(
      [monitor, operations, contractor].map((p) =>
        expect(p.getByTestId("sync-status")).toHaveAttribute(
          "data-revision",
          String(before + 1),
        ),
      ),
    );
    actionMs.push(performance.now() - start);
  }
  const state = await synchronized([monitor, operations, contractor]);
  expect(
    state.companies.filter((c) => c.activationStatus === "Active"),
  ).toHaveLength(13);
  expect(
    state.viz!.recordings.filter((r) => r.status === "Recording"),
  ).toHaveLength(12);
  expect(
    state.viz!.recordings.filter((r) => r.status === "Completed"),
  ).toHaveLength(38);
  await nav(monitor, "Journey Map");
  const recording = state.viz!.recordings.find(
    (r) => r.definition.workflowName === "CompanyOnboarding",
  )!;
  await monitor
    .getByLabel("Recording", { exact: true })
    .selectOption(recording.id);
  const seekMs: number[] = [];
  for (const number of [3, recording.frames.length - 1, 0, 8]) {
    const start = performance.now();
    await monitor.getByLabel("Visual history").fill(String(number));
    await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
      `Frame ${number} / ${recording.frames.length - 1}`,
    );
    await expect(monitor.getByTestId("viz-canvas")).toHaveAttribute(
      "data-fitting",
      "false",
    );
    seekMs.push(performance.now() - start);
  }
  await monitor.screenshot({
    path: info.outputPath("large-workspace.png"),
    fullPage: true,
  });
  await nav(monitor, "Demo Workspace");
  const exportStart = performance.now(),
    downloading = monitor.waitForEvent("download");
  await monitor
    .getByRole("button", { name: "Download JSON", exact: true })
    .click();
  const downloaded = await downloading;
  await downloaded.saveAs(info.outputPath("large-workspace.json"));
  const exportMs = performance.now() - exportStart;
  const metrics = {
    measurementScope:
      "13 publication commits after restore; rendered revision signals, no full snapshots during timing; put/add included; shared transactionId deduplicates callbacks",
    label: process.env.UNITY_BENCHMARK_LABEL ?? "current",
    companies: 25,
    concurrentRecordingsAtStart: 25,
    framesBefore: frameCount,
    framesAfter: state.viz!.recordings.reduce((n, r) => n + r.frames.length, 0),
    logicalStateBytes: Buffer.byteLength(JSON.stringify(state)),
    exportBytes: (await fs.stat(info.outputPath("large-workspace.json"))).size,
    validationPreviewMs,
    restoreMs,
    exportMs,
    actionRoundTripMs: actionMs,
    playbackSeekMs: seekMs,
    tabs: await Promise.all(
      [monitor, operations, contractor].map((p) =>
        p.evaluate(() => ({
          storage: (window as unknown as { storageSamples: unknown[] })
            .storageSamples,
          serialization: (
            window as unknown as { serializationSamples: unknown[] }
          ).serializationSamples,
        })),
      ),
    ),
  };
  await fs.writeFile(
    info.outputPath("scale-metrics.json"),
    JSON.stringify(metrics, null, 2),
  );
});
