import { test, expect } from "@playwright/test";

test("support is public, usable without JavaScript and has no deferred hospital search", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  await page.goto("/crisis");
  await expect(page.getByRole("heading", { name: "Support is here" })).toBeVisible();
  await expect(page.getByRole("link", { name: "14416", exact: true })).toHaveAttribute(
    "href",
    "tel:14416",
  );
  await expect(page.getByRole("link", { name: "112", exact: true })).toHaveAttribute(
    "href",
    "tel:112",
  );
  await expect(page.getByText(/your answers suggest/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /hospital|nearby|location/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Back to MannMitra" })).toBeVisible();
  await context.close();
});
