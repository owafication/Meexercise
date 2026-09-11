"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/modules/identity/server/auth";
import { parsePlanningProfileFormData } from "@/modules/profile-assessment/planning-profile";
import {
  displayNameError,
  normalizeDisplayName,
  parseRowVersion,
} from "@/modules/profile-assessment/validation";

import type { ProfileActionState } from "./state";

function unavailable(rowVersion: number | null): ProfileActionState {
  return {
    status: "error",
    message:
      "Profile could not be saved right now. Your entered values are unchanged.",
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
  const planning = parsePlanningProfileFormData(formData);

  if (parsedRowVersion === undefined) {
    return {
      status: "error",
      message: "Profile version is invalid. Reload the page before saving.",
      rowVersion: currentRowVersion,
    };
  }

  const nameError = displayNameError(displayName);
  const fieldErrors: NonNullable<ProfileActionState["fieldErrors"]> = {
    ...planning.fieldErrors,
  };

  if (nameError) {
    fieldErrors.displayName = nameError;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Check the highlighted profile fields.",
      rowVersion: parsedRowVersion,
      fieldErrors,
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

  const values = {
    display_name: displayName,
    primary_goal: planning.value.primaryGoal,
    secondary_goal: planning.value.secondaryGoal,
    preferred_methods: planning.value.preferredMethods,
    available_equipment: planning.value.equipment,
    available_facilities: planning.value.facilities,
    available_minutes: planning.value.availableMinutes,
    routine_frequency_days: planning.value.routineFrequencyDays,
  };

  if (parsedRowVersion === null) {
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        user_id: userId,
        ...values,
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

      if (error.code === "23514") {
        return {
          status: "error",
          message:
            "One or more planning choices are no longer accepted. Reload before saving.",
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
    .update(values)
    .eq("user_id", userId)
    .eq("row_version", parsedRowVersion)
    .select("row_version")
    .maybeSingle();

  if (error) {
    if (error.code === "23514") {
      return {
        status: "error",
        message:
          "One or more planning choices are no longer accepted. Reload before saving.",
        rowVersion: parsedRowVersion,
      };
    }

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
