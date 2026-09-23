import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { getPlanDetailPageState } from "@/modules/planning/server/plans";
import { getPlanSchedulePageState } from "@/modules/planning/server/schedules";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ planId: string }>;
};

export default async function PlanDetailPage({ params }: Props) {
  const { planId } = await params;
  const [state, scheduleState] = await Promise.all([
    getPlanDetailPageState(planId),
    getPlanSchedulePageState(planId),
  ]);

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
        <Link className="button button-secondary" href={`/plans/${plan.id}/schedule`}>
          {scheduleState.kind === "authenticated" && scheduleState.schedule
            ? "Edit schedule"
            : "Add schedule"}
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

      <section className="card" aria-labelledby="plan-schedule-title">
        <p className="status-label">Schedule</p>
        <h2 id="plan-schedule-title">Weekly recurrence</h2>

        {scheduleState.kind !== "authenticated" ? (
          <p>Schedule data is unavailable right now.</p>
        ) : scheduleState.schedule === null ? (
          <>
            <p>No recurring schedule has been saved for this plan.</p>
            <Link className="text-link" href={`/plans/${plan.id}/schedule`}>
              Add a weekly schedule
            </Link>
          </>
        ) : (
          <>
            <p>
              Schedule version {scheduleState.schedule.versionNumber} is pinned
              to plan version {scheduleState.schedule.planVersionNumber} in{" "}
              {scheduleState.schedule.timezoneName}.
              {scheduleState.schedule.isPaused
                ? " It is currently paused."
                : ""}
            </p>

            {scheduleState.schedule.planVersionNumber !== plan.versionNumber ? (
              <p>
                This schedule still uses an earlier plan snapshot. Review the
                schedule before moving future recurrence to plan version{" "}
                {plan.versionNumber}.
              </p>
            ) : null}

            <ul className="instruction-list">
              {scheduleState.schedule.rules.map((rule) => (
                <li key={`${rule.weekday}-${rule.routineVersionId}`}>
                  <strong>{rule.weekdayLabel}</strong>: {rule.windowStart}-
                  {rule.windowEnd} - {rule.routineTitle}, routine version{" "}
                  {rule.routineVersionNumber}
                </li>
              ))}
            </ul>

            {!scheduleState.schedule.isPaused &&
            scheduleState.upcoming.length > 0 ? (
              <>
                <h3>Upcoming</h3>
                <ol className="instruction-list">
                  {scheduleState.upcoming.slice(0, 5).map((occurrence) => (
                    <li key={`${occurrence.startsAt}-${occurrence.routineVersionId}`}>
                      <time dateTime={occurrence.startsAt}>
                        {occurrence.localDateLabel}
                      </time>
                      : {occurrence.windowStart}-{occurrence.windowEnd} -{" "}
                      {occurrence.routineTitle}
                      {occurrence.status === "rescheduled"
                        ? ` (rescheduled from ${occurrence.originalLocalDate})`
                        : ""}
                    </li>
                  ))}
                </ol>
              </>
            ) : null}

            <Link className="text-link" href={`/plans/${plan.id}/schedule`}>
              Review schedule and occurrence exceptions
            </Link>
          </>
        )}
      </section>
    </>
  );
}
