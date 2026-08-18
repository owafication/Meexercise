import { describe, expect, it } from "vitest";

import {
  emptyReadinessAnswers,
  parseReadinessForm,
  parseStoredReadinessAnswers,
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

  it("normalizes form input and ignores invalid stored choices", () => {
    const formData = new FormData();
    formData.set("activityFrequency", "three_four_days");
    formData.set("hasLimitations", "yes");
    formData.set("affectedAreas", "  left   shoulder ");
    formData.set("avoidedMovements", " overhead   pressing ");
    formData.set("independentExercise", "yes");
    formData.set("professionalRestriction", "no");

    expect(parseReadinessForm(formData)).toMatchObject({
      activity: { frequency: "three_four_days" },
      limitations: {
        hasLimitations: true,
        affectedAreas: "left shoulder",
        avoidedMovements: "overhead pressing",
      },
      readiness: {
        independentExercise: "yes",
        professionalRestriction: "no",
      },
    });

    expect(
      parseStoredReadinessAnswers({
        activity: { frequency: "not-valid" },
        limitations: { hasLimitations: "yes" },
        readiness: {
          independentExercise: "yes",
          professionalRestriction: "no",
        },
      }),
    ).toMatchObject({
      activity: { frequency: null },
      limitations: { hasLimitations: null },
    });
  });
});