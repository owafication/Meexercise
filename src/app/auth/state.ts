export type AuthActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
};

export const initialAuthActionState: AuthActionState = {
  status: "idle",
  message: "",
};
