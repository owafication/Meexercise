"use client";

import { useActionState } from "react";

import { saveProfileAction } from "@/app/profile/actions";
import { initialProfileActionState } from "@/app/profile/state";

export function ProfileForm({
  initialDisplayName,
  initialRowVersion,
}: {
  initialDisplayName: string | null;
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

      {state.message ? (
        <p
          className={messageClass}
          role={state.status === "error" || state.status === "conflict" ? "alert" : "status"}
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
