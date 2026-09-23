import type {
  ProgressionFeedbackKind,
  ProgressionReviewSnapshot,
} from "@/modules/planning/server/progression";

const weekdayLabels = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export function progressionWeekdayLabel(day: number) {
  return weekdayLabels[day] ?? `Day ${day}`;
}

export function describeProgressionFeedback(kind: ProgressionFeedbackKind) {
  switch (kind) {
    case "discomfort":
      return "Self-reported discomfort";
    case "excessive_difficulty":
      return "Self-reported excessive difficulty";
    case "user_requested_reduction":
      return "Requested schedule reduction";
  }
}

export function describeProgressionProposal(review: ProgressionReviewSnapshot) {
  if (review.proposedAction === "pause") {
    return `Pause the current recurring schedule: ${review.oldWeeklySessions} scheduled days per week to 0 until a later reviewed schedule version resumes it.`;
  }

  if (review.removeWeekday === null) {
    return "The proposed reduction could not be verified.";
  }

  return (
    `Reduce the recurring schedule from ${review.oldWeeklySessions} ` +
    `to ${review.newWeeklySessions} days per week by removing ` +
    `${progressionWeekdayLabel(review.removeWeekday)}. ` +
    "Existing routine snapshots and other scheduled windows stay unchanged."
  );
}
