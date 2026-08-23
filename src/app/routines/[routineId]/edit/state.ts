export type EditRoutineActionState = {
  status: "idle" | "error";
  message: string;
  fieldErrors?: {
    title?: string;
    exercises?: string;
  };
};

export const initialEditRoutineActionState: EditRoutineActionState = {
  status: "idle",
  message: "",
};
