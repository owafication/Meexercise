"use client";

import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="state-page" aria-labelledby="error-title">
      <p className="eyebrow">Something went wrong</p>
      <h1 id="error-title">We could not load this page</h1>
      <p>
        Try the page again. If the problem continues, return to Today and
        retry from there.
      </p>
      <div className="action-row">
        <button className="button" type="button" onClick={reset}>
          Try again
        </button>
        <Link className="button button-secondary" href="/">
          Return to Today
        </Link>
      </div>
    </section>
  );
}
