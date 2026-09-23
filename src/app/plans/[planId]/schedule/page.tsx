import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { getPlanSchedulePageState } from "@/modules/planning/server/schedules";

import { ScheduleForm } from "./schedule-form";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ planId: string }>;
};

export default async function PlanSchedulePage({ params }: Props) {
  const { planId } = await params;
  const state = await getPlanSchedulePageState(planId);

  if (state.kind === "signed-out") {
    return (
      <>
        <PageIntro eyebrow="Plan schedule" title="Sign in to schedule this plan">
          <p>Plan schedules are private account data.</p>
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
        <PageIntro eyebrow="Plan schedule" title="Schedule not available">
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
        <PageIntro eyebrow="Plan schedule" title="Schedule unavailable">
          <p>Current plan or schedule data could not be verified.</p>
        </PageIntro>
        <Link className="button button-secondary" href={`/plans/${planId}`}>
          Back to plan
        </Link>
      </>
    );
  }

  const { plan, schedule } = state;

  return (
    <>
      <PageIntro
        eyebrow="Plan schedule"
        title={`Schedule ${plan.title}`}
      >
        <p>
          Weekly schedule versions are immutable and pin exact routine versions
          from a specific plan version. Saving an edit creates another schedule
          version instead of rewriting prior scheduling history.
        </p>
      </PageIntro>

      {schedule ? (
        <section className="card" aria-labelledby="current-schedule-title">
          <p className="status-label">Current schedule</p>
          <h2 id="current-schedule-title">
            Schedule version {schedule.versionNumber}
          </h2>
          <p>
            Pinned to plan version {schedule.planVersionNumber}. Timezone:{" "}
            {schedule.timezoneName}. Starts on {schedule.startsOn}.
            {schedule.isPaused ? " This schedule is paused." : ""}
          </p>
          <ul className="instruction-list">
            {schedule.rules.map((rule) => (
              <li key={`${rule.weekday}-${rule.routineVersionId}`}>
                <strong>{rule.weekdayLabel}</strong>: {rule.windowStart}-
                {rule.windowEnd} - {rule.routineTitle}, exact routine version{" "}
                {rule.routineVersionNumber}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card" aria-labelledby="schedule-editor-title">
        <p className="status-label">
          {schedule ? "Append-only edit" : "Recurring schedule"}
        </p>
        <h2 id="schedule-editor-title">
          {schedule ? "Create the next schedule version" : "Set a weekly schedule"}
        </h2>
        <ScheduleForm
          planId={plan.id}
          currentPlanVersionNumber={plan.versionNumber}
          routines={plan.routines}
          schedule={schedule}
        />
      </section>

      <div className="action-row">
        <Link className="button button-secondary" href={`/plans/${plan.id}`}>
          Back to plan
        </Link>
      </div>
    </>
  );
}
