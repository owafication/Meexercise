import { describe, expect, it } from "vitest";

import {
  replacementOptionsForCandidate,
  selectGuidedRoutineCandidates,
  type GuidedExerciseCandidate,
} from "./generator";

const candidates: GuidedExerciseCandidate[] = [
  {
    id: "upper-b",
    exerciseKey: "upper_b",
    versionNumber: 1,
    title: "Upper beta",
    summary: "Upper beta summary",
    purpose: "Upper beta purpose",
    targetAreas: ["Upper body"],
    equipment: [],
  },
  {
    id: "lower-b",
    exerciseKey: "lower_b",
    versionNumber: 1,
    title: "Lower beta",
    summary: "Lower beta summary",
    purpose: "Lower beta purpose",
    targetAreas: ["Lower body"],
    equipment: [],
  },
  {
    id: "upper-a",
    exerciseKey: "upper_a",
    versionNumber: 2,
    title: "Upper alpha",
    summary: "Upper alpha summary",
    purpose: "Upper alpha purpose",
    targetAreas: ["Upper body"],
    equipment: [],
  },
  {
    id: "lower-a",
    exerciseKey: "lower_a",
    versionNumber: 1,
    title: "Lower alpha",
    summary: "Lower alpha summary",
    purpose: "Lower alpha purpose",
    targetAreas: ["Lower body"],
    equipment: [],
  },
];

describe("deterministic guided routine selection", () => {
  it("round-robins target-area groups for balanced proposals", () => {
    const selected = selectGuidedRoutineCandidates(
      [...candidates].reverse(),
      "balanced",
      4,
    );

    expect(selected?.map((item) => item.id)).toEqual([
      "lower-a",
      "upper-a",
      "lower-b",
      "upper-b",
    ]);
  });

  it("filters focused proposals and rejects unavailable requested structure", () => {
    expect(
      selectGuidedRoutineCandidates(candidates, "upper_body", 2)?.map(
        (item) => item.id,
      ),
    ).toEqual(["upper-a", "upper-b"]);

    expect(
      selectGuidedRoutineCandidates(candidates, "lower_body", 3),
    ).toBeNull();

    expect(
      selectGuidedRoutineCandidates(candidates, "balanced", 0),
    ).toBeNull();
  });

  it("limits replacements to the proposed target-area structure", () => {
    const selected = candidates.find((item) => item.id === "lower-a");

    expect(selected).toBeDefined();

    expect(
      replacementOptionsForCandidate(selected!, candidates).map(
        (item) => item.id,
      ),
    ).toEqual(["lower-a", "lower-b"]);
  });
});
