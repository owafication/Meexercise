export const PLANNING_GOAL_OPTIONS = [
  { value: "general_strength", label: "General strength" },
  { value: "mobility", label: "Mobility" },
  { value: "conditioning", label: "Conditioning" },
  { value: "balance", label: "Balance" },
  { value: "flexibility", label: "Flexibility" },
  { value: "activity_consistency", label: "Activity consistency" },
] as const;

export const PLANNING_METHOD_OPTIONS = [
  { value: "bodyweight", label: "Bodyweight exercise" },
  { value: "resistance_band", label: "Resistance-band exercise" },
  { value: "free_weights", label: "Free weights" },
  { value: "machines", label: "Exercise machines" },
  { value: "mobility_drills", label: "Mobility drills" },
  { value: "walking_cardio", label: "Walking or cardio" },
] as const;

export const PLANNING_EQUIPMENT_OPTIONS = [
  { value: "none", label: "No special equipment" },
  { value: "chair", label: "Chair" },
  { value: "wall", label: "Wall" },
  { value: "stable_support", label: "Stable support" },
  { value: "stable_elevated_surface", label: "Stable elevated surface" },
  { value: "counter_height_surface", label: "Counter-height surface" },
  { value: "resistance_band", label: "Resistance band equipment" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "barbell", label: "Barbell" },
  { value: "bench", label: "Bench" },
  { value: "cable_machine", label: "Cable machine" },
  { value: "cardio_machine", label: "Cardio machine" },
  { value: "mat", label: "Exercise mat" },
  { value: "pull_up_bar", label: "Pull-up bar" },
  { value: "step_box", label: "Step or box" },
] as const;

export const PLANNING_FACILITY_OPTIONS = [
  { value: "home", label: "Home" },
  { value: "gym", label: "Gym" },
  { value: "outdoors", label: "Outdoors" },
  { value: "pool", label: "Pool" },
] as const;

export const AVAILABLE_MINUTES_OPTIONS = [
  10,
  15,
  20,
  30,
  45,
  60,
  90,
  120,
] as const;

export const ROUTINE_FREQUENCY_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const;

export type PlanningGoal =
  (typeof PLANNING_GOAL_OPTIONS)[number]["value"];
export type PlanningMethod =
  (typeof PLANNING_METHOD_OPTIONS)[number]["value"];
export type PlanningEquipment =
  (typeof PLANNING_EQUIPMENT_OPTIONS)[number]["value"];
export type PlanningFacility =
  (typeof PLANNING_FACILITY_OPTIONS)[number]["value"];

export type PlanningProfile = {
  primaryGoal: PlanningGoal | null;
  secondaryGoal: PlanningGoal | null;
  preferredMethods: PlanningMethod[];
  equipment: PlanningEquipment[];
  facilities: PlanningFacility[];
  availableMinutes: number | null;
  routineFrequencyDays: number | null;
};

export type PlanningProfileFieldErrors = {
  primaryGoal?: string;
  secondaryGoal?: string;
  preferredMethods?: string;
  equipment?: string;
  facilities?: string;
  availableMinutes?: string;
  routineFrequencyDays?: string;
};

export const EMPTY_PLANNING_PROFILE: PlanningProfile = {
  primaryGoal: null,
  secondaryGoal: null,
  preferredMethods: [],
  equipment: [],
  facilities: [],
  availableMinutes: null,
  routineFrequencyDays: null,
};

const GOALS = new Set<string>(
  PLANNING_GOAL_OPTIONS.map((option) => option.value),
);
const METHODS = new Set<string>(
  PLANNING_METHOD_OPTIONS.map((option) => option.value),
);
const EQUIPMENT = new Set<string>(
  PLANNING_EQUIPMENT_OPTIONS.map((option) => option.value),
);
const FACILITIES = new Set<string>(
  PLANNING_FACILITY_OPTIONS.map((option) => option.value),
);

function optionalChoice<T extends string>(
  value: FormDataEntryValue | null,
  allowed: Set<string>,
): T | null | undefined {
  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || !allowed.has(value)) {
    return undefined;
  }

  return value as T;
}

function choiceList<T extends string>(
  values: FormDataEntryValue[],
  allowed: Set<string>,
): T[] | undefined {
  if (values.some((value) => typeof value !== "string")) {
    return undefined;
  }

  const strings = values as string[];

  if (strings.some((value) => !allowed.has(value))) {
    return undefined;
  }

  if (new Set(strings).size !== strings.length) {
    return undefined;
  }

  return strings as T[];
}

function optionalBoundedNumber(
  value: FormDataEntryValue | null,
  minimum: number,
  maximum: number,
  step = 1,
): number | null | undefined {
  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return undefined;
  }

  const parsed = Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < minimum ||
    parsed > maximum ||
    parsed % step !== 0
  ) {
    return undefined;
  }

  return parsed;
}

export function parsePlanningProfileFormData(formData: FormData): {
  value: PlanningProfile;
  fieldErrors: PlanningProfileFieldErrors;
} {
  const fieldErrors: PlanningProfileFieldErrors = {};

  const primaryGoal = optionalChoice<PlanningGoal>(
    formData.get("primaryGoal"),
    GOALS,
  );
  const secondaryGoal = optionalChoice<PlanningGoal>(
    formData.get("secondaryGoal"),
    GOALS,
  );
  const preferredMethods = choiceList<PlanningMethod>(
    formData.getAll("preferredMethod"),
    METHODS,
  );
  const equipment = choiceList<PlanningEquipment>(
    formData.getAll("equipment"),
    EQUIPMENT,
  );
  const facilities = choiceList<PlanningFacility>(
    formData.getAll("facility"),
    FACILITIES,
  );
  const availableMinutes = optionalBoundedNumber(
    formData.get("availableMinutes"),
    10,
    180,
    5,
  );
  const routineFrequencyDays = optionalBoundedNumber(
    formData.get("routineFrequencyDays"),
    1,
    7,
  );

  if (primaryGoal === undefined) {
    fieldErrors.primaryGoal = "Choose a supported primary goal or leave it blank.";
  }

  if (secondaryGoal === undefined) {
    fieldErrors.secondaryGoal =
      "Choose a supported secondary goal or leave it blank.";
  }

  if (
    primaryGoal !== undefined &&
    secondaryGoal !== undefined &&
    secondaryGoal !== null &&
    primaryGoal === null
  ) {
    fieldErrors.secondaryGoal =
      "Choose a primary goal before adding a secondary goal.";
  }

  if (
    primaryGoal !== null &&
    primaryGoal !== undefined &&
    secondaryGoal !== null &&
    secondaryGoal !== undefined &&
    primaryGoal === secondaryGoal
  ) {
    fieldErrors.secondaryGoal =
      "Primary and secondary goals must be different.";
  }

  if (preferredMethods === undefined) {
    fieldErrors.preferredMethods =
      "Preferred methods contain an unsupported or duplicate choice.";
  }

  if (equipment === undefined) {
    fieldErrors.equipment =
      "Equipment contains an unsupported or duplicate choice.";
  } else if (equipment.includes("none") && equipment.length > 1) {
    fieldErrors.equipment =
      "Choose either no special equipment or the equipment you have, not both.";
  }

  if (facilities === undefined) {
    fieldErrors.facilities =
      "Facilities contain an unsupported or duplicate choice.";
  }

  if (availableMinutes === undefined) {
    fieldErrors.availableMinutes =
      "Available time must be between 10 and 180 minutes in 5-minute steps.";
  }

  if (routineFrequencyDays === undefined) {
    fieldErrors.routineFrequencyDays =
      "Routine frequency must be between 1 and 7 days per week.";
  }

  return {
    value: {
      primaryGoal: primaryGoal ?? null,
      secondaryGoal: secondaryGoal ?? null,
      preferredMethods: preferredMethods ?? [],
      equipment: equipment ?? [],
      facilities: facilities ?? [],
      availableMinutes: availableMinutes ?? null,
      routineFrequencyDays: routineFrequencyDays ?? null,
    },
    fieldErrors,
  };
}

export function isPlanningProfileComplete(profile: PlanningProfile): boolean {
  return (
    profile.primaryGoal !== null &&
    profile.preferredMethods.length > 0 &&
    profile.equipment.length > 0 &&
    profile.facilities.length > 0 &&
    profile.availableMinutes !== null &&
    profile.routineFrequencyDays !== null
  );
}

function storedChoice<T extends string>(
  value: unknown,
  allowed: Set<string>,
): T | null | undefined {
  if (value === null) {
    return null;
  }

  return typeof value === "string" && allowed.has(value)
    ? (value as T)
    : undefined;
}

function storedChoiceList<T extends string>(
  value: unknown,
  allowed: Set<string>,
): T[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  if (
    value.some(
      (item) => typeof item !== "string" || !allowed.has(item),
    )
  ) {
    return undefined;
  }

  const strings = value as string[];

  if (new Set(strings).size !== strings.length) {
    return undefined;
  }

  return strings as T[];
}

export function parseStoredPlanningProfile(input: {
  primaryGoal: unknown;
  secondaryGoal: unknown;
  preferredMethods: unknown;
  equipment: unknown;
  facilities: unknown;
  availableMinutes: unknown;
  routineFrequencyDays: unknown;
}): PlanningProfile | null {
  const primaryGoal = storedChoice<PlanningGoal>(input.primaryGoal, GOALS);
  const secondaryGoal = storedChoice<PlanningGoal>(
    input.secondaryGoal,
    GOALS,
  );
  const preferredMethods = storedChoiceList<PlanningMethod>(
    input.preferredMethods,
    METHODS,
  );
  const equipment = storedChoiceList<PlanningEquipment>(
    input.equipment,
    EQUIPMENT,
  );
  const facilities = storedChoiceList<PlanningFacility>(
    input.facilities,
    FACILITIES,
  );

  const availableMinutes =
    input.availableMinutes === null
      ? null
      : typeof input.availableMinutes === "number" &&
          Number.isInteger(input.availableMinutes) &&
          input.availableMinutes >= 10 &&
          input.availableMinutes <= 180 &&
          input.availableMinutes % 5 === 0
        ? input.availableMinutes
        : undefined;

  const routineFrequencyDays =
    input.routineFrequencyDays === null
      ? null
      : typeof input.routineFrequencyDays === "number" &&
          Number.isInteger(input.routineFrequencyDays) &&
          input.routineFrequencyDays >= 1 &&
          input.routineFrequencyDays <= 7
        ? input.routineFrequencyDays
        : undefined;

  if (
    primaryGoal === undefined ||
    secondaryGoal === undefined ||
    preferredMethods === undefined ||
    equipment === undefined ||
    facilities === undefined ||
    availableMinutes === undefined ||
    routineFrequencyDays === undefined ||
    (secondaryGoal !== null && primaryGoal === null) ||
    (primaryGoal !== null && secondaryGoal === primaryGoal) ||
    (equipment.includes("none") && equipment.length > 1)
  ) {
    return null;
  }

  return {
    primaryGoal,
    secondaryGoal,
    preferredMethods,
    equipment,
    facilities,
    availableMinutes,
    routineFrequencyDays,
  };
}
