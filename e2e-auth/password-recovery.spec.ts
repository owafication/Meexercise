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

async function waitForRecoveryLink(email: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const response = await fetch(
      `${MAILPIT_URL}/api/v1/messages?limit=50`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error(`Mailpit message query failed with ${response.status}.`);
    }

    const data = (await response.json()) as MailpitListResponse;

    const message = (data.messages ?? []).find(
      (candidate) =>
        candidate.ID &&
        candidate.To?.some(
          (recipient) =>
            recipient.Address?.toLowerCase() === email.toLowerCase(),
        ) &&
        /password|reset|recover/i.test(candidate.Subject ?? ""),
    );

    if (message?.ID) {
      const htmlResponse = await fetch(
        `${MAILPIT_URL}/view/${encodeURIComponent(message.ID)}.html`,
        { cache: "no-store" },
      );

      if (!htmlResponse.ok) {
        throw new Error(
          `Mailpit message body query failed with ${htmlResponse.status}.`,
        );
      }

      const html = await htmlResponse.text();
      const hrefMatches = Array.from(
        html.matchAll(/href=(["'])([\s\S]*?)\1/gi),
      );

      for (const match of hrefMatches) {
        const href = decodeHtmlAttribute(match[2]);

        if (
          href.includes("/auth/callback?token_hash=") &&
          href.includes("type=recovery")
        ) {
          return href;
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`No password-recovery email link found for ${email}.`);
}

test("password recovery email establishes a recovery session and changes credentials", async ({
  page,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `recovery-${suffix}@example.invalid`;
  const originalPassword = "RecoveryOriginal!1234";
  const replacementPassword = "RecoveryChanged!5678";

  await page.goto("/auth/sign-up");
  await page.getByLabel("Email").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(originalPassword);
  await page.getByLabel("Confirm password").fill(originalPassword);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/profile$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);

  await page.goto("/auth/update-password");

  await expect(
    page.getByText("The recovery session is missing or expired."),
  ).toBeVisible();

  await expect(
    page.getByRole("link", { name: "Request another reset link" }),
  ).toBeVisible();

  await page.goto("/auth/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(page.getByRole("status")).toHaveText(
    "If an account matches that email, a password-reset message has been sent.",
  );

  const recoveryLink = await waitForRecoveryLink(email);

  await page.goto(recoveryLink);

  expect(new URL(page.url()).host).toBe("127.0.0.1:3000");

  await expect(page).toHaveURL(/\/auth\/update-password$/);
  await expect(
    page.getByRole("heading", { level: 2, name: "Update password" }),
  ).toBeVisible();

  await page.getByLabel("New password", { exact: true }).fill(
    replacementPassword,
  );
  await page.getByLabel("Confirm new password").fill(replacementPassword);
  await page.getByRole("button", { name: "Update password" }).click();

  await expect(page).toHaveURL(/\/profile$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(originalPassword);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Email or password was not accepted." }),
  ).toHaveText("Email or password was not accepted.");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(replacementPassword);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/profile$/);
});