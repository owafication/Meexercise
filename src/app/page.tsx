import Link from "next/link";

import { PageIntro } from "@/components/page-intro";
import { getTodaySchedulePageState } from "@/modules/planning/server/schedules";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const state = await getTodaySchedulePageState();

  const next =
    state.kind === "authenticated" ? state.occurrences[0] : undefined;

  return (
    <>
      <PageIntro eyebrow="Today" title="Your day, at a glance">
        <p>
          Your next recurring plan window appears here from the exact schedule
          snapshot you saved. Session performance and completion tracking arrive
          in PH-06.
        </p>
      </PageIntro>

      <div className="card-grid">
        <section className="card card-featured" aria-labelledby="today-next-title">
          <p className="status-label">Next up</p>

          {state.kind === "signed-out" ? (
            <>
              <h2 id="today-next-title">Sign in to view your schedule</h2>
              <p>Recurring plan schedules are private account data.</p>
              <Link className="button" href="/auth/sign-in">
                Sign in
              </Link>
            </>
          ) : state.kind === "unavailable" ? (
            <>
              <h2 id="today-next-title">Schedule unavailable</h2>
              <p>Your current schedule could not be verified right now.</p>
              <Link className="button" href="/plans">
                Open Plans
              </Link>
            </>
          ) : next ? (
            <>
              <h2 id="today-next-title">{next.routineTitle}</h2>
              <p>
                <time dateTime={next.startsAt}>{next.localDateLabel}</time>,{" "}
                {next.windowStart}-{next.windowEnd} in {next.timezoneName}.
                Scheduled from {next.planTitle}, exact plan version{" "}
                {next.planVersionNumber} and routine version{" "}
                {next.routineVersionNumber}.
              </p>
              <Link className="button" href={`/plans/${next.planId}`}>
                View scheduled plan
              </Link>
            </>
          ) : (
            <>
              <h2 id="today-next-title">
                No routine scheduled in the next 14 days
              </h2>
              <p>
                Add a recurring weekly schedule to one of your saved plans, or
                resume a paused schedule.
              </p>
              <Link className="button" href="/plans">
                Open Plans
              </Link>
            </>
          )}
        </section>

        <section className="card" aria-labelledby="today-boundary-title">
          <p className="status-label">General wellness</p>
          <h2 id="today-boundary-title">You remain in control</h2>
          <p>
            MeExercise is designed for self-directed exercise and mobility
            planning. Recommendations and scheduling remain reviewable and
            editable.
          </p>
        </section>
      </div>
    </>
  );
}
