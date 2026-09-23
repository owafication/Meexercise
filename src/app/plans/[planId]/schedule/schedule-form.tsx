"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";

import {
  savePlanScheduleAction,
  type ScheduleActionState,
} from "@/app/plans/actions";

type RoutineOption = {
  routineId: string;
  routineVersionId: string;
  routineVersionNumber: number;
  routineTitle: string;
};

type ExistingRule = {
  weekday: number;
  routineVersionId: string;
  windowStart: string;
  windowEnd: string;
};

type ExistingSchedule = {
  versionNumber: number;
  planVersionNumber: number;
  timezoneName: string;
  startsOn: string;
  isPaused: boolean;
  rules: ExistingRule[];
};

const initialState: ScheduleActionState = {
  status: "idle",
  message: "",
};

const weekdays = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

function browserLocalDate() {
  const now = new Date();
  const year = String(now.getFullYear()).padStart(4, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ScheduleForm({
  planId,
  currentPlanVersionNumber,
  routines,
  schedule,
}: {
  planId: string;
  currentPlanVersionNumber: number;
  routines: RoutineOption[];
  schedule: ExistingSchedule | null;
}) {
  const [state, formAction, pending] = useActionState(
    savePlanScheduleAction,
    initialState,
  );
  const timezoneInputRef = useRef<HTMLInputElement>(null);
  const startsOnInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (
      !schedule?.timezoneName &&
      timezoneInputRef.current &&
      !timezoneInputRef.current.value
    ) {
      timezoneInputRef.current.value =
        Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    if (
      !schedule?.startsOn &&
      startsOnInputRef.current &&
      !startsOnInputRef.current.value
    ) {
      startsOnInputRef.current.value = browserLocalDate();
    }
  }, [schedule?.startsOn, schedule?.timezoneName]);

  const currentRoutineVersionIds = useMemo(
    () => new Set(routines.map((routine) => routine.routineVersionId)),
    [routines],
  );

  const existingByWeekday = useMemo(() => {
    const map = new Map<number, ExistingRule>();

    for (const rule of schedule?.rules ?? []) {
      map.set(rule.weekday, rule);
    }

    return map;
  }, [schedule]);

  const planVersionChanged =
    schedule !== null &&
    schedule.planVersionNumber !== currentPlanVersionNumber;

  return (
    <form action={formAction} className="form-stack">
      <input type="hidden" name="planId" value={planId} />
      <input
        type="hidden"
        name="expectedPlanVersionNumber"
        value={currentPlanVersionNumber}
      />
      <input
        type="hidden"
        name="expectedScheduleVersionNumber"
        value={schedule?.versionNumber ?? 0}
      />

      {planVersionChanged ? (
        <p className="form-message">
          The current schedule is pinned to plan version{" "}
          {schedule.planVersionNumber}. Saving here creates a new schedule
          version against current plan version {currentPlanVersionNumber}.
          Days whose exact routine version is no longer in the plan must be
          reselected.
        </p>
      ) : null}

      <div className="field">
        <label htmlFor={`schedule-timezone-${planId}`}>Schedule timezone</label>
        <input
          ref={timezoneInputRef}
          id={`schedule-timezone-${planId}`}
          name="timezoneName"
          type="text"
          maxLength={64}
          required
          defaultValue={schedule?.timezoneName ?? ""}
        />
        <p className="field-help">
          Use a named timezone such as Australia/Adelaide. On first setup the
          browser timezone is filled automatically. Named zones preserve local
          wall-clock times when daylight-saving offsets change.
        </p>
      </div>

      <div className="field">
        <label htmlFor={`schedule-starts-${planId}`}>Schedule starts on</label>
        <input
          ref={startsOnInputRef}
          id={`schedule-starts-${planId}`}
          name="startsOn"
          type="date"
          required
          defaultValue={schedule?.startsOn ?? ""}
        />
      </div>

      <label className="choice-option">
        <input
          type="checkbox"
          name="schedulePaused"
          defaultChecked={schedule?.isPaused ?? false}
        />
        <span>
          Pause this recurring schedule. The saved weekly rules remain in the
          new immutable schedule version, but no upcoming occurrences are
          produced until a later version resumes it.
        </span>
      </label>

      <fieldset className="form-stack">
        <legend>Weekly routine windows</legend>
        <p>
          Choose at most one routine window per weekday in this first PH-05
          scheduling slice. Leave a weekday set to No routine when it should
          not recur.
        </p>

        {weekdays.map((day) => {
          const existing = existingByWeekday.get(day.value);
          const selectedRoutineVersionId =
            existing &&
            currentRoutineVersionIds.has(existing.routineVersionId)
              ? existing.routineVersionId
              : "";

          return (
            <fieldset className="card" key={day.value}>
              <legend>{day.label}</legend>

              <div className="field">
                <label htmlFor={`schedule-routine-${day.value}`}>
                  {day.label} routine
                </label>
                <select
                  id={`schedule-routine-${day.value}`}
                  name={`scheduleRoutine-${day.value}`}
                  defaultValue={selectedRoutineVersionId}
                >
                  <option value="">No routine</option>
                  {routines.map((routine) => (
                    <option
                      key={routine.routineVersionId}
                      value={routine.routineVersionId}
                    >
                      {routine.routineTitle} - routine version{" "}
                      {routine.routineVersionNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor={`schedule-start-${day.value}`}>
                  {day.label} window start
                </label>
                <input
                  id={`schedule-start-${day.value}`}
                  name={`scheduleStart-${day.value}`}
                  type="time"
                  defaultValue={existing?.windowStart ?? "09:00"}
                />
              </div>

              <div className="field">
                <label htmlFor={`schedule-end-${day.value}`}>
                  {day.label} window end
                </label>
                <input
                  id={`schedule-end-${day.value}`}
                  name={`scheduleEnd-${day.value}`}
                  type="time"
                  defaultValue={existing?.windowEnd ?? "10:00"}
                />
              </div>
            </fieldset>
          );
        })}
      </fieldset>

      {state.message ? (
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
      ) : null}

      <button className="button" type="submit" disabled={pending}>
        {pending
          ? "Saving schedule..."
          : schedule
            ? "Save new schedule version"
            : "Save recurring schedule"}
      </button>
    </form>
  );
}
