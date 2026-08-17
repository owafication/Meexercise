import Link from "next/link";

export default function NotFound() {
  return (
    <section className="state-page" aria-labelledby="not-found-title">
      <p className="eyebrow">404</p>
      <h1 id="not-found-title">Page not found</h1>
      <p>
        The address may be incorrect, or this part of MeExercise may not exist
        yet.
      </p>
      <Link className="button" href="/">
        Return to Today
      </Link>
    </section>
  );
}
