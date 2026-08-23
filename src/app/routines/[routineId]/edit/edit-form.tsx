"use client";

import { useActionState } from "react";

import {
  RoutineExerciseSlots,
  type RoutineExerciseSlotOption,
} from "@/modules/planning/routine-exercise-slots";

import { editManualRoutineAction } from "./actions";
import { initialEditRoutineActionState } from "./state";

type Props = {
  routineId: string;
  expectedVersionNumber: number;
  title: string;
  options: RoutineExerciseSlotOption[];
  selectedIds: string[];
  unavailableItems: string[];
};

export function EditRoutineForm({
  routineId,
  expectedVersionNumber,
  title,
  options,
  selectedIds,
  unavailableItems,
}: Props) {
  const [state, formAction, pending] = useActionState(
    editManualRoutineAction,
    initialEditRoutineActionState,
  );

  return (
    <form action={formAction} className="form-stack">
      <input type="hidden" name="routineId" value={routineId} />
      <input
        type="hidden"
        name="expectedVersionNumber"
        value={expectedVersionNumber}
      />

      {state.message ? (
        <p className="form-message form-message-error" role="alert">
          {state.message}
        </p>
      ) : null}

      {unavailableItems.length > 0 ? (
        <div className="card card-featured">
          <p className="status-label">Review required</p>
          <p>
            These historical exercise versions are no longer approved for a
            new routine version and have been left out of the editable slots:
          </p>
          <ul>
            {unavailableItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>Choose a currently approved replacement before saving.</p>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="edit-routine-title">Routine title</label>
        <input
          id="edit-routine-title"
          name="title"
          type="text"
          maxLength={80}
          required
          defaultValue={title}
          aria-invalid={Boolean(state.fieldErrors?.title)}
          aria-describedby={
            state.fieldErrors?.title ? "edit-routine-title-error" : undefined
          }
        />
        {state.fieldErrors?.title ? (
          <p className="field-error" id="edit-routine-title-error">
            {state.fieldErrors.title}
          </p>
        ) : null}
      </div>

      <RoutineExerciseSlots
        idPrefix="edit-routine"
        options={options}
        selectedIds={selectedIds}
        error={state.fieldErrors?.exercises}
      />

      <button className="button" type="submit" disabled={pending}>
        {pending ? "Saving new version…" : "Save new version"}
      </button>
    </form>
  );
}
