"use client";

import { useActionState } from "react";

import {
  startAssessmentAction,
  startAssessmentCorrectionAction,
} from "@/app/profile/assessment/actions";
import { initialAssessmentStartState } from "@/app/profile/assessment/state";

export function AssessmentStartForm({
  label = "Start readiness assessment",
  correctsSessionId,
}: {
  label?: string;
  correctsSessionId?: string;
}) {
  const action = correctsSessionId
    ? startAssessmentCorrectionAction
    : startAssessmentAction;

  const [state, formAction, pending] = useActionState(
    action,
    initialAssessmentStartState,
  );

  return (
    <form action={formAction}>
      {correctsSessionId ? (
        <input
          type="hidden"
          name="correctsSessionId"
          value={correctsSessionId}
        />
      ) : null}

      {state.message ? (
        <p className="form-message form-message-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <button className="button" type="submit" disabled={pending}>
        {pending ? "Starting…" : label}
      </button>
    </form>
  );
}
