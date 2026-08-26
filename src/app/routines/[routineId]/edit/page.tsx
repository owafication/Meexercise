import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { createClient } from "@/lib/supabase/server";
import {
  getExerciseLibrary,
  getExercisePlanningCompatibility,
  type ExerciseConstraintTag,
} from "@/modules/exercise-content/server/library";
import { getVerifiedUserId } from "@/modules/identity/server/auth";
import {
  getRoutineDetailPageState,
  type RoutineExerciseSnapshot,
} from "@/modules/planning/server/routines";
import type { RoutineExerciseSlotOption } from "@/modules/planning/routine-exercise-slots";
import {
  getPlanningConstraintContext,
  type PlanningConstraintContext,
} from "@/modules/profile-assessment/server/assessment";

import { EditRoutineForm } from "./edit-form";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ routineId: string }>;
};

function unavailableLabel(exercise: RoutineExerciseSnapshot) {
  return `${exercise.title} — version ${exercise.versionNumber} (${exercise.status.replaceAll("_", " ")})`;
}

function constraintLabel(constraint: ExerciseConstraintTag) {
  switch (constraint) {
    case "surface_hand_loading":
      return "body weight supported through the hands";
    case "knee_bending":
      return "repeated knee-bending movements";
  }
}

export default async function EditRoutinePage({ params }: Props) {
  const { routineId } = await params;
  const state = await getRoutineDetailPageState(routineId);

  if (state.kind === "signed-out") {
    return (
      <>
        <PageIntro eyebrow="Edit routine" title="Sign in to edit this routine">
          <p>Saved routines are private account data.</p>
        </PageIntro>
        <Link className="button" href="/auth/sign-in">
          Sign in
        </Link>
      </>
    );
  }

  if (state.kind === "not-found") {
    return (
      <>
        <PageIntro eyebrow="Edit routine" title="Routine not available">
          <p>The routine does not exist or is not owned by the current account.</p>
        </PageIntro>
        <Link className="button button-secondary" href="/plans">
          Back to Plans
        </Link>
      </>
    );
  }

  if (state.kind === "unavailable") {
    return (
      <>
        <PageIntro eyebrow="Edit routine" title="Routine not available">
          <p>
            Routine ownership or historical exercise-version data could not be
            verified right now.
          </p>
        </PageIntro>
        <Link className="button button-secondary" href="/plans">
          Back to Plans
        </Link>
      </>
    );
  }

  let planning: PlanningConstraintContext = { kind: "unavailable" };

  try {
    const supabase = await createClient();
    const userId = await getVerifiedUserId(supabase);

    if (userId) {
      planning = await getPlanningConstraintContext(supabase, userId);
    }
  } catch {
    planning = { kind: "unavailable" };
  }

  if (planning.kind === "assessment_required") {
    return (
      <>
        <PageIntro eyebrow="Edit routine" title="Complete your readiness assessment">
          <p>
            Routine editing remains paused while the current readiness
            assessment is missing or in progress.
          </p>
        </PageIntro>
        <Link className="button" href="/profile/assessment">
          Open readiness assessment
        </Link>
      </>
    );
  }

  if (planning.kind === "restricted_unresolved") {
    return (
      <>
        <PageIntro eyebrow="Edit routine" title="A structured movement choice is required">
          <p>
            The current assessment records a movement restriction that is not
            represented by supported structured choices. MeExercise will not
            infer compatibility from free-text notes.
          </p>
        </PageIntro>
        <Link className="button button-secondary" href="/profile/assessment">
          Review assessment
        </Link>
      </>
    );
  }

  if (planning.kind === "blocked") {
    return (
      <>
        <PageIntro eyebrow="Edit routine" title="Self-directed planning is paused">
          <p>
            The current readiness outcome blocks self-directed routine editing.
            Review the assessment outcome before planning.
          </p>
        </PageIntro>
        <Link className="button button-secondary" href="/profile/assessment">
          Review assessment
        </Link>
      </>
    );
  }

  if (planning.kind === "unavailable") {
    return (
      <>
        <PageIntro eyebrow="Edit routine" title="Routine editing unavailable">
          <p>The current readiness state could not be verified.</p>
        </PageIntro>
        <Link className="button button-secondary" href={`/routines/${routineId}`}>
          Back to routine
        </Link>
      </>
    );
  }

  const constraints: ExerciseConstraintTag[] = planning.constraints;

  let library;
  try {
    library = await getExerciseLibrary();
  } catch {
    return (
      <>
        <PageIntro eyebrow="Edit routine" title="Routine editing unavailable">
          <p>The current approved exercise catalogue could not be verified.</p>
        </PageIntro>
        <Link className="button button-secondary" href={`/routines/${routineId}`}>
          Back to routine
        </Link>
      </>
    );
  }

  const currentItems = state.routine.sections.flatMap((section) => section.items);
  const allIds = Array.from(
    new Set([
      ...library.map((exercise) => exercise.id),
      ...currentItems.map((item) => item.exerciseVersion.id),
    ]),
  );

  const compatibility = await getExercisePlanningCompatibility(
    allIds,
    constraints,
  );

  if (!compatibility || compatibility.length !== allIds.length) {
    return (
      <>
        <PageIntro eyebrow="Edit routine" title="Routine editing unavailable">
          <p>
            Exact exercise-version compatibility could not be verified right
            now.
          </p>
        </PageIntro>
        <Link className="button button-secondary" href={`/routines/${routineId}`}>
          Back to routine
        </Link>
      </>
    );
  }

  const compatibilityById = new Map(
    compatibility.map((exercise) => [exercise.id, exercise]),
  );
  const optionMap = new Map<string, RoutineExerciseSlotOption>();

  for (const exercise of library) {
    if (compatibilityById.get(exercise.id)?.compatible) {
      optionMap.set(exercise.id, {
        id: exercise.id,
        title: exercise.title,
        versionNumber: exercise.versionNumber,
      });
    }
  }

  for (const item of currentItems) {
    const exercise = item.exerciseVersion;
    const planningStatus = compatibilityById.get(exercise.id);

    if (
      planningStatus?.compatible &&
      (exercise.status === "general" || exercise.status === "reviewed") &&
      !optionMap.has(exercise.id)
    ) {
      optionMap.set(exercise.id, {
        id: exercise.id,
        title: exercise.title,
        versionNumber: exercise.versionNumber,
      });
    }
  }

  const options = Array.from(optionMap.values()).sort(
    (left, right) =>
      left.title.localeCompare(right.title) ||
      right.versionNumber - left.versionNumber,
  );

  const optionIds = new Set(options.map((option) => option.id));
  const selectedIds = currentItems.map((item) =>
    optionIds.has(item.exerciseVersion.id) ? item.exerciseVersion.id : "",
  );

  const unavailableItems = currentItems.flatMap((item) => {
    const exercise = item.exerciseVersion;
    const planningStatus = compatibilityById.get(exercise.id);

    if (optionIds.has(exercise.id)) {
      return [];
    }

    if (exercise.status !== "general" && exercise.status !== "reviewed") {
      return [unavailableLabel(exercise)];
    }

    if (!planningStatus?.compatible) {
      const suggestion = planningStatus?.substitution
        ? ` Suggested substitution: ${planningStatus.substitution.title} — version ${planningStatus.substitution.versionNumber}.`
        : " No compatible reviewed substitution relation is currently available.";

      return [
        `${exercise.title} — version ${exercise.versionNumber} conflicts with the current structured movement constraints.${suggestion}`,
      ];
    }

    return [unavailableLabel(exercise)];
  });

  return (
    <>
      <PageIntro
        eyebrow={`Edit routine · current version ${state.routine.versionNumber}`}
        title={`Edit ${state.routine.title}`}
      >
        <p>
          Saving creates version {state.routine.versionNumber + 1}. The current
          version remains unchanged in routine history and export.
        </p>
      </PageIntro>

      {planning.kind === "restricted" ? (
        <section className="card card-featured" aria-labelledby="edit-constraints-title">
          <p className="status-label">Structured restriction applied</p>
          <h2 id="edit-constraints-title">Current movement constraints</h2>
          <ul>
            {constraints.map((constraint) => (
              <li key={constraint}>{constraintLabel(constraint)}</li>
            ))}
          </ul>
          <p>
            Incompatible exercise versions are removed from editable slots.
            Existing substitution relationships are suggestions only and are
            never applied automatically.
          </p>
        </section>
      ) : null}

      <section className="card" aria-labelledby="edit-routine-form-title">
        <p className="status-label">Append-only edit</p>
        <h2 id="edit-routine-form-title">Create the next routine version</h2>
        <EditRoutineForm
          routineId={state.routine.id}
          expectedVersionNumber={state.routine.versionNumber}
          title={state.routine.title}
          options={options}
          selectedIds={selectedIds}
          unavailableItems={unavailableItems}
        />
      </section>

      <div className="action-row">
        <Link className="button button-secondary" href={`/routines/${routineId}`}>
          Cancel
        </Link>
        <Link className="button button-secondary" href="/exercises">
          Browse exercise library
        </Link>
      </div>
    </>
  );
}
