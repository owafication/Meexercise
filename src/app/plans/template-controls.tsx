"use client";

import { useActionState } from "react";

import {
  createRoutineFromTemplateAction,
  saveRoutineTemplateAction,
  type RoutineTemplateActionState,
} from "./actions";

const initialRoutineTemplateActionState: RoutineTemplateActionState = {
  status: "idle",
  message: "",
};

function ActionMessage({
  status,
  message,
}: RoutineTemplateActionState) {
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

export function SaveRoutineTemplateForm({
  routineId,
  routineTitle,
}: {
  routineId: string;
  routineTitle: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveRoutineTemplateAction,
    initialRoutineTemplateActionState,
  );

  const inputId = `template-title-${routineId}`;

  return (
    <form action={formAction} className="form-stack">
      <input type="hidden" name="routineId" value={routineId} />

      <div className="field">
        <label htmlFor={inputId}>Template name for {routineTitle}</label>
        <input
          id={inputId}
          name="templateTitle"
          type="text"
          maxLength={80}
          required
          defaultValue={`${routineTitle} template`}
        />
      </div>

      <ActionMessage status={state.status} message={state.message} />

      <button
        className="button button-secondary"
        type="submit"
        disabled={pending}
      >
        {pending ? "Saving template..." : "Save as template"}
      </button>
    </form>
  );
}

export function CreateRoutineFromTemplateForm({
  templateId,
  templateTitle,
}: {
  templateId: string;
  templateTitle: string;
}) {
  const [state, formAction, pending] = useActionState(
    createRoutineFromTemplateAction,
    initialRoutineTemplateActionState,
  );

  const inputId = `routine-from-template-${templateId}`;

  return (
    <form action={formAction} className="form-stack">
      <input type="hidden" name="templateId" value={templateId} />

      <div className="field">
        <label htmlFor={inputId}>New routine title from {templateTitle}</label>
        <input
          id={inputId}
          name="routineTitle"
          type="text"
          maxLength={80}
          required
          defaultValue={templateTitle}
        />
      </div>

      <ActionMessage status={state.status} message={state.message} />

      <button className="button" type="submit" disabled={pending}>
        {pending ? "Creating routine..." : "Create routine from template"}
      </button>
    </form>
  );
}
