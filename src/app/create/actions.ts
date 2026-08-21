"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getExerciseLibrary } from "@/modules/exercise-content/server/library";
import { getVerifiedUserId } from "@/modules/identity/server/auth";
import { getPlanningReadinessGate } from "@/modules/profile-assessment/server/assessment";

import type { CreateRoutineActionState } from "./state";

function errorState(
  message: string,
  fieldErrors?: CreateRoutineActionState["fieldErrors"],
): CreateRoutineActionState {
  return {
    status: "error",
    message,
    fieldErrors,
  };
}

export async function createManualRoutineAction(
  previousState: CreateRoutineActionState,
  formData: FormData,
): Promise<CreateRoutineActionState> {
  void previousState;

  const rawTitle = formData.get("title");
  const title = typeof rawTitle === "string" ? rawTitle.trim().replace(/\s+/g, " ") : "";

  const exerciseVersionIds = Array.from(
    new Set(
      formData
        .getAll("exerciseVersionId")
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );

  const fieldErrors: NonNullable<CreateRoutineActionState["fieldErrors"]> = {};

  if (title.length < 1 || title.length > 80) {
    fieldErrors.title = "Enter a routine title between 1 and 80 characters.";
  }

  if (exerciseVersionIds.length < 1 || exerciseVersionIds.length > 12) {
    fieldErrors.exercises = "Choose between 1 and 12 exercises.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return errorState("Check the highlighted routine fields.", fieldErrors);
  }

  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return errorState("Routine could not be saved right now. Your selections are unchanged.");
  }

  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    return errorState("Your session has expired. Sign in again before saving.");
  }

  const gate = await getPlanningReadinessGate(supabase, userId);

  if (gate === "assessment_required") {
    return errorState("Complete your current readiness assessment before saving a routine.");
  }

  if (gate === "restricted") {
    return errorState(
      "Your assessment records movement restrictions. Routine saving is paused until deterministic restriction matching is available.",
    );
  }

  if (gate === "blocked") {
    return errorState(
      "Your latest readiness assessment blocks unrestricted self-directed routine creation. Review the assessment outcome before planning.",
    );
  }

  if (gate !== "ready") {
    return errorState("Routine readiness could not be verified. Try again later.");
  }

  let library;

  try {
    library = await getExerciseLibrary();
  } catch {
    return errorState("Approved exercise content could not be verified. Try again later.");
  }

  const allowedIds = new Set(library.map((exercise) => exercise.id));

  if (exerciseVersionIds.some((id) => !allowedIds.has(id))) {
    return errorState(
      "One or more selected exercises are no longer available for a new routine. Reload and review your selections.",
      { exercises: "Reload the current approved exercise list before saving." },
    );
  }

  const { data, error } = await supabase.rpc("create_manual_routine", {
    p_title: title,
    p_exercise_version_ids: exerciseVersionIds,
  });

  if (error || typeof data !== "string") {
    return errorState("Routine could not be saved. Reload the page and review the current planning state.");
  }

  revalidatePath("/plans");
  redirect(`/routines/${data}`);
}
