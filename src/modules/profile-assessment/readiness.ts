export const READINESS_TEMPLATE_KEY = "readiness_baseline";

export const ACTIVITY_FREQUENCY_OPTIONS = [
  { value: "less_than_weekly", label: "Less than once per week" },
  { value: "one_two_days", label: "1–2 days per week" },
  { value: "three_four_days", label: "3–4 days per week" },
  { value: "five_plus_days", label: "5 or more days per week" },
] as const;

export const INDEPENDENT_EXERCISE_OPTIONS = [
  { value: "yes", label: "Yes, I can exercise independently" },
  {
    value: "unsure",
    label: "I am unsure about exercising independently",
  },
  {
    value: "no",
    label: "No, I do not currently exercise independently",
  },
] as const;

export const PROFESSIONAL_RESTRICTION_OPTIONS = [
  { value: "no", label: "No professional restriction has been given" },
  {
    value: "yes",
    label: "Yes, I have been told to avoid or modify exercise",
  },
  {
    value: "unsure",
    label: "I am unsure whether previous advice still applies",
  },
] as const;

export type ActivityFrequency =
  (typeof ACTIVITY_FREQUENCY_OPTIONS)[number]["value"];

export type ReadinessChoice =
  (typeof INDEPENDENT_EXERCISE_OPTIONS)[number]["value"];

export type ProfessionalRestriction =
  (typeof PROFESSIONAL_RESTRICTION_OPTIONS)[number]["value"];

export type ReadinessAssessmentAnswers = {
  activity: {
    frequency: ActivityFrequency | null;
  };
  limitations: {
    hasLimitations: boolean | null;
    affectedAreas: string;
    avoidedMovements: string;
  };
  readiness: {
    independentExercise: ReadinessChoice | null;
    professionalRestriction: ProfessionalRestriction | null;
  };
};

export type ReadinessFieldErrors = {
  activityFrequency?: string;
  hasLimitations?: string;
  limitationDetails?: string;
  affectedAreas?: string;
  avoidedMovements?: string;
  independentExercise?: string;
  professionalRestriction?: string;
};

function normalizeText(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ");
}

function parseOption<T extends string>(
  value: FormDataEntryValue | null,
  allowed: readonly T[],
): T | null {
  if (typeof value !== "string") {
    return null;
  }

  return allowed.includes(value as T) ? (value as T) : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function storedString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function storedBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function storedOption<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : null;
}

export function emptyReadinessAnswers(): ReadinessAssessmentAnswers {
  return {
    activity: {
      frequency: null,
    },
    limitations: {
      hasLimitations: null,
      affectedAreas: "",
      avoidedMovements: "",
    },
    readiness: {
      independentExercise: null,
      professionalRestriction: null,
    },
  };
}

export function parseReadinessForm(
  formData: FormData,
): ReadinessAssessmentAnswers {
  const limitationValue = formData.get("hasLimitations");

  return {
    activity: {
      frequency: parseOption(
        formData.get("activityFrequency"),
        ACTIVITY_FREQUENCY_OPTIONS.map((option) => option.value),
      ),
    },
    limitations: {
      hasLimitations:
        limitationValue === "yes"
          ? true
          : limitationValue === "no"
            ? false
            : null,
      affectedAreas: normalizeText(formData.get("affectedAreas")),
      avoidedMovements: normalizeText(formData.get("avoidedMovements")),
    },
    readiness: {
      independentExercise: parseOption(
        formData.get("independentExercise"),
        INDEPENDENT_EXERCISE_OPTIONS.map((option) => option.value),
      ),
      professionalRestriction: parseOption(
        formData.get("professionalRestriction"),
        PROFESSIONAL_RESTRICTION_OPTIONS.map((option) => option.value),
      ),
    },
  };
}

export function parseStoredReadinessAnswers(
  value: unknown,
): ReadinessAssessmentAnswers {
  const root = asRecord(value);
  const activity = asRecord(root?.activity);
  const limitations = asRecord(root?.limitations);
  const readiness = asRecord(root?.readiness);

  return {
    activity: {
      frequency: storedOption(
        activity?.frequency,
        ACTIVITY_FREQUENCY_OPTIONS.map((option) => option.value),
      ),
    },
    limitations: {
      hasLimitations: storedBoolean(limitations?.hasLimitations),
      affectedAreas: storedString(limitations?.affectedAreas),
      avoidedMovements: storedString(limitations?.avoidedMovements),
    },
    readiness: {
      independentExercise: storedOption(
        readiness?.independentExercise,
        INDEPENDENT_EXERCISE_OPTIONS.map((option) => option.value),
      ),
      professionalRestriction: storedOption(
        readiness?.professionalRestriction,
        PROFESSIONAL_RESTRICTION_OPTIONS.map((option) => option.value),
      ),
    },
  };
}

export function validateReadinessAnswers(
  answers: ReadinessAssessmentAnswers,
  requireComplete: boolean,
): ReadinessFieldErrors {
  const errors: ReadinessFieldErrors = {};

  if (answers.limitations.affectedAreas.length > 300) {
    errors.affectedAreas = "Affected areas must be 300 characters or fewer.";
  }

  if (answers.limitations.avoidedMovements.length > 300) {
    errors.avoidedMovements =
      "Movements to avoid must be 300 characters or fewer.";
  }

  if (!requireComplete) {
    return errors;
  }

  if (!answers.activity.frequency) {
    errors.activityFrequency = "Choose your current activity frequency.";
  }

  if (answers.limitations.hasLimitations === null) {
    errors.hasLimitations = "Choose whether you have movement limitations.";
  }

  if (
    answers.limitations.hasLimitations === true &&
    !answers.limitations.affectedAreas &&
    !answers.limitations.avoidedMovements
  ) {
    errors.limitationDetails =
      "Add an affected area or a movement you want MeExercise to avoid.";
  }

  if (!answers.readiness.independentExercise) {
    errors.independentExercise =
      "Choose whether you currently exercise independently.";
  }

  if (!answers.readiness.professionalRestriction) {
    errors.professionalRestriction =
      "Choose whether a professional restriction currently applies.";
  }

  return errors;
}

export function hasReadinessFieldErrors(
  errors: ReadinessFieldErrors,
): boolean {
  return Object.values(errors).some(Boolean);
}

export function toReadinessResponse(
  answers: ReadinessAssessmentAnswers,
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    activity: answers.activity,
    limitations: answers.limitations,
    readiness: answers.readiness,
  };
}