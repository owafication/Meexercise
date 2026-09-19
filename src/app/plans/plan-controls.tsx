"use client";

import { useActionState } from "react";

import {
  createPlanAction,
  createPlanVersionAction,
  type PlanActionState,
} from "./actions";

const initialPlanActionState: PlanActionState = {
  status: "idle",
  message: "",
};

type PlanRoutineOption = {
  routineId: string;
  versionId: string;
  title: string;
  versionNumber: number;
};

function ActionMessage({ status, message }: PlanActionState) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={
        status === "error"
          ? "form-message form-message-error"
          : "form-message"
      }
      role={status === "error" ? "alert" : "status"}
    >
      {message}
    </p>
  );
}

function RoutineChoices({
  options,
  selectedVersionIds = [],
}: {
  options: PlanRoutineOption[];
  selectedVersionIds?: string[];
}) {
  const selected = new Set(selectedVersionIds);

  return (
    <fieldset className="form-stack">
      <legend>Routine snapshots in this plan</legend>
      <p>
        Select one exact version for each routine you want to include. The
        stored plan version keeps these exact references even if a routine is
        edited later.
      </p>
      {options.map((option) => (
        <label key={option.versionId}>
          <input
            type="checkbox"
            name="routineVersionId"
            value={option.versionId}
            defaultChecked={selected.has(option.versionId)}
          />{" "}
          {option.title} - routine version {option.versionNumber}
        </label>
      ))}
    </fieldset>
  );
}

export function CreatePlanForm({
  routines,
}: {
  routines: PlanRoutineOption[];
}) {
  const [state, formAction, pending] = useActionState(
    createPlanAction,
    initialPlanActionState,
  );

  return (
    <form action={formAction} className="form-stack">
      <div className="field">
        <label htmlFor="new-plan-title">Plan title</label>
        <input
          id="new-plan-title"
          name="planTitle"
          type="text"
          maxLength={80}
          required
          defaultValue="My plan"
        />
      </div>

      <RoutineChoices options={routines} />
      <ActionMessage status={state.status} message={state.message} />

      <button className="button" type="submit" disabled={pending}>
        {pending ? "Saving plan..." : "Save plan"}
      </button>
    </form>
  );
}

export function EditPlanForm({
  planId,
  expectedVersionNumber,
  title,
  options,
  selectedVersionIds,
}: {
  planId: string;
  expectedVersionNumber: number;
  title: string;
  options: PlanRoutineOption[];
  selectedVersionIds: string[];
}) {
  const [state, formAction, pending] = useActionState(
    createPlanVersionAction,
    initialPlanActionState,
  );

  return (
    <form action={formAction} className="form-stack">
      <input type="hidden" name="planId" value={planId} />
      <input
        type="hidden"
        name="expectedVersionNumber"
        value={expectedVersionNumber}
      />

      <div className="field">
        <label htmlFor={`edit-plan-title-${planId}`}>Plan title</label>
        <input
          id={`edit-plan-title-${planId}`}
          name="planTitle"
          type="text"
          maxLength={80}
          required
          defaultValue={title}
        />
      </div>

      <RoutineChoices
        options={options}
        selectedVersionIds={selectedVersionIds}
      />
      <ActionMessage status={state.status} message={state.message} />

      <button className="button" type="submit" disabled={pending}>
        {pending ? "Saving new version..." : "Save new plan version"}
      </button>
    </form>
  );
}