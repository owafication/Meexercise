import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { getRoutineListPageState } from "@/modules/planning/server/routines";

export const metadata = {
  title: "Plans",
};

export const dynamic = "force-dynamic";

function savedDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default async function PlansPage() {
  const state = await getRoutineListPageState();

  return (
    <>
      <PageIntro eyebrow="Plans" title="Your saved routines">
        <p>
          Saved routine versions keep exact exercise-version references. Plans, schedules and progression remain later PH-04/PH-05 work.
        </p>
      </PageIntro>

      {state.kind === "signed-out" ? (
        <section className="card" aria-labelledby="plans-sign-in-title">
          <p className="status-label">Account required</p>
          <h2 id="plans-sign-in-title">Sign in to view saved routines</h2>
          <Link className="button" href="/auth/sign-in">Sign in</Link>
        </section>
      ) : null}

      {state.kind === "unavailable" ? (
        <section className="card" aria-labelledby="plans-unavailable-title">
          <p className="status-label">Unavailable</p>
          <h2 id="plans-unavailable-title">Saved routines are not available right now</h2>
          <p>No private routine data is shown when ownership or storage state cannot be verified.</p>
        </section>
      ) : null}

      {state.kind === "authenticated" && state.routines.length === 0 ? (
        <section className="empty-state" aria-labelledby="plans-empty-title">
          <h2 id="plans-empty-title">No routines yet</h2>
          <p>Create a manual routine from approved exercise versions.</p>
          <Link className="text-link" href="/create">Create a routine</Link>
        </section>
      ) : null}

      {state.kind === "authenticated" && state.routines.length > 0 ? (
        <div className="card-grid">
          {state.routines.map((routine) => (
            <article className="card" key={routine.id}>
              <p className="status-label">Routine · version {routine.versionNumber}</p>
              <h2>{routine.title}</h2>
              <p>
                {routine.itemCount} {routine.itemCount === 1 ? "exercise" : "exercises"} · saved {savedDate(routine.createdAt)}
              </p>
              <Link className="button button-secondary" href={`/routines/${routine.id}`}>
                View routine
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </>
  );
}
