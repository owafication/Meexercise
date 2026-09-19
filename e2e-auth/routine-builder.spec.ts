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

async function completeStructuredRestrictedReadiness(page: Page) {
  await page.goto("/profile/assessment");
  await page.getByRole("button", { name: "Start readiness assessment" }).click();
  await page.getByLabel("1–2 days per week").check();
  await page
    .getByLabel("Yes, I have areas or movements to account for")
    .check();
  await page.getByLabel("Affected areas").fill("Wrist");
  await page.getByLabel("Movements you avoid").fill("Weight through hands");
  await page
    .getByLabel("Body weight supported through the hands")
    .check();
  await page.getByLabel("Yes, I can exercise independently").check();
  await page.getByLabel("No professional restriction has been given").check();
  await page.getByRole("button", { name: "Complete assessment" }).click();

  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Movement restrictions recorded",
    }),
  ).toBeVisible();
}

async function completePlanningProfile(page: Page) {
  await page.goto("/profile");
  await page.getByLabel("Primary goal").selectOption("general_strength");
  await page.getByLabel("Secondary goal").selectOption("balance");
  await page.getByLabel("Bodyweight exercise").check();
  await page.getByLabel("Resistance-band exercise").check();

  for (const equipment of ["Chair", "Wall", "Stable support", "Stable elevated surface", "Counter-height surface", "Resistance band equipment"]) {
    await page.getByLabel(equipment, { exact: true }).check();
  }

  await page.getByLabel("Home", { exact: true }).check();
  await page.getByLabel("Available time per routine").selectOption("20");
  await page.getByLabel("Preferred routine frequency").selectOption("3");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Profile saved." })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Primary goal")).toHaveValue("general_strength");
  await expect(page.getByLabel("Available time per routine")).toHaveValue("20");
  await expect(page.getByLabel("Preferred routine frequency")).toHaveValue("3");
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
    page.getByRole("heading", { level: 3, name: "Edited routine" }),
  ).toBeVisible();
  await expect(page.getByText("2 exercises", { exact: false })).toBeVisible();

  await page.goto("/profile/account");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download JSON export" }).click();
  const exportDownload = await downloadPromise;
  const exported = JSON.parse(await readDownloadText(exportDownload));

  expect(exported.exportVersion).toBe(5);
  expect(exported.routines).toHaveLength(1);
  expect(exported.templates).toEqual([]);
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
  await page.getByLabel("Affected areas").fill("Wrist");
  await page.getByLabel("Movements you avoid").fill("Weight through hands");
  await page
    .getByLabel("Body weight supported through the hands")
    .check();
  await page.getByRole("button", { name: "Complete assessment" }).click();

  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Movement restrictions recorded",
    }),
  ).toBeVisible();

  await page.goto(`${routineUrl}/edit`);

  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Current movement constraints",
    }),
  ).toBeVisible();
  await expect(page.getByText(/Incline push-up — version 1 conflicts/)).toBeVisible();
  await expect(page.getByText(/Counter push-up — version 1 conflicts/)).toBeVisible();

  await page
    .getByLabel("Exercise 1", { exact: true })
    .selectOption({ label: "Standing resistance-band press — version 1" });
  await page.getByLabel("Exercise 2", { exact: true }).selectOption("");
  await page.getByRole("button", { name: "Save new version" }).click();

  await expect(page).toHaveURL(routineUrl);
  await expect(page.getByText("Routine · version 3")).toBeVisible();

  const constrainedItems = page
    .locator('section[aria-labelledby^="routine-section-"]')
    .getByRole("listitem");

  await expect(
    constrainedItems.nth(0).getByRole("heading", { level: 3 }),
  ).toHaveText("Standing resistance-band press");
  await expect(constrainedItems).toHaveCount(1);

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
      otherPage.getByRole("heading", { level: 3, name: "No routines yet" }),
    ).toBeVisible();
  } finally {
    await otherContext.close();
    await stalePage.close();
  }
});

test("structured restriction filters manual creation and exposes a compatible substitution", async ({
  page,
}: {
  page: Page;
}) => {
  await signUp(page, "routine-restricted-create");
  await completeStructuredRestrictedReadiness(page);

  await page.goto("/create");

  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Structured movement constraints applied",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Build a constrained manual routine",
    }),
  ).toBeVisible();

  const exerciseOne = page.getByLabel("Exercise 1", { exact: true });
  const optionText = await exerciseOne.locator("option").allTextContents();

  expect(optionText).toContain("Standing resistance-band press — version 1");
  expect(optionText).not.toContain("Wall push-up — version 2");

  await expect(
    page.getByRole("heading", { level: 2, name: "Compatible substitutions" }),
  ).toBeVisible();

  await expect(
    page.getByText(
      /Wall push-up — version 2.*Standing resistance-band press — version 1/,
    ),
  ).toBeVisible();

  await page.getByLabel("Routine title").fill("Structured restricted routine");
  await exerciseOne.selectOption({
    label: "Standing resistance-band press — version 1",
  });
  await page.getByRole("button", { name: "Save routine" }).click();

  await expect(page).toHaveURL(/\/routines\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Structured restricted routine",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 3,
      name: "Standing resistance-band press",
    }),
  ).toBeVisible();
});
test("guided proposal explains and permits replacement of every item before save", async ({
  page,
}: {
  page: Page;
}) => {
  await signUp(page, "guided-review");
  await completeUnrestrictedReadiness(page);

  await page.goto("/create");
  await expect(page.getByRole("heading", { level: 2, name: "Complete your planning profile" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Build a manual routine" })).toBeVisible();

  await completePlanningProfile(page);
  await page.goto("/create");

  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Generate and review a routine proposal",
    }),
  ).toBeVisible();

  await page.getByLabel("Routine focus").selectOption("balanced");
  await page.getByLabel("Number of exercises").selectOption("2");
  await page
    .getByRole("button", { name: "Generate routine proposal" })
    .click();

  await expect(
    page.getByRole("heading", {
      level: 3,
      name: "Review the proposal before saving",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { level: 3, name: "Purpose" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Planning profile" })).toBeVisible();
  await expect(page.getByText(/Primary goal: General strength\./)).toBeVisible();
  await expect(page.getByText(/Estimated proposal time: 11 of 20 available minutes\./)).toBeVisible();
  await expect(page.getByText(/Preferred routine frequency: 3 days per week/)).toBeVisible();

  await expect(
    page.getByRole("heading", { level: 3, name: "Balance" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "Constraints" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 3,
      name: "Substitutions and review",
    }),
  ).toBeVisible();

  const reviewOne = page.getByLabel("Exercise 1 review choice");
  const reviewTwo = page.getByLabel("Exercise 2 review choice");

  await expect(reviewOne).toHaveValue(
    "e1111111-1111-4111-8111-111111111111",
  );
  await expect(reviewTwo).toHaveValue(
    "e3333333-3333-4333-8333-333333333334",
  );

  await reviewOne.selectOption({
    label: "Supported bodyweight squat — version 1",
  });
  await reviewTwo.selectOption({
    label: "Standing resistance-band press — version 1",
  });

  await page.locator("#guided-review-routine-title").fill("Reviewed guided routine");
  await page
    .getByRole("button", { name: "Save reviewed routine" })
    .click();

  await expect(page).toHaveURL(/\/routines\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Reviewed guided routine",
    }),
  ).toBeVisible();

  const items = page
    .locator('section[aria-labelledby^="routine-section-"]')
    .getByRole("listitem");

  await expect(items).toHaveCount(2);
  await expect(items.nth(0).getByRole("heading", { level: 3 })).toHaveText(
    "Supported bodyweight squat",
  );
  await expect(items.nth(1).getByRole("heading", { level: 3 })).toHaveText(
    "Standing resistance-band press",
  );
});

test("guided proposal respects supported structured restrictions", async ({
  page,
}: {
  page: Page;
}) => {
  await signUp(page, "guided-restricted");
  await completeStructuredRestrictedReadiness(page);
  await completePlanningProfile(page);

  await page.goto("/create");

  await page.getByLabel("Routine focus").selectOption("upper_body");
  await page.getByLabel("Number of exercises").selectOption("1");
  await page
    .getByRole("button", { name: "Generate routine proposal" })
    .click();

  await expect(
    page.getByRole("heading", {
      level: 3,
      name: "Standing resistance-band press — version 1",
    }),
  ).toBeVisible();

  const review = page.getByLabel("Exercise 1 review choice");
  const optionText = await review.locator("option").allTextContents();

  expect(optionText).toEqual([
    "Standing resistance-band press — version 1",
  ]);

  await expect(
    page.getByText(
      /proposal excludes exact exercise versions that conflict with the current structured movement constraints: surface_hand_loading/i,
    ),
  ).toBeVisible();

  await page.locator("#guided-review-routine-title").fill("Restricted guided routine");
  await page
    .getByRole("button", { name: "Save reviewed routine" })
    .click();

  await expect(page).toHaveURL(/\/routines\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Restricted guided routine",
    }),
  ).toBeVisible();
});

test("guided save revalidates a changed planning profile before persistence", async ({ page }: { page: Page }) => {
  await signUp(page, "guided-profile-revalidate");
  await completeUnrestrictedReadiness(page);
  await completePlanningProfile(page);

  await page.goto("/create");
  await page.getByLabel("Routine focus").selectOption("upper_body");
  await page.getByLabel("Number of exercises").selectOption("1");
  await page.getByRole("button", { name: "Generate routine proposal" }).click();

  await expect(page.getByRole("heading", { level: 3, name: "Wall push-up — version 2" })).toBeVisible();

  const profilePage = await page.context().newPage();
  try {
    await profilePage.goto("/profile");
    await profilePage.getByLabel("Bodyweight exercise").uncheck();
    await profilePage.getByRole("button", { name: "Save profile" }).click();
    await expect(profilePage.getByRole("status").filter({ hasText: "Profile saved." })).toBeVisible();
    await profilePage.reload();
    await expect(profilePage.getByLabel("Bodyweight exercise")).not.toBeChecked();

    await page.locator("#guided-review-routine-title").fill("Stale profile guided routine");
    await page.getByRole("button", { name: "Save reviewed routine" }).click();
    await expect(page.getByRole("alert").filter({ hasText:"The reviewed guided routine no longer fits your current planning profile." })).toBeVisible();
  } finally {
    await profilePage.close();
  }
});

test("routine templates preserve an exact source snapshot and create a new validated routine", async ({ page, browser }: { page: Page; browser: Browser }) => {
  await signUp(page, "routine-template-owner");
  await completeUnrestrictedReadiness(page);
  await page.goto("/create");
  await page.getByLabel("Routine title").fill("Template source");
  await page.getByLabel("Exercise 1", { exact: true }).selectOption({ label: "Wall push-up \u2014 version 2" });
  await page.getByLabel("Exercise 2", { exact: true }).selectOption({ label: "Incline push-up \u2014 version 1" });
  await page.getByRole("button", { name: "Save routine" }).click();
  await expect(page).toHaveURL(/\/routines\/[0-9a-f-]+$/);
  const sourceRoutineUrl=page.url();

  await page.goto("/plans");
  await expect(page.getByRole("heading",{level:2,name:"Reusable routine templates"})).toBeVisible();
  await page.getByLabel("Template name for Template source").fill("Reusable exact starter");
  await page.getByRole("button",{name:"Save as template"}).click();
  await expect(page.getByRole("status").filter({hasText:"Template saved."})).toBeVisible();
  await expect(page.getByRole("heading",{level:3,name:"Reusable exact starter"})).toBeVisible();

  await page.goto(`${sourceRoutineUrl}/edit`);
  await page.getByLabel("Routine title").fill("Edited template source");
  await page.getByLabel("Exercise 1", { exact: true }).selectOption({ label: "Incline push-up \u2014 version 1" });
  await page.getByLabel("Exercise 2", { exact: true }).selectOption({ label: "Counter push-up \u2014 version 1" });
  await page.getByRole("button",{name:"Save new version"}).click();
  await expect(page.getByText(/Routine .* version 2/)).toBeVisible();

  await page.goto("/plans");
  const card=page.locator("article").filter({hasText:"Reusable exact starter"});
  await expect(card).toContainText("source routine version 1");
  await expect(card).toContainText("Template source");
  await card.getByLabel("New routine title from Reusable exact starter").fill("Routine from saved template");
  await card.getByRole("button",{name:"Create routine from template"}).click();
  await expect(page).toHaveURL(/\/routines\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading",{level:1,name:"Routine from saved template"})).toBeVisible();
  const items=page.locator('section[aria-labelledby^="routine-section-"]').getByRole("listitem");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0).getByRole("heading",{level:3})).toHaveText("Wall push-up");
  await expect(items.nth(1).getByRole("heading",{level:3})).toHaveText("Incline push-up");

  await page.goto("/profile/account");
  const downloadPromise=page.waitForEvent("download");
  await page.getByRole("link",{name:"Download JSON export"}).click();
  const exported=JSON.parse(await readDownloadText(await downloadPromise));
  expect(exported.exportVersion).toBe(5);
  expect(exported.templates).toHaveLength(1);
  expect(exported.templates[0]).toMatchObject({ title:"Reusable exact starter", sourceRoutineVersionNumber:1, sourceRoutineTitle:"Template source", itemCount:2 });

  const otherContext=await browser.newContext();
  try { const otherPage=await otherContext.newPage(); await signUp(otherPage,"routine-template-other"); await completeUnrestrictedReadiness(otherPage); await otherPage.goto("/plans"); await expect(otherPage.getByRole("heading",{level:3,name:"No routines yet"})).toBeVisible(); await expect(otherPage.getByRole("heading",{level:3,name:"No templates yet"})).toBeVisible(); }
  finally { await otherContext.close(); }
});
