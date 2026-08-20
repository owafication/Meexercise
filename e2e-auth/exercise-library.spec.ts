import { expect, test } from "@playwright/test";

test("exercise library exposes only visible versioned content with accessible instructions", async ({ page }) => {
  await page.goto("/exercises");

  await expect(page.getByRole("heading", { level: 1, name: "Approved structured content" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("4 exercises");
  await expect(page.getByText("Internal draft example")).toHaveCount(0);

  await page.getByRole("searchbox", { name: "Search" }).fill("wall");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page.getByRole("status")).toContainText("1 exercise");
  await expect(page.getByRole("heading", { level: 2, name: "Wall push-up" })).toBeVisible();

  await page.getByRole("link", { name: "View instructions" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Wall push-up" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Steps" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Plain-language description" })).toBeVisible();
  await expect(page.getByText("Place both hands on a solid wall, keep the body controlled", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Related variations" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Incline push-up" })).toBeVisible();

  await page.getByRole("link", { name: "Back to exercise library" }).click();
  await page.getByLabel("Equipment").selectOption("Chair");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page.getByRole("status")).toContainText("1 exercise");
  await expect(page.getByRole("heading", { level: 2, name: "Chair sit-to-stand" })).toBeVisible();
});
