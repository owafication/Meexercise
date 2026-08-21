"use client";

import { useActionState } from "react";

import { createManualRoutineAction } from "./actions";
import { initialCreateRoutineActionState } from "./state";

type ExerciseOption = {
  id: string;
  title: string;
  versionNumber: number;
  summary: string;
  targetAreas: string[];
  equipment: string[];
};

export function RoutineForm({ exercises }: { exercises: ExerciseOption[] }) {
  const [state, formAction, pending] = useActionState(
    createManualRoutineAction,
    initialCreateRoutineActionState,
  );

  return (
    <form action={formAction} className="form-stack">
      {state.message ? (
        <p className="form-message form-message-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="routine-title">Routine title</label>
        <input
          id="routine-title"
          name="title"
          type="text"
          maxLength={80}
          required
          aria-invalid={Boolean(state.fieldErrors?.title)}
          aria-describedby={state.fieldErrors?.title ? "routine-title-error" : undefined}
        />
        {state.fieldErrors?.title ? (
          <p className="field-error" id="routine-title-error">
            {state.fieldErrors.title}
          </p>
        ) : null}
      </div>

      <fieldset
        className="choice-group"
        aria-describedby={state.fieldErrors?.exercises ? "routine-exercises-error" : "routine-exercises-help"}
      >
        <legend>Exercises</legend>
        <p className="field-help" id="routine-exercises-help">
          Choose 1–12 currently approved exercise versions. This manual builder does not generate or infer exercises for you.
        </p>

        {exercises.map((exercise) => (
          <label className="choice-option" key={exercise.id}>
            <input
              type="checkbox"
              name="exerciseVersionId"
              value={exercise.id}
            />
            <span>
              <strong>{exercise.title}</strong> · version {exercise.versionNumber}
              <br />
              {exercise.summary}
              <br />
              Target: {exercise.targetAreas.join(", ")}
              {" · "}
              Equipment: {exercise.equipment.length ? exercise.equipment.join(", ") : "None"}
            </span>
          </label>
        ))}

        {state.fieldErrors?.exercises ? (
          <p className="field-error" id="routine-exercises-error">
            {state.fieldErrors.exercises}
          </p>
        ) : null}
      </fieldset>

      <button className="button" type="submit" disabled={pending}>
        {pending ? "Saving routine…" : "Save routine"}
      </button>
    </form>
  );
}
