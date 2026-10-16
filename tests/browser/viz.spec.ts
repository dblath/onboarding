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
  verify,
  workspace,
} from "./helpers";

async function journey(page: Page) {
  await nav(page, "Journey Map");
  await expect(page.getByRole("region", { name: "Journey Map" })).toBeVisible();
}
async function track(page: Page, eventId: string) {
  await page
    .getByLabel("Originating event", { exact: true })
    .selectOption(eventId);
  await page.getByRole("button", { name: "Track journey" }).click();
  await expect(page.getByTestId("viz-frame-number")).toHaveText("Frame 0 / 0");
}
async function fullMapScreenshot(page: Page, path: string) {
  await page.setViewportSize({ width: 2560, height: 2400 });
  await page.getByRole("button", { name: "Expand all", exact: true }).click();
  await page
    .getByRole("button", { name: "Presentation view", exact: true })
    .click();
  await expect(page.locator(".react-flow__node")).toHaveCount(37);
  // Wait for layout/viewport animation to settle by inspecting its transform, not sleeping.
  await expect
    .poll(async () =>
      page.locator(".react-flow__viewport").getAttribute("style"),
    )
    .toContain("transform");
  await page.getByRole("button", { name: "Fit map", exact: true }).click();
  await expect(page.getByTestId("viz-canvas")).toHaveAttribute(
    "data-fitting",
    "false",
  );
  const geometry = await page
    .locator(".react-flow__node-journey")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const r = node.getBoundingClientRect();
        return {
          left: r.left,
          top: r.top,
          right: r.right,
          bottom: r.bottom,
          width: r.width,
        };
      }),
    );
  const canvas = (await page.getByTestId("viz-canvas").boundingBox())!;
  expect(Math.min(...geometry.map((n) => n.width))).toBeGreaterThan(125);
  for (const node of geometry) {
    expect(node.left).toBeGreaterThanOrEqual(canvas.x);
    expect(node.right).toBeLessThanOrEqual(canvas.x + canvas.width);
    expect(node.top).toBeGreaterThanOrEqual(canvas.y);
    expect(node.bottom).toBeLessThanOrEqual(canvas.y + canvas.height);
  }
  for (let i = 0; i < geometry.length; i++)
    for (let j = i + 1; j < geometry.length; j++) {
      const a = geometry[i],
        b = geometry[j];
      expect(
        a.right <= b.left + 1 ||
          b.right <= a.left + 1 ||
          a.bottom <= b.top + 1 ||
          b.bottom <= a.top + 1,
      ).toBe(true);
    }
  await expect(page.locator(".react-flow__minimap-node")).toHaveCount(37);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await page
    .getByRole("button", { name: "Exit presentation", exact: true })
    .first()
    .click();
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page
    .getByRole("button", { name: "Group overview", exact: true })
    .click();
}

test("Viz records a real 37-step journey across tabs, failure, joins and immutable playback; isolates origins and archives capture", async ({
  context,
}, testInfo) => {
  const contractor = await workspace(context, "contractor"),
    operations = await workspace(context, "operations"),
    monitor = await workspace(context, "monitor");
  await application(contractor, "Viz Parallel Partners");
  await proceed(operations);
  await nav(contractor, "Required actions");
  await evidence(contractor, "Submit insurance evidence");
  const started = await snapshot(monitor),
    origin = started.events.find(
      (e) => e.eventType === "ApplicationSubmitted",
    )!;
  await journey(monitor);
  await track(monitor, origin.eventId);
  let s = await snapshot(monitor),
    recording = s.viz!.recordings[0];
  expect(recording.frames).toHaveLength(1);
  expect(recording.frames[0].nodes.ReviewInsurance.status).toBe("waiting");
  expect(recording.frames[0].nodes.ScreenApplication.status).toBe("complete");
  expect(recording.definition.nodes).toHaveLength(37);
  await monitor.setViewportSize({ width: 1600, height: 1100 });
  await expect(monitor.getByTestId("viz-canvas")).toHaveAttribute(
    "data-fitting",
    "false",
  );
  await monitor.screenshot({
    path: testInfo.outputPath("viz-frame-zero.png"),
    fullPage: true,
  });
  // Capture is not a mounted React effect: the Monitor view is absent while these commands run.
  await nav(monitor, "Automations & Integrations");
  for (const label of [
    "Submit fictional tax / banking pack",
    "Submit simulated agreement",
    "Submit license evidence",
  ])
    await evidence(contractor, label);
  await journey(monitor);
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    "Frame 3 / 3",
  );
  await fullMapScreenshot(
    monitor,
    testInfo.outputPath("viz-complex-parallel.png"),
  );
  const parallel = (await snapshot(monitor)).viz!.recordings[0].frames.at(-1)!;
  expect([
    parallel.nodes.ReviewInsurance.status,
    parallel.nodes.ReviewFinancial.status,
    parallel.nodes.ExecuteAgreement.status,
  ]).toEqual(["waiting", "waiting", "waiting"]);
  await role(operations, "Compliance");
  const insurance = card(operations, "Review insurance");
  await insurance.getByRole("checkbox").check();
  await insurance
    .getByRole("button", { name: "Run simulated verification →" })
    .click();
  await expect(monitor.getByTestId("viz-node-group:Insurance")).toHaveAttribute(
    "data-status",
    "error",
  );
  await fullMapScreenshot(monitor, testInfo.outputPath("viz-failure.png"));
  await nav(monitor, "Automations & Integrations");
  await card(monitor, "Review insurance")
    .getByRole("button", { name: "↻ Retry activity →" })
    .click();
  await expect(card(monitor, "Review insurance")).toHaveCount(0);
  await role(operations, "Finance");
  await verify(operations, "Verify fictional financial pack");
  await role(operations, "Contractor Relations");
  await verify(operations, "Execute simulated agreement");
  await role(operations, "Compliance");
  await verify(operations, "Verify license");
  await role(operations, "Field Manager");
  await card(operations, "Approve skill qualification")
    .getByRole("button", { name: "Record skill decision →" })
    .click();
  await card(monitor, "Create vendor record")
    .getByRole("button", { name: "Create vendor record →" })
    .click();
  await expect(card(monitor, "Create vendor record")).toHaveCount(0);
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
  await journey(monitor);
  await expect(monitor.getByTestId("viz-node-group:Activation")).toContainText(
    "3 of 4 complete",
  );
  await fullMapScreenshot(monitor, testInfo.outputPath("viz-waiting-join.png"));
  await monitor
    .getByRole("button", { name: "+ Activation", exact: true })
    .click();
  await monitor
    .locator(".react-flow__node")
    .filter({ has: monitor.getByTestId("viz-node-readiness-join") })
    .focus();
  await monitor.keyboard.press("Enter");
  await expect(
    monitor.getByRole("region", { name: "Selected journey step" }),
  ).toContainText("Training confirmation — Training");
  await expect(
    monitor.getByRole("region", { name: "Selected journey step" }),
  ).toContainText("3 satisfied · 1 outstanding");
  await monitor.getByRole("button", { name: "Close node details" }).click();
  await monitor.getByRole("button", { name: "Jump to first frame" }).click();
  const beforeAdvance = await snapshot(monitor),
    count = beforeAdvance.viz!.recordings[0].frames.length;
  await role(operations, "Training");
  await completion(
    operations,
    "Confirm training completion",
    "Confirm training →",
  );
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    `Frame 0 / ${count}`,
  );
  await monitor.getByRole("button", { name: "Return to Live" }).click();
  await expect(monitor.getByTestId("viz-node-readiness-join")).toHaveAttribute(
    "data-status",
    "complete",
  );
  await expect(
    monitor.getByTestId("viz-node-PublishActivation"),
  ).toHaveAttribute("data-status", "waiting");
  // Unrelated company commands must leave this recording unchanged, including its processed identities.
  const other = await workspace(context, "contractor");
  const beforeOther = (await snapshot(monitor)).viz!.recordings[0];
  await application(other, "Unrelated Journey", "other@example.com");
  expect((await snapshot(monitor)).viz!.recordings[0]).toEqual(beforeOther);
  await monitor.reload();
  await journey(monitor);
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    `Frame ${count} / ${count}`,
  );
  // Compare every rendered node to each exact saved frame while traversing ten transitions.
  await monitor
    .getByRole("button", { name: "Expand all", exact: true })
    .click();
  const stored = (await snapshot(monitor)).viz!.recordings[0];
  const beforePlayback = await snapshot(monitor);
  for (let i = 0; i < 10; i++)
    await monitor
      .getByRole("button", { name: "Step backward", exact: true })
      .click();
  for (
    let frameIndex = stored.frames.length - 11;
    frameIndex < stored.frames.length;
    frameIndex++
  ) {
    const expected = Object.fromEntries(
      Object.entries(stored.frames[frameIndex].nodes).map(([id, n]) => [
        id,
        n.status,
      ]),
    );
    await expect
      .poll(async () =>
        monitor
          .locator('[data-testid^="viz-node-"]')
          .evaluateAll((nodes) =>
            Object.fromEntries(
              nodes.map((n) => [
                n.getAttribute("data-testid")!.slice(9),
                n.getAttribute("data-status"),
              ]),
            ),
          ),
      )
      .toEqual(expected);
    if (frameIndex < stored.frames.length - 1)
      await monitor
        .getByRole("button", { name: "Step forward", exact: true })
        .click();
  }
  await monitor.getByRole("button", { name: "Jump to first frame" }).click();
  await fullMapScreenshot(
    monitor,
    testInfo.outputPath("viz-historical-playback.png"),
  );
  const afterPlayback = await snapshot(monitor);
  expect(afterPlayback).toEqual(beforePlayback);
  await monitor.getByRole("button", { name: "Return to Live" }).click();
  await nav(monitor, "Automations & Integrations");
  await card(monitor, "Publish contractor activation")
    .getByRole("button", { name: "Publish contractor activation →" })
    .click();
  await nav(contractor, "Your journey");
  await nav(operations, "Overview");
  await nav(monitor, "Workflow monitor");
  for (const page of [contractor, operations, monitor])
    await expect(page.getByTestId("lifecycle-eligibility")).toHaveText(
      "Eligible",
    );
  const completed = (await snapshot(monitor)).viz!.recordings[0];
  await contractor
    .getByLabel("Add another company skill")
    .selectOption("Plumbing");
  await contractor
    .getByRole("button", { name: "＋ Request qualification" })
    .click();
  await expect(card(contractor, "Submit license evidence")).toHaveCount(0); // journey page remains scoped, no forced work navigation
  await expect
    .poll(async () => (await snapshot(monitor)).qualifications.length)
    .toBe(2);
  expect((await snapshot(monitor)).viz!.recordings[0]).toEqual(completed);
  await journey(monitor);
  s = await snapshot(monitor);
  const skillOrigin = s.events.find(
    (e) => e.eventType === "SkillRequested" && !e.applicationId,
  )!;
  await track(monitor, skillOrigin.eventId);
  await nav(contractor, "Required actions");
  await evidence(contractor, "Submit license evidence");
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    "Frame 1 / 1",
  );
  await monitor
    .getByLabel("Recording", { exact: true })
    .selectOption(completed.id);
  await expect(
    monitor.getByText("Archived · capture stopped", { exact: true }),
  ).toBeVisible();
  expect((await snapshot(monitor)).viz!.recordings[0].frames).toEqual(
    completed.frames,
  );
  const after = await synchronized([contractor, operations, monitor]);
  expect(after.viz!.activeRecordingId).not.toBe(completed.id);
});

test("Viz pan, zoom, minimap, blocker focus and logical groups are read-only", async ({
  context,
}) => {
  const contractor = await workspace(context, "contractor"),
    operations = await workspace(context, "operations"),
    monitor = await workspace(context, "monitor");
  await monitor.setViewportSize({ width: 1600, height: 1100 });
  await application(contractor);
  await proceed(operations);
  await journey(monitor);
  await track(monitor, (await snapshot(monitor)).events[0].eventId);
  await expect(monitor.getByTestId("viz-canvas")).toHaveAttribute(
    "data-fitting",
    "false",
  );
  const before = await snapshot(monitor),
    viewport = monitor.locator(".react-flow__viewport");
  const initial = await viewport.getAttribute("style");
  await monitor.getByRole("button", { name: "Zoom In", exact: true }).click();
  await expect.poll(() => viewport.getAttribute("style")).not.toBe(initial);
  const zoomed = await viewport.getAttribute("style");
  const canvas = (await monitor.getByTestId("viz-canvas").boundingBox())!;
  await monitor.mouse.move(canvas.x + 30, canvas.y + 120);
  await monitor.mouse.down();
  await monitor.mouse.move(canvas.x + 130, canvas.y + 180, { steps: 8 });
  await monitor.mouse.up();
  await expect.poll(() => viewport.getAttribute("style")).not.toBe(zoomed);
  const panned = await viewport.getAttribute("style");
  const minimap = (await monitor
    .locator(".react-flow__minimap")
    .boundingBox())!;
  await monitor.mouse.move(minimap.x + 50, minimap.y + 50);
  await monitor.mouse.down();
  await monitor.mouse.move(minimap.x + 80, minimap.y + 65, { steps: 6 });
  await monitor.mouse.up();
  await expect.poll(() => viewport.getAttribute("style")).not.toBe(panned);
  await monitor.getByRole("button", { name: "Fit map", exact: true }).click();
  await monitor
    .getByRole("button", { name: "Focus blockers", exact: true })
    .click();
  await expect(monitor.getByTestId("viz-canvas")).toHaveAttribute(
    "data-fitting",
    "false",
  );
  await monitor
    .getByRole("button", { name: "+ Skill qualification", exact: true })
    .click();
  await expect(monitor.locator(".react-flow__node")).toHaveCount(14);
  await monitor
    .locator(".react-flow__node")
    .filter({ has: monitor.getByTestId("viz-node-SubmitLicense") })
    .focus();
  await monitor.keyboard.press("Enter");
  await expect(
    monitor.getByRole("region", { name: "Selected journey step" }),
  ).toContainText("Contractor");
  await expect(
    monitor.getByRole("link", { name: "Open Contractor Portal" }),
  ).toBeVisible();
  expect(await snapshot(monitor)).toEqual(before);
});

test("duplicate notifications and event redelivery cannot append frames; concurrent selections keep one active recording", async ({
  context,
}) => {
  const contractor = await workspace(context, "contractor"),
    operations = await workspace(context, "operations"),
    monitor = await workspace(context, "monitor"),
    second = await workspace(context, "monitor");
  await application(contractor);
  const origin = (await snapshot(monitor)).events[0];
  await journey(monitor);
  await journey(second);
  await Promise.all([
    track(monitor, origin.eventId),
    track(second, origin.eventId),
  ]);
  let s = await snapshot(monitor);
  expect(s.viz!.recordings).toHaveLength(2);
  expect(
    s.viz!.recordings.filter((r) => r.stoppedAtRevision === undefined),
  ).toHaveLength(1);
  const activeId = s.viz!.activeRecordingId;
  await proceed(operations);
  const before = await snapshot(monitor);
  await nav(second, "Workflow monitor");
  await second
    .getByRole("button", { name: "Event ingress demonstrations" })
    .click();
  await second.getByRole("button", { name: "Redeliver last event" }).click();
  await second.evaluate((revision) => {
    const channel = new BroadcastChannel("fieldwork-onboarding:changes:v1");
    for (let i = 0; i < 3; i++)
      channel.postMessage({ type: "committed", revision });
    channel.close();
  }, before.revision);
  await synchronized([contractor, operations, monitor, second]);
  s = await snapshot(monitor);
  expect(s.viz).toEqual(before.viz);
  expect(s.viz!.activeRecordingId).toBe(activeId);
  expect(s.viz!.recordings.find((r) => r.id === activeId)!.frames).toHaveLength(
    2,
  );
  await monitor.reload();
  await journey(monitor);
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    "Frame 1 / 1",
  );
  await monitor.close();
  await second.close();
  await nav(contractor, "Required actions");
  await evidence(contractor, "Submit insurance evidence");
  const reopened = await workspace(context, "monitor");
  await journey(reopened);
  await expect(reopened.getByTestId("viz-frame-number")).toHaveText(
    "Frame 2 / 2",
  );
});
