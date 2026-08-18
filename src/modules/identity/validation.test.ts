import { describe, expect, it } from "vitest";

import {
  isValidEmail,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  passwordError,
} from "./validation";

describe("identity validation", () => {
  it("normalizes and validates ordinary email input", () => {
    expect(normalizeEmail("  USER@example.com ")).toBe("user@example.com");
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
  });

  it("enforces the application password floor", () => {
    expect(passwordError("x".repeat(MIN_PASSWORD_LENGTH - 1))).toContain(
      String(MIN_PASSWORD_LENGTH),
    );
    expect(passwordError("x".repeat(MIN_PASSWORD_LENGTH))).toBeNull();
  });
});
