import { expect, test } from "@playwright/test";

test("exercise library preserves visible versions, exact relation targets, and structured variation semantics", async ({ page }) => {
  await page.goto("/exercises");

  await expect(page.getByRole("heading", { level: 1, name: "Approved structured content" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("6 exercises");
  await expect(page.getByText("Internal draft example")).toHaveCount(0);

  await page.getByRole("searchbox", { name: "Search" }).fill("wall");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page.getByRole("status")).toContainText("1 exercise");
  await expect(page.getByRole("heading", { level: 2, name: "Wall push-up" })).toBeVisible();
  await expect(page.getByText("Version 2 · reviewed")).toBeVisible();

  await page.getByRole("link", { name: "View instructions" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Wall push-up" })).toBeVisible();
  await expect(page.getByText("Exercise · version 2")).toBeVisible();
  await expect(page.getByText("Side rule: Both sides together")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Steps" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Plain-language description" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Related variations" })).toBeVisible();

  const relations = page.getByRole("region", { name: "Related variations" });
  await expect(relations).toContainText("progression:");
  await expect(relations).toContainText("equipment alternative:");
  await expect(relations).toContainText("substitution:");
  await expect(relations.getByRole("link", { name: "Incline push-up" })).toBeVisible();
  await expect(relations.getByRole("link", { name: "Counter push-up" })).toBeVisible();
  await expect(relations.getByRole("link", { name: "Standing resistance-band press" })).toBeVisible();

  await relations.getByRole("link", { name: "Incline push-up" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Incline push-up" })).toBeVisible();
  await expect(page.getByText("Exercise · version 1")).toBeVisible();

  const inclineRelations = page.getByRole("region", { name: "Related variations" });
  await expect(inclineRelations).toContainText("regression:");
  await inclineRelations.getByRole("link", { name: "Wall push-up" }).click();

  await expect(page).toHaveURL(/\/exercises\/wall_push_up\?version=1$/);
  await expect(page.getByRole("heading", { level: 1, name: "Wall push-up" })).toBeVisible();
  await expect(page.getByText("Exercise · version 1")).toBeVisible();

  await page.getByRole("link", { name: "Back to exercise library" }).click();
  await page.getByLabel("Equipment").selectOption("Chair");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page.getByRole("status")).toContainText("1 exercise");
  await expect(page.getByRole("heading", { level: 2, name: "Chair sit-to-stand" })).toBeVisible();
});
