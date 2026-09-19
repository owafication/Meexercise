import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { getPlanListPageState } from "@/modules/planning/server/plans";
import { getRoutineListPageState } from "@/modules/planning/server/routines";
import { getRoutineTemplateListPageState } from "@/modules/planning/server/templates";

import { CreatePlanForm } from "./plan-controls";
import {
  CreateRoutineFromTemplateForm,
  SaveRoutineTemplateForm,
} from "./template-controls";

export const metadata = { title: "Plans" };
export const dynamic = "force-dynamic";

const savedDate = (value: string) =>
  new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(
    new Date(value),
  );

export default async function PlansPage() {
  const [planState, routineState, templateState] = await Promise.all([
    getPlanListPageState(),
    getRoutineListPageState(),
    getRoutineTemplateListPageState(),
  ]);

  const signedOut =
    planState.kind === "signed-out" ||
    routineState.kind === "signed-out" ||
    templateState.kind === "signed-out";

  const unavailable =
    planState.kind === "unavailable" ||
    routineState.kind === "unavailable" ||
    templateState.kind === "unavailable";

  return (
    <>
      <PageIntro eyebrow="Plans" title="Your saved routines">
        <p>
          Saved plans pin exact routine versions. Saved routine versions pin
          exact exercise versions. Editing either creates a new immutable
          version instead of rewriting history.
        </p>
      </PageIntro>

      {signedOut ? (
        <section className="card">
          <h2>Sign in to view saved plans, routines and templates</h2>
          <Link className="button" href="/auth/sign-in">
            Sign in
          </Link>
        </section>
      ) : null}

      {!signedOut && unavailable ? (
        <section className="card">
          <h2>Saved planning data is not available right now</h2>
        </section>
      ) : null}

      {!signedOut &&
      !unavailable &&
      planState.kind === "authenticated" &&
      routineState.kind === "authenticated" &&
      templateState.kind === "authenticated" ? (
        <>
          <section className="form-stack" aria-labelledby="saved-plans-title">
            <div>
              <p className="status-label">Plans - free</p>
              <h2 id="saved-plans-title">Saved plans</h2>
              <p>
                Plans are durable versioned compositions of exact routine
                snapshots. Scheduling and progression are added later in PH-05.
              </p>
            </div>

            {routineState.routines.length > 0 ? (
              <div className="card">
                <h3>Create a plan from saved routines</h3>
                <CreatePlanForm
                  routines={routineState.routines.map((routine) => ({
                    routineId: routine.id,
                    versionId: routine.versionId,
                    title: routine.title,
                    versionNumber: routine.versionNumber,
                  }))}
                />
              </div>
            ) : null}

            {planState.plans.length === 0 ? (
              <div className="empty-state">
                <h3>No plans yet</h3>
                <p>
                  Save at least one routine, then combine exact routine
                  snapshots into a plan.
                </p>
              </div>
            ) : (
              <div className="card-grid">
                {planState.plans.map((plan) => (
                  <article className="card" key={plan.id}>
                    <p className="status-label">
                      Plan - version {plan.versionNumber}
                    </p>
                    <h3>{plan.title}</h3>
                    <p>
                      {plan.routineCount}{" "}
                      {plan.routineCount === 1 ? "routine" : "routines"} -
                      saved {savedDate(plan.createdAt)}
                    </p>
                    <Link
                      className="button button-secondary"
                      href={`/plans/${plan.id}`}
                    >
                      View plan
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="form-stack" aria-labelledby="saved-routines-title">
            <div>
              <p className="status-label">Routines</p>
              <h2 id="saved-routines-title">Saved routines</h2>
            </div>

            {routineState.routines.length === 0 ? (
              <div className="empty-state">
                <h3>No routines yet</h3>
                <p>
                  Create a manual or guided routine from approved exercise
                  versions.
                </p>
                <Link className="text-link" href="/create">
                  Create a routine
                </Link>
              </div>
            ) : (
              <div className="card-grid">
                {routineState.routines.map((routine) => (
                  <article className="card" key={routine.id}>
                    <p className="status-label">
                      Routine - version {routine.versionNumber}
                    </p>
                    <h3>{routine.title}</h3>
                    <p>
                      {routine.itemCount}{" "}
                      {routine.itemCount === 1 ? "exercise" : "exercises"} -
                      saved {savedDate(routine.createdAt)}
                    </p>
                    <Link
                      className="button button-secondary"
                      href={`/routines/${routine.id}`}
                    >
                      View routine
                    </Link>
                    <SaveRoutineTemplateForm
                      routineId={routine.id}
                      routineTitle={routine.title}
                    />
                  </article>
                ))}
              </div>
            )}
          </section>

          <section
            className="form-stack"
            aria-labelledby="routine-templates-title"
          >
            <div>
              <p className="status-label">Reusable templates - free</p>
              <h2 id="routine-templates-title">Reusable routine templates</h2>
              <p>
                There is no subscription or saved-template count gate. A
                template stays pinned to the exact routine version captured
                when saved.
              </p>
            </div>

            {templateState.templates.length === 0 ? (
              <div className="empty-state">
                <h3>No templates yet</h3>
                <p>Save any current routine as a reusable template above.</p>
              </div>
            ) : (
              <div className="card-grid">
                {templateState.templates.map((template) => (
                  <article className="card" key={template.id}>
                    <p className="status-label">
                      Template - source routine version{" "}
                      {template.sourceRoutineVersionNumber}
                    </p>
                    <h3>{template.title}</h3>
                    <p>
                      {template.itemCount}{" "}
                      {template.itemCount === 1 ? "exercise" : "exercises"} -
                      source &quot;{template.sourceRoutineTitle}&quot; - saved{" "}
                      {savedDate(template.createdAt)}
                    </p>
                    <CreateRoutineFromTemplateForm
                      templateId={template.id}
                      templateTitle={template.title}
                    />
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}