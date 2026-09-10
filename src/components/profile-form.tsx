"use client";

import { useActionState } from "react";

import { saveProfileAction } from "@/app/profile/actions";
import { initialProfileActionState } from "@/app/profile/state";
import {
  AVAILABLE_MINUTES_OPTIONS,
  PLANNING_EQUIPMENT_OPTIONS,
  PLANNING_FACILITY_OPTIONS,
  PLANNING_GOAL_OPTIONS,
  PLANNING_METHOD_OPTIONS,
  ROUTINE_FREQUENCY_OPTIONS,
  type PlanningProfile,
} from "@/modules/profile-assessment/planning-profile";

export function ProfileForm({
  initialDisplayName,
  initialPlanningProfile,
  initialRowVersion,
}: {
  initialDisplayName: string | null;
  initialPlanningProfile: PlanningProfile;
  initialRowVersion: number | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveProfileAction,
    initialProfileActionState(initialRowVersion),
  );

  const messageClass =
    state.status === "error" || state.status === "conflict"
      ? "form-message form-message-error"
      : "form-message";

  return (
    <form action={formAction} className="form-stack">
      <input
        type="hidden"
        name="rowVersion"
        value={state.rowVersion ?? ""}
      />

      <div className="field">
        <label htmlFor="display-name">Display name</label>
        <input
          id="display-name"
          name="displayName"
          type="text"
          autoComplete="name"
          defaultValue={initialDisplayName ?? ""}
          maxLength={80}
          aria-describedby={
            state.fieldErrors?.displayName
              ? "display-name-help display-name-error"
              : "display-name-help"
          }
          aria-invalid={Boolean(state.fieldErrors?.displayName)}
        />
        <p className="field-help" id="display-name-help">
          Optional. This is private account profile data and is not a public
          profile.
        </p>
        {state.fieldErrors?.displayName ? (
          <p className="field-error" id="display-name-error">
            {state.fieldErrors.displayName}
          </p>
        ) : null}
      </div>

      <fieldset className="choice-group">
        <legend>Goals and priority</legend>
        <p className="field-help">
          These are general-wellness planning goals. Primary and secondary
          positions record priority; they are not medical treatment goals.
        </p>

        <div className="field">
          <label htmlFor="primary-goal">Primary goal</label>
          <select
            id="primary-goal"
            name="primaryGoal"
            defaultValue={initialPlanningProfile.primaryGoal ?? ""}
            aria-invalid={Boolean(state.fieldErrors?.primaryGoal)}
          >
            <option value="">Not set</option>
            {PLANNING_GOAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.primaryGoal ? (
            <p className="field-error">{state.fieldErrors.primaryGoal}</p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="secondary-goal">Secondary goal</label>
          <select
            id="secondary-goal"
            name="secondaryGoal"
            defaultValue={initialPlanningProfile.secondaryGoal ?? ""}
            aria-invalid={Boolean(state.fieldErrors?.secondaryGoal)}
          >
            <option value="">Not set</option>
            {PLANNING_GOAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.secondaryGoal ? (
            <p className="field-error">{state.fieldErrors.secondaryGoal}</p>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="choice-group">
        <legend>Preferred methods</legend>
        <p className="field-help">
          Choose any methods you prefer. Preferences are current planning
          context and do not override readiness restrictions.
        </p>
        {PLANNING_METHOD_OPTIONS.map((option) => (
          <label className="checkbox-row" key={option.value}>
            <input
              type="checkbox"
              name="preferredMethod"
              value={option.value}
              defaultChecked={initialPlanningProfile.preferredMethods.includes(
                option.value,
              )}
            />
            <span>{option.label}</span>
          </label>
        ))}
        {state.fieldErrors?.preferredMethods ? (
          <p className="field-error">{state.fieldErrors.preferredMethods}</p>
        ) : null}
      </fieldset>

      <fieldset className="choice-group">
        <legend>Equipment available</legend>
        <p className="field-help">
          Choose the equipment you can reliably use. If you choose no special
          equipment, do not combine it with another equipment choice.
        </p>
        {PLANNING_EQUIPMENT_OPTIONS.map((option) => (
          <label className="checkbox-row" key={option.value}>
            <input
              type="checkbox"
              name="equipment"
              value={option.value}
              defaultChecked={initialPlanningProfile.equipment.includes(
                option.value,
              )}
            />
            <span>{option.label}</span>
          </label>
        ))}
        {state.fieldErrors?.equipment ? (
          <p className="field-error">{state.fieldErrors.equipment}</p>
        ) : null}
      </fieldset>

      <fieldset className="choice-group">
        <legend>Facilities available</legend>
        <p className="field-help">
          Choose the places you normally have available for exercise.
        </p>
        {PLANNING_FACILITY_OPTIONS.map((option) => (
          <label className="checkbox-row" key={option.value}>
            <input
              type="checkbox"
              name="facility"
              value={option.value}
              defaultChecked={initialPlanningProfile.facilities.includes(
                option.value,
              )}
            />
            <span>{option.label}</span>
          </label>
        ))}
        {state.fieldErrors?.facilities ? (
          <p className="field-error">{state.fieldErrors.facilities}</p>
        ) : null}
      </fieldset>

      <div className="field">
        <label htmlFor="available-minutes">Available time per routine</label>
        <select
          id="available-minutes"
          name="availableMinutes"
          defaultValue={initialPlanningProfile.availableMinutes ?? ""}
          aria-invalid={Boolean(state.fieldErrors?.availableMinutes)}
        >
          <option value="">Not set</option>
          {AVAILABLE_MINUTES_OPTIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} minutes
            </option>
          ))}
        </select>
        {state.fieldErrors?.availableMinutes ? (
          <p className="field-error">{state.fieldErrors.availableMinutes}</p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="routine-frequency-days">Preferred routine frequency</label>
        <select
          id="routine-frequency-days"
          name="routineFrequencyDays"
          defaultValue={initialPlanningProfile.routineFrequencyDays ?? ""}
          aria-invalid={Boolean(state.fieldErrors?.routineFrequencyDays)}
        >
          <option value="">Not set</option>
          {ROUTINE_FREQUENCY_OPTIONS.map((days) => (
            <option key={days} value={days}>
              {days} {days === 1 ? "day" : "days"} per week
            </option>
          ))}
        </select>
        {state.fieldErrors?.routineFrequencyDays ? (
          <p className="field-error">
            {state.fieldErrors.routineFrequencyDays}
          </p>
        ) : null}
      </div>

      {state.message ? (
        <p
          className={messageClass}
          role={
            state.status === "error" || state.status === "conflict"
              ? "alert"
              : "status"
          }
        >
          {state.message}
        </p>
      ) : null}

      <button className="button" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
