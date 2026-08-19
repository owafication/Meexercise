import { expect, test, type Page } from "@playwright/test";

async function signUpAndSetProfile(
  page: Page,
  email: string,
  password: string,
  displayName: string,
) {
  await page.goto("/auth/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/profile$/);

  await page.getByLabel("Display name").fill(displayName);
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toHaveText("Profile saved.");
}

async function startAssessment(page: Page) {
  await page.goto("/profile/assessment");
  await page
    .getByRole("button", { name: "Start readiness assessment" })
    .click();

  await expect(
    page.getByRole("heading", { level: 2, name: "Readiness baseline" }),
  ).toBeVisible();
}

async function fillAssessment(
  page: Page,
  affectedArea: string,
  avoidedMovement: string,
) {
  await page.getByLabel("1–2 days per week").check();
  await page
    .getByLabel("Yes, I have areas or movements to account for")
    .check();
  await page.getByLabel("Affected areas").fill(affectedArea);
  await page.getByLabel("Movements you avoid").fill(avoidedMovement);
  await page.getByLabel("Yes, I can exercise independently").check();
  await page
    .getByLabel("No professional restriction has been given")
    .check();
}

test("authenticated users cannot read or mutate another user's private records", async ({
  browser,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ownerEmail = `owner-${suffix}@example.invalid`;
  const attackerEmail = `other-${suffix}@example.invalid`;
  const password = "LocalAuthorizationTest!1234";

  const ownerProfile = `Owner ${suffix}`;
  const attackerProfile = `Other ${suffix}`;
  const ownerArea = `Owner-only shoulder ${suffix}`;
  const ownerMovement = `Owner-only overhead press ${suffix}`;
  const attackerArea = `Other-only ankle ${suffix}`;
  const attackerMovement = `Other-only jumping ${suffix}`;

  const ownerContext = await browser.newContext();
  const attackerContext = await browser.newContext();

  try {
    const ownerPage = await ownerContext.newPage();
    const attackerPage = await attackerContext.newPage();

    await signUpAndSetProfile(
      ownerPage,
      ownerEmail,
      password,
      ownerProfile,
    );

    await startAssessment(ownerPage);
    await fillAssessment(ownerPage, ownerArea, ownerMovement);
    await ownerPage.getByRole("button", { name: "Save progress" }).click();
    await expect(ownerPage.getByRole("status")).toHaveText(
      "Assessment progress saved.",
    );

    const ownerSessionId = await ownerPage
      .locator('input[name="sessionId"]')
      .inputValue();
    const ownerRowVersion = await ownerPage
      .locator('input[name="rowVersion"]')
      .inputValue();

    expect(ownerSessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(Number(ownerRowVersion)).toBeGreaterThan(1);

    await signUpAndSetProfile(
      attackerPage,
      attackerEmail,
      password,
      attackerProfile,
    );

    await attackerPage.goto("/profile");
    await expect(attackerPage.getByLabel("Display name")).toHaveValue(
      attackerProfile,
    );
    await expect(attackerPage.getByText(ownerProfile)).toHaveCount(0);

    await startAssessment(attackerPage);
    await fillAssessment(
      attackerPage,
      attackerArea,
      attackerMovement,
    );

    await attackerPage
      .locator('input[name="sessionId"]')
      .evaluate((element, value) => {
        (element as HTMLInputElement).value = String(value);
      }, ownerSessionId);

    await attackerPage
      .locator('input[name="rowVersion"]')
      .evaluate((element, value) => {
        (element as HTMLInputElement).value = String(value);
      }, ownerRowVersion);

    await attackerPage
      .getByRole("button", { name: "Save progress" })
      .click();

    await expect(
      attackerPage
        .getByRole("alert")
        .filter({ hasText: "Assessment changed in another session." }),
    ).toHaveText(
      "Assessment changed in another session. Reload before saving again.",
    );

    await ownerPage.reload();

    await expect(ownerPage.getByLabel("Affected areas")).toHaveValue(
      ownerArea,
    );
    await expect(ownerPage.getByLabel("Movements you avoid")).toHaveValue(
      ownerMovement,
    );
    await expect(ownerPage.getByText(attackerArea)).toHaveCount(0);
    await expect(ownerPage.getByText(attackerMovement)).toHaveCount(0);

    const attackerExport = await attackerContext.request.get(
      "/profile/export",
    );

    expect(attackerExport.status()).toBe(200);
    expect(attackerExport.headers()["cache-control"]).toContain("no-store");

    const attackerData = await attackerExport.json();
    const attackerJson = JSON.stringify(attackerData);

    expect(attackerData.account.email).toBe(attackerEmail);
    expect(attackerData.profile.displayName).toBe(attackerProfile);
    expect(attackerJson).toContain(attackerProfile);
    expect(attackerJson).not.toContain(ownerEmail);
    expect(attackerJson).not.toContain(ownerProfile);
    expect(attackerJson).not.toContain(ownerArea);
    expect(attackerJson).not.toContain(ownerMovement);

    const ownerExport = await ownerContext.request.get("/profile/export");

    expect(ownerExport.status()).toBe(200);

    const ownerData = await ownerExport.json();
    const ownerJson = JSON.stringify(ownerData);

    expect(ownerData.account.email).toBe(ownerEmail);
    expect(ownerData.profile.displayName).toBe(ownerProfile);
    expect(ownerJson).toContain(ownerArea);
    expect(ownerJson).toContain(ownerMovement);
    expect(ownerJson).not.toContain(attackerEmail);
    expect(ownerJson).not.toContain(attackerProfile);
    expect(ownerJson).not.toContain(attackerArea);
    expect(ownerJson).not.toContain(attackerMovement);
  } finally {
    await ownerContext.close();
    await attackerContext.close();
  }
});