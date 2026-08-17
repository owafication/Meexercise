import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { PrimaryNav } from "./primary-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

test("exposes the five canonical primary destinations", () => {
  render(<PrimaryNav />);

  const navigation = screen.getByRole("navigation", {
    name: "Primary",
  });

  expect(navigation).toBeInTheDocument();

  const labels = ["Today", "Plans", "Create", "Progress", "Profile"];

  for (const label of labels) {
    expect(
      screen.getByRole("link", {
        name: label,
      }),
    ).toBeInTheDocument();
  }

  expect(
    screen.getByRole("link", {
      name: "Today",
    }),
  ).toHaveAttribute("aria-current", "page");
});
