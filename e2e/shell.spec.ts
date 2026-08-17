import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  { path: "/", heading: "Your day, at a glance" },
  { path: "/plans", heading: "Your plans and routines" },
  { path: "/create", heading: "Build something that fits" },
  { path: "/progress", heading: "See what your history shows" },
  {
    path: "/profile",
    heading: "Your context, preferences, and account",
  },
];

for (const route of routes) {
  test(`${route.path} exposes semantic shell content without axe violations`, async ({
    page,
  }) => {
    await page.goto(route.path);

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: route.heading,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("navigation", {
        name: "Primary",
      }),
    ).toBeVisible();

    const accessibility = await new AxeBuilder({ page }).analyze();

    expect(accessibility.violations).toEqual([]);
  });
}

test("unknown route has an actionable accessible not-found state", async ({
  page,
}) => {
  await page.goto("/this-route-does-not-exist");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Page not found",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", {
      name: "Return to Today",
    }),
  ).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();

  expect(accessibility.violations).toEqual([]);
});

test("skip link is the first keyboard destination and moves focus to main content", async ({
  page,
}) => {
  await page.goto("/");

  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", {
    name: "Skip to main content",
  });

  await expect(skipLink).toBeFocused();

  await page.keyboard.press("Enter");

  await expect(page.locator("#main-content")).toBeFocused();
});

test("primary navigation has a logical keyboard sequence", async ({ page }) => {
  await page.goto("/");

  const today = page.getByRole("link", { name: "Today" });
  const plans = page.getByRole("link", { name: "Plans" });

  await today.focus();
  await expect(today).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(plans).toBeFocused();
});

for (const width of [320, 768, 1280]) {
  test(`Today shell does not horizontally overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width,
      height: 900,
    });

    await page.goto("/");

    const overflow = await page.evaluate(() => {
      const root = document.documentElement;

      return {
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
      };
    });

    expect(overflow.scrollWidth).toBeLessThanOrEqual(
      overflow.clientWidth,
    );
  });
}

test("shell remains usable when reduced motion is requested", async ({
  page,
}) => {
  await page.emulateMedia({
    reducedMotion: "reduce",
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Your day, at a glance",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("navigation", {
      name: "Primary",
    }),
  ).toBeVisible();
});
