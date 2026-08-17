import Link from "next/link";

import { PageIntro } from "@/components/page-intro";

export const metadata = {
  title: "Progress",
};

export default function ProgressPage() {
  return (
    <>
      <PageIntro eyebrow="Progress" title="See what your history shows">
        <p>
          Progress will summarize your recorded activity while keeping
          user-reported observations distinct from calculated or imported
          information.
        </p>
      </PageIntro>

      <section className="empty-state" aria-labelledby="progress-empty-title">
        <h2 id="progress-empty-title">No completed activity yet</h2>
        <p>
          Progress information will appear after routines can be performed and
          recorded.
        </p>
        <Link className="text-link" href="/">
          Return to Today
        </Link>
      </section>
    </>
  );
}
