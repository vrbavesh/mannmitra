import { expect, test } from "@playwright/test";

test("entry links open the signup and sign-in forms", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Understand how you feel. Gently." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Start your check-in", exact: true }).first().click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByLabel("Email address", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Confirm password", { exact: true })).toBeVisible();
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Sign in", exact: true })
    .click();
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
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d")!;
    const luminance = (color: string) => {
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const values = Array.from(context.getImageData(0, 0, 1, 1).data)
        .slice(0, 3)
        .map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
      return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
    };
    const contrast = (color: string, backgroundColor = style.backgroundColor) => {
      const foreground = luminance(color);
      const background = luminance(backgroundColor);
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    };
    const button = getComputedStyle(
      element.closest("form")!.querySelector('button[type="submit"]')!,
    );
    return {
      border: contrast(style.borderTopColor),
      placeholder: contrast(getComputedStyle(element, "::placeholder").color),
      focus: contrast(style.outlineColor),
      text: contrast(style.color),
      button: contrast(button.color, button.backgroundColor),
    };
  });
  expect(styles.border).toBeGreaterThanOrEqual(3);
  expect(styles.placeholder).toBeGreaterThanOrEqual(4.5);
  expect(styles.focus).toBeGreaterThanOrEqual(3);
  expect(styles.text).toBeGreaterThanOrEqual(4.5);
  expect(styles.button).toBeGreaterThanOrEqual(4.5);
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
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator("[data-orb-still]")).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Sign in", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  const duration = await page
    .locator("main > div")
    .last()
    .evaluate((element) => parseFloat(getComputedStyle(element).animationDuration));
  expect(duration).toBeLessThan(0.001);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
