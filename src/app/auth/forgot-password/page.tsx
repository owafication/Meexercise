import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth-forms";
import { PageIntro } from "@/components/page-intro";

export const metadata = {
  title: "Reset password",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <PageIntro eyebrow="Account" title="Reset your password">
        <p>
          Request a reset link. For privacy, the response does not confirm
          whether an email address has an account.
        </p>
      </PageIntro>

      <section className="card auth-card" aria-labelledby="reset-title">
        <h2 id="reset-title">Request reset link</h2>
        <ForgotPasswordForm />

        <Link className="text-link" href="/auth/sign-in">
          Return to sign in
        </Link>
      </section>
    </>
  );
}
