"use client";

import { useActionState } from "react";

import { startAssessmentAction } from "@/app/profile/assessment/actions";
import { initialAssessmentStartState } from "@/app/profile/assessment/state";

export function AssessmentStartForm({
  label = "Start readiness assessment",
}: {
  label?: string;
}) {
  const [state, formAction, pending] = useActionState(
    startAssessmentAction,
    initialAssessmentStartState,
  );

  return (
    <form action={formAction}>
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