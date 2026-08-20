import Link from "next/link";
import { notFound } from "next/navigation";

import { PageIntro } from "@/components/page-intro";
import {
  getExerciseDetail,
  type ExerciseSideRule,
} from "@/modules/exercise-content/server/library";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ exerciseKey: string }>;
  searchParams: Promise<{ version?: string | string[] }>;
};

function relationLabel(value: string) {
  return value.replaceAll("_", " ");
}

function sideRuleLabel(value: ExerciseSideRule) {
  switch (value) {
    case "bilateral":
      return "Both sides together";
    case "unilateral":
      return "One side at a time";
    case "per_side":
      return "Repeat per side";
    case "alternating":
      return "Alternate sides";
    default:
      return "Not applicable";
  }
}

function parseRequestedVersion(value: string | string[] | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export default async function ExerciseDetailPage({ params, searchParams }: Props) {
  const { exerciseKey } = await params;
  const { version } = await searchParams;
  const requestedVersion = parseRequestedVersion(version);

  if (requestedVersion === null) {
    notFound();
  }

  const exercise = await getExerciseDetail(exerciseKey, requestedVersion);

  if (!exercise) {
    notFound();
  }

  return (
    <>
      <PageIntro eyebrow={`Exercise · version ${exercise.versionNumber}`} title={exercise.title}>
        <p>{exercise.summary}</p>
      </PageIntro>

      <div className="action-row">
        <Link className="button button-secondary" href="/exercises">Back to exercise library</Link>
      </div>

      <section className="card" aria-labelledby="exercise-purpose-title">
        <p className="status-label">{exercise.status}</p>
        <h2 id="exercise-purpose-title">Purpose and setup</h2>
        <p>{exercise.purpose}</p>
        <h3>Setup</h3>
        <p>{exercise.setup}</p>
        <p><strong>Target:</strong> {exercise.targetAreas.join(", ")}</p>
        <p><strong>Equipment:</strong> {exercise.equipment.length ? exercise.equipment.join(", ") : "None"}</p>
        <p><strong>Side rule:</strong> {sideRuleLabel(exercise.sideRule)}</p>
      </section>

      <section className="card" aria-labelledby="exercise-steps-title">
        <h2 id="exercise-steps-title">Steps</h2>
        <ol className="instruction-list">
          {exercise.steps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}
        </ol>
        {exercise.cues.length ? (
          <>
            <h3>Cues</h3>
            <ul className="instruction-list">{exercise.cues.map((cue) => <li key={cue}>{cue}</li>)}</ul>
          </>
        ) : null}
      </section>

      <section className="card" aria-labelledby="exercise-dosage-title">
        <h2 id="exercise-dosage-title">Dosage and common errors</h2>
        <p>{exercise.dosageGuidance}</p>
        {exercise.commonErrors.length ? (
          <>
            <h3>Common errors</h3>
            <ul className="instruction-list">{exercise.commonErrors.map((item) => <li key={item}>{item}</li>)}</ul>
          </>
        ) : null}
      </section>

      <section className="card" aria-labelledby="exercise-safety-title">
        <h2 id="exercise-safety-title">Safety notes</h2>
        {exercise.safetyNotes.length ? (
          <ul className="instruction-list">{exercise.safetyNotes.map((item) => <li key={item}>{item}</li>)}</ul>
        ) : <p>No additional safety notes are recorded for this version.</p>}
      </section>

      <section className="card" aria-labelledby="exercise-accessible-title">
        <h2 id="exercise-accessible-title">Plain-language description</h2>
        <p>{exercise.accessibleText}</p>
      </section>

      {exercise.relations.length ? (
        <section className="card" aria-labelledby="exercise-variations-title">
          <h2 id="exercise-variations-title">Related variations</h2>
          <ul className="relation-list">
            {exercise.relations.map((relation) => (
              <li key={`${relation.relationType}-${relation.target.exerciseKey}-${relation.target.versionNumber}`}>
                <strong>{relationLabel(relation.relationType)}:</strong>{" "}
                <Link href={`/exercises/${relation.target.exerciseKey}?version=${relation.target.versionNumber}`}>
                  {relation.target.title}
                </Link>{" "}
                (version {relation.target.versionNumber}). {relation.guidance}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
