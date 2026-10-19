import { expect, test } from "@playwright/test";

test("entry links open the signup and sign-in forms", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "MannMitra" })).toBeVisible();
  await page.getByRole("link", { name: "Create an account", exact: true }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Confirm password", { exact: true })).toBeVisible();
  await page.goto("/");
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/signin$/);
  await expect(page.getByLabel("Email or username", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});

test("sign-in controls meet contrast and motion requirements", async ({ page }) => {
  await page.goto("/signin");
  const input = page.getByLabel("Email or username", { exact: true });
  await input.focus();
  const styles = await input.evaluate((element) => {
    const style = getComputedStyle(element);
    const luminance = (color: string) => {
      const values = color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
        .map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
      return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
    };
    const contrast = (color: string) => {
      const foreground = luminance(color);
      const background = luminance(style.backgroundColor);
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    };
    return {
      border: contrast(style.borderTopColor),
      placeholder: contrast(getComputedStyle(element, "::placeholder").color),
      focus: contrast(style.outlineColor),
    };
  });
  expect(styles.border).toBeGreaterThanOrEqual(3);
  expect(styles.placeholder).toBeGreaterThanOrEqual(4.5);
  expect(styles.focus).toBeGreaterThanOrEqual(3);
  const transition = await page
    .getByRole("button", { name: "Sign in", exact: true })
    .evaluate((element) => getComputedStyle(element).transitionProperty);
  expect(transition.split(",").map((property) => property.trim())).toEqual([
    "transform",
    "translate",
    "scale",
    "rotate",
  ]);
});

test("entry navigation works on mobile with reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  const duration = await page
    .locator("main > div")
    .last()
    .evaluate((element) => parseFloat(getComputedStyle(element).animationDuration));
  expect(duration).toBeLessThan(0.001);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
