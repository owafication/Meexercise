import { expect, test } from "@playwright/test";

test("account and private profile flow preserves structured planning values and a concurrent edit", async ({
  browser,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `auth-${suffix}@example.invalid`;
  const password = "LocalAuthTest!1234";

  const context = await browser.newContext();
  const firstPage = await context.newPage();

  await firstPage.goto("/auth/sign-up");
  await firstPage.getByLabel("Email").fill(email);
  await firstPage.getByLabel("Password", { exact: true }).fill(password);
  await firstPage.getByLabel("Confirm password").fill(password);
  await firstPage.getByRole("button", { name: "Create account" }).click();

  await expect(firstPage).toHaveURL(/\/profile$/);
  await expect(
    firstPage.getByRole("heading", {
      level: 2,
      name: "Your profile",
    }),
  ).toBeVisible();

  const firstDisplayName = firstPage.getByLabel("Display name");

  await firstDisplayName.fill("Initial Test User");
  await firstPage.getByLabel("Primary goal").selectOption("general_strength");
  await firstPage.getByLabel("Secondary goal").selectOption("mobility");
  await firstPage.getByLabel("Bodyweight exercise").check();
  await firstPage.getByLabel("Resistance-band exercise").check();
  await firstPage.getByLabel("Chair", { exact: true }).check();
  await firstPage.getByLabel("Resistance band equipment").check();
  await firstPage.getByLabel("Home", { exact: true }).check();
  await firstPage
    .getByLabel("Available time per routine")
    .selectOption("30");
  await firstPage
    .getByLabel("Preferred routine frequency")
    .selectOption("3");

  await firstPage.getByRole("button", { name: "Save profile" }).click();
  await expect(firstPage.getByRole("status")).toHaveText("Profile saved.");

  await firstPage.reload();

  await expect(firstDisplayName).toHaveValue("Initial Test User");
  await expect(firstPage.getByLabel("Primary goal")).toHaveValue(
    "general_strength",
  );
  await expect(firstPage.getByLabel("Secondary goal")).toHaveValue("mobility");
  await expect(firstPage.getByLabel("Bodyweight exercise")).toBeChecked();
  await expect(firstPage.getByLabel("Resistance-band exercise")).toBeChecked();
  await expect(firstPage.getByLabel("Chair", { exact: true })).toBeChecked();
  await expect(firstPage.getByLabel("Resistance band equipment")).toBeChecked();
  await expect(firstPage.getByLabel("Home", { exact: true })).toBeChecked();
  await expect(firstPage.getByLabel("Available time per routine")).toHaveValue(
    "30",
  );
  await expect(firstPage.getByLabel("Preferred routine frequency")).toHaveValue(
    "3",
  );

  const secondPage = await context.newPage();
  await secondPage.goto("/profile");

  const secondDisplayName = secondPage.getByLabel("Display name");
  await expect(secondDisplayName).toHaveValue("Initial Test User");

  await firstDisplayName.fill("Device One Update");
  await firstPage.getByRole("button", { name: "Save profile" }).click();
  await expect(firstPage.getByRole("status")).toHaveText("Profile saved.");

  await secondDisplayName.fill("Stale Device Update");
  await secondPage.getByRole("button", { name: "Save profile" }).click();
  await expect(
    secondPage
      .getByRole("alert")
      .filter({ hasText: "Profile changed in another session." }),
  ).toHaveText(
    "Profile changed in another session. Reload before saving again.",
  );

  await secondPage.reload();
  await expect(secondDisplayName).toHaveValue("Device One Update");
  await expect(secondPage.getByLabel("Primary goal")).toHaveValue(
    "general_strength",
  );
  await expect(secondPage.getByLabel("Available time per routine")).toHaveValue(
    "30",
  );

  await firstPage.getByRole("button", { name: "Sign out" }).click();
  await expect(firstPage).toHaveURL(/\/auth\/sign-in$/);

  await firstPage.getByLabel("Email").fill(email);
  await firstPage.getByLabel("Password").fill(password);
  await firstPage.getByRole("button", { name: "Sign in" }).click();

  await expect(firstPage).toHaveURL(/\/profile$/);
  await expect(firstPage.getByLabel("Display name")).toHaveValue(
    "Device One Update",
  );
  await expect(firstPage.getByLabel("Primary goal")).toHaveValue(
    "general_strength",
  );
  await expect(firstPage.getByLabel("Preferred routine frequency")).toHaveValue(
    "3",
  );

  await context.close();
});
