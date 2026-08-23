"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/modules/identity/server/auth";
import { getPlanningReadinessGate } from "@/modules/profile-assessment/server/assessment";

import type { EditRoutineActionState } from "./state";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorState(
  message: string,
  fieldErrors?: EditRoutineActionState["fieldErrors"],
): EditRoutineActionState {
  return { status: "error", message, fieldErrors };
}

export async function editManualRoutineAction(
  previousState: EditRoutineActionState,
  formData: FormData,
): Promise<EditRoutineActionState> {
  void previousState;

  const rawRoutineId = formData.get("routineId");
  const routineId =
    typeof rawRoutineId === "string" ? rawRoutineId.trim() : "";

  const rawExpectedVersion = formData.get("expectedVersionNumber");
  const expectedVersionNumber =
    typeof rawExpectedVersion === "string" &&
    /^[1-9][0-9]*$/.test(rawExpectedVersion)
      ? Number(rawExpectedVersion)
      : Number.NaN;

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
  const fieldErrors: NonNullable<EditRoutineActionState["fieldErrors"]> = {};

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

  if (
    !UUID_PATTERN.test(routineId) ||
    !Number.isSafeInteger(expectedVersionNumber) ||
    expectedVersionNumber < 1
  ) {
    return errorState(
      "Routine editing state is invalid. Reload the routine before saving.",
    );
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

  const gate = await getPlanningReadinessGate(supabase, userId);

  if (gate === "assessment_required") {
    return errorState(
      "Complete your current readiness assessment before saving a new routine version.",
    );
  }

  if (gate === "restricted") {
    return errorState(
      "Your assessment records movement restrictions. Routine editing is paused until deterministic restriction matching is available.",
    );
  }

  if (gate === "blocked") {
    return errorState(
      "Your latest readiness assessment blocks unrestricted self-directed routine editing. Review the assessment outcome before planning.",
    );
  }

  if (gate !== "ready") {
    return errorState("Routine readiness could not be verified. Try again later.");
  }

  const { data: selectedRows, error: selectedError } = await supabase
    .from("exercise_versions")
    .select("id,status")
    .in("id", exerciseVersionIds);

  if (
    selectedError ||
    !selectedRows ||
    selectedRows.length !== exerciseVersionIds.length ||
    selectedRows.some(
      (row) => row.status !== "general" && row.status !== "reviewed",
    )
  ) {
    return errorState(
      "One or more selected exercise versions cannot be carried into a new routine version. Reload and choose currently approved content.",
      {
        exercises:
          "Use only exercise versions that are still general or reviewed.",
      },
    );
  }

  const { data, error } = await supabase.rpc("create_manual_routine_version", {
    p_routine_id: routineId,
    p_expected_version_number: expectedVersionNumber,
    p_title: title,
    p_exercise_version_ids: exerciseVersionIds,
  });

  if (error?.code === "40001") {
    return errorState(
      "This routine changed in another session. Reload before saving another version.",
    );
  }

  if (error?.code === "42501") {
    return errorState("Routine not available.");
  }

  if (error || typeof data !== "number") {
    return errorState(
      "Routine could not be saved. Reload and review the current planning state.",
    );
  }

  revalidatePath("/plans");
  revalidatePath(`/routines/${routineId}`);
  redirect(`/routines/${routineId}`);
}
