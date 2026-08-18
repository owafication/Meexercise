import { expect, test, type Download } from "@playwright/test";

async function readDownloadText(download: Download) {
  const stream = await download.createReadStream();

  if (!stream) {
    throw new Error("Downloaded export stream is unavailable.");
  }

  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

test("user can export current data and permanently delete the account", async ({
  page,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `lifecycle-${suffix}@example.invalid`;
  const password = "LifecycleTest!1234";

  await page.goto("/auth/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/profile$/);

  await page.getByLabel("Display name").fill("Lifecycle Test User");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toHaveText("Profile saved.");

  await page.goto("/profile/assessment");
  await page
    .getByRole("button", { name: "Start readiness assessment" })
    .click();

  await page.getByLabel("1–2 days per week").check();
  await page
    .getByLabel("Yes, I have areas or movements to account for")
    .check();
  await page.getByLabel("Affected areas").fill("Right knee");
  await page.getByLabel("Movements you avoid").fill("Jumping");
  await page.getByLabel("Yes, I can exercise independently").check();
  await page
    .getByLabel("No professional restriction has been given")
    .check();

  await page.getByRole("button", { name: "Complete assessment" }).click();

  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Movement restrictions recorded",
    }),
  ).toBeVisible();

  await page.goto("/profile/account");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download JSON export" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("meexercise-data-export.json");

  const exportText = await readDownloadText(download);
  const exported = JSON.parse(exportText);

  expect(exported.exportVersion).toBe(1);
  expect(exported.account.email).toBe(email);
  expect(exported.profile.displayName).toBe("Lifecycle Test User");
  expect(exported.assessments).toHaveLength(1);
  expect(exported.assessments[0].templateVersion.templateKey).toBe(
    "readiness_baseline",
  );
  expect(exported.assessments[0].responses.limitations).toMatchObject({
    hasLimitations: true,
    affectedAreas: "Right knee",
    avoidedMovements: "Jumping",
  });
  expect(
    exported.assessments[0].safetyFlags.some(
      (flag: { flagCode: string }) =>
        flag.flagCode === "movement_restrictions_present",
    ),
  ).toBe(true);

  await page.getByLabel("Current password").fill("WrongLifecycle!1234");
  await page
    .getByLabel("Type DELETE MY ACCOUNT to confirm")
    .fill("DELETE MY ACCOUNT");
  await page
    .getByRole("button", { name: "Delete account permanently" })
    .click();

  await expect(
    page.getByRole("alert").filter({ hasText: "Password was not accepted." }),
  ).toHaveText("Password was not accepted.");

  await page.getByLabel("Current password").fill(password);
  await page
    .getByLabel("Type DELETE MY ACCOUNT to confirm")
    .fill("DELETE MY ACCOUNT");
  await page
    .getByRole("button", { name: "Delete account permanently" })
    .click();

  await expect(page).toHaveURL(/\/auth\/sign-in\?accountDeleted=1$/);
  await expect(page.getByRole("status")).toContainText(
    "account and its current stored account data were deleted",
  );

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Email or password was not accepted." }),
  ).toHaveText("Email or password was not accepted.");
});