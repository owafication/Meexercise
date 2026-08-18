import Link from "next/link";

import { signOutAction } from "@/app/auth/actions";
import { ProfileForm } from "@/components/profile-form";
import { PageIntro } from "@/components/page-intro";
import { getProfilePageState } from "@/modules/profile-assessment/server/profile";

export const metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const state = await getProfilePageState();

  return (
    <>
      <PageIntro eyebrow="Profile" title="Your context, preferences, and account">
        <p>
          Profile holds only the information you choose to provide for
          self-directed planning, together with account and privacy controls.
        </p>
      </PageIntro>

      {state.kind === "signed-out" ? (
        <section className="card" aria-labelledby="profile-sign-in-title">
          <p className="status-label">Account required</p>
          <h2 id="profile-sign-in-title">Sign in to manage your private profile</h2>
          <p>
            Account-backed profile and assessment records are private and are
            not exposed as a public profile.
          </p>
          <div className="action-row">
            <Link className="button" href="/auth/sign-in">
              Sign in
            </Link>
            <Link className="button button-secondary" href="/auth/sign-up">
              Create account
            </Link>
          </div>
        </section>
      ) : null}

      {state.kind === "unavailable" ? (
        <section className="card" aria-labelledby="profile-unavailable-title">
          <p className="status-label">Account unavailable</p>
          <h2 id="profile-unavailable-title">Profile services are not available</h2>
          <p>
            No private profile data is shown when account configuration or
            authentication cannot be verified.
          </p>
        </section>
      ) : null}

      {state.kind === "authenticated" ? (
        <div className="card-grid">
          <section className="card" aria-labelledby="private-profile-title">
            <p className="status-label">Private profile</p>
            <h2 id="private-profile-title">Your profile</h2>
            <p>
              This slice stores an optional private display name. Assessment
              answers are kept separately against their own versioned
              general-wellness assessment.
            </p>

            <ProfileForm
              initialDisplayName={state.profile?.displayName ?? null}
              initialRowVersion={state.profile?.rowVersion ?? null}
            />
          </section>

          <section className="card" aria-labelledby="assessment-card-title">
            <p className="status-label">Assessment</p>
            <h2 id="assessment-card-title">Readiness and movement context</h2>
            <p>
              Save or resume your versioned readiness assessment, record
              movement limitations, and review conservative planning outcomes.
            </p>
            <Link className="button button-secondary" href="/profile/assessment">
              Open readiness assessment
            </Link>
          </section>

          <section className="card" aria-labelledby="account-controls-title">
            <p className="status-label">Account</p>
            <h2 id="account-controls-title">Session controls</h2>
            <p>
              Signing out removes this browser&apos;s active MeExercise session.
            </p>
            <form action={signOutAction}>
              <button className="button button-secondary" type="submit">
                Sign out
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}