"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  getExerciseDetail,
  getExerciseLibrary,
  getExercisePlanningCompatibility,
} from "@/modules/exercise-content/server/library";
import { getVerifiedUserId } from "@/modules/identity/server/auth";
import {
  guidedFocusLabel,
  replacementOptionsForCandidate,
  selectGuidedRoutineCandidates,
  type GuidedExerciseCandidate,
  type GuidedRoutineActionState,
  type GuidedRoutineFocus,
} from "@/modules/planning/generator";
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
const GUIDED_FOCUS_VALUES = new Set<GuidedRoutineFocus>([
  "balanced",
  "upper_body",
  "lower_body",
]);

function guidedError(message: string): GuidedRoutineActionState {
  return { status: "error", message };
}

function parseGuidedFocus(value: FormDataEntryValue | null) {
  return typeof value === "string" &&
    GUIDED_FOCUS_VALUES.has(value as GuidedRoutineFocus)
    ? (value as GuidedRoutineFocus)
    : null;
}

function parseGuidedItemCount(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^[1-6]$/.test(value)) {
    return null;
  }

  return Number(value);
}

export async function generateGuidedRoutineAction(
  previousState: GuidedRoutineActionState,
  formData: FormData,
): Promise<GuidedRoutineActionState> {
  void previousState;

  const focus = parseGuidedFocus(formData.get("guidedFocus"));
  const itemCount = parseGuidedItemCount(formData.get("guidedItemCount"));

  if (!focus || !itemCount) {
    return guidedError(
      "Choose a guided focus and a routine size between 1 and 6 items.",
    );
  }

  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return guidedError(
      "Guided routine state could not be verified. Try again later.",
    );
  }

  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    return guidedError("Sign in before generating a private routine proposal.");
  }

  const planning = await getPlanningConstraintContext(supabase, userId);

  if (planning.kind === "assessment_required") {
    return guidedError(
      "Complete your current readiness assessment before generating a routine.",
    );
  }

  if (planning.kind === "restricted_unresolved") {
    return guidedError(
      "Your movement restriction is not represented by supported structured choices. Review the assessment before generating.",
    );
  }

  if (planning.kind === "blocked") {
    return guidedError(
      "Your latest readiness assessment blocks self-directed routine generation.",
    );
  }

  if (planning.kind === "unavailable") {
    return guidedError(
      "Current readiness could not be verified. Try again later.",
    );
  }

  let library;

  try {
    library = await getExerciseLibrary();
  } catch {
    return guidedError(
      "Approved exercise content could not be loaded for generation.",
    );
  }

  const compatibility = await getExercisePlanningCompatibility(
    library.map((exercise) => exercise.id),
    planning.constraints,
  );

  if (!compatibility || compatibility.length !== library.length) {
    return guidedError(
      "Approved exercise compatibility could not be verified.",
    );
  }

  const compatibleIds = new Set(
    compatibility
      .filter((exercise) => exercise.compatible)
      .map((exercise) => exercise.id),
  );

  const candidates: GuidedExerciseCandidate[] = library
    .filter((exercise) => compatibleIds.has(exercise.id))
    .map((exercise) => ({
      id: exercise.id,
      exerciseKey: exercise.exerciseKey,
      versionNumber: exercise.versionNumber,
      title: exercise.title,
      summary: exercise.summary,
      purpose: exercise.purpose,
      targetAreas: exercise.targetAreas,
      equipment: exercise.equipment,
    }));

  const selected = selectGuidedRoutineCandidates(
    candidates,
    focus,
    itemCount,
  );

  if (!selected) {
    return guidedError(
      "There are not enough approved compatible exercise versions for that focus and routine size. Choose a smaller routine or another focus.",
    );
  }

  const compatibleKeyVersions = new Set(
    candidates.map(
      (candidate) =>
        `${candidate.exerciseKey}:${candidate.versionNumber}`,
    ),
  );

  const items = await Promise.all(
    selected.map(async (candidate) => {
      let substitutionNotes: string[] = [];

      try {
        const detail = await getExerciseDetail(
          candidate.exerciseKey,
          candidate.versionNumber,
        );

        substitutionNotes =
          detail?.relations
            .filter(
              (relation) =>
                relation.relationType === "substitution" &&
                compatibleKeyVersions.has(
                  `${relation.target.exerciseKey}:${relation.target.versionNumber}`,
                ),
            )
            .map(
              (relation) =>
                `${relation.target.title} — version ${relation.target.versionNumber}: ${relation.guidance}`,
            ) ?? [];
      } catch {
        substitutionNotes = [];
      }

      return {
        ...candidate,
        primaryTargetArea: candidate.targetAreas[0] ?? "General",
        replacementOptions: replacementOptionsForCandidate(
          candidate,
          candidates,
        ),
        substitutionNotes,
      };
    }),
  );

  const targetAreas = Array.from(
    new Set(items.map((item) => item.primaryTargetArea)),
  ).sort();

  const focusLabel = guidedFocusLabel(focus);

  return {
    status: "proposal",
    proposal: {
      title: `Guided ${focusLabel.toLowerCase()} routine`,
      focus,
      itemCount,
      purposeExplanation:
        `This ${itemCount}-item proposal uses only current approved exact exercise versions for a self-directed general-wellness ${focusLabel.toLowerCase()} routine.`,
      balanceExplanation:
        focus === "balanced"
          ? `The deterministic selector rotates across available target-area groups where possible. This proposal covers: ${targetAreas.join(", ")}.`
          : `Every proposed item matches the ${focusLabel.toLowerCase()} target-area focus. The routine keeps the requested item count and order during review.`,
      constraintExplanation:
        planning.constraints.length === 0
          ? "No supported structured movement constraint is active in the current readiness assessment. The final save still rechecks current readiness and exact-version approval."
          : `The proposal excludes exact exercise versions that conflict with the current structured movement constraints: ${planning.constraints.join(", ")}. Free-text notes are not interpreted.`,
      substitutionExplanation:
        "Every proposed item can be replaced before saving while preserving its target-area slot. Reviewed substitution notes are shown only when the exact source version has a currently compatible substitution relation. No replacement is automatic.",
      items,
    },
  };
}
