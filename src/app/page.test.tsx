import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import TodayPage from "./page";

test("renders the Today shell with a meaningful empty state", () => {
  render(<TodayPage />);

  expect(
    screen.getByRole("heading", {
      level: 1,
      name: "Your day, at a glance",
    }),
  ).toBeInTheDocument();

  expect(
    screen.getByRole("heading", {
      level: 2,
      name: "No routine scheduled yet",
    }),
  ).toBeInTheDocument();

  expect(
    screen.getByRole("link", {
      name: "Explore routine setup",
    }),
  ).toHaveAttribute("href", "/create");
});
