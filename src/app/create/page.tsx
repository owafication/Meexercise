import Link from "next/link";

import { PageIntro } from "@/components/page-intro";

export const metadata = { title: "Create" };

export default function CreatePage() {
  return (
    <>
      <PageIntro eyebrow="Create" title="Build something that fits">
        <p>
          Routine creation will use approved exercise content and your preferences,
          equipment, schedule, and constraints.
        </p>
      </PageIntro>

      <section className="card" aria-labelledby="exercise-library-title">
        <p className="status-label">Exercise content</p>
        <h2 id="exercise-library-title">Browse the exercise library</h2>
        <p>Structured exercise versions are available to inspect before the routine builder is introduced.</p>
        <Link className="button" href="/exercises">Open exercise library</Link>
      </section>

      <section className="card" aria-labelledby="create-foundation-title">
        <p className="status-label">Next phase consumer</p>
        <h2 id="create-foundation-title">Routine builder not active yet</h2>
        <p>
          PH-04 will consume approved exercise versions and the existing profile/readiness constraints.
          No placeholder routine data is generated here.
        </p>
      </section>
    </>
  );
}
