import Link from "next/link";

import { SignInForm } from "@/components/auth-forms";
import { PageIntro } from "@/components/page-intro";

export const metadata = {
  title: "Sign in",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    callback?: string;
    accountDeleted?: string;
  }>;
}) {
  const params = await searchParams;
  const callbackProblem = params.callback;
  const accountDeleted = params.accountDeleted === "1";

  return (
    <>
      <PageIntro eyebrow="Account" title="Sign in to MeExercise">
        <p>
          Your account keeps private profile and assessment data associated with
          you across supported devices.
        </p>
      </PageIntro>

      <section className="card auth-card" aria-labelledby="sign-in-title">
        <h2 id="sign-in-title">Sign in</h2>

        {callbackProblem ? (
          <p className="form-message form-message-error" role="alert">
            That account link is invalid, expired, or could not be completed.
          </p>
        ) : null}

        {accountDeleted ? (
          <p className="form-message" role="status">
            Your MeExercise account and its current stored account data were
            deleted.
          </p>
        ) : null}

        <SignInForm />

        <div className="auth-links">
          <Link className="text-link" href="/auth/forgot-password">
            Forgot password?
          </Link>
          <Link className="text-link" href="/auth/sign-up">
            Create an account
          </Link>
        </div>
      </section>
    </>
  );
}