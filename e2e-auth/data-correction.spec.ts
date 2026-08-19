import { expect, test } from "@playwright/test";

const MAILPIT_URL = "http://127.0.0.1:54324";

type MailpitAddress = {
  Address?: string;
};

type MailpitMessage = {
  ID?: string;
  Subject?: string;
  To?: MailpitAddress[];
};

type MailpitListResponse = {
  messages?: MailpitMessage[];
};

function decodeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#38;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#34;", '"');
}

async function waitForEmailChangeLink(recipientEmail: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await fetch(
      `${MAILPIT_URL}/api/v1/messages?limit=50`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error(`Mailpit message query failed with ${response.status}.`);
    }

    const data = (await response.json()) as MailpitListResponse;

    const candidates = (data.messages ?? []).filter(
      (message) =>
        message.ID &&
        message.To?.some(
          (recipient) =>
            recipient.Address?.toLowerCase() ===
            recipientEmail.toLowerCase(),
        ) &&
        /email change/i.test(message.Subject ?? ""),
    );

    for (const message of candidates) {
      const htmlResponse = await fetch(
        `${MAILPIT_URL}/view/${encodeURIComponent(String(message.ID))}.html`,
        { cache: "no-store" },
      );

      if (!htmlResponse.ok) {
        continue;
      }

      const html = await htmlResponse.text();
      const hrefMatches = Array.from(
        html.matchAll(/href=(["'])([\s\S]*?)\1/gi),
      );

      for (const match of hrefMatches) {
        const href = decodeHtmlAttribute(match[2]);

        if (
          href.includes("/auth/callback?token_hash=") &&
          href.includes("type=email_change") &&
          href.includes("next=/profile/account")
        ) {
          return href;
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `No email-change confirmation link found for ${recipientEmail}.`,
  );
}

test("user can correct completed assessment history and account email", async ({
  page,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const originalEmail = `correction-old-${suffix}@example.invalid`;
  const replacementEmail = `correction-new-${suffix}@example.invalid`;
  const password = "LocalCorrectionTest!1234";

  await page.goto("/auth/sign-up");
  await page.getByLabel("Email").fill(originalEmail);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/profile$/);

  await page.getByLabel("Display name").fill("Correction Test User");
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
  await page.getByLabel("Affected areas").fill("Left shoulder - incorrect");
  await page.getByLabel("Movements you avoid").fill("Overhead press - incorrect");
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

  const beforeCorrection = await page.request.get("/profile/export");

  expect(beforeCorrection.status()).toBe(200);

  const beforeData = await beforeCorrection.json();

  expect(beforeData.exportVersion).toBe(2);
  expect(beforeData.assessments).toHaveLength(1);

  const sourceSessionId = String(beforeData.assessments[0].id);

  expect(beforeData.assessments[0].correctsSessionId).toBeNull();

  await page
    .getByRole("button", { name: "Correct this assessment" })
    .click();

  await expect(page.getByText("Correction in progress")).toBeVisible();
  await expect(page.getByLabel("Affected areas")).toHaveValue(
    "Left shoulder - incorrect",
  );
  await expect(page.getByLabel("Movements you avoid")).toHaveValue(
    "Overhead press - incorrect",
  );

  await page.getByLabel("Affected areas").fill("Right shoulder - corrected");
  await page.getByLabel("Movements you avoid").fill("Bench press - corrected");

  await page.getByRole("button", { name: "Complete assessment" }).click();

  await expect(
    page.getByText("Corrected assessment completed"),
  ).toBeVisible();

  const afterCorrection = await page.request.get("/profile/export");

  expect(afterCorrection.status()).toBe(200);

  const afterData = await afterCorrection.json();

  expect(afterData.exportVersion).toBe(2);
  expect(afterData.assessments).toHaveLength(2);

  const source = afterData.assessments.find(
    (assessment: { id: string }) => assessment.id === sourceSessionId,
  );

  const corrected = afterData.assessments.find(
    (assessment: { correctsSessionId: string | null }) =>
      assessment.correctsSessionId === sourceSessionId,
  );

  expect(source).toBeTruthy();
  expect(corrected).toBeTruthy();

  expect(source.responses.limitations.affectedAreas).toBe(
    "Left shoulder - incorrect",
  );
  expect(source.responses.limitations.avoidedMovements).toBe(
    "Overhead press - incorrect",
  );
  expect(corrected.responses.limitations.affectedAreas).toBe(
    "Right shoulder - corrected",
  );
  expect(corrected.responses.limitations.avoidedMovements).toBe(
    "Bench press - corrected",
  );
  expect(corrected.templateVersion.id).toBe(source.templateVersion.id);

  await page.goto("/profile/account");

  await expect(
    page
      .locator('section[aria-labelledby="email-change-title"]')
      .getByText(originalEmail, { exact: false }),
  ).toBeVisible();

  await page.getByLabel("New email").fill(replacementEmail);
  await page
    .getByLabel("Current password for email change")
    .fill(password);
  await page
    .getByRole("button", { name: "Request email change" })
    .click();

  await expect(
    page
      .getByRole("status")
      .filter({
        hasText:
          "Check your new email address and confirm the change from that message.",
      }),
  ).toHaveText(
    "Check your new email address and confirm the change from that message.",
  );

  const newAddressLink = await waitForEmailChangeLink(replacementEmail);

  await page.goto(newAddressLink);
  await expect(page).toHaveURL(/\/profile\/account$/);

  await page.reload();

  await expect(
    page
      .locator('section[aria-labelledby="email-change-title"]')
      .getByText(replacementEmail, { exact: false }),
  ).toBeVisible();

  const correctedExport = await page.request.get("/profile/export");

  expect(correctedExport.status()).toBe(200);

  const correctedExportData = await correctedExport.json();

  expect(correctedExportData.exportVersion).toBe(2);
  expect(correctedExportData.account.email).toBe(replacementEmail);
  expect(correctedExportData.assessments).toHaveLength(2);
  expect(
    correctedExportData.assessments.some(
      (assessment: { correctsSessionId: string | null }) =>
        assessment.correctsSessionId === sourceSessionId,
    ),
  ).toBe(true);

  await page.goto("/profile");
  await expect(page).toHaveURL(/\/profile$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);

  await page.getByLabel("Email").fill(originalEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Email or password was not accepted." }),
  ).toHaveText("Email or password was not accepted.");

  await page.getByLabel("Email").fill(replacementEmail);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/profile$/);
});
