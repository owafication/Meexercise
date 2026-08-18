import type { AccountDeletionFieldErrors } from "@/modules/identity/account-lifecycle";

export type AccountDeletionActionState = {
  status: "idle" | "error";
  message: string;
  fieldErrors?: AccountDeletionFieldErrors;
};

export const initialAccountDeletionActionState: AccountDeletionActionState = {
  status: "idle",
  message: "",
};