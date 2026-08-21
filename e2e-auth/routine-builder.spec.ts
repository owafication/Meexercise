import { expect, test, type Browser, type Download, type Page } from "@playwright/test";

async function signUp(page: Page, prefix: string) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `${prefix}-${suffix}@example.invalid`;
  const password = "RoutineTest!1234";

  await page.goto("/auth/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/profile$/);

  return { email, password };
}

async function completeUnrestrictedReadiness(page: Page) {
  await page.goto("/profile/assessment");
  await page.getByRole("button", { name: "Start readiness assessment" }).click();
  await page.getByLabel("1–2 days per week").check();
  await page.getByLabel("No current movement limitations to record").check();
  await page.getByLabel("Yes, I can exercise independently").check();
  await page.getByLabel("No professional restriction has been given").check();
  await page.getByRole("button", { name: "Complete assessment" }).click();

  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "No planning restriction generated",
    }),
  ).toBeVisible();
}

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

test("manual routine keeps exact approved exercise versions and remains private", async ({
  page,
  browser,
}: {
  page: Page;
  browser: Browser;
}) => {
  await signUp(page, "routine-owner");

  await page.goto("/create");
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Complete your readiness assessment",
    }),
  ).toBeVisible();

  await completeUnrestrictedReadiness(page);

  await page.goto("/create");

  await expect(
    page.getByRole("heading", { level: 2, name: "Build a manual routine" }),
  ).toBeVisible();

  await page.getByLabel("Routine title").fill("Starter routine");
  await page.getByLabel(/Wall push-up.*version 2/).check();
  await page.getByLabel(/Incline push-up.*version 1/).check();
  await page.getByRole("button", { name: "Save routine" }).click();

  await expect(page).toHaveURL(/\/routines\/[0-9a-f-]+$/);
  const routineUrl = page.url();

  await expect(
    page.getByRole("heading", { level: 1, name: "Starter routine" }),
  ).toBeVisible();
  await expect(page.getByText("Exact exercise version 2 · reviewed")).toBeVisible();
  await expect(page.getByText("Exact exercise version 1 · general")).toBeVisible();

  await page.goto("/plans");
  await expect(
    page.getByRole("heading", { level: 2, name: "Starter routine" }),
  ).toBeVisible();
  await expect(page.getByText("2 exercises", { exact: false })).toBeVisible();

  await page.goto("/profile/account");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download JSON export" }).click();
  const exportDownload = await downloadPromise;
  const exported = JSON.parse(await readDownloadText(exportDownload));

  expect(exported.exportVersion).toBe(3);
  expect(exported.routines).toHaveLength(1);
  expect(exported.routines[0].versions).toHaveLength(1);
  expect(exported.routines[0].versions[0].title).toBe("Starter routine");
  const exportedExerciseVersions =
    exported.routines[0].versions[0].sections[0].items
      .map(
        (item: {
          exerciseVersion: { title: string; versionNumber: number };
        }) => ({
          title: item.exerciseVersion.title,
          versionNumber: item.exerciseVersion.versionNumber,
        }),
      )
      .sort((left: { title: string }, right: { title: string }) =>
        left.title.localeCompare(right.title),
      );

  expect(exportedExerciseVersions).toEqual([
    { title: "Incline push-up", versionNumber: 1 },
    { title: "Wall push-up", versionNumber: 2 },
  ]);

  const otherContext = await browser.newContext();

  try {
    const otherPage = await otherContext.newPage();
    await signUp(otherPage, "routine-other");
    await otherPage.goto(routineUrl);

    await expect(
      otherPage.getByRole("heading", { level: 1, name: "Routine not available" }),
    ).toBeVisible();

    await otherPage.goto("/plans");
    await expect(
      otherPage.getByRole("heading", { level: 2, name: "No routines yet" }),
    ).toBeVisible();
  } finally {
    await otherContext.close();
  }
});
