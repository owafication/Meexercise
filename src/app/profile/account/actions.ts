"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  accountDeletionFieldErrors,
  hasAccountDeletionFieldErrors,
  parseAccountDeletionForm,
} from "@/modules/identity/account-lifecycle";
import {
  isValidEmail,
  normalizeEmail,
  readText,
} from "@/modules/identity/validation";

import type {
  AccountDeletionActionState,
  AccountEmailChangeActionState,
} from "./state";

function deletionUnavailable(
  fieldErrors?: AccountDeletionActionState["fieldErrors"],
): AccountDeletionActionState {
  return {
    status: "error",
    message:
      "Account deletion could not be completed right now. Your account has not been deleted.",
    fieldErrors,
  };
}

export async function requestAccountEmailChangeAction(
  _previousState: AccountEmailChangeActionState,
  formData: FormData,
): Promise<AccountEmailChangeActionState> {
  const newEmail = normalizeEmail(formData.get("newEmail"));
  const currentPassword = readText(formData.get("currentPassword"));
  const fieldErrors: NonNullable<
    AccountEmailChangeActionState["fieldErrors"]
  > = {};

  if (!isValidEmail(newEmail)) {
    fieldErrors.newEmail = "Enter a valid new email address.";
  }

  if (!currentPassword) {
    fieldErrors.currentPassword =
      "Enter your current password to confirm this account change.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors,
    };
  }

  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return {
      status: "error",
      message: "Account email could not be changed right now.",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return {
      status: "error",
      message: "Your session has expired. Sign in again before changing email.",
    };
  }

  const currentEmail = normalizeEmail(user.email);

  if (newEmail === currentEmail) {
    return {
      status: "error",
      message: "Check the highlighted field.",
      fieldErrors: {
        newEmail: "Enter a different email address.",
      },
    };
  }

  const { data: reauthenticated, error: passwordError } =
    await supabase.auth.signInWithPassword({
      email: currentEmail,
      password: currentPassword,
    });

  if (
    passwordError ||
    !reauthenticated.user ||
    reauthenticated.user.id !== user.id
  ) {
    return {
      status: "error",
      message: "Password was not accepted.",
      fieldErrors: {
        currentPassword: "Enter the current password for this account.",
      },
    };
  }

  const { error } = await supabase.auth.updateUser({
    email: newEmail,
  });

  if (error) {
    return {
      status: "error",
      message:
        "Email change could not be requested. Check the address and try again.",
    };
  }

  return {
    status: "success",
    message:
      "Check your new email address and confirm the change from that message.",
  };
}

export async function deleteAccountAction(
  _previousState: AccountDeletionActionState,
  formData: FormData,
): Promise<AccountDeletionActionState> {
  const input = parseAccountDeletionForm(formData);
  const fieldErrors = accountDeletionFieldErrors(input);

  if (hasAccountDeletionFieldErrors(fieldErrors)) {
    return {
      status: "error",
      message: "Complete the required account-deletion confirmation.",
      fieldErrors,
    };
  }

  let supabase;
  let admin;

  try {
    supabase = await createClient();
    admin = createAdminClient();
  } catch {
    return deletionUnavailable();
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      status: "error",
      message: "Your session has expired. Sign in again before deleting your account.",
    };
  }

  if (!user.email) {
    return deletionUnavailable();
  }

  const { data: reauthenticated, error: passwordError } =
    await supabase.auth.signInWithPassword({
      email: user.email,
      password: input.currentPassword,
    });

  if (
    passwordError ||
    !reauthenticated.user ||
    reauthenticated.user.id !== user.id
  ) {
    return {
      status: "error",
      message: "Password was not accepted.",
      fieldErrors: {
        currentPassword: "Enter the current password for this account.",
      },
    };
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(
    user.id,
    false,
  );

  if (deleteError) {
    return deletionUnavailable();
  }

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // The Auth user has already been deleted. The sign-in surface is still the
    // fail-closed destination if local session cleanup cannot contact Auth.
  }

  redirect("/auth/sign-in?accountDeleted=1");
}
