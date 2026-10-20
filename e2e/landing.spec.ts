import { expect, test } from "@playwright/test";

test("landing remains usable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Understand how you feel. Gently.",
  );
  await expect(page.locator("[data-orb-still]")).toBeVisible();
  const preview = page.getByRole("img", { name: /Thirty-day preview/ });
  await expect(preview).toBeVisible();
  expect(await preview.locator("span").allTextContents()).toEqual(
    Array.from({ length: 30 }, (_, i) => String(i + 1)),
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page
    .getByRole("navigation", { name: "Footer" })
    .getByRole("link", { name: "Privacy" })
    .click();
  await expect(page).toHaveURL(/\/privacy$/);
  await context.close();
});

test("WebGL failure leaves the static design and working entry links", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]).startsWith("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("[data-scene-fallback]")).toHaveCount(1);
  await expect(page.locator("[data-orb-still]")).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Get started" })
    .click();
  await expect(page).toHaveURL(/\/signup$/);
});

test("reduced motion can be enabled live and all content stays readable", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-scene-ready]")).toHaveCount(1);
  await page.mouse.move(960, 360);
  await page.mouse.down();
  expect(await page.locator("#landing").evaluate((element) => element.hasPointerCapture(1))).toBe(
    true,
  );
  await page.mouse.move(1040, 300);
  await page.mouse.up();
  expect(await page.locator("#landing").evaluate((element) => element.hasPointerCapture(1))).toBe(
    false,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator('[data-scene-mode="static"]')).toHaveCount(1);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator("[data-orb-still]")).toBeVisible();
  await page.getByRole("heading", { name: "Ready when you are." }).scrollIntoViewIfNeeded();
  await expect(page.getByText("MannMitra offers supportive tools", { exact: false })).toBeVisible();
  expect(
    await page
      .locator("main")
      .evaluate(
        (element) =>
          element
            .getAnimations({ subtree: true })
            .filter((animation) => animation.playState === "running").length,
      ),
  ).toBe(0);
});

test("a lost WebGL context restores the static orb", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-scene-ready]")).toHaveCount(1);
  await page.locator("canvas").evaluate((canvas) => {
    const extension = (canvas as HTMLCanvasElement)
      .getContext("webgl2")
      ?.getExtension("WEBGL_lose_context");
    if (!extension) throw new Error("The test browser must support simulated context loss.");
    extension.loseContext();
  });
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(
    await page.locator("[data-orb-still]").evaluate((element) => getComputedStyle(element).opacity),
  ).toBe("1");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("data-saving devices use the static landing", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "connection", {
      value: { saveData: true },
      configurable: true,
    }),
  );
  await page.goto("/");
  await expect(page.locator('[data-scene-mode="static"]')).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator("[data-orb-still]")).toBeVisible();
});
