import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { getExerciseLibrary } from "@/modules/exercise-content/server/library";

export const dynamic = "force-dynamic";
export const metadata = { title: "Exercise library" };

type Props = {
  searchParams: Promise<{ q?: string; equipment?: string; target?: string }>;
};

function normalise(value: string | undefined) {
  return value?.trim().toLocaleLowerCase() ?? "";
}

export default async function ExerciseLibraryPage({ searchParams }: Props) {
  const params = await searchParams;
  const exercises = await getExerciseLibrary();

  const query = normalise(params.q);
  const equipmentFilter = normalise(params.equipment);
  const targetFilter = normalise(params.target);

  const equipmentOptions = Array.from(new Set(exercises.flatMap((x) => x.equipment)))
    .sort((a,b) => a.localeCompare(b));
  const targetOptions = Array.from(new Set(exercises.flatMap((x) => x.targetAreas)))
    .sort((a,b) => a.localeCompare(b));

  const filtered = exercises.filter((exercise) => {
    const searchable = [
      exercise.title,
      exercise.summary,
      ...exercise.targetAreas,
      ...exercise.equipment,
    ].join(" ").toLocaleLowerCase();

    return (
      (!query || searchable.includes(query)) &&
      (!equipmentFilter || exercise.equipment.some((x) => x.toLocaleLowerCase() === equipmentFilter)) &&
      (!targetFilter || exercise.targetAreas.some((x) => x.toLocaleLowerCase() === targetFilter))
    );
  });

  return (
    <>
      <PageIntro eyebrow="Exercise library" title="Approved structured content">
        <p>
          Browse the currently available general-wellness exercise versions.
          Draft, withdrawn, restricted, and future professional-only content is not exposed here.
        </p>
      </PageIntro>

      <section className="card" aria-labelledby="exercise-filter-title">
        <p className="status-label">Find an exercise</p>
        <h2 id="exercise-filter-title">Search and filter</h2>

        <form className="exercise-filter-grid" method="get" action="/exercises">
          <div className="field">
            <label htmlFor="exercise-search">Search</label>
            <input id="exercise-search" name="q" type="search" defaultValue={params.q ?? ""} placeholder="Name, purpose, area, or equipment" />
          </div>

          <div className="field">
            <label htmlFor="exercise-equipment">Equipment</label>
            <select id="exercise-equipment" name="equipment" defaultValue={params.equipment ?? ""}>
              <option value="">Any equipment</option>
              {equipmentOptions.map((equipment) => (
                <option key={equipment} value={equipment}>{equipment}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="exercise-target">Target area</label>
            <select id="exercise-target" name="target" defaultValue={params.target ?? ""}>
              <option value="">Any target area</option>
              {targetOptions.map((target) => (
                <option key={target} value={target}>{target}</option>
              ))}
            </select>
          </div>

          <div className="action-row">
            <button className="button" type="submit">Apply filters</button>
            <Link className="button button-secondary" href="/exercises">Clear</Link>
          </div>
        </form>
      </section>

      <p className="library-result-count" role="status">
        {filtered.length} {filtered.length === 1 ? "exercise" : "exercises"}
      </p>

      {filtered.length > 0 ? (
        <div className="card-grid">
          {filtered.map((exercise) => (
            <article className="card" key={exercise.id}>
              <p className="status-label">Version {exercise.versionNumber} · {exercise.status}</p>
              <h2>{exercise.title}</h2>
              <p>{exercise.summary}</p>
              <p><strong>Target:</strong> {exercise.targetAreas.join(", ")}</p>
              <p><strong>Equipment:</strong> {exercise.equipment.length ? exercise.equipment.join(", ") : "None"}</p>
              <Link className="text-link" href={`/exercises/${exercise.exerciseKey}`}>View instructions</Link>
            </article>
          ))}
        </div>
      ) : (
        <section className="empty-state" aria-labelledby="no-exercises-title">
          <h2 id="no-exercises-title">No exercises match these filters</h2>
          <p>Clear or change the filters to browse the available library.</p>
        </section>
      )}
    </>
  );
}
