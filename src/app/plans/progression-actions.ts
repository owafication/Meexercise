"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/modules/identity/server/auth";

export type ProgressionActionState = {
  status: "idle" | "error";
  message: string;
};

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function createConservativeProgressionReviewAction(
  previousState: ProgressionActionState,
  formData: FormData,
): Promise<ProgressionActionState> {
  void previousState;
  const planId = field(formData, "planId");
  const planVersion = Number(field(formData, "expectedPlanVersionNumber"));
  const scheduleVersion = Number(
    field(formData, "expectedScheduleVersionNumber"),
  );
  const feedback = field(formData, "feedbackKind");
  const removeWeekdayText = field(formData, "removeWeekday");
  const removeWeekday = removeWeekdayText ? Number(removeWeekdayText) : null;

  if (
    !validUuid(planId) ||
    !Number.isInteger(planVersion) ||
    planVersion < 1 ||
    !Number.isInteger(scheduleVersion) ||
    scheduleVersion < 1
  ) {
    return { status: "error", message: "Plan or schedule could not be verified." };
  }

  if (
    feedback !== "discomfort" &&
    feedback !== "excessive_difficulty" &&
    feedback !== "user_requested_reduction"
  ) {
    return { status: "error", message: "Choose a supported feedback option." };
  }

  if (
    removeWeekday !== null &&
    (!Number.isInteger(removeWeekday) || removeWeekday < 1 || removeWeekday > 7)
  ) {
    return { status: "error", message: "Choose a scheduled weekday to remove." };
  }

  try {
    const supabase = await createClient();
    const userId = await getVerifiedUserId(supabase);

    if (!userId) {
      return { status: "error", message: "Sign in before reviewing progression." };
    }

    const { data, error } = await supabase.rpc(
      "create_conservative_plan_progression_review",
      {
        p_plan_id: planId,
        p_expected_plan_version_number: planVersion,
        p_expected_schedule_version_number: scheduleVersion,
        p_feedback_kind: feedback,
        p_remove_weekday: removeWeekday,
      },
    );

    if (error?.code === "40001") {
      return {
        status: "error",
        message: "The plan or schedule changed. Reload before reviewing progression.",
      };
    }

    if (error?.code === "23505") {
      return {
        status: "error",
        message: "Feedback of this type was already recorded for the current schedule version.",
      };
    }

    if (error?.code === "23514") {
      return {
        status: "error",
        message: "This schedule and feedback combination is not valid. Review the selected weekday and current schedule.",
      };
    }

    if (error?.code === "42501") {
      return { status: "error", message: "This plan is unavailable." };
    }

    if (error || typeof data !== "string") {
      return {
        status: "error",
        message: "The proposal could not be saved. Try again later.",
      };
    }
  } catch {
    return {
      status: "error",
      message: "The proposal could not be saved. Try again later.",
    };
  }

  revalidatePath(`/plans/${planId}`);
  redirect(`/plans/${planId}#plan-progression-title`);
}

export async function dismissConservativeProgressionReviewAction(
  previousState: ProgressionActionState,
  formData: FormData,
): Promise<ProgressionActionState> {
  void previousState;
  const planId = field(formData, "planId");
  const reviewId = field(formData, "reviewId");
  const version = Number(field(formData, "expectedEventVersionNumber"));

  if (!validUuid(planId) || !validUuid(reviewId) || version !== 1) {
    return { status: "error", message: "Review identity or version is invalid." };
  }

  try {
    const supabase = await createClient();
    const userId = await getVerifiedUserId(supabase);

    if (!userId) {
      return { status: "error", message: "Sign in before dismissing feedback." };
    }

    const { data, error } = await supabase.rpc(
      "dismiss_conservative_plan_progression_review",
      {
        p_review_id: reviewId,
        p_expected_event_version_number: version,
      },
    );

    if (error?.code === "40001") {
      return {
        status: "error",
        message: "This review changed in another session. Reload before dismissing it.",
      };
    }

    if (error?.code === "42501") {
      return { status: "error", message: "This review is unavailable." };
    }

    if (error || data !== 2) {
      return { status: "error", message: "Review dismissal failed." };
    }
  } catch {
    return { status: "error", message: "Review dismissal failed." };
  }

  revalidatePath(`/plans/${planId}`);
  redirect(`/plans/${planId}#plan-progression-title`);
}
