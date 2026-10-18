import { test, expect } from "@playwright/test";
import {
  application,
  card,
  evidence,
  nav,
  proceed,
  role,
  snapshot,
  synchronized,
  verify,
  workspace,
  inspectCompany,
} from "./helpers";

test.use({ viewport: { width: 1600, height: 1100 } });
test("role-scoped network follows open owned work, clears stale selection, supports broad discovery and preserves global totals", async ({
  context,
}, info) => {
  const portal = await workspace(context, "contractor"),
    recruitment = await workspace(context, "operations"),
    compliance = await workspace(context, "operations");
  await application(portal, "Active Alpha", "alpha@example.com");
  await application(portal, "Active Beta", "beta@example.com");
  await expect(recruitment.locator(".application-row")).toHaveCount(2);
  const initial = await snapshot(recruitment),
    beta = initial.companies.find((c) => c.name === "Active Beta")!;
  await recruitment
    .locator(".application-row")
    .filter({ hasText: "Active Beta" })
    .click();
  await proceed(recruitment);
  await expect(recruitment.locator(".application-row")).toHaveCount(1);
  await expect(recruitment.locator(".application-row")).toContainText(
    "Active Alpha",
  );
  await expect(recruitment.getByTestId("lifecycle-onboarding")).toHaveCount(0);
  await recruitment.screenshot({
    path: info.outputPath("recruitment-active-work.png"),
    fullPage: true,
  });
  await role(compliance, "Compliance");
  await expect(
    compliance.getByText("No active work for Compliance.", { exact: true }),
  ).toBeVisible();
  await nav(portal, "Required actions");
  await evidence(portal, "Submit insurance evidence");
  await expect(compliance.locator(".application-row")).toHaveCount(1);
  await expect(compliance.locator(".application-row")).toContainText(
    "Active Beta",
  );
  await expect(
    compliance.locator(".application-row .ops-role-count"),
  ).toHaveText("1");
  await compliance.locator(".application-row").click();
  await verify(compliance, "Review insurance");
  await expect(compliance.locator(".application-row")).toHaveCount(0);
  await expect(compliance.getByTestId("lifecycle-onboarding")).toHaveCount(0);
  await role(compliance, "Finance");
  await compliance
    .getByRole("button", { name: "Show all companies", exact: true })
    .click();
  await expect(compliance.locator(".application-row")).toHaveCount(2);
  await compliance
    .locator(".application-row")
    .filter({ hasText: "Active Beta" })
    .click();
  await inspectCompany(compliance, "Active Beta");
  await expect(compliance.getByTestId("lifecycle-onboarding")).toBeVisible();
  await nav(compliance, "Work queue");
  await compliance
    .getByRole("button", { name: "All participants work", exact: true })
    .click();
  await compliance.getByLabel("Work queue company").selectOption("");
  await expect(
    compliance.getByRole("button", { name: "Record decision →", exact: true }),
  ).toHaveCount(0);
  await expect(
    compliance.getByText(
      "Owned by Recruitment. Select that role to complete this work.",
      { exact: true },
    ),
  ).toBeVisible();
  const s = await synchronized([portal, recruitment, compliance]);
  expect(s.workflows.filter((w) => w.companyId === beta.id)).toHaveLength(2);
  for (const page of [recruitment, compliance])
    await expect(page.getByTestId("queue-total")).toHaveText(
      String(s.workItems.filter((t) => t.status === "Open").length),
    );
  await compliance.screenshot({
    path: info.outputPath("all-companies-discovery.png"),
    fullPage: true,
  });
});

test("grouped activity counts reconcile with correction loops, failures and immutable historical frames", async ({
  context,
}, info) => {
  const portal = await workspace(context, "contractor"),
    ops = await workspace(context, "operations"),
    monitor = await workspace(context, "monitor");
  await application(portal);
  const origin = (await snapshot(monitor)).events[0].eventId;
  await nav(monitor, "Journey Map");
  await monitor
    .getByLabel("Originating event", { exact: true })
    .selectOption(origin);
  await monitor
    .getByRole("button", { name: "Track journey", exact: false })
    .click();
  await expect(monitor.getByTestId("remaining-Insurance")).toHaveText(
    "Route pending",
  );
  await proceed(ops);
  await expect(monitor.getByTestId("remaining-Insurance")).toHaveText(
    "2 remaining",
  );
  await expect(monitor.getByTestId("remaining-Enablement")).toHaveText(
    "4 remaining",
  );
  await expect(monitor.getByTestId("remaining-Starting point")).toHaveText(
    "Complete",
  );
  await nav(portal, "Required actions");
  await evidence(portal, "Submit insurance evidence", "Expired demo document");
  await expect(monitor.getByTestId("remaining-Insurance")).toHaveText(
    "1 remaining",
  );
  await role(ops, "Compliance");
  await verify(ops, "Review insurance");
  await expect(monitor.getByTestId("remaining-Insurance")).toHaveText(
    "2 remaining",
  );
  const correction = (await snapshot(monitor)).viz!.recordings[0].frames.at(
    -1,
  )!.number;
  await evidence(portal, "Submit insurance evidence");
  await expect(monitor.getByTestId("remaining-Insurance")).toHaveText(
    "1 remaining",
  );
  await role(ops, "Compliance");
  const t = card(ops, "Review insurance");
  await t.getByText("Test outcomes", { exact: true }).click();
  await t.getByRole("checkbox").check();
  await t
    .getByRole("button", { name: "Run test verification →", exact: true })
    .click();
  await expect(t).toContainText("Verification failed — retry available");
  await expect(monitor.getByTestId("remaining-Insurance")).toHaveText(
    "1 remaining",
  );
  await nav(monitor, "Automations & Integrations");
  const retry = card(monitor, "Review insurance");
  await retry
    .getByRole("button", { name: "↻ Retry activity →", exact: true })
    .click();
  await expect(retry).toHaveCount(0);
  await nav(monitor, "Journey Map");
  await expect(monitor.getByTestId("remaining-Insurance")).toHaveText(
    "Complete",
  );
  await monitor.getByLabel("Visual history").fill(String(correction));
  await expect(monitor.getByTestId("remaining-Insurance")).toHaveText(
    "2 remaining",
  );
  await monitor
    .getByRole("button", { name: "+ Insurance", exact: true })
    .click();
  await expect(monitor.getByTestId("viz-node-SubmitInsurance")).toHaveAttribute(
    "data-status",
    "waiting",
  );
  await expect(monitor.getByTestId("viz-node-ReviewInsurance")).toHaveAttribute(
    "data-status",
    "complete",
  );
  await monitor
    .getByRole("button", { name: "Group overview", exact: true })
    .click();
  await monitor
    .getByRole("button", { name: "Presentation view", exact: true })
    .click();
  await monitor.screenshot({
    path: info.outputPath("grouped-remaining-history.png"),
    fullPage: true,
  });
  await monitor
    .getByRole("button", { name: "Return to Live", exact: true })
    .click();
  await expect(monitor.getByTestId("remaining-Insurance")).toHaveText(
    "Complete",
  );
});

test("real auxiliary frame-write failure commits business work, isolates one recording and preserves healthy capture across refresh", async ({
  context,
}, info) => {
  await context.addInitScript(() => {
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (...args: Parameters<typeof add>) {
      if (
        this.name === "viz-frames" &&
        Array.isArray(args[1]) &&
        args[1][0] ===
          (window as unknown as { failingRecording: string }).failingRecording
      )
        throw new DOMException(
          "Injected auxiliary failure",
          "QuotaExceededError",
        );
      return add.apply(this, args);
    };
  });
  const portal = await workspace(context, "contractor"),
    ops = await workspace(context, "operations"),
    monitor = await workspace(context, "monitor");
  await application(portal);
  const origin = (await snapshot(monitor)).events[0].eventId;
  await nav(monitor, "Journey Map");
  await monitor
    .getByLabel("Originating event", { exact: true })
    .selectOption(origin);
  for (let i = 0; i < 2; i++) {
    await monitor
      .getByRole("button", { name: "Track journey", exact: false })
      .click();
    await expect
      .poll(async () => (await snapshot(monitor)).viz?.recordings.length ?? 0)
      .toBe(i + 1);
  }
  const before = await snapshot(monitor),
    broken = before.viz!.recordings[0].id,
    healthy = before.viz!.recordings[1].id;
  await ops.evaluate((id) => {
    (window as unknown as { failingRecording: string }).failingRecording = id;
  }, broken);
  await proceed(ops);
  let s = await synchronized([portal, ops, monitor]);
  expect(s.applications[0].status).toBe("Onboarding");
  expect(s.viz!.recordings.find((r) => r.id === broken)!.status).toBe(
    "Capture issue",
  );
  expect(s.viz!.recordings.find((r) => r.id === healthy)!.frames).toHaveLength(
    2,
  );
  await nav(portal, "Required actions");
  await evidence(portal, "Submit license evidence");
  s = await synchronized([portal, ops, monitor]);
  expect(s.viz!.recordings.find((r) => r.id === broken)!.frames).toHaveLength(
    1,
  );
  expect(s.viz!.recordings.find((r) => r.id === healthy)!.frames).toHaveLength(
    3,
  );
  await monitor.reload();
  await nav(monitor, "Journey Map");
  await monitor.getByLabel("Recording", { exact: true }).selectOption(broken);
  await expect(monitor.getByRole("alert")).toContainText("capture gap");
  await expect(monitor.getByTestId("viz-frame-number")).toHaveText(
    "Frame 0 / 0",
  );
  await monitor.screenshot({
    path: info.outputPath("observer-capture-issue.png"),
    fullPage: true,
  });
});
