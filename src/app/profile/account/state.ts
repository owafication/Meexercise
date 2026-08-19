import type { AccountDeletionFieldErrors } from "@/modules/identity/account-lifecycle";

export type AccountEmailChangeActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: {
    newEmail?: string;
    currentPassword?: string;
  };
};

export const initialAccountEmailChangeActionState: AccountEmailChangeActionState = {
  status: "idle",
  message: "",
};

export type AccountDeletionActionState = {
  status: "idle" | "error";
  message: string;
  fieldErrors?: AccountDeletionFieldErrors;
};

export const initialAccountDeletionActionState: AccountDeletionActionState = {
  status: "idle",
  message: "",
};
