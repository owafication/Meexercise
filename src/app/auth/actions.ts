"use server";

import { redirect } from "next/navigation";

import {
  getRequiredSiteUrl,
  getRequiredSupabasePublicConfig,
} from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/modules/identity/server/auth";
import {
  isValidEmail,
  normalizeEmail,
  passwordError,
  readText,
} from "@/modules/identity/validation";

import type { AuthActionState } from "./state";

function authUnavailable(): AuthActionState {
  return {
    status: "error",
    message: "Account services are unavailable in this environment.",
  };
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = normalizeEmail(formData.get("email"));
  const password = readText(formData.get("password"));
  const confirmPassword = readText(formData.get("confirmPassword"));

  const fieldErrors: AuthActionState["fieldErrors"] = {};

  if (!isValidEmail(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  const passwordValidation = passwordError(password);

  if (passwordValidation) {
    fieldErrors.password = passwordValidation;
  }

  if (password !== confirmPassword) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors,
    };
  }

  let supabase;
  let siteUrl: string;

  try {
    getRequiredSupabasePublicConfig();
    siteUrl = getRequiredSiteUrl();
    supabase = await createClient();
  } catch {
    return authUnavailable();
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/profile`,
    },
  });

  if (error) {
    return {
      status: "error",
      message: "Account creation could not be completed. Check the details and try again.",
    };
  }

  if (data.session) {
    redirect("/profile");
  }

  return {
    status: "success",
    message:
      "Check your email to confirm your account, then return here to sign in.",
  };
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = normalizeEmail(formData.get("email"));
  const password = readText(formData.get("password"));

  const fieldErrors: AuthActionState["fieldErrors"] = {};

  if (!isValidEmail(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!password) {
    fieldErrors.password = "Enter your password.";
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
    return authUnavailable();
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      status: "error",
      message: "Email or password was not accepted.",
    };
  }

  redirect("/profile");
}

export async function requestPasswordResetAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = normalizeEmail(formData.get("email"));

  if (!isValidEmail(email)) {
    return {
      status: "error",
      message: "Check the highlighted field.",
      fieldErrors: {
        email: "Enter a valid email address.",
      },
    };
  }

  let supabase;
  let siteUrl: string;

  try {
    siteUrl = getRequiredSiteUrl();
    supabase = await createClient();
  } catch {
    return authUnavailable();
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/update-password`,
  });

  if (error) {
    return {
      status: "error",
      message: "Password reset could not be requested right now. Try again later.",
    };
  }

  return {
    status: "success",
    message:
      "If an account matches that email, a password-reset message has been sent.",
  };
}

export async function updatePasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = readText(formData.get("password"));
  const confirmPassword = readText(formData.get("confirmPassword"));

  const fieldErrors: AuthActionState["fieldErrors"] = {};
  const validation = passwordError(password);

  if (validation) {
    fieldErrors.password = validation;
  }

  if (password !== confirmPassword) {
    fieldErrors.confirmPassword = "Passwords do not match.";
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
    return authUnavailable();
  }

  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    return {
      status: "error",
      message: "The recovery session is missing or expired. Request a new reset link.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      status: "error",
      message: "Password could not be updated. Request a new reset link and try again.",
    };
  }

  redirect("/profile");
}

export async function signOutAction() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Signing out remains fail-closed from the application's perspective:
    // the user is returned to the sign-in surface and no private data is shown.
  }

  redirect("/auth/sign-in");
}
