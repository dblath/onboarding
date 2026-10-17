import { test, expect } from "@playwright/test";
import {
  application,
  evidence,
  nav,
  proceed,
  snapshot,
  workspace,
} from "./helpers";
import { largeVizFixture } from "../fixtures/vizLayout";

test.use({ viewport: { width: 1600, height: 1100 }, video: "on" });

test("change storytelling, follow preference, historical background capture and timed playback stay read-only", async ({
  context,
}, testInfo) => {
  const contractor = await workspace(context, "contractor"),
    operations = await workspace(context, "operations"),
    monitor = await workspace(context, "monitor");
  await application(contractor, "Living Process Partners");
  await nav(monitor, "Journey Map");
  await monitor
    .getByLabel("Originating event", { exact: true })
    .selectOption((await snapshot(monitor)).events[0].eventId);
  await monitor.getByRole("button", { name: "Track journey" }).click();
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    "Frame 0 / 0",
  );
  await monitor
    .getByRole("button", { name: "Presentation view", exact: true })
    .click();
  await expect(monitor.getByTestId("viz-canvas")).toHaveAttribute(
    "data-fitting",
    "false",
  );
  await monitor.getByLabel("Follow changes", { exact: true }).uncheck();
  const viewport = monitor.locator(".react-flow__viewport");
  const fitted = await viewport.getAttribute("style");
  await monitor.getByRole("button", { name: "Zoom In", exact: true }).click();
  await expect.poll(() => viewport.getAttribute("style")).not.toBe(fitted);
  const before = await viewport.getAttribute("style");
  await proceed(operations);
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    "Frame 1 / 1",
  );
  await expect(viewport).toHaveAttribute("style", before!);
  await expect(monitor.getByTestId("viz-story")).toContainText(
    "Review application — completed",
  );
  await expect(
    monitor.getByTestId("viz-node-group:Starting point"),
  ).toHaveAttribute("data-changed", "true");
  await expect(monitor.locator(".viz-edge-changed").first()).toBeAttached();
  await monitor.getByRole("button", { name: "Fit map", exact: true }).click();
  await expect(monitor.getByTestId("viz-canvas")).toHaveAttribute(
    "data-fitting",
    "false",
  );
  await monitor.screenshot({
    path: testInfo.outputPath("viz-desktop-grouped.png"),
  });
  await monitor.getByLabel("Follow changes", { exact: true }).check();
  await nav(contractor, "Required actions");
  await evidence(contractor, "Submit insurance evidence");
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    "Frame 2 / 2",
  );
  await expect.poll(() => viewport.getAttribute("style")).not.toBe(before);
  await expect(monitor.getByTestId("viz-story")).toContainText(
    "Send insurance — completed",
  );
  await monitor.screenshot({
    path: testInfo.outputPath("viz-changed-route.png"),
  });
  await monitor.getByRole("button", { name: "Jump to first frame" }).click();
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    "Frame 0 / 2",
  );
  const historicalView = await viewport.getAttribute("style");
  await evidence(contractor, "Submit fictional tax / banking pack");
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    "Frame 0 / 3",
  );
  await expect(monitor.getByTestId("viz-new-frames")).toContainText(
    "3 newer frames available",
  );
  await expect(viewport).toHaveAttribute("style", historicalView!);
  const businessBefore = await snapshot(monitor);
  await monitor.getByLabel("Playback speed").selectOption("3200");
  await monitor.getByRole("button", { name: "Play playback" }).click();
  await expect(
    monitor.getByRole("button", { name: "Pause playback" }),
  ).toBeVisible();
  await monitor.getByRole("button", { name: "Pause playback" }).click();
  await monitor
    .getByRole("button", { name: "Step forward", exact: true })
    .click();
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    "Frame 1 / 3",
  );
  await monitor.getByLabel("Playback speed").selectOption("800");
  await monitor.getByRole("button", { name: "Play playback" }).click();
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    "Frame 3 / 3",
  );
  await expect(
    monitor.getByRole("button", { name: "Play playback" }),
  ).toBeVisible();
  await monitor.getByRole("button", { name: "Return to Live" }).click();
  await expect(
    monitor.getByText("Recording live", { exact: true }),
  ).toBeVisible();
  expect(await snapshot(monitor)).toEqual(businessBefore);
  await monitor.emulateMedia({ reducedMotion: "reduce" });
  await monitor
    .getByRole("button", { name: "Step backward", exact: true })
    .click();
  await expect(monitor.getByTestId("viz-node-group:Insurance")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(monitor.locator(".viz-edge-changed path").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  expect(await snapshot(monitor)).toEqual(businessBefore);
  const video = monitor.video();
  await monitor.close();
  if (video) await video.saveAs(testInfo.outputPath("viz-playback.webm"));
});

test("80-step synthetic layout fixture is compact, navigable and clearly identified as non-executable", async ({
  context,
}, testInfo) => {
  const monitor = await workspace(context, "monitor");
  const fixture = largeVizFixture();
  // Test-only auxiliary visualization data, never submitted as business work.
  await monitor.evaluate(async (recording) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("fieldwork-onboarding");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("state", "readwrite"),
        store = tx.objectStore("state"),
        request = store.get("current");
      request.onsuccess = () => {
        const {
          storageLayout: _layout,
          observerExpected: _observer,
          ...legacy
        } = request.result;
        store.put(
          {
            ...legacy,
            viz: { version: 1, activeRecordingId: "", recordings: [recording] },
          },
          "current",
        );
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, fixture);
  await monitor.reload();
  await nav(monitor, "Journey Map");
  await monitor
    .getByLabel("Recording", { exact: true })
    .selectOption(fixture.id);
  await expect(monitor.getByTestId("remaining-Insurance")).toHaveText(
    "2 remaining",
  );
  await expect(monitor.getByTestId("remaining-Finance")).toHaveText(
    "16 remaining",
  );
  await monitor
    .getByRole("button", { name: "Presentation view", exact: true })
    .click();
  await expect(monitor.getByTestId("viz-canvas")).toHaveAttribute(
    "data-fitting",
    "false",
  );
  await monitor.screenshot({
    path: testInfo.outputPath("viz-grouped-80-fixture.png"),
  });
  await monitor
    .getByRole("button", { name: "Expand all", exact: true })
    .click();
  await expect(monitor.locator(".react-flow__node")).toHaveCount(80);
  await monitor.getByRole("button", { name: "Fit map", exact: true }).click();
  await expect(monitor.getByTestId("viz-canvas")).toHaveAttribute(
    "data-fitting",
    "false",
  );
  await expect(
    monitor
      .locator(".viz-recording-bar")
      .getByText("LAYOUT FIXTURE — 80 synthetic steps", { exact: true }),
  ).toBeVisible();
  await expect(monitor.locator(".react-flow__minimap-node")).toHaveCount(80);
  const sizes = await monitor.locator(".viz-node").evaluateAll((nodes) =>
    nodes.map((n) => ({
      width: (n as HTMLElement).offsetWidth,
      height: (n as HTMLElement).offsetHeight,
      font: getComputedStyle(n.querySelector("strong")!).fontSize,
    })),
  );
  expect(
    sizes.every((n) => n.width === 154 && n.height === 44 && n.font === "13px"),
  ).toBe(true);
  await monitor.screenshot({
    path: testInfo.outputPath("viz-desktop-80-fixture.png"),
  });
  await monitor.getByRole("button", { name: "Zoom In", exact: true }).click();
  await monitor.getByRole("button", { name: "Zoom In", exact: true }).click();
  await monitor.screenshot({
    path: testInfo.outputPath("viz-80-fixture-detail.png"),
  });
});
