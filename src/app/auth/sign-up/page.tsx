import Link from "next/link";

import { SignUpForm } from "@/components/auth-forms";
import { PageIntro } from "@/components/page-intro";

export const metadata = {
  title: "Create account",
};

export default function SignUpPage() {
  return (
    <>
      <PageIntro eyebrow="Account" title="Create your MeExercise account">
        <p>
          Start with account credentials only. Wellness context is collected
          separately when you choose to add it.
        </p>
      </PageIntro>

      <section className="card auth-card" aria-labelledby="sign-up-title">
        <h2 id="sign-up-title">Create account</h2>
        <SignUpForm />

        <Link className="text-link" href="/auth/sign-in">
          Already have an account? Sign in
        </Link>
      </section>
    </>
  );
}
