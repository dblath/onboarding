import { test, expect } from "@playwright/test";
import { readdir } from "node:fs/promises";
import { application, workspace } from "./helpers";

test("neutral Unity branding and favicon render proportionally across all experiences", async ({
  context,
}, info) => {
  const pages = {
    contractor: await workspace(context, "contractor"),
    operations: await workspace(context, "operations"),
    monitor: await workspace(context, "monitor"),
  };
  await application(pages.contractor, "Unity Brand Review");
  const titles = {
    contractor: "Contractor Portal",
    operations: "Onboarding Operations",
    monitor: "Workflow Monitor",
  };
  for (const [experience, page] of Object.entries(pages)) {
    await expect(page).toHaveTitle(
      `Unity fieldwork — ${titles[experience as keyof typeof titles]}`,
    );
    await expect(page.locator("header .app-identity")).toHaveText(
      `Unity fieldwork / ${titles[experience as keyof typeof titles]}`,
    );
    await expect(page.locator(".brand-caption")).toHaveText("Unityfieldwork");
    for (const wordmark of [
      page.locator(".brand-caption strong"),
      page.locator(".product-name strong"),
    ]) {
      const font = await wordmark.evaluate((e) => ({
        family: getComputedStyle(e).fontFamily,
        weight: getComputedStyle(e).fontWeight,
      }));
      expect(font.family).toContain("system-ui");
      expect(font.family).toContain("sans-serif");
      expect(font.weight).toBe("700");
    }
    for (const size of [
      { width: 1440, height: 1000 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(size);
      for (const selector of [".brand-image", ".header-brand-image"]) {
        const image = page.locator(selector);
        if (!(await image.isVisible())) continue;
        const rendered = await image.evaluate((e) => {
          const img = e as HTMLImageElement,
            rect = img.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            natural: [img.naturalWidth, img.naturalHeight],
            fit: getComputedStyle(e).objectFit,
            complete: img.complete,
          };
        });
        expect(rendered.complete).toBe(true);
        expect(rendered.natural).toEqual([64, 64]);
        expect(Math.abs(rendered.width / rendered.height - 1)).toBeLessThan(
          0.001,
        );
        expect(rendered.fit).toBe("contain");
        expect(rendered.width).toBeLessThanOrEqual(80);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`unity-${experience}-${size.width}.png`),
        fullPage: true,
      });
    }
    const icons = page.locator('link[rel="icon"]');
    await expect(icons).toHaveCount(1);
    await expect(icons).toHaveAttribute("sizes", "any");
    const href = await icons.getAttribute("href");
    const response = await page.request.get(href!);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/svg+xml");
    const pixels = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 32;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0, 32, 32);
      const bytes = ctx.getImageData(0, 0, 32, 32).data;
      return {
        painted: Array.from(bytes).filter((_, i) => i % 4 === 3 && bytes[i] > 0)
          .length,
        corner: bytes[3],
      };
    }, href!);
    expect(pixels.painted).toBeGreaterThan(100);
    expect(pixels.corner).toBe(0);
  }
  // Public files are copied verbatim: keep provenance notes and retired images out of the build.
  expect(await readdir("public/assets")).toEqual(["unity-mark.svg"]);
  expect(
    (await readdir("dist/assets")).filter(
      (name) => !/\.(js|css|svg)$/.test(name),
    ),
  ).toEqual([]);
});
