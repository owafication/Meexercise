import Link from "next/link";

import { AccountDeletionForm } from "@/components/account-deletion-form";
import { AccountEmailChangeForm } from "@/components/account-email-change-form";
import { PageIntro } from "@/components/page-intro";
import { getAccountLifecyclePageState } from "@/modules/identity/server/account";

export const metadata = {
  title: "Data and account",
};

export default async function AccountLifecyclePage() {
  const state = await getAccountLifecyclePageState();

  return (
    <>
      <PageIntro eyebrow="Profile" title="Data and account">
        <p>
          Download the account data MeExercise currently stores for you,
          correct current account/profile/assessment information, or permanently
          delete this account and its current stored records.
        </p>
      </PageIntro>

      {state.kind === "signed-out" ? (
        <section className="card" aria-labelledby="account-sign-in-title">
          <p className="status-label">Account required</p>
          <h2 id="account-sign-in-title">
            Sign in to manage your account data
          </h2>
          <p>
            Export, correction, and deletion controls are available only after
            your account session is verified.
          </p>
          <Link className="button" href="/auth/sign-in">
            Sign in
          </Link>
        </section>
      ) : null}

      {state.kind === "unavailable" ? (
        <section className="card" aria-labelledby="account-unavailable-title">
          <p className="status-label">Account unavailable</p>
          <h2 id="account-unavailable-title">
            Account data controls are not available
          </h2>
          <p>
            No destructive action is available when the account or server
            administration boundary cannot be verified.
          </p>
          <Link className="text-link" href="/profile">
            Back to profile
          </Link>
        </section>
      ) : null}

      {state.kind === "authenticated" ? (
        <>
          <div className="card-grid">
            <section className="card" aria-labelledby="data-export-title">
              <p className="status-label">Your data</p>
              <h2 id="data-export-title">Download your data</h2>
              <p>
                The current JSON export includes your account identifier/email,
                private profile, assessment responses, correction links and
                safety flags, together with the referenced assessment version
                needed to interpret that history.
              </p>
              <a
                className="button button-secondary"
                href="/profile/export"
                download
              >
                Download JSON export
              </a>
            </section>

            <section className="card" aria-labelledby="email-change-title">
              <p className="status-label">Account correction</p>
              <h2 id="email-change-title">Change account email</h2>
              <p>
                Current account email: <strong>{state.email}</strong>. The
                change takes effect only after the secure confirmation flow
                completes.
              </p>
              <AccountEmailChangeForm />
            </section>

            <section className="card" aria-labelledby="delete-account-title">
              <p className="status-label">Permanent deletion</p>
              <h2 id="delete-account-title">Delete your account</h2>
              <p>
                Signed in as <strong>{state.email}</strong>. This action is not
                undoable. Export anything you want to keep before continuing.
              </p>
              <AccountDeletionForm />
            </section>
          </div>

          <section className="card" aria-labelledby="record-correction-title">
            <p className="status-label">Record correction</p>
            <h2 id="record-correction-title">Correct profile and assessment data</h2>
            <p>
              Your current display name can be edited on Profile. In-progress
              assessment answers can be edited before completion. A completed
              assessment is immutable history; use its correction control to
              create a linked corrected successor without rewriting the
              original record.
            </p>
            <div className="action-row">
              <Link className="button button-secondary" href="/profile">
                Edit profile
              </Link>
              <Link
                className="button button-secondary"
                href="/profile/assessment"
              >
                Review assessment
              </Link>
            </div>
          </section>
        </>
      ) : null}

      <Link className="text-link" href="/profile">
        Back to profile
      </Link>
    </>
  );
}
