import { expect, test } from "@playwright/test";

test("readiness assessment saves, resumes, and completes conservatively", async ({
  page,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `assessment-${suffix}@example.invalid`;
  const password = "LocalAssessmentTest!1234";

  await page.goto("/auth/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/profile$/);

  await page.goto("/profile/assessment");
  await expect(
    page.getByRole("heading", { level: 1, name: "Readiness assessment" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Start readiness assessment" })
    .click();

  await expect(
    page.getByRole("heading", { level: 2, name: "Readiness baseline" }),
  ).toBeVisible();

  await page.getByLabel("1–2 days per week").check();
  await page
    .getByLabel("Yes, I have areas or movements to account for")
    .check();
  await page.getByLabel("Affected areas").fill("Left shoulder");
  await page.getByLabel("Movements you avoid").fill("Overhead pressing");
  await page.getByLabel("Yes, I can exercise independently").check();
  await page
    .getByLabel("No professional restriction has been given")
    .check();

  await page.getByRole("button", { name: "Save progress" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Assessment progress saved.",
  );

  await page.reload();

  await expect(page.getByLabel("1–2 days per week")).toBeChecked();
  await expect(
    page.getByLabel("Yes, I have areas or movements to account for"),
  ).toBeChecked();
  await expect(page.getByLabel("Affected areas")).toHaveValue("Left shoulder");
  await expect(page.getByLabel("Movements you avoid")).toHaveValue(
    "Overhead pressing",
  );
  await expect(
    page.getByLabel("Yes, I can exercise independently"),
  ).toBeChecked();
  await expect(
    page.getByLabel("No professional restriction has been given"),
  ).toBeChecked();

  await page
    .getByLabel("Yes, I have been told to avoid or modify exercise")
    .check();

  await page.getByRole("button", { name: "Complete assessment" }).click();

  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Professional input recommended",
    }),
  ).toBeVisible();

  await expect(
    page.getByText(
      "MeExercise will block unrestricted routine generation from this assessment",
      { exact: false },
    ),
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Start another assessment" }),
  ).toBeVisible();
});