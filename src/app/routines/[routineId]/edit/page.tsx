import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { getExerciseLibrary } from "@/modules/exercise-content/server/library";
import {
  getRoutineDetailPageState,
  type RoutineExerciseSnapshot,
} from "@/modules/planning/server/routines";
import type { RoutineExerciseSlotOption } from "@/modules/planning/routine-exercise-slots";

import { EditRoutineForm } from "./edit-form";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ routineId: string }>;
};

function unavailableLabel(exercise: RoutineExerciseSnapshot) {
  return `${exercise.title} — version ${exercise.versionNumber} (${exercise.status.replaceAll("_", " ")})`;
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
          <p>Routine ownership or historical exercise-version data could not be verified right now.</p>
        </PageIntro>
        <Link className="button button-secondary" href="/plans">
          Back to Plans
        </Link>
      </>
    );
  }

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
  const optionMap = new Map<string, RoutineExerciseSlotOption>();

  for (const exercise of library) {
    optionMap.set(exercise.id, {
      id: exercise.id,
      title: exercise.title,
      versionNumber: exercise.versionNumber,
    });
  }

  for (const item of currentItems) {
    const exercise = item.exerciseVersion;
    if (
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

  const unavailableItems = currentItems
    .filter((item) => !optionIds.has(item.exerciseVersion.id))
    .map((item) => unavailableLabel(item.exerciseVersion));

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
