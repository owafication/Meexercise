"use client";

import { useActionState } from "react";

import { RoutineExerciseSlots } from "@/modules/planning/routine-exercise-slots";

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

      <RoutineExerciseSlots
        idPrefix="create-routine"
        options={exercises}
        error={state.fieldErrors?.exercises}
      />

      <button className="button" type="submit" disabled={pending}>
        {pending ? "Saving routine…" : "Save routine"}
      </button>
    </form>
  );
}
