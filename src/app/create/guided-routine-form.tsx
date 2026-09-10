"use client";

import { useActionState } from "react";

import {
  GUIDED_ROUTINE_FOCUS_OPTIONS,
  initialGuidedRoutineActionState,
  type GuidedRoutineProposal,
} from "@/modules/planning/generator";

import {
  createManualRoutineAction,
  generateGuidedRoutineAction,
} from "./actions";
import { initialCreateRoutineActionState } from "./state";

function GuidedReviewForm({
  proposal,
}: {
  proposal: GuidedRoutineProposal;
}) {
  const [state, formAction, pending] = useActionState(
    createManualRoutineAction,
    initialCreateRoutineActionState,
  );

  return (
    <form action={formAction} className="form-stack">
      <div className="card card-featured">
        <p className="status-label">Proposal explanation</p>
        <h3>Purpose</h3>
        <p>{proposal.purposeExplanation}</p>
        <h3>Balance</h3>
        <p>{proposal.balanceExplanation}</p>
        <h3>Constraints</h3>
        <p>{proposal.constraintExplanation}</p>
        <h3>Substitutions and review</h3>
        <p>{proposal.substitutionExplanation}</p>
      </div>

      {state.message ? (
        <p className="form-message form-message-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="guided-review-routine-title">Routine title</label>
        <input
          id="guided-review-routine-title"
          name="title"
          type="text"
          maxLength={80}
          required
          defaultValue={proposal.title}
          aria-invalid={Boolean(state.fieldErrors?.title)}
          aria-describedby={
            state.fieldErrors?.title
              ? "guided-review-routine-title-error"
              : undefined
          }
        />
        {state.fieldErrors?.title ? (
          <p className="field-error" id="guided-review-routine-title-error">
            {state.fieldErrors.title}
          </p>
        ) : null}
      </div>

      <fieldset
        className="choice-group"
        aria-describedby={
          state.fieldErrors?.exercises
            ? "guided-review-help guided-review-error"
            : "guided-review-help"
        }
      >
        <legend>Review every proposed exercise</legend>
        <p className="field-help" id="guided-review-help">
          Each selector starts with the deterministic proposal. Review every
          item and replace any item before saving. Replacement choices preserve
          that proposal slot&apos;s target-area structure.
        </p>

        {proposal.items.map((item, index) => {
          const inputId = `guided-review-item-${index + 1}`;

          return (
            <div className="card" key={`${item.id}-${index}`}>
              <p className="status-label">
                Proposed item {index + 1} · {item.primaryTargetArea}
              </p>
              <h3>{item.title} — version {item.versionNumber}</h3>
              <p>{item.purpose}</p>
              <p>{item.summary}</p>
              <p>
                <strong>Equipment:</strong>{" "}
                {item.equipment.length > 0
                  ? item.equipment.join(", ")
                  : "No listed equipment"}
              </p>

              {item.substitutionNotes.length > 0 ? (
                <>
                  <p>
                    <strong>Reviewed compatible substitution notes:</strong>
                  </p>
                  <ul>
                    {item.substitutionNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>
                  No currently compatible reviewed substitution relation is
                  attached to this exact source version.
                </p>
              )}

              <div className="field">
                <label htmlFor={inputId}>
                  Exercise {index + 1} review choice
                </label>
                <select
                  id={inputId}
                  name="exerciseVersionId"
                  defaultValue={item.id}
                  required
                >
                  {item.replacementOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title} — version {option.versionNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}

        {state.fieldErrors?.exercises ? (
          <p className="field-error" id="guided-review-error">
            {state.fieldErrors.exercises}
          </p>
        ) : null}
      </fieldset>

      <button className="button" type="submit" disabled={pending}>
        {pending ? "Saving reviewed routine…" : "Save reviewed routine"}
      </button>
    </form>
  );
}

export function GuidedRoutineForm() {
  const [state, formAction, pending] = useActionState(
    generateGuidedRoutineAction,
    initialGuidedRoutineActionState,
  );

  return (
    <div className="form-stack">
      <form action={formAction} className="form-stack">
        <div className="field">
          <label htmlFor="guided-focus">Routine focus</label>
          <select
            id="guided-focus"
            name="guidedFocus"
            defaultValue="balanced"
          >
            {GUIDED_ROUTINE_FOCUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="guided-item-count">Number of exercises</label>
          <select
            id="guided-item-count"
            name="guidedItemCount"
            defaultValue="2"
          >
            {[1, 2, 3, 4, 5, 6].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>

        <p className="field-help">
          Generation is deterministic and uses only current approved exact
          exercise versions that pass the current structured readiness
          constraints. Runtime AI is not used.
        </p>

        {state.status === "error" ? (
          <p className="form-message form-message-error" role="alert">
            {state.message}
          </p>
        ) : null}

        <button className="button" type="submit" disabled={pending}>
          {pending ? "Generating proposal…" : "Generate routine proposal"}
        </button>
      </form>

      {state.status === "proposal" ? (
        <section
          className="form-stack"
          aria-labelledby="guided-review-title"
        >
          <p className="status-label">Generated proposal</p>
          <h3 id="guided-review-title">
            Review the proposal before saving
          </h3>
          <GuidedReviewForm proposal={state.proposal} />
        </section>
      ) : null}
    </div>
  );
}
