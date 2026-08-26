"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getExercisePlanningCompatibility } from "@/modules/exercise-content/server/library";
import { getVerifiedUserId } from "@/modules/identity/server/auth";
import { getPlanningConstraintContext } from "@/modules/profile-assessment/server/assessment";

import type { CreateRoutineActionState } from "./state";

function errorState(
  message: string,
  fieldErrors?: CreateRoutineActionState["fieldErrors"],
): CreateRoutineActionState {
  return { status: "error", message, fieldErrors };
}

export async function createManualRoutineAction(
  previousState: CreateRoutineActionState,
  formData: FormData,
): Promise<CreateRoutineActionState> {
  void previousState;

  const rawTitle = formData.get("title");
  const title =
    typeof rawTitle === "string" ? rawTitle.trim().replace(/\s+/g, " ") : "";

  const submittedExerciseVersionIds = formData
    .getAll("exerciseVersionId")
    .filter(
      (value): value is string =>
        typeof value === "string" && value.length > 0,
    );

  const exerciseVersionIds = Array.from(new Set(submittedExerciseVersionIds));
  const fieldErrors: NonNullable<CreateRoutineActionState["fieldErrors"]> = {};

  if (title.length < 1 || title.length > 80) {
    fieldErrors.title = "Enter a routine title between 1 and 80 characters.";
  }

  if (
    submittedExerciseVersionIds.length < 1 ||
    submittedExerciseVersionIds.length > 12
  ) {
    fieldErrors.exercises = "Choose between 1 and 12 exercises.";
  } else if (exerciseVersionIds.length !== submittedExerciseVersionIds.length) {
    fieldErrors.exercises = "Choose each exercise only once.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return errorState("Check the highlighted routine fields.", fieldErrors);
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return errorState(
      "Routine could not be saved right now. Your selections are unchanged.",
    );
  }

  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    return errorState("Your session has expired. Sign in again before saving.");
  }

  const planning = await getPlanningConstraintContext(supabase, userId);

  if (planning.kind === "assessment_required") {
    return errorState(
      "Complete your current readiness assessment before saving a routine.",
    );
  }

  if (planning.kind === "restricted_unresolved") {
    return errorState(
      "Your assessment records movement restrictions that are not represented by supported structured choices. Review the assessment before saving.",
    );
  }

  if (planning.kind === "blocked") {
    return errorState(
      "Your latest readiness assessment blocks self-directed routine creation. Review the assessment outcome before planning.",
    );
  }

  if (planning.kind === "unavailable") {
    return errorState("Routine readiness could not be verified. Try again later.");
  }

  const compatibility = await getExercisePlanningCompatibility(
    exerciseVersionIds,
    planning.constraints,
  );

  if (!compatibility || compatibility.length !== exerciseVersionIds.length) {
    return errorState(
      "Approved exercise content could not be verified. Reload and review your selections.",
    );
  }

  if (compatibility.some((exercise) => !exercise.compatible)) {
    return errorState(
      "One or more selected exercises conflict with the current structured planning constraints.",
      {
        exercises:
          "Choose only the compatible exercise versions shown by the current builder.",
      },
    );
  }

  const { data, error } = await supabase.rpc("create_manual_routine", {
    p_title: title,
    p_exercise_version_ids: exerciseVersionIds,
  });

  if (error?.code === "23514") {
    return errorState(
      "One or more selected exercises are no longer approved or compatible. Reload and review the current choices.",
      {
        exercises:
          "Reload the current approved and compatible exercise list before saving.",
      },
    );
  }

  if (error?.code === "55000") {
    return errorState(
      "Current readiness constraints could not be satisfied. Review the readiness assessment and reload before saving.",
    );
  }

  if (error || typeof data !== "string") {
    return errorState(
      "Routine could not be saved. Reload the page and review the current planning state.",
    );
  }

  revalidatePath("/plans");
  redirect(`/routines/${data}`);
}
