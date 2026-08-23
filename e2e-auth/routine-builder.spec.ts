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

function versionPairs(version: {
  sections: Array<{
    items: Array<{
      exerciseVersion: { title: string; versionNumber: number };
    }>;
  }>;
}) {
  return version.sections[0].items.map((item) => ({
    title: item.exerciseVersion.title,
    versionNumber: item.exerciseVersion.versionNumber,
  }));
}

test("manual routine creation and editing preserve ordered immutable versions", async ({
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
  await page
    .getByLabel("Exercise 1", { exact: true })
    .selectOption({ label: "Wall push-up — version 2" });
  await page
    .getByLabel("Exercise 2", { exact: true })
    .selectOption({ label: "Incline push-up — version 1" });
  await page.getByRole("button", { name: "Save routine" }).click();

  await expect(page).toHaveURL(/\/routines\/[0-9a-f-]+$/);
  const routineUrl = page.url();

  await expect(
    page.getByRole("heading", { level: 1, name: "Starter routine" }),
  ).toBeVisible();
  await expect(page.getByText("Routine · version 1")).toBeVisible();

  const routineItems = page
    .locator('section[aria-labelledby^="routine-section-"]')
    .getByRole("listitem");

  await expect(routineItems.nth(0).getByRole("heading", { level: 3 })).toHaveText(
    "Wall push-up",
  );
  await expect(routineItems.nth(1).getByRole("heading", { level: 3 })).toHaveText(
    "Incline push-up",
  );

  const stalePage = await page.context().newPage();
  await stalePage.goto(`${routineUrl}/edit`);
  await expect(
    stalePage.getByRole("heading", { level: 1, name: "Edit Starter routine" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Edit routine" }).click();
  await expect(page).toHaveURL(new RegExp(`${routineUrl}/edit$`));

  await expect(page.getByLabel("Routine title")).toHaveValue("Starter routine");
  await expect(page.getByLabel("Exercise 1", { exact: true })).toHaveValue(
    "e3333333-3333-4333-8333-333333333334",
  );
  await expect(page.getByLabel("Exercise 2", { exact: true })).toHaveValue(
    "e4444444-4444-4444-8444-444444444444",
  );

  await page.getByLabel("Routine title").fill("Edited routine");
  await page
    .getByLabel("Exercise 1", { exact: true })
    .selectOption({ label: "Incline push-up — version 1" });
  await page
    .getByLabel("Exercise 2", { exact: true })
    .selectOption({ label: "Counter push-up — version 1" });
  await page.getByRole("button", { name: "Save new version" }).click();

  await expect(page).toHaveURL(routineUrl);
  await expect(
    page.getByRole("heading", { level: 1, name: "Edited routine" }),
  ).toBeVisible();
  await expect(page.getByText("Routine · version 2")).toBeVisible();

  const editedItems = page
    .locator('section[aria-labelledby^="routine-section-"]')
    .getByRole("listitem");

  await expect(editedItems.nth(0).getByRole("heading", { level: 3 })).toHaveText(
    "Incline push-up",
  );
  await expect(editedItems.nth(1).getByRole("heading", { level: 3 })).toHaveText(
    "Counter push-up",
  );

  await stalePage.getByLabel("Routine title").fill("Stale edit");
  await stalePage.getByRole("button", { name: "Save new version" }).click();

  await expect(
    stalePage
      .getByRole("alert")
      .filter({ hasText: "This routine changed in another session." }),
  ).toContainText(
    "This routine changed in another session. Reload before saving another version.",
  );

  await page.goto("/plans");
  await expect(
    page.getByRole("heading", { level: 2, name: "Edited routine" }),
  ).toBeVisible();
  await expect(page.getByText("2 exercises", { exact: false })).toBeVisible();

  await page.goto("/profile/account");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download JSON export" }).click();
  const exportDownload = await downloadPromise;
  const exported = JSON.parse(await readDownloadText(exportDownload));

  expect(exported.exportVersion).toBe(3);
  expect(exported.routines).toHaveLength(1);
  expect(exported.routines[0].versions).toHaveLength(2);

  expect(exported.routines[0].versions[0].versionNumber).toBe(1);
  expect(exported.routines[0].versions[0].title).toBe("Starter routine");
  expect(versionPairs(exported.routines[0].versions[0])).toEqual([
    { title: "Wall push-up", versionNumber: 2 },
    { title: "Incline push-up", versionNumber: 1 },
  ]);

  expect(exported.routines[0].versions[1].versionNumber).toBe(2);
  expect(exported.routines[0].versions[1].title).toBe("Edited routine");
  expect(versionPairs(exported.routines[0].versions[1])).toEqual([
    { title: "Incline push-up", versionNumber: 1 },
    { title: "Counter push-up", versionNumber: 1 },
  ]);

  await page.goto("/profile/assessment");
  await page.getByRole("button", { name: "Correct this assessment" }).click();
  await expect(page.getByText("Correction in progress")).toBeVisible();

  await page
    .getByLabel("Yes, I have areas or movements to account for")
    .check();
  await page.getByLabel("Affected areas").fill("Shoulder");
  await page.getByLabel("Movements you avoid").fill("Overhead press");
  await page.getByRole("button", { name: "Complete assessment" }).click();

  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Movement restrictions recorded",
    }),
  ).toBeVisible();

  await page.goto(`${routineUrl}/edit`);
  await page.getByRole("button", { name: "Save new version" }).click();

  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Your assessment records movement restrictions." }),
  ).toContainText(
    "Routine editing is paused until deterministic restriction matching is available.",
  );

  const otherContext = await browser.newContext();

  try {
    const otherPage = await otherContext.newPage();
    await signUp(otherPage, "routine-other");

    await otherPage.goto(routineUrl);
    await expect(
      otherPage.getByRole("heading", { level: 1, name: "Routine not available" }),
    ).toBeVisible();

    await otherPage.goto(`${routineUrl}/edit`);
    await expect(
      otherPage.getByRole("heading", { level: 1, name: "Routine not available" }),
    ).toBeVisible();

    await otherPage.goto("/plans");
    await expect(
      otherPage.getByRole("heading", { level: 2, name: "No routines yet" }),
    ).toBeVisible();
  } finally {
    await otherContext.close();
    await stalePage.close();
  }
});
