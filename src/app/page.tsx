import Link from "next/link";

import { PageIntro } from "@/components/page-intro";

export default function TodayPage() {
  return (
    <>
      <PageIntro eyebrow="Today" title="Your day, at a glance">
        <p>
          Your next routine, schedule, and recent activity will come together
          here as your MeExercise plan takes shape.
        </p>
      </PageIntro>

      <div className="card-grid">
        <section className="card card-featured" aria-labelledby="today-next-title">
          <p className="status-label">Next up</p>
          <h2 id="today-next-title">No routine scheduled yet</h2>
          <p>
            Start from Create when you are ready to build a routine around your
            goals, available time, equipment, and preferences.
          </p>
          <Link className="button" href="/create">
            Explore routine setup
          </Link>
        </section>

        <section className="card" aria-labelledby="today-boundary-title">
          <p className="status-label">General wellness</p>
          <h2 id="today-boundary-title">You remain in control</h2>
          <p>
            MeExercise is designed for self-directed exercise and mobility
            planning. Recommendations must remain reviewable and editable.
          </p>
        </section>
      </div>
    </>
  );
}
