import { describe, expect, it } from "vitest";

import type { PlanningProfile } from "@/modules/profile-assessment/planning-profile";

import {
  guidedCandidateMatchesPlanningProfile,
  guidedSelectionFitsPlanningProfile,
  replacementOptionsForCandidate,
  selectGuidedRoutineCandidates,
  type GuidedExerciseCandidate,
} from "./generator";

const profile: PlanningProfile = {
  primaryGoal: "general_strength",
  secondaryGoal: "balance",
  preferredMethods: ["bodyweight", "resistance_band"],
  equipment: ["chair", "wall", "stable_support", "resistance_band"],
  facilities: ["home"],
  availableMinutes: 20,
  routineFrequencyDays: 3,
};

const candidates: GuidedExerciseCandidate[] = [
  { id:"upper-b", exerciseKey:"upper_b", versionNumber:1, title:"Upper beta", summary:"Upper beta summary", purpose:"Upper beta purpose", targetAreas:["Upper body"], equipment:[], planningGoalTags:["general_strength"], planningMethodTags:["bodyweight"], planningEquipment:["wall"], planningFacilities:["home"], estimatedMinutes:4, planningMetadataComplete:true },
  { id:"lower-b", exerciseKey:"lower_b", versionNumber:1, title:"Lower beta", summary:"Lower beta summary", purpose:"Lower beta purpose", targetAreas:["Lower body"], equipment:[], planningGoalTags:["general_strength","balance"], planningMethodTags:["bodyweight"], planningEquipment:["stable_support"], planningFacilities:["home"], estimatedMinutes:4, planningMetadataComplete:true },
  { id:"upper-a", exerciseKey:"upper_a", versionNumber:2, title:"Upper alpha", summary:"Upper alpha summary", purpose:"Upper alpha purpose", targetAreas:["Upper body"], equipment:[], planningGoalTags:["general_strength"], planningMethodTags:["bodyweight"], planningEquipment:["wall"], planningFacilities:["home"], estimatedMinutes:4, planningMetadataComplete:true },
  { id:"lower-a", exerciseKey:"lower_a", versionNumber:1, title:"Lower alpha", summary:"Lower alpha summary", purpose:"Lower alpha purpose", targetAreas:["Lower body"], equipment:[], planningGoalTags:["general_strength"], planningMethodTags:["bodyweight"], planningEquipment:["chair"], planningFacilities:["home"], estimatedMinutes:4, planningMetadataComplete:true },
];

describe("deterministic guided routine selection", () => {
  it("round-robins target-area groups after deterministic profile filtering", () => {
    const selected = selectGuidedRoutineCandidates([...candidates].reverse(), "balanced", 4, profile);
    expect(selected?.map((item) => item.id)).toEqual(["lower-b", "upper-a", "lower-a", "upper-b"]);
  });

  it("filters focused proposals and rejects unavailable requested structure", () => {
    expect(selectGuidedRoutineCandidates(candidates, "upper_body", 2, profile)?.map((item) => item.id)).toEqual(["upper-a", "upper-b"]);
    expect(selectGuidedRoutineCandidates(candidates, "lower_body", 3, profile)).toBeNull();
    expect(selectGuidedRoutineCandidates(candidates, "balanced", 0, profile)).toBeNull();
  });

  it("fails closed for profile-incompatible metadata and routine time", () => {
    const incompatible: GuidedExerciseCandidate = { ...candidates[0], planningMethodTags:["free_weights"] };
    expect(guidedCandidateMatchesPlanningProfile(incompatible, profile)).toBe(false);
    expect(guidedSelectionFitsPlanningProfile(candidates.slice(0,2), {...profile, availableMinutes:5})).toBe(false);
    expect(selectGuidedRoutineCandidates(candidates, "balanced", 2, {...profile, availableMinutes:5})).toBeNull();
  });

  it("limits replacements to the proposed target-area structure", () => {
    const selected = candidates.find((item) => item.id === "lower-a");
    expect(selected).toBeDefined();
    expect(replacementOptionsForCandidate(selected!, candidates).map((item) => item.id)).toEqual(["lower-a", "lower-b"]);
  });
});
