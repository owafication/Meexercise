"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { saveAssessmentAction } from "@/app/profile/assessment/actions";
import { initialAssessmentActionState } from "@/app/profile/assessment/state";
import {
  ACTIVITY_FREQUENCY_OPTIONS,
  INDEPENDENT_EXERCISE_OPTIONS,
  PROFESSIONAL_RESTRICTION_OPTIONS,
  type ReadinessAssessmentAnswers,
} from "@/modules/profile-assessment/readiness";

export function AssessmentForm({
  sessionId,
  initialRowVersion,
  initialAnswers,
}: {
  sessionId: string;
  initialRowVersion: number;
  initialAnswers: ReadinessAssessmentAnswers;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveAssessmentAction,
    initialAssessmentActionState(initialRowVersion),
  );

  useEffect(() => {
    if (state.status === "completed") {
      router.refresh();
    }
  }, [router, state.status]);

  const messageClass =
    state.status === "error" || state.status === "conflict"
      ? "form-message form-message-error"
      : "form-message";

  const limitationDetailError =
    state.fieldErrors?.limitationDetails ??
    state.fieldErrors?.affectedAreas ??
    state.fieldErrors?.avoidedMovements;

  return (
    <form action={formAction} className="form-stack">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="rowVersion" value={state.rowVersion} />

      <fieldset
        className="choice-group"
        aria-describedby={
          state.fieldErrors?.activityFrequency
            ? "activity-frequency-help activity-frequency-error"
            : "activity-frequency-help"
        }
      >
        <legend>How often are you physically active in a typical week?</legend>
        <p className="field-help" id="activity-frequency-help">
          Choose the closest current pattern. This is context for general
          wellness planning, not a fitness grade.
        </p>

        {ACTIVITY_FREQUENCY_OPTIONS.map((option) => (
          <label className="choice-option" key={option.value}>
            <input
              type="radio"
              name="activityFrequency"
              value={option.value}
              defaultChecked={initialAnswers.activity.frequency === option.value}
            />
            <span>{option.label}</span>
          </label>
        ))}

        {state.fieldErrors?.activityFrequency ? (
          <p className="field-error" id="activity-frequency-error">
            {state.fieldErrors.activityFrequency}
          </p>
        ) : null}
      </fieldset>

      <fieldset
        className="choice-group"
        aria-describedby={
          state.fieldErrors?.hasLimitations
            ? "limitations-help limitations-error"
            : "limitations-help"
        }
      >
        <legend>
          Do you currently have areas or movements you want MeExercise to
          account for?
        </legend>
        <p className="field-help" id="limitations-help">
          Record only what is useful for self-directed exercise planning. You
          do not need to provide a diagnosis.
        </p>

        <label className="choice-option">
          <input
            type="radio"
            name="hasLimitations"
            value="no"
            defaultChecked={initialAnswers.limitations.hasLimitations === false}
          />
          <span>No current movement limitations to record</span>
        </label>

        <label className="choice-option">
          <input
            type="radio"
            name="hasLimitations"
            value="yes"
            defaultChecked={initialAnswers.limitations.hasLimitations === true}
          />
          <span>Yes, I have areas or movements to account for</span>
        </label>

        {state.fieldErrors?.hasLimitations ? (
          <p className="field-error" id="limitations-error">
            {state.fieldErrors.hasLimitations}
          </p>
        ) : null}
      </fieldset>

      <div className="field">
        <label htmlFor="affected-areas">Affected areas</label>
        <textarea
          id="affected-areas"
          name="affectedAreas"
          rows={3}
          maxLength={300}
          defaultValue={initialAnswers.limitations.affectedAreas}
          aria-invalid={Boolean(
            state.fieldErrors?.affectedAreas ||
              state.fieldErrors?.limitationDetails,
          )}
          aria-describedby={
            limitationDetailError
              ? "affected-areas-help limitation-details-error"
              : "affected-areas-help"
          }
        />
        <p className="field-help" id="affected-areas-help">
          Optional unless you said you have a limitation and do not list a
          movement to avoid. Use ordinary terms such as “left shoulder”.
        </p>
      </div>

      <div className="field">
        <label htmlFor="avoided-movements">Movements you avoid</label>
        <textarea
          id="avoided-movements"
          name="avoidedMovements"
          rows={3}
          maxLength={300}
          defaultValue={initialAnswers.limitations.avoidedMovements}
          aria-invalid={Boolean(
            state.fieldErrors?.avoidedMovements ||
              state.fieldErrors?.limitationDetails,
          )}
          aria-describedby={
            limitationDetailError
              ? "avoided-movements-help limitation-details-error"
              : "avoided-movements-help"
          }
        />
        <p className="field-help" id="avoided-movements-help">
          Optional unless this is the useful detail for a limitation. Examples:
          jumping, deep squats, overhead pressing.
        </p>
      </div>

      {limitationDetailError ? (
        <p className="field-error" id="limitation-details-error">
          {limitationDetailError}
        </p>
      ) : null}

      <fieldset
        className="choice-group"
        aria-describedby={
          state.fieldErrors?.independentExercise
            ? "independent-exercise-help independent-exercise-error"
            : "independent-exercise-help"
        }
      >
        <legend>
          Are you currently comfortable exercising independently without
          individual professional supervision?
        </legend>
        <p className="field-help" id="independent-exercise-help">
          If you are unsure or answer no, MeExercise will pause unrestricted
          routine generation and recommend appropriate professional input.
        </p>

        {INDEPENDENT_EXERCISE_OPTIONS.map((option) => (
          <label className="choice-option" key={option.value}>
            <input
              type="radio"
              name="independentExercise"
              value={option.value}
              defaultChecked={
                initialAnswers.readiness.independentExercise === option.value
              }
            />
            <span>{option.label}</span>
          </label>
        ))}

        {state.fieldErrors?.independentExercise ? (
          <p className="field-error" id="independent-exercise-error">
            {state.fieldErrors.independentExercise}
          </p>
        ) : null}
      </fieldset>

      <fieldset
        className="choice-group"
        aria-describedby={
          state.fieldErrors?.professionalRestriction
            ? "professional-restriction-help professional-restriction-error"
            : "professional-restriction-help"
        }
      >
        <legend>
          Has a qualified health professional told you to avoid or modify
          exercise right now?
        </legend>
        <p className="field-help" id="professional-restriction-help">
          MeExercise does not interpret the reason or diagnose a condition. A
          yes or unsure answer conservatively blocks unrestricted generation.
        </p>

        {PROFESSIONAL_RESTRICTION_OPTIONS.map((option) => (
          <label className="choice-option" key={option.value}>
            <input
              type="radio"
              name="professionalRestriction"
              value={option.value}
              defaultChecked={
                initialAnswers.readiness.professionalRestriction === option.value
              }
            />
            <span>{option.label}</span>
          </label>
        ))}

        {state.fieldErrors?.professionalRestriction ? (
          <p className="field-error" id="professional-restriction-error">
            {state.fieldErrors.professionalRestriction}
          </p>
        ) : null}
      </fieldset>

      {state.message ? (
        <p
          className={messageClass}
          role={
            state.status === "error" || state.status === "conflict"
              ? "alert"
              : "status"
          }
        >
          {state.message}
        </p>
      ) : null}

      <p className="field-help">
        You can save before every question is complete. Completing the
        assessment locks this version into your history.
      </p>

      <div className="action-row">
        <button
          className="button"
          type="submit"
          name="intent"
          value="save"
          disabled={pending}
        >
          {pending ? "Saving…" : "Save progress"}
        </button>

        <button
          className="button button-secondary"
          type="submit"
          name="intent"
          value="complete"
          disabled={pending}
        >
          Complete assessment
        </button>
      </div>
    </form>
  );
}