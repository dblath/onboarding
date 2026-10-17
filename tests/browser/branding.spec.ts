import { test, expect } from "@playwright/test";
import { application, workspace } from "./helpers";

test("Unity branding preserves the original proportions and complete logo in production favicons across all experiences", async ({
  context,
}, testInfo) => {
  const pages = {
    contractor: await workspace(context, "contractor"),
    operations: await workspace(context, "operations"),
    monitor: await workspace(context, "monitor"),
  };
  await application(pages.contractor, "Unity Brand Demo");
  for (const [experience, page] of Object.entries(pages)) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const titles = {
      contractor: "Contractor Portal",
      operations: "Onboarding Operations",
      monitor: "Workflow Monitor",
    };
    await expect(page).toHaveTitle(
      `Unity fieldwork \u2014 ${titles[experience as keyof typeof titles]}`,
    );
    await expect(page.locator("header .app-identity")).toHaveText(
      `Unity fieldwork / ${titles[experience as keyof typeof titles]}`,
    );
    await expect(page.locator(".brand-caption")).toHaveText("Unityfieldwork");
    for (const wordmark of [
      page.locator(".brand-caption strong"),
      page.locator(".product-name strong"),
    ]) {
      const font = await wordmark.evaluate((element) => ({
        family: getComputedStyle(element).fontFamily,
        weight: Number(getComputedStyle(element).fontWeight),
      }));
      expect(font.family).toContain("sans-serif");
      expect(font.family).not.toContain("Georgia");
      expect(font.weight).toBe(450);
      expect(font.family).toContain("Unity Narrow");
    }
    const logo = page
      .getByRole("link", { name: "Unity fieldwork" })
      .getByRole("img");
    await expect(logo).toBeVisible();
    await expect(
      page.locator("header").getByRole("img", { name: "Unity", exact: true }),
    ).toBeVisible();
    for (const image of [logo, page.locator(".header-brand-image")]) {
      const size = await image.evaluate((element) => {
        const image = element as HTMLImageElement,
          rect = image.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          fit: getComputedStyle(image).objectFit,
          complete: image.complete,
        };
      });
      expect(size.complete).toBe(true);
      expect([size.naturalWidth, size.naturalHeight]).toEqual([267, 331]);
      expect(Math.abs(size.width / size.height - 267 / 331)).toBeLessThan(
        0.001,
      );
      expect(size.fit).toBe("contain");
      expect(size.width).toBeLessThanOrEqual(80);
      expect(size.height).toBeLessThan(110);
    }
    for (const icon of await page
      .locator('link[rel="icon"]')
      .evaluateAll((links) =>
        links.map((link) => ({
          href: (link as HTMLLinkElement).href,
          sizes: link.getAttribute("sizes"),
        })),
      )) {
      const response = await page.request.get(icon.href);
      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("image/png");
      expect(["32x32", "331x331"]).toContain(icon.sizes);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`unity-${experience}.png`),
      fullPage: true,
    });
  }
  const pixels = await pages.contractor.evaluate(async () => {
    async function load(src: string) {
      const image = new Image();
      image.src = src;
      await image.decode();
      return image;
    }
    const original = await load("./assets/unity.png"),
      favicon = await load("./assets/unity-favicon.png"),
      small = await load("./assets/unity-favicon-32.png");
    function imagePixels(image: HTMLImageElement) {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, canvas.width, canvas.height).data;
    }
    const source = imagePixels(original),
      padded = imagePixels(favicon),
      smallPixels = imagePixels(small);
    let intact = true,
      transparentPadding = true;
    for (let y = 0; y < 331; y++) {
      for (let x = 0; x < 267; x++)
        for (let channel = 0; channel < 4; channel++)
          if (
            source[(y * 267 + x) * 4 + channel] !==
            padded[(y * 331 + x + 32) * 4 + channel]
          )
            intact = false;
      for (let x = 0; x < 32; x++)
        if (
          padded[(y * 331 + x) * 4 + 3] !== 0 ||
          padded[(y * 331 + x + 299) * 4 + 3] !== 0
        )
          transparentPadding = false;
    }
    return {
      original: [original.naturalWidth, original.naturalHeight],
      favicon: [favicon.naturalWidth, favicon.naturalHeight],
      small: [small.naturalWidth, small.naturalHeight],
      intact,
      transparentPadding,
      smallTransparentCorners:
        smallPixels[3] === 0 && smallPixels[(32 * 32 - 1) * 4 + 3] === 0,
    };
  });
  expect(pixels).toEqual({
    original: [267, 331],
    favicon: [331, 331],
    small: [32, 32],
    intact: true,
    transparentPadding: true,
    smallTransparentCorners: true,
  });
  await pages.contractor.setViewportSize({ width: 390, height: 844 });
  const mobileSize = await pages.contractor
    .locator(".brand-image")
    .boundingBox();
  expect(mobileSize!.width).toBe(36);
  expect(
    Math.abs(mobileSize!.width / mobileSize!.height - 267 / 331),
  ).toBeLessThan(0.001);
});
