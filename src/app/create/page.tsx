import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { createClient } from "@/lib/supabase/server";
import {
  getExerciseLibrary,
  getExercisePlanningCompatibility,
  type ExerciseConstraintTag,
} from "@/modules/exercise-content/server/library";
import { getVerifiedUserId } from "@/modules/identity/server/auth";
import { getPlanningConstraintContext } from "@/modules/profile-assessment/server/assessment";

import { GuidedRoutineForm } from "./guided-routine-form";
import { RoutineForm } from "./routine-form";

export const metadata = { title: "Create" };
export const dynamic = "force-dynamic";

type CreateState =
  | "signed-out"
  | "unavailable"
  | "assessment_required"
  | "restricted_unresolved"
  | "restricted"
  | "blocked"
  | "ready";

type SubstitutionSummary = {
  sourceTitle: string;
  sourceVersionNumber: number;
  targetTitle: string;
  targetVersionNumber: number;
  guidance: string;
};

function constraintLabel(constraint: ExerciseConstraintTag) {
  switch (constraint) {
    case "surface_hand_loading":
      return "body weight supported through the hands";
    case "knee_bending":
      return "repeated knee-bending movements";
  }
}

export default async function CreatePage() {
  let state: CreateState = "unavailable";
  let constraints: ExerciseConstraintTag[] = [];

  try {
    const supabase = await createClient();
    const userId = await getVerifiedUserId(supabase);

    if (!userId) {
      state = "signed-out";
    } else {
      const planning = await getPlanningConstraintContext(supabase, userId);
      state = planning.kind;

      if (planning.kind === "ready" || planning.kind === "restricted") {
        constraints = planning.constraints;
      }
    }
  } catch {
    state = "unavailable";
  }

  let exercises: Awaited<ReturnType<typeof getExerciseLibrary>> = [];
  let substitutions: SubstitutionSummary[] = [];

  if (state === "ready" || state === "restricted") {
    try {
      const library = await getExerciseLibrary();

      if (state === "ready") {
        exercises = library;
      } else {
        const compatibility = await getExercisePlanningCompatibility(
          library.map((exercise) => exercise.id),
          constraints,
        );

        if (!compatibility || compatibility.length !== library.length) {
          state = "unavailable";
        } else {
          const byId = new Map(
            compatibility.map((exercise) => [exercise.id, exercise]),
          );

          exercises = library.filter(
            (exercise) => byId.get(exercise.id)?.compatible === true,
          );

          substitutions = compatibility.flatMap((exercise) =>
            !exercise.compatible && exercise.substitution
              ? [
                  {
                    sourceTitle: exercise.title,
                    sourceVersionNumber: exercise.versionNumber,
                    targetTitle: exercise.substitution.title,
                    targetVersionNumber: exercise.substitution.versionNumber,
                    guidance: exercise.substitution.guidance,
                  },
                ]
              : [],
          );
        }
      }
    } catch {
      state = "unavailable";
      exercises = [];
      substitutions = [];
    }
  }

  const canBuild =
    state === "ready" || (state === "restricted" && exercises.length > 0);

  return (
    <>
      <PageIntro
        eyebrow="Create"
        title="Build a routine from approved exercise versions"
      >
        <p>
          Manual routine saving uses exact exercise versions and rechecks the
          current readiness state before every save. Structured restrictions
          are matched deterministically; free-text notes are never interpreted
          into exercise compatibility.
        </p>
      </PageIntro>

      {state === "signed-out" ? (
        <section className="card" aria-labelledby="create-sign-in-title">
          <p className="status-label">Account required</p>
          <h2 id="create-sign-in-title">Sign in to save private routines</h2>
          <p>
            Saved routines are private account records and use the existing
            server-authoritative ownership boundary.
          </p>
          <div className="action-row">
            <Link className="button" href="/auth/sign-in">
              Sign in
            </Link>
            <Link className="button button-secondary" href="/auth/sign-up">
              Create account
            </Link>
          </div>
        </section>
      ) : null}

      {state === "assessment_required" ? (
        <section className="card" aria-labelledby="create-assessment-title">
          <p className="status-label">Readiness required</p>
          <h2 id="create-assessment-title">
            Complete your readiness assessment
          </h2>
          <p>
            Routine saving remains fail-closed while the current readiness
            assessment is missing or in progress.
          </p>
          <Link className="button" href="/profile/assessment">
            Open readiness assessment
          </Link>
        </section>
      ) : null}

      {state === "restricted_unresolved" ? (
        <section
          className="card card-featured"
          aria-labelledby="create-restricted-unresolved-title"
        >
          <p className="status-label">Planning restriction</p>
          <h2 id="create-restricted-unresolved-title">
            A structured movement choice is required
          </h2>
          <p>
            Your assessment records a movement restriction, but the current
            record does not contain a supported deterministic movement
            category. MeExercise will not infer one from free-text notes.
          </p>
          <Link className="button button-secondary" href="/profile/assessment">
            Review assessment
          </Link>
        </section>
      ) : null}

      {state === "restricted" ? (
        <section
          className="card card-featured"
          aria-labelledby="create-restricted-title"
        >
          <p className="status-label">Structured restriction applied</p>
          <h2 id="create-restricted-title">
            Structured movement constraints applied
          </h2>
          <p>
            The builder excludes exercise versions that conflict with the
            current structured movement choices. The current constraints are:
          </p>
          <ul>
            {constraints.map((constraint) => (
              <li key={constraint}>{constraintLabel(constraint)}</li>
            ))}
          </ul>
          <p>
            Suggested substitutions come only from existing version-owned
            substitution relationships and are never applied automatically.
          </p>
        </section>
      ) : null}

      {state === "blocked" ? (
        <section
          className="card card-featured"
          aria-labelledby="create-blocked-title"
        >
          <p className="status-label">Planning paused</p>
          <h2 id="create-blocked-title">
            Review the readiness outcome before self-directed planning
          </h2>
          <p>
            Your latest assessment blocks self-directed routine creation and
            recommends professional input. This is a conservative planning
            control, not a diagnosis or medical safety decision.
          </p>
          <Link className="button button-secondary" href="/profile/assessment">
            Review assessment
          </Link>
        </section>
      ) : null}

      {state === "unavailable" ? (
        <section className="card" aria-labelledby="create-unavailable-title">
          <p className="status-label">Unavailable</p>
          <h2 id="create-unavailable-title">
            Routine creation is not available right now
          </h2>
          <p>
            No routine data is shown or saved when account, readiness, or
            exercise-content state cannot be verified.
          </p>
        </section>
      ) : null}

      {state === "restricted" && substitutions.length > 0 ? (
        <section className="card" aria-labelledby="create-substitutions-title">
          <p className="status-label">Deterministic alternatives</p>
          <h2 id="create-substitutions-title">Compatible substitutions</h2>
          <ul>
            {substitutions.map((substitution) => (
              <li
                key={`${substitution.sourceTitle}-${substitution.sourceVersionNumber}`}
              >
                <strong>
                  {substitution.sourceTitle} — version{" "}
                  {substitution.sourceVersionNumber}
                </strong>{" "}
                →{" "}
                <strong>
                  {substitution.targetTitle} — version{" "}
                  {substitution.targetVersionNumber}
                </strong>
                <br />
                {substitution.guidance}
              </li>
            ))}
          </ul>
          <p>
            These are reviewed relationship suggestions only. Choose the
            replacement yourself in the routine slots.
          </p>
        </section>
      ) : null}

      {canBuild ? (
        <section className="card" aria-labelledby="guided-routine-title">
          <p className="status-label">Deterministic guided builder</p>
          <h2 id="guided-routine-title">Generate and review a routine proposal</h2>
          <p>
            Choose a focus and routine size. MeExercise proposes an ordered
            routine from approved compatible exact exercise versions, explains
            the proposal, then requires review of every item before save.
          </p>
          <GuidedRoutineForm />
        </section>
      ) : null}

      {canBuild ? (
        <section className="card" aria-labelledby="manual-routine-title">
          <p className="status-label">
            {state === "restricted" ? "Constrained manual builder" : "Manual builder"}
          </p>
          <h2 id="manual-routine-title">
            {state === "restricted"
              ? "Build a constrained manual routine"
              : "Build a manual routine"}
          </h2>
          <RoutineForm exercises={exercises} />
        </section>
      ) : null}

      {state === "restricted" && exercises.length === 0 ? (
        <section className="card" aria-labelledby="no-compatible-title">
          <p className="status-label">No compatible content</p>
          <h2 id="no-compatible-title">
            No approved compatible exercise versions are available
          </h2>
          <p>
            Routine saving remains paused rather than ignoring the structured
            constraint.
          </p>
        </section>
      ) : null}

      <section className="card" aria-labelledby="exercise-library-title">
        <p className="status-label">Reference</p>
        <h2 id="exercise-library-title">Browse exercise instructions first</h2>
        <p>
          The public library remains the place to inspect structured
          instructions and related variations before choosing exercises.
        </p>
        <Link className="button button-secondary" href="/exercises">
          Open exercise library
        </Link>
      </section>
    </>
  );
}
