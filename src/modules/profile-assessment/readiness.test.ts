import { describe, expect, it } from "vitest";

import {
  deterministicMovementConstraints,
  emptyReadinessAnswers,
  parseReadinessForm,
  parseStoredReadinessAnswers,
  toReadinessResponse,
  validateReadinessAnswers,
} from "./readiness";

describe("readiness assessment validation", () => {
  it("allows incomplete progress to be saved but requires completion answers", () => {
    const answers = emptyReadinessAnswers();

    expect(validateReadinessAnswers(answers, false)).toEqual({});

    expect(validateReadinessAnswers(answers, true)).toMatchObject({
      activityFrequency: expect.any(String),
      hasLimitations: expect.any(String),
      independentExercise: expect.any(String),
      professionalRestriction: expect.any(String),
    });
  });

  it("requires useful limitation detail only when limitations are reported", () => {
    const answers = emptyReadinessAnswers();
    answers.activity.frequency = "one_two_days";
    answers.limitations.hasLimitations = true;
    answers.readiness.independentExercise = "yes";
    answers.readiness.professionalRestriction = "no";

    expect(validateReadinessAnswers(answers, true).limitationDetails).toContain(
      "affected area",
    );

    answers.limitations.avoidedMovements = "Overhead pressing";

    expect(validateReadinessAnswers(answers, true)).toEqual({});
  });

  it("normalizes form input and keeps only supported structured choices", () => {
    const formData = new FormData();
    formData.set("activityFrequency", "three_four_days");
    formData.set("hasLimitations", "yes");
    formData.set("affectedAreas", "  left   shoulder ");
    formData.set("avoidedMovements", " overhead   pressing ");
    formData.append("movementConstraint", "surface_hand_loading");
    formData.append("movementConstraint", "surface_hand_loading");
    formData.append("movementConstraint", "not-valid");
    formData.set("independentExercise", "yes");
    formData.set("professionalRestriction", "no");

    expect(parseReadinessForm(formData)).toMatchObject({
      activity: { frequency: "three_four_days" },
      limitations: {
        hasLimitations: true,
        affectedAreas: "left shoulder",
        avoidedMovements: "overhead pressing",
        movementConstraints: ["surface_hand_loading"],
      },
      readiness: {
        independentExercise: "yes",
        professionalRestriction: "no",
      },
    });
  });

  it("parses old responses safely and treats unclear structured constraints as unresolved", () => {
    const stored = parseStoredReadinessAnswers({
      activity: { frequency: "not-valid" },
      limitations: {
        hasLimitations: true,
        movementConstraints: [
          "surface_hand_loading",
          "other_or_unclear",
          "not-valid",
        ],
      },
      readiness: {
        independentExercise: "yes",
        professionalRestriction: "no",
      },
    });

    expect(stored.activity.frequency).toBeNull();
    expect(stored.limitations.movementConstraints).toEqual([
      "surface_hand_loading",
      "other_or_unclear",
    ]);
    expect(deterministicMovementConstraints(stored)).toBeNull();

    const legacy = parseStoredReadinessAnswers({
      limitations: { hasLimitations: true },
    });

    expect(legacy.limitations.movementConstraints).toEqual([]);
    expect(deterministicMovementConstraints(legacy)).toBeNull();
  });

  it("returns exact deterministic choices only for a supported set", () => {
    const answers = emptyReadinessAnswers();

    expect(deterministicMovementConstraints(answers)).toEqual([]);

    answers.limitations.hasLimitations = true;
    answers.limitations.affectedAreas = "Wrist";
    answers.limitations.movementConstraints = ["surface_hand_loading"];

    expect(deterministicMovementConstraints(answers)).toEqual([
      "surface_hand_loading",
    ]);

    expect(toReadinessResponse(answers)).toMatchObject({
      limitations: {
        movementConstraints: ["surface_hand_loading"],
      },
    });
  });
});
