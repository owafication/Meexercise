import Link from "next/link";

import { PageIntro } from "@/components/page-intro";

export const metadata = {
  title: "Plans",
};

export default function PlansPage() {
  return (
    <>
      <PageIntro eyebrow="Plans" title="Your plans and routines">
        <p>
          Saved plans, routines, and reusable templates will live here without
          changing the meaning of completed history.
        </p>
      </PageIntro>

      <section className="empty-state" aria-labelledby="plans-empty-title">
        <h2 id="plans-empty-title">No plans yet</h2>
        <p>
          There is nothing to manage yet. Routine creation is the next place
          to explore.
        </p>
        <Link className="text-link" href="/create">
          Go to Create
        </Link>
      </section>
    </>
  );
}
