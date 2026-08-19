import Link from "next/link";

import { AssessmentForm } from "@/components/assessment-form";
import { AssessmentStartForm } from "@/components/assessment-start-form";
import { PageIntro } from "@/components/page-intro";
import { getReadinessAssessmentPageState } from "@/modules/profile-assessment/server/assessment";

export const metadata = {
  title: "Readiness assessment",
};

function completedDate(value: string | null): string {
  if (!value) {
    return "Completion time unavailable";
  }

  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function ReadinessAssessmentPage() {
  const state = await getReadinessAssessmentPageState();

  const completedSession =
    state.kind === "authenticated" && state.session?.status === "completed"
      ? state.session
      : null;

  const professionalReview = completedSession?.safetyFlags.some(
    (flag) => flag.flagCode === "professional_review_recommended",
  );

  const movementRestriction = completedSession?.safetyFlags.some(
    (flag) => flag.flagCode === "movement_restrictions_present",
  );

  return (
    <>
      <PageIntro eyebrow="Profile" title="Readiness assessment">
        <p>
          Record current activity, movement limitations, and whether
          self-directed exercise planning is appropriate for you right now.
          This is a general-wellness assessment, not a diagnosis, treatment
          recommendation, or medical safety clearance.
        </p>
      </PageIntro>

      {state.kind === "signed-out" ? (
        <section className="card" aria-labelledby="assessment-sign-in-title">
          <p className="status-label">Account required</p>
          <h2 id="assessment-sign-in-title">
            Sign in to use your private assessment
          </h2>
          <p>
            Assessment answers are private account data and are not a public
            profile.
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
        <section className="card" aria-labelledby="assessment-unavailable-title">
          <p className="status-label">Assessment unavailable</p>
          <h2 id="assessment-unavailable-title">
            Readiness assessment is not available
          </h2>
          <p>
            No assessment data is shown when account or assessment services
            cannot be verified. Try again later from your profile.
          </p>
          <Link className="text-link" href="/profile">
            Back to profile
          </Link>
        </section>
      ) : null}

      {state.kind === "authenticated" && !state.session ? (
        <section className="card" aria-labelledby="assessment-start-title">
          <p className="status-label">Not started</p>
          <h2 id="assessment-start-title">{state.latestVersion.title}</h2>
          <p>
            You can save progress and return later. A completed assessment is
            kept against its exact template version so later changes do not
            rewrite your history.
          </p>
          <AssessmentStartForm />
        </section>
      ) : null}

      {state.kind === "authenticated" &&
      state.session?.status === "in_progress" ? (
        <section className="card" aria-labelledby="assessment-form-title">
          <p className="status-label">
            {state.session.correctsSessionId ? "Correction in progress" : "In progress"}
          </p>
          <h2 id="assessment-form-title">{state.session.version.title}</h2>
          <p>
            Version {state.session.version.versionNumber}. Save at any point and
            return from Profile to continue.
          </p>

          <AssessmentForm
            sessionId={state.session.id}
            initialRowVersion={state.session.rowVersion}
            initialAnswers={state.session.answers}
          />
        </section>
      ) : null}

      {completedSession ? (
        <div className="card-grid">
          <section className="card" aria-labelledby="assessment-complete-title">
            <p className="status-label">
              {completedSession.correctsSessionId
                ? "Corrected assessment completed"
                : "Assessment completed"}
            </p>
            <h2 id="assessment-complete-title">
              {completedSession.version.title}
            </h2>
            <p>
              Version {completedSession.version.versionNumber}, completed{" "}
              {completedDate(completedSession.completedAt)}.{" "}
              {completedSession.correctsSessionId
                ? "This corrected record is now the latest completed assessment; the earlier completed record remains in your history."
                : "This completed response is retained as historical context."}
            </p>
            <div className="action-row">
              <AssessmentStartForm
                label="Correct this assessment"
                correctsSessionId={completedSession.id}
              />
              <AssessmentStartForm label="Start another assessment" />
            </div>
          </section>

          <section
            className={professionalReview ? "card card-featured" : "card"}
            aria-labelledby="assessment-outcome-title"
          >
            <p className="status-label">Planning outcome</p>

            {professionalReview ? (
              <>
                <h2 id="assessment-outcome-title">
                  Professional input recommended
                </h2>
                <p>
                  Based on what you reported, MeExercise will block unrestricted
                  routine generation from this assessment. Consider discussing
                  exercise with an appropriate qualified professional before
                  relying on self-directed planning. This is not a diagnosis or
                  medical safety determination.
                </p>
              </>
            ) : movementRestriction ? (
              <>
                <h2 id="assessment-outcome-title">
                  Movement restrictions recorded
                </h2>
                <p>
                  Future routine generation must respect the affected areas or
                  movements you chose to avoid. This does not certify that other
                  activity is medically safe.
                </p>
              </>
            ) : (
              <>
                <h2 id="assessment-outcome-title">
                  No planning restriction generated
                </h2>
                <p>
                  No conservative planning flag was generated from these
                  answers. This is not medical clearance or a guarantee that
                  exercise is safe.
                </p>
              </>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
