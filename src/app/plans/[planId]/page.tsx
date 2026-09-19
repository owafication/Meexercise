import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { getPlanDetailPageState } from "@/modules/planning/server/plans";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ planId: string }>;
};

export default async function PlanDetailPage({ params }: Props) {
  const { planId } = await params;
  const state = await getPlanDetailPageState(planId);

  if (state.kind === "signed-out") {
    return (
      <>
        <PageIntro eyebrow="Plan" title="Sign in to view this plan">
          <p>Saved plans are private account data.</p>
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
        <PageIntro eyebrow="Plan" title="Plan not available">
          <p>The plan does not exist or is not owned by the current account.</p>
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
        <PageIntro eyebrow="Plan" title="Plan not available">
          <p>Plan ownership or exact routine-version data could not be verified.</p>
        </PageIntro>
        <Link className="button button-secondary" href="/plans">
          Back to Plans
        </Link>
      </>
    );
  }

  const { plan } = state;

  return (
    <>
      <PageIntro
        eyebrow={`Plan - version ${plan.versionNumber}`}
        title={plan.title}
      >
        <p>
          This immutable plan version records the exact routine versions shown
          below. Later routine or plan edits do not rewrite this snapshot.
        </p>
      </PageIntro>

      <div className="action-row">
        <Link className="button" href={`/plans/${plan.id}/edit`}>
          Edit plan
        </Link>
        <Link className="button button-secondary" href="/plans">
          Back to Plans
        </Link>
      </div>

      <section className="card" aria-labelledby="plan-routines-title">
        <p className="status-label">Exact composition</p>
        <h2 id="plan-routines-title">Routine snapshots</h2>
        <ol className="instruction-list">
          {plan.routines.map((routine) => (
            <li key={routine.routineVersionId}>
              <article>
                <h3>{routine.routineTitle}</h3>
                <p>Exact routine version {routine.routineVersionNumber}</p>
              </article>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}