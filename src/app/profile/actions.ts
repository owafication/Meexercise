"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/modules/identity/server/auth";
import {
  displayNameError,
  normalizeDisplayName,
  parseRowVersion,
} from "@/modules/profile-assessment/validation";

import type { ProfileActionState } from "./state";

function unavailable(rowVersion: number | null): ProfileActionState {
  return {
    status: "error",
    message: "Profile could not be saved right now. Your entered value is unchanged.",
    rowVersion,
  };
}

export async function saveProfileAction(
  previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const displayName = normalizeDisplayName(formData.get("displayName"));
  const parsedRowVersion = parseRowVersion(formData.get("rowVersion"));
  const currentRowVersion = previousState.rowVersion;

  if (parsedRowVersion === undefined) {
    return {
      status: "error",
      message: "Profile version is invalid. Reload the page before saving.",
      rowVersion: currentRowVersion,
    };
  }

  const nameError = displayNameError(displayName);

  if (nameError) {
    return {
      status: "error",
      message: "Check the highlighted field.",
      rowVersion: parsedRowVersion,
      fieldErrors: {
        displayName: nameError,
      },
    };
  }

  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return unavailable(parsedRowVersion);
  }

  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    return {
      status: "error",
      message: "Your session has expired. Sign in again before saving.",
      rowVersion: parsedRowVersion,
    };
  }

  if (parsedRowVersion === null) {
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        user_id: userId,
        display_name: displayName,
      })
      .select("row_version")
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          status: "conflict",
          message:
            "Profile changed in another session. Reload before saving again.",
          rowVersion: null,
        };
      }

      return unavailable(null);
    }

    revalidatePath("/profile");

    return {
      status: "success",
      message: "Profile saved.",
      rowVersion: Number(data.row_version),
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
    })
    .eq("user_id", userId)
    .eq("row_version", parsedRowVersion)
    .select("row_version")
    .maybeSingle();

  if (error) {
    return unavailable(parsedRowVersion);
  }

  if (!data) {
    return {
      status: "conflict",
      message: "Profile changed in another session. Reload before saving again.",
      rowVersion: parsedRowVersion,
    };
  }

  revalidatePath("/profile");

  return {
    status: "success",
    message: "Profile saved.",
    rowVersion: Number(data.row_version),
  };
}
