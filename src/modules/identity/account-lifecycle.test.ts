import { describe, expect, it } from "vitest";

import {
  ACCOUNT_DELETE_CONFIRMATION,
  accountDeletionFieldErrors,
  normalizeDeletionConfirmation,
} from "./account-lifecycle";

describe("account deletion confirmation", () => {
  it("normalizes spacing without weakening the exact destructive phrase", () => {
    expect(
      normalizeDeletionConfirmation("  DELETE   MY   ACCOUNT  "),
    ).toBe(ACCOUNT_DELETE_CONFIRMATION);

    expect(normalizeDeletionConfirmation("delete my account")).not.toBe(
      ACCOUNT_DELETE_CONFIRMATION,
    );
  });

  it("requires both a current password and the exact confirmation phrase", () => {
    expect(
      accountDeletionFieldErrors({
        currentPassword: "",
        confirmation: "",
      }),
    ).toMatchObject({
      currentPassword: expect.any(String),
      confirmation: expect.any(String),
    });

    expect(
      accountDeletionFieldErrors({
        currentPassword: "CurrentPassword!123",
        confirmation: ACCOUNT_DELETE_CONFIRMATION,
      }),
    ).toEqual({});
  });
});