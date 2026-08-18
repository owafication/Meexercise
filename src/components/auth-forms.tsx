"use client";

import { useActionState } from "react";

import {
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
} from "@/app/auth/actions";
import { initialAuthActionState } from "@/app/auth/state";
import { MIN_PASSWORD_LENGTH } from "@/modules/identity/validation";

function FormMessage({
  status,
  message,
}: {
  status: "idle" | "error" | "success";
  message: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={status === "error" ? "form-message form-message-error" : "form-message"}
      role={status === "error" ? "alert" : "status"}
    >
      {message}
    </p>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="field-error" id={id}>
      {message}
    </p>
  );
}

export function SignInForm() {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialAuthActionState,
  );

  return (
    <form action={formAction} className="form-stack">
      <div className="field">
        <label htmlFor="sign-in-email">Email</label>
        <input
          id="sign-in-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-describedby={state.fieldErrors?.email ? "sign-in-email-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        <FieldError id="sign-in-email-error" message={state.fieldErrors?.email} />
      </div>

      <div className="field">
        <label htmlFor="sign-in-password">Password</label>
        <input
          id="sign-in-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-describedby={
            state.fieldErrors?.password ? "sign-in-password-error" : undefined
          }
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
        <FieldError
          id="sign-in-password-error"
          message={state.fieldErrors?.password}
        />
      </div>

      <FormMessage status={state.status} message={state.message} />

      <button className="button" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(
    signUpAction,
    initialAuthActionState,
  );

  return (
    <form action={formAction} className="form-stack">
      <div className="field">
        <label htmlFor="sign-up-email">Email</label>
        <input
          id="sign-up-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-describedby={state.fieldErrors?.email ? "sign-up-email-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        <FieldError id="sign-up-email-error" message={state.fieldErrors?.email} />
      </div>

      <div className="field">
        <label htmlFor="sign-up-password">Password</label>
        <input
          id="sign-up-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          aria-describedby={
            state.fieldErrors?.password
              ? "sign-up-password-help sign-up-password-error"
              : "sign-up-password-help"
          }
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
        <p className="field-help" id="sign-up-password-help">
          Use at least {MIN_PASSWORD_LENGTH} characters.
        </p>
        <FieldError
          id="sign-up-password-error"
          message={state.fieldErrors?.password}
        />
      </div>

      <div className="field">
        <label htmlFor="sign-up-confirm-password">Confirm password</label>
        <input
          id="sign-up-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          aria-describedby={
            state.fieldErrors?.confirmPassword
              ? "sign-up-confirm-password-error"
              : undefined
          }
          aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
        />
        <FieldError
          id="sign-up-confirm-password-error"
          message={state.fieldErrors?.confirmPassword}
        />
      </div>

      <FormMessage status={state.status} message={state.message} />

      <button className="button" type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialAuthActionState,
  );

  return (
    <form action={formAction} className="form-stack">
      <div className="field">
        <label htmlFor="reset-email">Email</label>
        <input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-describedby={state.fieldErrors?.email ? "reset-email-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        <FieldError id="reset-email-error" message={state.fieldErrors?.email} />
      </div>

      <FormMessage status={state.status} message={state.message} />

      <button className="button" type="submit" disabled={pending}>
        {pending ? "Requesting reset…" : "Send reset link"}
      </button>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initialAuthActionState,
  );

  return (
    <form action={formAction} className="form-stack">
      <div className="field">
        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          aria-describedby={
            state.fieldErrors?.password
              ? "new-password-help new-password-error"
              : "new-password-help"
          }
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
        <p className="field-help" id="new-password-help">
          Use at least {MIN_PASSWORD_LENGTH} characters.
        </p>
        <FieldError id="new-password-error" message={state.fieldErrors?.password} />
      </div>

      <div className="field">
        <label htmlFor="new-password-confirm">Confirm new password</label>
        <input
          id="new-password-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          aria-describedby={
            state.fieldErrors?.confirmPassword
              ? "new-password-confirm-error"
              : undefined
          }
          aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
        />
        <FieldError
          id="new-password-confirm-error"
          message={state.fieldErrors?.confirmPassword}
        />
      </div>

      <FormMessage status={state.status} message={state.message} />

      <button className="button" type="submit" disabled={pending}>
        {pending ? "Updating password…" : "Update password"}
      </button>
    </form>
  );
}
