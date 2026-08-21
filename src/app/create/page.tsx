import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { createClient } from "@/lib/supabase/server";
import { getExerciseLibrary } from "@/modules/exercise-content/server/library";
import { getVerifiedUserId } from "@/modules/identity/server/auth";
import { getPlanningReadinessGate } from "@/modules/profile-assessment/server/assessment";

import { RoutineForm } from "./routine-form";

export const metadata = { title: "Create" };
export const dynamic = "force-dynamic";

export default async function CreatePage() {
  let state:
    | "signed-out"
    | "unavailable"
    | "assessment_required"
    | "restricted"
    | "blocked"
    | "ready" = "unavailable";

  try {
    const supabase = await createClient();
    const userId = await getVerifiedUserId(supabase);

    if (!userId) {
      state = "signed-out";
    } else {
      state = await getPlanningReadinessGate(supabase, userId);
    }
  } catch {
    state = "unavailable";
  }

  let exercises: Awaited<ReturnType<typeof getExerciseLibrary>> = [];

  if (state === "ready") {
    try {
      exercises = await getExerciseLibrary();
    } catch {
      state = "unavailable";
    }
  }

  return (
    <>
      <PageIntro eyebrow="Create" title="Build a routine from approved exercise versions">
        <p>
          This first PH-04 builder is manual. It stores the exact exercise versions you choose so later content updates cannot silently change the saved routine.
        </p>
      </PageIntro>

      {state === "signed-out" ? (
        <section className="card" aria-labelledby="create-sign-in-title">
          <p className="status-label">Account required</p>
          <h2 id="create-sign-in-title">Sign in to save private routines</h2>
          <p>Saved routines are private account records and use the existing server-authoritative ownership boundary.</p>
          <div className="action-row">
            <Link className="button" href="/auth/sign-in">Sign in</Link>
            <Link className="button button-secondary" href="/auth/sign-up">Create account</Link>
          </div>
        </section>
      ) : null}

      {state === "assessment_required" ? (
        <section className="card" aria-labelledby="create-assessment-title">
          <p className="status-label">Readiness required</p>
          <h2 id="create-assessment-title">Complete your readiness assessment</h2>
          <p>
            Routine saving is fail-closed while the readiness assessment is missing or in progress. Complete it before creating a routine.
          </p>
          <Link className="button" href="/profile/assessment">Open readiness assessment</Link>
        </section>
      ) : null}

      {state === "restricted" ? (
        <section className="card card-featured" aria-labelledby="create-restricted-title">
          <p className="status-label">Planning restriction</p>
          <h2 id="create-restricted-title">Deterministic restriction matching is required first</h2>
          <p>
            Your assessment records areas or movements to account for. This first manual slice will not save an unrestricted routine before PH-04 can deterministically validate those restrictions against exercise content.
          </p>
          <Link className="button button-secondary" href="/profile/assessment">Review assessment</Link>
        </section>
      ) : null}

      {state === "blocked" ? (
        <section className="card card-featured" aria-labelledby="create-blocked-title">
          <p className="status-label">Planning paused</p>
          <h2 id="create-blocked-title">Review the readiness outcome before self-directed planning</h2>
          <p>
            Your latest assessment blocks unrestricted routine creation and recommends professional input. This is a conservative planning control, not a diagnosis or medical safety decision.
          </p>
          <Link className="button button-secondary" href="/profile/assessment">Review assessment</Link>
        </section>
      ) : null}

      {state === "unavailable" ? (
        <section className="card" aria-labelledby="create-unavailable-title">
          <p className="status-label">Unavailable</p>
          <h2 id="create-unavailable-title">Routine creation is not available right now</h2>
          <p>No routine data is shown or saved when account, readiness, or exercise-content state cannot be verified.</p>
        </section>
      ) : null}

      {state === "ready" ? (
        <section className="card" aria-labelledby="manual-routine-title">
          <p className="status-label">Manual builder</p>
          <h2 id="manual-routine-title">Build a manual routine</h2>
          <RoutineForm exercises={exercises} />
        </section>
      ) : null}

      <section className="card" aria-labelledby="exercise-library-title">
        <p className="status-label">Reference</p>
        <h2 id="exercise-library-title">Browse exercise instructions first</h2>
        <p>The public library remains the place to inspect the structured instructions and related variations before choosing exercises.</p>
        <Link className="button button-secondary" href="/exercises">Open exercise library</Link>
      </section>
    </>
  );
}
