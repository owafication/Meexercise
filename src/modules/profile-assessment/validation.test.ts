import { describe, expect, it } from "vitest";

import {
  displayNameError,
  normalizeDisplayName,
  parseRowVersion,
} from "./validation";

describe("profile validation", () => {
  it("normalizes optional display names without collecting empty strings", () => {
    expect(normalizeDisplayName("  Test   User  ")).toBe("Test User");
    expect(normalizeDisplayName("   ")).toBeNull();
    expect(displayNameError("x".repeat(81))).toContain("80");
  });

  it("accepts only positive safe row versions", () => {
    expect(parseRowVersion(null)).toBeNull();
    expect(parseRowVersion("1")).toBe(1);
    expect(parseRowVersion("0")).toBeUndefined();
    expect(parseRowVersion("-1")).toBeUndefined();
    expect(parseRowVersion("not-a-number")).toBeUndefined();
  });
});
