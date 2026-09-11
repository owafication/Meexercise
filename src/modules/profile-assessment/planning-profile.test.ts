import { describe, expect, it } from "vitest";

import {
  EMPTY_PLANNING_PROFILE,
  isPlanningProfileComplete,
  parsePlanningProfileFormData,
  parseStoredPlanningProfile,
} from "./planning-profile";

function completeForm() {
  const form = new FormData();
  form.set("primaryGoal", "general_strength");
  form.set("secondaryGoal", "mobility");
  form.append("preferredMethod", "bodyweight");
  form.append("preferredMethod", "resistance_band");
  form.append("equipment", "chair");
  form.append("equipment", "resistance_band");
  form.append("facility", "home");
  form.set("availableMinutes", "30");
  form.set("routineFrequencyDays", "3");
  return form;
}

describe("structured planning profile", () => {
  it("parses a complete bounded planning profile", () => {
    const parsed = parsePlanningProfileFormData(completeForm());

    expect(parsed.fieldErrors).toEqual({});
    expect(parsed.value).toEqual({
      primaryGoal: "general_strength",
      secondaryGoal: "mobility",
      preferredMethods: ["bodyweight", "resistance_band"],
      equipment: ["chair", "resistance_band"],
      facilities: ["home"],
      availableMinutes: 30,
      routineFrequencyDays: 3,
    });
    expect(isPlanningProfileComplete(parsed.value)).toBe(true);
  });

  it("allows a fully blank planning profile to remain an intentional partial save", () => {
    const parsed = parsePlanningProfileFormData(new FormData());

    expect(parsed.fieldErrors).toEqual({});
    expect(parsed.value).toEqual(EMPTY_PLANNING_PROFILE);
    expect(isPlanningProfileComplete(parsed.value)).toBe(false);
  });

  it("rejects invalid priority and equipment combinations", () => {
    const duplicateGoals = completeForm();
    duplicateGoals.set("secondaryGoal", "general_strength");

    expect(
      parsePlanningProfileFormData(duplicateGoals).fieldErrors.secondaryGoal,
    ).toMatch(/different/i);

    const contradictoryEquipment = completeForm();
    contradictoryEquipment.append("equipment", "none");

    expect(
      parsePlanningProfileFormData(contradictoryEquipment).fieldErrors
        .equipment,
    ).toMatch(/not both/i);
  });

  it("fails closed on unsupported or malformed stored planning values", () => {
    expect(
      parseStoredPlanningProfile({
        primaryGoal: "unsupported",
        secondaryGoal: null,
        preferredMethods: [],
        equipment: [],
        facilities: [],
        availableMinutes: null,
        routineFrequencyDays: null,
      }),
    ).toBeNull();

    expect(
      parseStoredPlanningProfile({
        primaryGoal: "general_strength",
        secondaryGoal: null,
        preferredMethods: ["bodyweight"],
        equipment: ["none"],
        facilities: ["home"],
        availableMinutes: 30,
        routineFrequencyDays: 3,
      }),
    ).toEqual({
      primaryGoal: "general_strength",
      secondaryGoal: null,
      preferredMethods: ["bodyweight"],
      equipment: ["none"],
      facilities: ["home"],
      availableMinutes: 30,
      routineFrequencyDays: 3,
    });
  });
});
