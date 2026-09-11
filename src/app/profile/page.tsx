import Link from "next/link";

import { signOutAction } from "@/app/auth/actions";
import { PageIntro } from "@/components/page-intro";
import { ProfileForm } from "@/components/profile-form";
import {
  EMPTY_PLANNING_PROFILE,
} from "@/modules/profile-assessment/planning-profile";
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
            No private profile data is shown when account configuration,
            authentication, or stored planning values cannot be verified.
          </p>
        </section>
      ) : null}

      {state.kind === "authenticated" ? (
        <div className="card-grid">
          <section className="card" aria-labelledby="private-profile-title">
            <p className="status-label">Private profile</p>
            <h2 id="private-profile-title">Your profile</h2>
            <p>
              Record optional account identity plus structured general-wellness
              goals, priorities, preferred methods, equipment, facilities,
              available routine time and preferred weekly frequency.
            </p>
            <p>
              {state.profile?.planningComplete
                ? "Planning profile complete. A later PH-04 consumer slice can use these structured values in deterministic generation."
                : "Planning profile incomplete. You can save partial values now; deterministic generation will not guess missing planning context."}
            </p>

            <ProfileForm
              initialDisplayName={state.profile?.displayName ?? null}
              initialPlanningProfile={
                state.profile?.planning ?? EMPTY_PLANNING_PROFILE
              }
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

          <section className="card" aria-labelledby="data-account-title">
            <p className="status-label">Data and privacy</p>
            <h2 id="data-account-title">Export or delete account data</h2>
            <p>
              Download the current account data MeExercise stores for you or
              review the permanent account-deletion controls.
            </p>
            <Link className="button button-secondary" href="/profile/account">
              Open data and account controls
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
