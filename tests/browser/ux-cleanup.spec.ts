import { test, expect, type Page } from "@playwright/test";
import { contractorStates } from "../fixtures/contractorStates";
import { operationsState } from "../fixtures/operationsState";
import { type WorkspaceFile } from "../../src/workspace/format";
import { selectionWorkspace } from "../fixtures/recordingSelection";
import { frame13Workspace } from "../fixtures/workspace";
import { createWorkspaceFile } from "../../src/workspace/format";
import { emptyState } from "../../src/domain";
import { journeyMapLink } from "../../src/presentation";
import { signIn, snapshot, synchronized, workspace } from "./helpers";

const baseline = process.env.UNITY_CAPTURE_BASELINE === "1";
async function load(page: Page, file: WorkspaceFile) {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /^(Demo )?Workspace$/ })
    .click();
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

test("cleanup hierarchy, landing spacing, navigation and cool surfaces at desktop/mobile remain presentation-only", async ({
  context,
}, info) => {
  test.setTimeout(90000);
  const portal = await workspace(context, "contractor");
  const shots = async (name: string, page: Page) =>
    page.screenshot({
      path: info.outputPath(`${baseline ? "before" : "after"}-${name}.png`),
      fullPage: false,
      animations: "disabled",
    });
  await portal.setViewportSize({ width: 390, height: 844 });
  await expect(
    portal.getByRole("heading", {
      name: "Your next opportunity starts here.",
      exact: true,
    }),
  ).toBeVisible();
  const landingY = (await portal.locator(".portal-access").boundingBox())!.y;
  if (!baseline) {
    await expect(
      portal.getByRole("heading", {
        name: "Your next chapter starts here.",
        exact: true,
      }),
    ).toHaveCount(0);
    // Preserve the accepted introduction gap relative to the header. Its absolute
    // screen coordinate changes with the neutral mark and native platform fonts.
    const header = (await portal.locator(".main > header").boundingBox())!;
    expect(landingY - header.y - header.height).toBeCloseTo(93, 0);
  } else {
    const fs = await import("node:fs/promises");
    await fs.mkdir("docs/chet/iteration-3.13", { recursive: true });
    await fs.writeFile(
      "docs/chet/iteration-3.13/before-layout.json",
      JSON.stringify({
        landingY,
        titleHeight: (await portal.locator(".title-row").boundingBox())!.height,
      }),
    );
  }
  await shots("anonymous-390", portal);
  await portal
    .getByRole("button", { name: "Start a new application", exact: false })
    .click();
  await expect(
    portal.getByRole("heading", {
      name: "Your next chapter starts here.",
      exact: true,
    }),
  ).toBeVisible();
  await portal.getByRole("button", { name: "Open Sign In" }).click();
  const monitor = await workspace(context, "monitor");
  const { files } = await contractorStates();
  await load(monitor, files.eligible);
  await signIn(portal, "alex@example.com");
  const before = await synchronized([portal, monitor]);
  for (const width of [1440, 390]) {
    await portal.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    if (!baseline) {
      const growth = await portal
        .getByRole("heading", {
          name: "Grow your company's skills",
          exact: true,
        })
        .boundingBox();
      const history = await portal
        .getByRole("heading", {
          name: "Your completed onboarding",
          exact: true,
        })
        .boundingBox();
      expect(growth!.y).toBeLessThan(history!.y);
      await expect(
        portal.getByRole("button", { name: /Request qualification/ }),
      ).toHaveClass("primary");
    }
    expect(
      await portal.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await portal.evaluate(() => scrollTo(0, 0));
    if (width === 1440) await shots("contractor-1440", portal);
  }
  expect(await snapshot(portal)).toEqual(before);
  await monitor
    .getByRole("navigation")
    .getByRole("button", { name: "Journey Map", exact: true })
    .click();
  await expect(monitor.getByTestId("viz-canvas")).toBeVisible();
  await monitor.setViewportSize({ width: 1440, height: 1000 });
  await shots("viz-monitor-1440", monitor);
  if (!baseline) {
    const navigation = monitor.getByRole("navigation");
    await expect(
      navigation.getByRole("button", { name: "Workspace", exact: true }),
    ).toHaveCount(1);
    await expect(navigation.getByRole("separator")).toHaveCount(1);
    const left = async (name: string) =>
      (await navigation
        .getByRole("button", { name, exact: true })
        .locator(".nav-label")
        .boundingBox())!.x;
    expect(await left("Automations & Integrations")).toBeCloseTo(
      await left("Workflow monitor"),
      0,
    );
    await expect(monitor.locator(".recording-browser")).toHaveCSS(
      "background-color",
      "rgb(248, 250, 252)",
    );
    await expect(
      monitor.locator(".recording-table tr[aria-selected=true]"),
    ).toHaveCSS("background-color", "rgb(234, 242, 249)");
    for (const width of [1440, 390]) {
      await monitor.setViewportSize({
        width,
        height: width === 390 ? 844 : 1000,
      });
      expect(
        await monitor.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  expect(await snapshot(monitor)).toEqual(before);
  await load(monitor, await operationsState());
  const ops = await workspace(context, "operations");
  await ops.setViewportSize({ width: 1440, height: 1000 });
  const fleet = await synchronized([ops, monitor]);
  await ops.locator(".ops-company-row").first().click();
  await shots("operations-1440", ops);
  expect(await snapshot(ops)).toEqual(fleet);
});

async function journey(
  page: Page,
  companyId = "",
  workflowId = "",
  recordingId = "",
) {
  await page.evaluate(
    (hash) => {
      location.hash = hash;
    },
    journeyMapLink(companyId, workflowId, recordingId),
  );
  await expect(
    page.getByRole("region", { name: "Journey Map", exact: true }),
  ).toBeVisible();
}
async function monitorNav(page: Page, name: string) {
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
}

test("real manual, automatic, stopped and mid-workflow recordings resolve; explicit selection survives navigation/refresh and stays tab-local", async ({
  context,
}) => {
  const page = await workspace(context, "monitor"),
    second = await workspace(context, "monitor");
  const file = await selectionWorkspace();
  await load(page, file);
  const before = await synchronized([page, second]);
  const company = before.companies.find(
    (c) => c.name === "Skill capture only",
  )!;
  const root = before.workflows.find(
    (w) => w.companyId === company.id && w.definitionId === "CompanyOnboarding",
  )!;
  await journey(page, company.id, root.id);
  const skill = before.viz!.recordings.find((r) => r.companyId === company.id)!;
  await expect(page.getByLabel("Recording", { exact: true })).toHaveValue(
    skill.id,
  );
  await expect(page.getByTestId("viz-frame-number")).toHaveText("Frame 0 / 0");
  const stopped = before.viz!.recordings.find(
    (r) => r.stoppedAtRevision !== undefined,
  )!;
  const automatic = before.viz!.recordings.find(
    (r) => !!r.triggerMatches?.length,
  )!;
  for (const r of before.viz!.recordings) {
    await page.getByLabel("Recording", { exact: true }).selectOption(r.id);
    await expect(page.getByLabel("Recording", { exact: true })).toHaveValue(
      r.id,
    );
    await expect(page.getByTestId("viz-frame-number")).toBeVisible();
  }
  await page.getByLabel("Recording", { exact: true }).selectOption(stopped.id);
  await journey(
    second,
    automatic.companyId,
    automatic.workflowId,
    automatic.id,
  );
  await monitorNav(page, "Workflow monitor");
  await monitorNav(page, "Workspace");
  await monitorNav(page, "Journey Map");
  await expect(page.getByLabel("Recording", { exact: true })).toHaveValue(
    stopped.id,
  );
  await expect(second.getByLabel("Recording", { exact: true })).toHaveValue(
    automatic.id,
  );
  expect(await snapshot(page)).toEqual(before);
  await page.reload();
  await expect(page.getByLabel("Recording", { exact: true })).toHaveValue(
    stopped.id,
  );
  // Existing service initialization increments revision on refresh, never recording/business facts.
  expect({
    ...(await synchronized([page, second])),
    revision: before.revision,
  }).toEqual(before);
});

test("honest empty states, archived/completed recordings and workspace replacement never substitute another company", async ({
  context,
}) => {
  const page = await workspace(context, "monitor"),
    loader = await workspace(context, "monitor");
  const file = await selectionWorkspace();
  await load(loader, file);
  const noCapture = file.state.companies.find((c) => c.name === "No capture")!;
  await journey(page, noCapture.id);
  const before = await synchronized([page, loader]);
  await expect(
    page.getByLabel("Recording", { exact: true }).locator("option:checked"),
  ).toHaveText("No recordings for this company");
  await page.getByRole("link", { name: "All companies", exact: true }).click();
  await expect(page.getByLabel("Recording", { exact: true })).not.toHaveValue(
    "",
  );
  expect(await snapshot(page)).toEqual(before);
  const archived = await frame13Workspace();
  await load(loader, archived);
  await expect(page.getByLabel("Recording", { exact: true })).toHaveValue("");
  await expect(
    page.getByText("The linked recording is unavailable for this journey.", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Recording", { exact: true })
    .selectOption(archived.state.viz!.recordings[0].id);
  await expect(page.getByTestId("viz-frame-number")).toHaveText("Frame 0 / 0");
  await monitorNav(page, "Workspace");
  await monitorNav(page, "Journey Map");
  await expect(page.getByLabel("Recording", { exact: true })).toHaveValue(
    archived.state.viz!.recordings[0].id,
  );
  const { files } = await contractorStates();
  await load(loader, files.eligible);
  await expect(page.getByLabel("Recording", { exact: true })).toHaveValue("");
  await monitorNav(page, "Workspace");
  await monitorNav(page, "Journey Map");
  await expect(
    page.getByLabel("Recording", { exact: true }).locator("option:checked"),
  ).toHaveText("No recordings for this company");
  await page.getByRole("link", { name: "All companies", exact: true }).click();
  const completed = files.eligible.state.viz!.recordings[0];
  await page
    .getByLabel("Recording", { exact: true })
    .selectOption(completed.id);
  await expect(
    page.getByLabel("Recording", { exact: true }).locator("option:checked"),
  ).toContainText("Completed");
  const stable = await synchronized([page, loader]);
  await monitorNav(page, "Workflow monitor");
  await monitorNav(page, "Journey Map");
  await expect(page.getByLabel("Recording", { exact: true })).toHaveValue(
    completed.id,
  );
  expect(await snapshot(page)).toEqual(stable);
  await load(
    loader,
    createWorkspaceFile(emptyState(), "Empty workspace", "No capture exists."),
  );
  await expect(
    page.getByLabel("Recording", { exact: true }).locator("option:checked"),
  ).toHaveText("No recordings yet");
  await expect(
    page.getByRole("link", { name: "All companies", exact: true }),
  ).toHaveCount(0);
});
