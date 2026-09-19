import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { getPlanDetailPageState } from "@/modules/planning/server/plans";
import { getRoutineListPageState } from "@/modules/planning/server/routines";

import { EditPlanForm } from "../../plan-controls";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ planId: string }>;
};

export default async function EditPlanPage({ params }: Props) {
  const { planId } = await params;
  const [planState, routineState] = await Promise.all([
    getPlanDetailPageState(planId),
    getRoutineListPageState(),
  ]);

  if (planState.kind === "signed-out" || routineState.kind === "signed-out") {
    return (
      <>
        <PageIntro eyebrow="Edit plan" title="Sign in to edit this plan">
          <p>Saved plans are private account data.</p>
        </PageIntro>
        <Link className="button" href="/auth/sign-in">
          Sign in
        </Link>
      </>
    );
  }

  if (planState.kind === "not-found") {
    return (
      <>
        <PageIntro eyebrow="Edit plan" title="Plan not available">
          <p>The plan does not exist or is not owned by the current account.</p>
        </PageIntro>
        <Link className="button button-secondary" href="/plans">
          Back to Plans
        </Link>
      </>
    );
  }

  if (
    planState.kind === "unavailable" ||
    routineState.kind === "unavailable"
  ) {
    return (
      <>
        <PageIntro eyebrow="Edit plan" title="Plan editing unavailable">
          <p>Current plan or routine snapshot data could not be verified.</p>
        </PageIntro>
        <Link className="button button-secondary" href={`/plans/${planId}`}>
          Back to plan
        </Link>
      </>
    );
  }

  const { plan } = planState;
  const latestByRoutine = new Map(
    routineState.routines.map((routine) => [routine.id, routine]),
  );
  const options: Array<{
    routineId: string;
    versionId: string;
    title: string;
    versionNumber: number;
  }> = [];
  const includedVersionIds = new Set<string>();
  const planRoutineIds = new Set(plan.routines.map((routine) => routine.routineId));

  for (const current of plan.routines) {
    options.push({
      routineId: current.routineId,
      versionId: current.routineVersionId,
      title: current.routineTitle,
      versionNumber: current.routineVersionNumber,
    });
    includedVersionIds.add(current.routineVersionId);

    const latest = latestByRoutine.get(current.routineId);

    if (latest && !includedVersionIds.has(latest.versionId)) {
      options.push({
        routineId: latest.id,
        versionId: latest.versionId,
        title: latest.title,
        versionNumber: latest.versionNumber,
      });
      includedVersionIds.add(latest.versionId);
    }
  }

  for (const latest of routineState.routines) {
    if (
      !planRoutineIds.has(latest.id) &&
      !includedVersionIds.has(latest.versionId)
    ) {
      options.push({
        routineId: latest.id,
        versionId: latest.versionId,
        title: latest.title,
        versionNumber: latest.versionNumber,
      });
      includedVersionIds.add(latest.versionId);
    }
  }

  return (
    <>
      <PageIntro
        eyebrow={`Edit plan - current version ${plan.versionNumber}`}
        title={`Edit ${plan.title}`}
      >
        <p>
          Saving creates version {plan.versionNumber + 1}. Version{" "}
          {plan.versionNumber} and its exact routine references remain unchanged.
        </p>
      </PageIntro>

      <section className="card" aria-labelledby="edit-plan-form-title">
        <p className="status-label">Append-only edit</p>
        <h2 id="edit-plan-form-title">Create the next plan version</h2>
        <EditPlanForm
          planId={plan.id}
          expectedVersionNumber={plan.versionNumber}
          title={plan.title}
          options={options}
          selectedVersionIds={plan.routines.map(
            (routine) => routine.routineVersionId,
          )}
        />
      </section>

      <div className="action-row">
        <Link className="button button-secondary" href={`/plans/${plan.id}`}>
          Cancel
        </Link>
      </div>
    </>
  );
}