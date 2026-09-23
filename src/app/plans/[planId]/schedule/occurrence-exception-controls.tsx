"use client";

import { useActionState } from "react";

import {
  savePlanScheduleOccurrenceExceptionAction,
  type ScheduleExceptionActionState,
} from "@/app/plans/actions";

const initialState: ScheduleExceptionActionState = {
  status: "idle",
  message: "",
};

type Occurrence = {
  scheduleVersionNumber: number;
  localDate: string;
  localDateLabel: string;
  windowStart: string;
  windowEnd: string;
  routineVersionId: string;
  routineVersionNumber: number;
  routineTitle: string;
  originalLocalDate: string;
  exceptionVersionNumber: number;
  status: "scheduled" | "rescheduled";
};

type ActiveException = {
  versionNumber: number;
  originalLocalDate: string;
  routineTitle: string;
};

function ActionMessage({ state }: { state: ScheduleExceptionActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={
        state.status === "error"
          ? "form-message form-message-error"
          : "form-message"
      }
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </p>
  );
}

export function OccurrenceExceptionControls({
  planId,
  occurrence,
}: {
  planId: string;
  occurrence: Occurrence;
}) {
  const [state, formAction, pending] = useActionState(
    savePlanScheduleOccurrenceExceptionAction,
    initialState,
  );
  const inputPrefix = `occurrence-${occurrence.originalLocalDate}-${occurrence.routineVersionId}`;

  return (
    <form action={formAction} className="form-stack">
      <input type="hidden" name="planId" value={planId} />
      <input
        type="hidden"
        name="expectedScheduleVersionNumber"
        value={occurrence.scheduleVersionNumber}
      />
      <input
        type="hidden"
        name="originalLocalDate"
        value={occurrence.originalLocalDate}
      />
      <input
        type="hidden"
        name="expectedExceptionVersionNumber"
        value={occurrence.exceptionVersionNumber}
      />

      <div className="action-row">
        <button
          className="button button-secondary"
          type="submit"
          name="exceptionAction"
          value="skip"
          disabled={pending}
        >
          Skip this occurrence
        </button>
      </div>

      <fieldset className="form-stack">
        <legend>Reschedule this occurrence</legend>

        <div className="field">
          <label htmlFor={`${inputPrefix}-date`}>Rescheduled date</label>
          <input
            id={`${inputPrefix}-date`}
            name="rescheduledLocalDate"
            type="date"
            required
            defaultValue={occurrence.localDate}
          />
        </div>

        <div className="field">
          <label htmlFor={`${inputPrefix}-start`}>
            Rescheduled window start
          </label>
          <input
            id={`${inputPrefix}-start`}
            name="rescheduledWindowStart"
            type="time"
            required
            defaultValue={occurrence.windowStart}
          />
        </div>

        <div className="field">
          <label htmlFor={`${inputPrefix}-end`}>
            Rescheduled window end
          </label>
          <input
            id={`${inputPrefix}-end`}
            name="rescheduledWindowEnd"
            type="time"
            required
            defaultValue={occurrence.windowEnd}
          />
        </div>

        <button
          className="button"
          type="submit"
          name="exceptionAction"
          value="reschedule"
          disabled={pending}
        >
          Reschedule this occurrence
        </button>
      </fieldset>

      <ActionMessage state={state} />
    </form>
  );
}

export function ExceptionRestoreControl({
  planId,
  scheduleVersionNumber,
  exception,
}: {
  planId: string;
  scheduleVersionNumber: number;
  exception: ActiveException;
}) {
  const [state, formAction, pending] = useActionState(
    savePlanScheduleOccurrenceExceptionAction,
    initialState,
  );

  return (
    <form action={formAction} className="form-stack">
      <input type="hidden" name="planId" value={planId} />
      <input
        type="hidden"
        name="expectedScheduleVersionNumber"
        value={scheduleVersionNumber}
      />
      <input
        type="hidden"
        name="originalLocalDate"
        value={exception.originalLocalDate}
      />
      <input
        type="hidden"
        name="expectedExceptionVersionNumber"
        value={exception.versionNumber}
      />
      <button
        className="button button-secondary"
        type="submit"
        name="exceptionAction"
        value="restore"
        disabled={pending}
      >
        Restore original occurrence
      </button>
      <ActionMessage state={state} />
    </form>
  );
}
