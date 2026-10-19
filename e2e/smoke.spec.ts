import { expect, test } from "@playwright/test";

test("home renders the sign-in card with our primitives", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "MannMitra" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
});
