import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { getRoutineDetailPageState } from "@/modules/planning/server/routines";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ routineId: string }>;
};

function statusText(status: string) {
  return status.replaceAll("_", " ");
}

export default async function RoutineDetailPage({ params }: Props) {
  const { routineId } = await params;
  const state = await getRoutineDetailPageState(routineId);

  if (state.kind === "signed-out") {
    return (
      <>
        <PageIntro eyebrow="Routine" title="Sign in to view this routine">
          <p>Saved routines are private account data.</p>
        </PageIntro>
        <Link className="button" href="/auth/sign-in">Sign in</Link>
      </>
    );
  }

  if (state.kind === "not-found") {
    return (
      <>
        <PageIntro eyebrow="Routine" title="Routine not available">
          <p>The routine does not exist or is not owned by the current account.</p>
        </PageIntro>
        <Link className="button button-secondary" href="/plans">Back to Plans</Link>
      </>
    );
  }

  if (state.kind === "unavailable") {
    return (
      <>
        <PageIntro eyebrow="Routine" title="Routine not available">
          <p>Routine ownership or historical exercise-version data could not be verified right now.</p>
        </PageIntro>
        <Link className="button button-secondary" href="/plans">Back to Plans</Link>
      </>
    );
  }

  const { routine } = state;

  return (
    <>
      <PageIntro eyebrow={`Routine · version ${routine.versionNumber}`} title={routine.title}>
        <p>
          This saved version references the exact exercise versions shown below. It is read-only in this first PH-04 slice.
        </p>
      </PageIntro>

      <div className="action-row">
        <Link className="button button-secondary" href="/plans">Back to Plans</Link>
        <Link className="button button-secondary" href="/create">Create another routine</Link>
      </div>

      {routine.sections.map((section) => (
        <section className="card" aria-labelledby={`routine-section-${section.id}`} key={section.id}>
          <p className="status-label">Section {section.position}</p>
          <h2 id={`routine-section-${section.id}`}>{section.title}</h2>

          <ol className="instruction-list">
            {section.items.map((item) => (
              <li key={item.id}>
                <article>
                  <h3>{item.exerciseVersion.title}</h3>
                  <p>
                    Exact exercise version {item.exerciseVersion.versionNumber} · {statusText(item.exerciseVersion.status)}
                  </p>
                  <p>{item.exerciseVersion.summary}</p>
                  <p><strong>Dosage guidance:</strong> {item.exerciseVersion.dosageGuidance}</p>
                  <p><strong>Side rule:</strong> {statusText(item.exerciseVersion.sideRule)}</p>
                  <p><strong>Plain-language description:</strong> {item.exerciseVersion.accessibleText}</p>
                </article>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </>
  );
}
