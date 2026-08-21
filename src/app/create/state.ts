export type CreateRoutineActionState = {
  status: "idle" | "error";
  message: string;
  fieldErrors?: {
    title?: string;
    exercises?: string;
  };
};

export const initialCreateRoutineActionState: CreateRoutineActionState = {
  status: "idle",
  message: "",
};
