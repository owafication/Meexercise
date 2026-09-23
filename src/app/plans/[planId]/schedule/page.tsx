import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { getPlanSchedulePageState } from "@/modules/planning/server/schedules";

import {
  ExceptionRestoreControl,
  OccurrenceExceptionControls,
} from "./occurrence-exception-controls";
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

  const { plan, schedule, upcoming, exceptions } = state;

  return (
    <>
      <PageIntro eyebrow="Plan schedule" title={`Schedule ${plan.title}`}>
        <p>
          Weekly schedule versions are immutable and pin exact routine versions
          from a specific plan version. Per-occurrence skip and reschedule
          changes are also append-only and stay pinned to the exact schedule
          version they modify.
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
        {schedule && exceptions.length > 0 ? (
          <p className="form-message">
            Saving a new recurring schedule version does not copy current
            occurrence exceptions into the new snapshot. Existing skip and
            reschedule history remains preserved against the exact schedule
            version it changed.
          </p>
        ) : null}
        <ScheduleForm
          planId={plan.id}
          currentPlanVersionNumber={plan.versionNumber}
          routines={plan.routines}
          schedule={schedule}
        />
      </section>

      {schedule ? (
        <section className="card" aria-labelledby="schedule-upcoming-title">
          <p className="status-label">Per-occurrence control</p>
          <h2 id="schedule-upcoming-title">Upcoming occurrences</h2>
          {schedule.isPaused ? (
            <p>
              This recurring schedule is paused. Resume it with a new schedule
              version before changing individual occurrences.
            </p>
          ) : upcoming.length === 0 ? (
            <p>No effective occurrences are scheduled in the next 28 days.</p>
          ) : (
            <div className="card-grid">
              {upcoming.slice(0, 8).map((occurrence) => (
                <article
                  className="card"
                  key={`${occurrence.startsAt}-${occurrence.routineVersionId}`}
                >
                  <p className="status-label">
                    {occurrence.status === "rescheduled"
                      ? "Rescheduled"
                      : "Scheduled"}
                  </p>
                  <h3>{occurrence.routineTitle}</h3>
                  <p>
                    <time dateTime={occurrence.startsAt}>
                      {occurrence.localDateLabel}
                    </time>
                    , {occurrence.windowStart}-{occurrence.windowEnd} in{" "}
                    {occurrence.timezoneName}. Exact routine version{" "}
                    {occurrence.routineVersionNumber}.
                  </p>
                  {occurrence.status === "rescheduled" ? (
                    <p>
                      Rescheduled from original local date{" "}
                      {occurrence.originalLocalDate}.
                    </p>
                  ) : null}
                  <OccurrenceExceptionControls
                    planId={plan.id}
                    occurrence={occurrence}
                  />
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {schedule ? (
        <section className="card" aria-labelledby="schedule-exceptions-title">
          <p className="status-label">Current schedule version</p>
          <h2 id="schedule-exceptions-title">
            Current occurrence exceptions
          </h2>
          {exceptions.length === 0 ? (
            <p>No active skip or reschedule exceptions.</p>
          ) : (
            <ul className="instruction-list">
              {exceptions.map((exception) => (
                <li key={exception.id}>
                  <article>
                    <h3>{exception.routineTitle}</h3>
                    <p>
                      Original occurrence: {exception.originalLocalDate},{" "}
                      {exception.originalWindowStart}-
                      {exception.originalWindowEnd}.
                    </p>
                    {exception.action === "skip" ? (
                      <p>Skipped.</p>
                    ) : (
                      <p>
                        Rescheduled to {exception.rescheduledLocalDate} at{" "}
                        {exception.rescheduledWindowStart}-
                        {exception.rescheduledWindowEnd}.
                      </p>
                    )}
                    <ExceptionRestoreControl
                      planId={plan.id}
                      scheduleVersionNumber={schedule.versionNumber}
                      exception={exception}
                    />
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <div className="action-row">
        <Link className="button button-secondary" href={`/plans/${plan.id}`}>
          Back to plan
        </Link>
      </div>
    </>
  );
}
