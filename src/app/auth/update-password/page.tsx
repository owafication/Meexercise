import Link from "next/link";

import { UpdatePasswordForm } from "@/components/auth-forms";
import { PageIntro } from "@/components/page-intro";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/modules/identity/server/auth";

export const metadata = {
  title: "Update password",
};

async function hasRecoverySession(): Promise<boolean> {
  try {
    const supabase = await createClient();
    return Boolean(await getVerifiedUserId(supabase));
  } catch {
    return false;
  }
}

export default async function UpdatePasswordPage() {
  const canUpdate = await hasRecoverySession();

  return (
    <>
      <PageIntro eyebrow="Account" title="Choose a new password">
        <p>
          A valid recovery session is required before account credentials can be
          changed.
        </p>
      </PageIntro>

      <section className="card auth-card" aria-labelledby="update-password-title">
        <h2 id="update-password-title">Update password</h2>

        {canUpdate ? (
          <UpdatePasswordForm />
        ) : (
          <>
            <p>
              The recovery session is missing or expired. Request a new reset
              link to continue.
            </p>
            <Link className="button" href="/auth/forgot-password">
              Request another reset link
            </Link>
          </>
        )}
      </section>
    </>
  );
}
