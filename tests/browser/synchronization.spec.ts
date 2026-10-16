import { test, expect } from "@playwright/test";
import {
  application,
  card,
  nav,
  proceed,
  role,
  snapshot,
  synchronized,
  workspace,
} from "./helpers";

test("missed background notifications recover when the inactive tab becomes visible", async ({
  context,
}) => {
  const contractor = await workspace(context, "contractor"),
    operations = await workspace(context, "operations");
  const monitor = await context.newPage();
  await monitor.addInitScript(() => {
    const descriptor = Object.getOwnPropertyDescriptor(
      BroadcastChannel.prototype,
      "onmessage",
    )!;
    Object.defineProperty(BroadcastChannel.prototype, "onmessage", {
      ...descriptor,
      set(callback: (event: MessageEvent) => void) {
        descriptor.set!.call(this, (event: MessageEvent) => {
          if (
            !(window as unknown as { dropDemoNotifications: boolean })
              .dropDemoNotifications
          )
            callback(event);
        });
      },
    });
    (
      window as unknown as { dropDemoNotifications: boolean }
    ).dropDemoNotifications = true;
  });
  await monitor.goto("/#/monitor");
  await expect(monitor.getByTestId("sync-status")).toContainText("Live");
  await expect(
    monitor.getByText("Restoring your browser-local workspace…"),
  ).toHaveCount(0);
  // Headless pages each remain "visible" even when another page is brought forward.
  // Drive the browser lifecycle event explicitly; repository and channel behavior remain real.
  await monitor.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await application(contractor, "Visible Again Demo");
  await expect(card(operations, "Review application")).toBeVisible();
  await proceed(operations);
  // Inbound channel messages were intentionally dropped only in Monitor.
  await expect(
    monitor.getByRole("heading", { name: "Visible Again Demo", exact: true }),
  ).toHaveCount(0);
  await monitor.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    monitor.getByRole("heading", { name: "Visible Again Demo", exact: true }),
  ).toBeVisible();
  await synchronized([contractor, operations, monitor]);
  await expect(
    monitor.getByLabel("Workflow instance").locator("option"),
  ).toHaveCount(2);
});

test("change notifications contain only revision metadata and observe already committed state", async ({
  context,
}) => {
  await context.addInitScript(() => {
    type Probe = { keys: string[]; announced: number; stored: number };
    const probes: Promise<Probe>[] = [];
    (
      window as unknown as { notificationProbes: Promise<Probe>[] }
    ).notificationProbes = probes;
    const send = BroadcastChannel.prototype.postMessage;
    BroadcastChannel.prototype.postMessage = function (data: {
      type: string;
      revision: number;
    }) {
      probes.push(
        new Promise<Probe>((resolve, reject) => {
          const request = indexedDB.open("fieldwork-onboarding", 1);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result,
              r = db.transaction("state").objectStore("state").get("current");
            r.onsuccess = () => {
              resolve({
                keys: Object.keys(data).sort(),
                announced: data.revision,
                stored: r.result.revision,
              });
              db.close();
            };
            r.onerror = () => reject(r.error);
          };
        }),
      );
      return send.call(this, data);
    };
  });
  const contractor = await workspace(context, "contractor"),
    operations = await workspace(context, "operations"),
    monitor = await workspace(context, "monitor");
  await application(contractor);
  await proceed(operations);
  await synchronized([contractor, operations, monitor]);
  const probes = (
    await Promise.all(
      [contractor, operations, monitor].map((page) =>
        page.evaluate(async () =>
          Promise.all(
            (
              window as unknown as {
                notificationProbes: Promise<{
                  keys: string[];
                  announced: number;
                  stored: number;
                }>[];
              }
            ).notificationProbes,
          ),
        ),
      ),
    )
  ).flat();
  expect(probes.length).toBeGreaterThanOrEqual(5);
  for (const probe of probes) {
    expect(probe.keys).toEqual(["revision", "type"]);
    expect(probe.stored).toBeGreaterThanOrEqual(probe.announced);
  }
});

for (const capability of ["locks", "BroadcastChannel"] as const) {
  test(`fails safely when ${capability} is unavailable`, async ({
    context,
  }) => {
    await context.addInitScript((capability) => {
      Object.defineProperty(
        capability === "locks" ? navigator : window,
        capability,
        { value: undefined, configurable: true },
      );
    }, capability);
    const page = await context.newPage();
    await page.goto("/#/contractor");
    await expect(page.getByRole("alert")).toContainText(
      "Web Locks and BroadcastChannel",
    );
    await expect(
      page.getByRole("button", { name: "＋ New application" }),
    ).toBeDisabled();
    await expect(page.getByTestId("sync-status")).toContainText(
      "Writes disabled",
    );
    expect(await snapshot(page)).toBeUndefined();
  });
}

test("hash navigation keeps application and internal tab selections separate", async ({
  context,
}) => {
  const contractor = await workspace(context, "contractor"),
    operations = await workspace(context, "operations"),
    monitor = await workspace(context, "monitor");
  await application(contractor, "First Company");
  await application(contractor, "Second Company");
  // Selection of a different company and role in one tab does not move another tab.
  await operations
    .getByRole("button")
    .filter({ hasText: "First Company" })
    .click();
  await role(operations, "Finance");
  await monitor
    .getByRole("button")
    .filter({ hasText: "First Company" })
    .click();
  await expect(
    contractor.getByRole("heading", { name: "Second Company", exact: true }),
  ).toBeVisible();
  await expect(
    operations.getByRole("heading", { name: "First Company", exact: true }),
  ).toBeVisible();
  await expect(
    monitor.getByRole("heading", { name: "First Company", exact: true }),
  ).toBeVisible();
  await operations.reload();
  await expect(operations.getByLabel("Internal role")).toHaveValue("Finance");
  await expect(
    operations.getByRole("heading", { name: "First Company", exact: true }),
  ).toBeVisible();
  await contractor.reload();
  await expect(
    contractor.getByRole("heading", { name: "Second Company", exact: true }),
  ).toBeVisible();
  await nav(contractor, "Required actions");
  await synchronized([contractor, operations, monitor]);
});
