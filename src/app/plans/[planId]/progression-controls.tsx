"use client";

import { useActionState, useState } from "react";

import {
  createConservativeProgressionReviewAction,
  dismissConservativeProgressionReviewAction,
  type ProgressionActionState,
} from "@/app/plans/progression-actions";
import {
  describeProgressionFeedback,
  describeProgressionProposal,
} from "@/modules/planning/progression-display";
import type {
  ProgressionFeedbackKind,
  ProgressionReviewSnapshot,
} from "@/modules/planning/server/progression";

type ScheduleRule = { weekday: number; weekdayLabel: string };

type Schedule = {
  versionNumber: number;
  versionId: string;
  planVersionNumber: number;
  isPaused: boolean;
  rules: ScheduleRule[];
};

const initialState: ProgressionActionState = { status: "idle", message: "" };

function DismissReview({ planId, review }: {
  planId: string;
  review: ProgressionReviewSnapshot;
}) {
  const [state, action, pending] = useActionState(
    dismissConservativeProgressionReviewAction,
    initialState,
  );

  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="reviewId" value={review.id} />
      <input
        type="hidden"
        name="expectedEventVersionNumber"
        value={review.events.at(-1)?.versionNumber ?? 0}
      />
      {state.message ? <p className="form-message form-message-error" role="alert">{state.message}</p> : null}
      <button type="submit" className="button button-secondary" disabled={pending}>
        {pending ? "Dismissing..." : "Dismiss this proposal"}
      </button>
    </form>
  );
}

export function ProgressionControls({
  planId,
  planVersionNumber,
  schedule,
  scheduleAvailable,
  reviews,
}: {
  planId: string;
  planVersionNumber: number;
  schedule: Schedule | null;
  scheduleAvailable: boolean;
  reviews: ProgressionReviewSnapshot[];
}) {
  const [state, action, pending] = useActionState(
    createConservativeProgressionReviewAction,
    initialState,
  );
  const [feedback, setFeedback] = useState<ProgressionFeedbackKind>(
    "excessive_difficulty",
  );
  const mayPropose =
    schedule !== null &&
    !schedule.isPaused &&
    schedule.planVersionNumber === planVersionNumber;
  const chooseDay =
    mayPropose &&
    feedback !== "discomfort" &&
    schedule !== null &&
    schedule.rules.length > 1;

  return (
    <>
      <p>
        These are review-only, conservative suggestions based on your explicit
        feedback. Recording or dismissing one does not modify your schedule,
        exercise instructions, or historical activity. Applying and reversing
        proposals are not available in this initial slice.
      </p>
      {mayPropose && schedule ? (
        <form action={action} className="form-stack">
          <input type="hidden" name="planId" value={planId} />
          <input type="hidden" name="expectedPlanVersionNumber" value={planVersionNumber} />
          <input
            type="hidden"
            name="expectedScheduleVersionNumber"
            value={schedule.versionNumber}
          />
          <div className="field">
            <label htmlFor="progression-feedback">Feedback for this plan</label>
            <select
              id="progression-feedback"
              name="feedbackKind"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value as ProgressionFeedbackKind)}
            >
              <option value="excessive_difficulty">It feels excessively difficult</option>
              <option value="discomfort">I am experiencing discomfort</option>
              <option value="user_requested_reduction">I prefer fewer scheduled days</option>
            </select>
          </div>
          {chooseDay ? (
            <div className="field">
              <label htmlFor="progression-remove-day">Scheduled day to remove</label>
              <select
                id="progression-remove-day"
                name="removeWeekday"
                defaultValue=""
                required
              >
                <option value="">Choose a scheduled day</option>
                {schedule.rules.map((rule) => (
                  <option key={rule.weekday} value={rule.weekday}>
                    {rule.weekdayLabel}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" name="removeWeekday" value="" />
          )}
          {feedback === "discomfort" ? (
            <p className="field-help">
              Discomfort produces a pause proposal rather than an increase.
              This is general-wellness scheduling, not medical assessment.
              Seek appropriate professional advice for concerning symptoms.
            </p>
          ) : schedule.rules.length === 1 ? (
            <p className="field-help">
              With one scheduled day, further frequency reduction proposes a pause.
            </p>
          ) : null}
          {state.message ? (
            <p className="form-message form-message-error" role="alert">
              {state.message}
            </p>
          ) : null}
          <button className="button" type="submit" disabled={pending}>
            {pending ? "Recording feedback..." : "Review conservative proposal"}
          </button>
        </form>
      ) : (
        <p>
          {schedule?.isPaused
            ? "This schedule is already paused. Resume it deliberately before requesting a new review."
            : !scheduleAvailable
              ? "Schedule data is currently unavailable. Reload before creating a progression proposal."
              : schedule
                ? "This schedule still references an earlier plan version. Review and save the recurring schedule before creating a progression proposal."
                : "Add a recurring schedule to review plan-level progression."}
        </p>
      )}
      <h3>Recorded proposals</h3>
      {reviews.length === 0 ? (
        <p>No progression feedback has been recorded for this plan.</p>
      ) : (
        <ol className="instruction-list">
          {reviews.map((review) => {
            const latest = review.events.at(-1);
            const active = latest?.action === "proposed";
            const sourceIsCurrent =
              schedule?.versionId === review.sourceScheduleVersionId;
            return (
              <li key={review.id}>
                <article>
                  <p className="status-label">{active ? "Proposed / not applied" : "Dismissed"}</p>
                  <p><strong>{describeProgressionFeedback(review.feedbackKind)}</strong></p>
                  <p>{describeProgressionProposal(review)}</p>
                  <p>
                    This proposal was recorded against an exact historical plan/schedule
                    snapshot. {sourceIsCurrent ? "That schedule is still current." : "The schedule has changed since this proposal."}
                  </p>
                  {active ? (
                    <DismissReview planId={planId} review={review} />
                  ) : null}
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
