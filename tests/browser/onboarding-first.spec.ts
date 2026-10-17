import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { contractorStates } from "../fixtures/contractorStates";
import { nav, signIn, snapshot, workspace, card } from "./helpers";

test("contractor business journey covers seven real states at desktop and mobile, with inspectable details and unchanged facts", async ({
  context,
}, info) => {
  const { files } = await contractorStates();
  const monitor = await workspace(context, "monitor"),
    portal = await workspace(context, "contractor");
  test.setTimeout(120000);
  for (const name of [
    "submitted",
    "active-work",
    "correction",
    "waiting-team",
    "activation-pending",
    "eligible",
    "separate-skill",
  ]) {
    await fs.writeFile(
      info.outputPath(`contractor-${name}.json`),
      JSON.stringify(files[name], null, 2),
    );
    await nav(monitor, "Demo Workspace");
    await monitor.getByLabel("Workspace JSON file").setInputFiles({
      name: `${name}.json`,
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(files[name])),
    });
    const dialog = monitor.getByRole("dialog", { name: "Load workspace?" });
    await dialog.getByRole("checkbox").check();
    await dialog
      .getByRole("button", { name: "Confirm Load State", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    // Every fixture shares the same company identity, so an existing tab-local session stays valid.
    if (name === "submitted") await signIn(portal, "alex@example.com");
    await nav(portal, "Your journey");
    const before = await snapshot(portal);
    await expect(portal.locator(".stats")).toHaveCount(0);
    await expect(
      portal.getByRole("region", { name: "Onboarding journey" }),
    ).toBeVisible();
    await expect(portal.locator(".contractor-disclosure[open]")).toHaveCount(0);
    await expect(
      portal.getByRole("region", { name: "What matters now" }),
    ).not.toContainText(/correlation|eventId|workflow|Revision/);
    if (name === "submitted")
      await expect(
        portal.getByRole("list", { name: "Waiting on other teams" }),
      ).toContainText("Recruitment");
    if (name === "active-work") {
      await expect(portal.getByTestId("journey-administration")).toContainText(
        "Waiting on you",
      );
      await expect(portal.getByTestId("journey-skills")).toContainText(
        "Waiting on you",
      );
    }
    if (name === "correction")
      await expect(portal.getByTestId("journey-administration")).toContainText(
        "Requires correction",
      );
    if (name === "waiting-team") {
      await expect(portal.locator(".contractor-next-action")).toHaveCount(0);
      await expect(
        portal.getByRole("list", { name: "Waiting on other teams" }),
      ).toContainText("Compliance");
    }
    await expect(portal.getByTestId("lifecycle-eligibility")).toHaveText(
      ["eligible", "separate-skill"].includes(name)
        ? "Eligible"
        : "Not eligible",
    );
    if (name === "activation-pending")
      await expect(
        portal.getByRole("region", { name: "What matters now" }),
      ).toContainText("awaiting publication by Operations");
    if (name === "separate-skill") {
      await expect(
        portal.getByRole("region", { name: "Separate company activities" }),
      ).toContainText("Plumbing");
      await expect(
        portal.locator(".contractor-stage>.contractor-status"),
      ).toHaveText(Array(6).fill("Complete"));
    }
    for (const width of [1440, 390]) {
      await portal.setViewportSize({
        width,
        height: width === 390 ? 844 : 1000,
      });
      await portal.evaluate(() => scrollTo(0, 0));
      expect(
        await portal.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (name === "active-work") {
        const action = portal.getByRole("button", {
          name: "Continue",
          exact: false,
        });
        const box = await action.boundingBox();
        expect(box!.y + box!.height).toBeLessThan(width === 390 ? 844 : 1000);
      }
      await portal.screenshot({
        path: info.outputPath(`${name}-${width}.png`),
        fullPage: true,
      });
    }
    await expect(
      portal.getByRole("button", {
        name: "Publish contractor activation →",
        exact: true,
      }),
    ).toHaveCount(0);
    if (name === "active-work") {
      await portal
        .getByRole("button", { name: "Continue", exact: false })
        .hover();
      const contrast = await portal.evaluate(() => {
        const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number);
        const luminance = (v: number[]) =>
          v
            .slice(0, 3)
            .map((n) => {
              const c = n / 255;
              return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            })
            .reduce((s, n, i) => s + n * [0.2126, 0.7152, 0.0722][i], 0);
        const ratio = (element: Element) => {
          const foreground = luminance(rgb(getComputedStyle(element).color));
          let parent: Element | null = element,
            background = 1;
          while (parent) {
            const color = rgb(getComputedStyle(parent).backgroundColor);
            if (color.length < 4 || color[3] !== 0) {
              background = luminance(color);
              break;
            }
            parent = parent.parentElement;
          }
          return (
            (Math.max(foreground, background) + 0.05) /
            (Math.min(foreground, background) + 0.05)
          );
        };
        const selectors = [
          ".contractor-lead",
          ".contractor-status.you",
          ".contractor-status.complete",
          ".contractor-job-status",
          ".contractor-next-action .primary",
          ".contractor-disclosure>summary small",
          "aside nav button",
        ];
        const values = Object.fromEntries(
          selectors.map((selector) => [
            selector,
            ratio(document.querySelector(selector)!),
          ]),
        );
        const button = document.querySelector<HTMLButtonElement>(
          ".contractor-next-action .primary",
        )!;
        button.disabled = true;
        values.disabledButton = ratio(button);
        button.disabled = false;
        return values;
      });
      for (const value of Object.values(contrast))
        expect(value).toBeGreaterThanOrEqual(4.5);
      await fs.writeFile(
        info.outputPath("contrast.json"),
        JSON.stringify(contrast, null, 2),
      );
      const continueAction = portal.getByRole("button", {
        name: "Continue",
        exact: false,
      });
      await continueAction.focus();
      await portal.keyboard.press("Tab");
      await portal.keyboard.press("Shift+Tab");
      expect(
        await continueAction.evaluate((e) => getComputedStyle(e).outlineWidth),
      ).toBe("3px");
      await portal.setViewportSize({ width: 1440, height: 1000 });
      const summary = portal.locator("#contractor-requirements>summary");
      await summary.focus();
      await portal.keyboard.press("Enter");
      await expect(portal.locator("#contractor-requirements")).toHaveAttribute(
        "open",
        "",
      );
      await expect(
        portal.getByText("Review owner: Compliance", { exact: true }),
      ).toBeVisible();
      await portal.locator("#contractor-skills>summary").click();
      await expect(portal.locator(".contractor-disclosure[open]")).toHaveCount(
        2,
      );
      await portal.evaluate(() => scrollTo(0, 0));
      await portal.screenshot({
        path: info.outputPath("expanded-details-1440.png"),
        fullPage: true,
      });
      await summary.focus();
      await portal.keyboard.press("Space");
      await expect(
        portal.locator("#contractor-requirements"),
      ).not.toHaveAttribute("open");
      await portal.locator("#contractor-skills>summary").click();
    }
    expect(await snapshot(portal)).toEqual(before);
  }
});

test("a next action opens existing contractor forms; submitting updates the business journey and owning team", async ({
  context,
}) => {
  const { files } = await contractorStates();
  const monitor = await workspace(context, "monitor"),
    portal = await workspace(context, "contractor");
  await nav(monitor, "Demo Workspace");
  await monitor.getByLabel("Workspace JSON file").setInputFiles({
    name: "actions.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(files["active-work"])),
  });
  const dialog = monitor.getByRole("dialog", { name: "Load workspace?" });
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Confirm Load State", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await signIn(portal, "alex@example.com");
  await portal.getByRole("button", { name: "Continue", exact: false }).click();
  const evidence = card(portal, "Submit insurance evidence");
  await expect(evidence).toBeVisible();
  await evidence
    .getByRole("button", { name: "Submit evidence →", exact: true })
    .click();
  await expect(evidence).toHaveCount(0);
  await nav(portal, "Your journey");
  const state = await snapshot(portal);
  expect(
    state.workItems.some(
      (t) =>
        t.activity === "ReviewInsurance" &&
        t.owner === "Compliance" &&
        t.status === "Open",
    ),
  ).toBe(true);
  await portal
    .getByRole("button", {
      name: "View details for Company documents",
      exact: false,
    })
    .click();
  await expect(portal.locator("#contractor-requirements")).toHaveAttribute(
    "open",
    "",
  );
  await expect(portal.locator("#contractor-requirements")).toContainText(
    "Under review",
  );
});
