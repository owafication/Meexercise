import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/modules/planning/server/schedules", () => ({
  getTodaySchedulePageState: vi.fn(),
}));

import { getTodaySchedulePageState } from "@/modules/planning/server/schedules";

import TodayPage from "./page";

const mockedGetTodaySchedulePageState = vi.mocked(
  getTodaySchedulePageState,
);

beforeEach(() => {
  mockedGetTodaySchedulePageState.mockResolvedValue({
    kind: "authenticated",
    occurrences: [],
  });
});

test("renders the Today shell with an authenticated empty schedule state", async () => {
  render(await TodayPage());

  expect(
    screen.getByRole("heading", {
      level: 1,
      name: "Your day, at a glance",
    }),
  ).toBeInTheDocument();

  expect(
    screen.getByRole("heading", {
      level: 2,
      name: "No routine scheduled in the next 14 days",
    }),
  ).toBeInTheDocument();

  expect(
    screen.getByRole("link", {
      name: "Open Plans",
    }),
  ).toHaveAttribute("href", "/plans");
});
