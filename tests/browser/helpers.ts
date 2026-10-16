import {
  expect,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import type { State } from "../../src/domain";

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
  return page;
}
export async function nav(page: Page, name: string) {
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
}
export async function role(page: Page, name: string) {
  await page.getByLabel("Internal role").selectOption(name);
}
export function card(page: Page, name: string): Locator {
  return page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
}
export async function systemActivities(page: Page) {
  const parent = page
    .getByRole("navigation")
    .getByRole("button", { name: "Work queue", exact: true });
  if ((await parent.getAttribute("aria-expanded")) !== "true")
    await parent.click();
  await page
    .getByRole("button", { name: "System Activities work", exact: true })
    .click();
}
export async function application(
  page: Page,
  name = "Summit Three Tabs",
  email = "alex@example.com",
) {
  await page.getByRole("button", { name: "＋ New application" }).click();
  await page.getByLabel("Fictional company name").fill(name);
  await page.getByLabel("Demo contact name").fill("Alex Demo");
  await page.getByLabel("Demo email").fill(email);
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
  await page.getByLabel("Demo password", { exact: true }).fill("123");
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
  await task.getByRole("button", { name: "Record decision →" }).click();
  await expect(task).toHaveCount(0);
}
export async function evidence(
  page: Page,
  activity: string,
  fixture = "Valid demo document",
) {
  const task = card(page, activity);
  await task.getByLabel("Fictional evidence fixture").selectOption(fixture);
  await task.getByRole("button", { name: "Submit demo evidence →" }).click();
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
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("fieldwork-onboarding", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      return await new Promise<State>((resolve, reject) => {
        const r = db.transaction("state").objectStore("state").get("current");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } finally {
      db.close();
    }
  });
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
    "Submit demo agreement",
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
  await card(operations, "Provision simulated vendor")
    .getByRole("button", { name: "Run vendor provisioning →" })
    .click();
  await expect(card(operations, "Provision simulated vendor")).toHaveCount(0);
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
    "Complete demo portal setup",
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
  const task = card(
    operations,
    "Publish activation to demo contractor management",
  );
  await task
    .getByRole("button", { name: "Run activation publication →" })
    .click();
  await expect(task).toHaveCount(0);
}
