export type ProfileActionState = {
  status: "idle" | "error" | "success" | "conflict";
  message: string;
  rowVersion: number | null;
  fieldErrors?: {
    displayName?: string;
  };
};

export function initialProfileActionState(
  rowVersion: number | null,
): ProfileActionState {
  return {
    status: "idle",
    message: "",
    rowVersion,
  };
}
