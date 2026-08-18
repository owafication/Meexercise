"use client";

import { useActionState } from "react";

import { deleteAccountAction } from "@/app/profile/account/actions";
import { initialAccountDeletionActionState } from "@/app/profile/account/state";
import { ACCOUNT_DELETE_CONFIRMATION } from "@/modules/identity/account-lifecycle";

export function AccountDeletionForm() {
  const [state, formAction, pending] = useActionState(
    deleteAccountAction,
    initialAccountDeletionActionState,
  );

  return (
    <form action={formAction} className="form-stack">
      <div className="field">
        <label htmlFor="current-password">Current password</label>
        <input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(state.fieldErrors?.currentPassword)}
          aria-describedby={
            state.fieldErrors?.currentPassword
              ? "current-password-help current-password-error"
              : "current-password-help"
          }
        />
        <p className="field-help" id="current-password-help">
          Re-enter your current password immediately before this destructive
          account action.
        </p>
        {state.fieldErrors?.currentPassword ? (
          <p className="field-error" id="current-password-error">
            {state.fieldErrors.currentPassword}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="delete-confirmation">
          Type {ACCOUNT_DELETE_CONFIRMATION} to confirm
        </label>
        <input
          id="delete-confirmation"
          name="confirmation"
          type="text"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(state.fieldErrors?.confirmation)}
          aria-describedby={
            state.fieldErrors?.confirmation
              ? "delete-confirmation-help delete-confirmation-error"
              : "delete-confirmation-help"
          }
        />
        <p className="field-help" id="delete-confirmation-help">
          This permanently deletes the current account and its stored
          MeExercise profile, assessment sessions, and assessment safety flags.
          Download your data first if you want to keep a copy.
        </p>
        {state.fieldErrors?.confirmation ? (
          <p className="field-error" id="delete-confirmation-error">
            {state.fieldErrors.confirmation}
          </p>
        ) : null}
      </div>

      {state.message ? (
        <p className="form-message form-message-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <button className="button button-danger" type="submit" disabled={pending}>
        {pending ? "Deleting…" : "Delete account permanently"}
      </button>
    </form>
  );
}