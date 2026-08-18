export const ACCOUNT_DELETE_CONFIRMATION = "DELETE MY ACCOUNT";

export type AccountDeletionInput = {
  currentPassword: string;
  confirmation: string;
};

export type AccountDeletionFieldErrors = {
  currentPassword?: string;
  confirmation?: string;
};

function formText(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export function normalizeDeletionConfirmation(
  value: FormDataEntryValue | null,
): string {
  return formText(value).trim().replace(/\s+/g, " ");
}

export function parseAccountDeletionForm(
  formData: FormData,
): AccountDeletionInput {
  return {
    currentPassword: formText(formData.get("currentPassword")),
    confirmation: normalizeDeletionConfirmation(formData.get("confirmation")),
  };
}

export function accountDeletionFieldErrors(
  input: AccountDeletionInput,
): AccountDeletionFieldErrors {
  const errors: AccountDeletionFieldErrors = {};

  if (!input.currentPassword) {
    errors.currentPassword =
      "Enter your current password to confirm this account action.";
  }

  if (input.confirmation !== ACCOUNT_DELETE_CONFIRMATION) {
    errors.confirmation = `Type ${ACCOUNT_DELETE_CONFIRMATION} exactly.`;
  }

  return errors;
}

export function hasAccountDeletionFieldErrors(
  errors: AccountDeletionFieldErrors,
): boolean {
  return Object.values(errors).some(Boolean);
}