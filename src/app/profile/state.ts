export type ProfileActionState = {
  status: "idle" | "error" | "success" | "conflict";
  message: string;
  rowVersion: number | null;
  fieldErrors?: {
    displayName?: string;
    primaryGoal?: string;
    secondaryGoal?: string;
    preferredMethods?: string;
    equipment?: string;
    facilities?: string;
    availableMinutes?: string;
    routineFrequencyDays?: string;
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
