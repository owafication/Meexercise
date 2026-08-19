"use client";

import { useActionState } from "react";

import { requestAccountEmailChangeAction } from "@/app/profile/account/actions";
import { initialAccountEmailChangeActionState } from "@/app/profile/account/state";

export function AccountEmailChangeForm() {
  const [state, formAction, pending] = useActionState(
    requestAccountEmailChangeAction,
    initialAccountEmailChangeActionState,
  );

  return (
    <form action={formAction} className="form-stack">
      <div className="field">
        <label htmlFor="new-account-email">New email</label>
        <input
          id="new-account-email"
          name="newEmail"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(state.fieldErrors?.newEmail)}
          aria-describedby={
            state.fieldErrors?.newEmail
              ? "new-account-email-help new-account-email-error"
              : "new-account-email-help"
          }
        />
        <p className="field-help" id="new-account-email-help">
          The new address must confirm ownership before the account email
          changes.
        </p>
        {state.fieldErrors?.newEmail ? (
          <p className="field-error" id="new-account-email-error">
            {state.fieldErrors.newEmail}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="email-change-password">
          Current password for email change
        </label>
        <input
          id="email-change-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.currentPassword)}
          aria-describedby={
            state.fieldErrors?.currentPassword
              ? "email-change-password-help email-change-password-error"
              : "email-change-password-help"
          }
        />
        <p className="field-help" id="email-change-password-help">
          Re-enter your password before requesting this identity change.
        </p>
        {state.fieldErrors?.currentPassword ? (
          <p className="field-error" id="email-change-password-error">
            {state.fieldErrors.currentPassword}
          </p>
        ) : null}
      </div>

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
        {pending ? "Requesting change…" : "Request email change"}
      </button>
    </form>
  );
}
