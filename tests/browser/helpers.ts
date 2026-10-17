import {
  expect,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import type { State } from "../../src/domain";
import {
  assembleStoredWorkspace,
  type Control,
  type Head,
  type BusinessRow,
} from "../../src/indexedDbRepository";
import type { VisualFrame } from "../../src/viz/types";

export async function workspace(
  context: BrowserContext,
  route: "contractor" | "operations" | "monitor",
) {
  const page = await context.newPage();
  await page.goto(`/#/${route}`);
  await expect(page.getByTestId("sync-status")).toContainText("Live");
  await expect(
    page.getByText("Restoring your browser-local workspace…"),
  ).toHaveCount(0);
  if (route === "monitor") await nav(page, "Workflow monitor");
  return page;
}
export async function nav(page: Page, name: string) {
  if (
    ["Overview", "Work queue"].includes(name) &&
    page.url().includes("#/monitor")
  )
    await page.goto("/#/operations");
  if (page.url().includes("#/operations") && name === "Overview") return; // Records now live below the working actions.
  if (page.url().includes("#/operations") && name === "Outbox") {
    await page
      .locator(".ops-disclosure")
      .filter({ hasText: "Messages & activity history" })
      .locator("summary")
      .click();
    return;
  }
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
}
export async function role(page: Page, name: string) {
  if (!page.url().includes("#/operations")) await page.goto("/#/operations");
  await page.getByLabel("Internal role").selectOption(name);
  // Explicit test intent to work on the first available company; production never substitutes a stale selection.
  if (
    (await page.locator(".ops-company-row.selected").count()) === 0 &&
    (await page.locator(".ops-company-row").count()) > 0
  )
    await page.locator(".ops-company-row").first().click();
}
export function card(page: Page, name: string): Locator {
  return page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
}
export async function systemActivities(page: Page) {
  if (page.url().includes("#/monitor")) {
    await nav(page, "Automations & Integrations");
    return;
  }
  const parent = page
    .getByRole("navigation")
    .getByRole("button", { name: "Work queue", exact: true });
  if ((await parent.getAttribute("aria-expanded")) !== "true")
    await parent.click();
  await page
    .getByRole("button", {
      name: "Automations & Integrations work",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("region", { name: "Automations & Integrations" }),
  ).toBeVisible();
}
export async function application(
  page: Page,
  name = "Summit Three Tabs",
  email = "alex@example.com",
) {
  await page.getByRole("button", { name: "＋ New application" }).click();
  await page.getByLabel("Fictional company name").fill(name);
  await page.getByLabel("Contact name").fill("Alex Demo");
  await page.getByLabel("Application email").fill(email);
  await page.getByLabel("Initial requested skill").selectOption("HVAC");
  await page.getByRole("button", { name: "Submit application →" }).click();
  await expect(
    page.getByRole("heading", { name: "Application submitted" }),
  ).toBeVisible();
  await signIn(page, email, name);
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}
export async function signIn(page: Page, email: string, companyName?: string) {
  await page.getByLabel("Application email").fill(email);
  await page.getByLabel("Simulation password", { exact: true }).fill("123");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  if (
    await page.getByRole("heading", { name: "Choose your company" }).isVisible()
  ) {
    const option = page
      .getByLabel("Company for this sign in")
      .locator("option")
      .filter({ hasText: companyName! });
    await page
      .getByLabel("Company for this sign in")
      .selectOption((await option.getAttribute("value"))!);
    await page.getByRole("button", { name: "Continue to company" }).click();
  }
  await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible();
}
export async function proceed(page: Page) {
  await role(page, "Recruitment");
  const task = card(page, "Review application");
  const workItemId = await task.getAttribute("data-work-item");
  await task.getByRole("button", { name: "Record decision →" }).click();
  await expect(
    page.locator(`article[data-work-item="${workItemId}"]`),
  ).toHaveCount(0);
}
/** Explicit broader discovery, never silently chooses a replacement company. */
export async function inspectCompany(page: Page, name: string) {
  if (!page.url().includes("#/operations")) await page.goto("/#/operations");
  const myWork = page.getByRole("button", {
    name: "Return to my work",
    exact: true,
  });
  if (await myWork.isVisible()) await myWork.click();
  await page
    .getByRole("button", { name: "All companies", exact: true })
    .click();
  await page
    .locator(".application-row")
    .filter({ has: page.getByText(name, { exact: true }) })
    .click();
  for (const record of [
    page.locator(".ops-disclosure").filter({
      has: page.getByText("Company facts & readiness", { exact: true }),
    }),
    page.getByTestId("ops-stage-skills"),
  ]) {
    if ((await record.count()) && (await record.getAttribute("open")) === null)
      await record.locator("summary").first().click();
  }
}
export async function evidence(
  page: Page,
  activity: string,
  fixture = "Valid demo document",
) {
  const task = card(page, activity);
  await task.getByLabel("Fictional evidence fixture").selectOption(fixture);
  await task.getByRole("button", { name: "Submit evidence →" }).click();
  await expect(task).toHaveCount(0);
}
export async function verify(page: Page, activity: string) {
  const task = card(page, activity);
  await task
    .getByRole("button", { name: "Run simulated verification →" })
    .click();
  await expect(task).toHaveCount(0);
}
export async function completion(page: Page, activity: string, button: string) {
  const task = card(page, activity);
  await task.getByRole("checkbox").check();
  await task.getByRole("button", { name: button }).click();
  await expect(task).toHaveCount(0);
}
export async function snapshot(page: Page): Promise<State> {
  const data = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("fieldwork-onboarding");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const read = <T>(r: IDBRequest<T>) =>
      new Promise<T>((resolve, reject) => {
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    try {
      const stores = db.objectStoreNames.contains("viz-control")
        ? ["state", "viz-control", "viz-recordings", "viz-frames"]
        : ["state"];
      const tx = db.transaction(stores);
      const [raw, control, heads, frames, keys] = await Promise.all([
        read(tx.objectStore("state").get("current")),
        stores.length > 1
          ? read(tx.objectStore("viz-control").get("current"))
          : undefined,
        stores.length > 1
          ? read(tx.objectStore("viz-recordings").getAll())
          : [],
        stores.length > 1 ? read(tx.objectStore("viz-frames").getAll()) : [],
        stores.length > 1
          ? read(tx.objectStore("viz-frames").getAllKeys())
          : [],
      ]);
      return { raw, control, heads, frames, keys };
    } finally {
      db.close();
    }
  });
  if (!data.raw) return data.raw;
  const frames = new Map<string, VisualFrame[]>();
  data.frames.forEach((f, i) => {
    const id = (data.keys[i] as [string, number])[0];
    const list = frames.get(id) ?? [];
    list.push(f);
    frames.set(id, list);
  });
  return assembleStoredWorkspace(
    data.raw as BusinessRow | State,
    data.control as Control | undefined,
    data.heads as Head[],
    frames,
  );
}
export async function synchronized(pages: Page[]) {
  await expect
    .poll(async () => {
      const current = await snapshot(pages[0]);
      const revisions = await Promise.all(
        pages.map((page) =>
          page.getByTestId("sync-status").getAttribute("data-revision"),
        ),
      );
      return revisions.every(
        (revision) => revision === String(current.revision),
      );
    })
    .toBe(true);
  return snapshot(pages[0]);
}

/** Normal participant actions, stopping before initial activation publication. */
export async function initialReadiness(
  contractor: Page,
  operations: Page,
  approveSkill = true,
) {
  await application(contractor);
  await proceed(operations);
  await nav(contractor, "Required actions");
  for (const name of [
    "Submit insurance evidence",
    "Submit fictional tax / banking pack",
    "Submit simulated agreement",
    "Submit license evidence",
  ])
    await evidence(contractor, name);
  await role(operations, "Compliance");
  await verify(operations, "Review insurance");
  await verify(operations, "Verify license");
  await role(operations, "Finance");
  await verify(operations, "Verify fictional financial pack");
  await role(operations, "Contractor Relations");
  await verify(operations, "Execute simulated agreement");
  await systemActivities(operations);
  await card(operations, "Create vendor record")
    .getByRole("button", { name: "Create vendor record →" })
    .click();
  await expect(card(operations, "Create vendor record")).toHaveCount(0);
  await role(operations, "Field Manager");
  const decision = card(operations, "Approve skill qualification");
  if (!approveSkill) {
    await decision.getByLabel("Qualification decision").selectOption("Reject");
    await decision
      .getByLabel("Decision note")
      .fill("Demo qualification rejected");
  }
  await decision
    .getByRole("button", { name: "Record skill decision →" })
    .click();
  await expect(decision).toHaveCount(0);
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
  await role(operations, "Training");
  await completion(
    operations,
    "Confirm training completion",
    "Confirm training →",
  );
}
export async function publishInitialActivation(operations: Page) {
  await systemActivities(operations);
  const task = card(operations, "Publish contractor activation");
  await task
    .getByRole("button", { name: "Publish contractor activation →" })
    .click();
  await expect(task).toHaveCount(0);
  await pageReturnToOperations(operations);
}

async function pageReturnToOperations(page: Page) {
  await page.goto("/#/operations");
  await expect(page.getByLabel("Internal role")).toBeVisible();
}
