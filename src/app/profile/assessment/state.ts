import type { ReadinessFieldErrors } from "@/modules/profile-assessment/readiness";

export type AssessmentStartState = {
  status: "idle" | "error";
  message: string;
};

export const initialAssessmentStartState: AssessmentStartState = {
  status: "idle",
  message: "",
};

export type AssessmentActionState = {
  status: "idle" | "error" | "success" | "conflict" | "completed";
  message: string;
  rowVersion: number;
  fieldErrors?: ReadinessFieldErrors;
};

export function initialAssessmentActionState(
  rowVersion: number,
): AssessmentActionState {
  return {
    status: "idle",
    message: "",
    rowVersion,
  };
}