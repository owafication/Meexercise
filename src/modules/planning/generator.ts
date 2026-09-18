import {
  isPlanningProfileComplete,
  type PlanningEquipment,
  type PlanningFacility,
  type PlanningGoal,
  type PlanningMethod,
  type PlanningProfile,
} from "@/modules/profile-assessment/planning-profile";

export const GUIDED_ROUTINE_FOCUS_OPTIONS = [
  { value: "balanced", label: "Balanced across target areas" },
  { value: "upper_body", label: "Upper body" },
  { value: "lower_body", label: "Lower body" },
] as const;

export type GuidedRoutineFocus =
  (typeof GUIDED_ROUTINE_FOCUS_OPTIONS)[number]["value"];

export type GuidedExerciseCandidate = {
  id: string;
  exerciseKey: string;
  versionNumber: number;
  title: string;
  summary: string;
  purpose: string;
  targetAreas: string[];
  equipment: string[];
  planningGoalTags: PlanningGoal[];
  planningMethodTags: PlanningMethod[];
  planningEquipment: PlanningEquipment[];
  planningFacilities: PlanningFacility[];
  estimatedMinutes: number | null;
  planningMetadataComplete: boolean;
};

export type GuidedReplacementOption = {
  id: string;
  title: string;
  versionNumber: number;
};

export type GuidedProposalItem = GuidedExerciseCandidate & {
  primaryTargetArea: string;
  replacementOptions: GuidedReplacementOption[];
  substitutionNotes: string[];
};

export type GuidedRoutineProposal = {
  title: string;
  focus: GuidedRoutineFocus;
  itemCount: number;
  purposeExplanation: string;
  profileExplanation: string;
  balanceExplanation: string;
  constraintExplanation: string;
  substitutionExplanation: string;
  items: GuidedProposalItem[];
};

export type GuidedRoutineActionState =
  | { status: "idle"; message?: undefined; proposal?: undefined }
  | { status: "error"; message: string; proposal?: undefined }
  | { status: "proposal"; message?: undefined; proposal: GuidedRoutineProposal };

export const initialGuidedRoutineActionState: GuidedRoutineActionState = {
  status: "idle",
};

function compareCandidates(
  left: GuidedExerciseCandidate,
  right: GuidedExerciseCandidate,
) {
  if (left.title < right.title) return -1;
  if (left.title > right.title) return 1;

  if (left.versionNumber !== right.versionNumber) {
    return right.versionNumber - left.versionNumber;
  }

  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

function primaryTargetArea(candidate: GuidedExerciseCandidate) {
  return candidate.targetAreas[0] ?? "General";
}

function focusMatches(
  candidate: GuidedExerciseCandidate,
  focus: GuidedRoutineFocus,
) {
  if (focus === "balanced") {
    return true;
  }

  const required = focus === "upper_body" ? "upper body" : "lower body";

  return candidate.targetAreas.some(
    (targetArea) => targetArea.toLowerCase() === required,
  );
}

export function guidedCandidateMatchesPlanningProfile(
  candidate: GuidedExerciseCandidate,
  profile: PlanningProfile,
) {
  if (
    !isPlanningProfileComplete(profile) ||
    profile.primaryGoal === null ||
    profile.availableMinutes === null ||
    !candidate.planningMetadataComplete ||
    candidate.estimatedMinutes === null
  ) {
    return false;
  }

  if (!candidate.planningGoalTags.includes(profile.primaryGoal)) return false;
  if (!candidate.planningMethodTags.some((method) => profile.preferredMethods.includes(method))) return false;
  if (!candidate.planningEquipment.every((equipment) => equipment === "none" || profile.equipment.includes(equipment))) return false;
  if (!candidate.planningFacilities.some((facility) => profile.facilities.includes(facility))) return false;

  return candidate.estimatedMinutes <= profile.availableMinutes;
}

export function guidedSelectionFitsPlanningProfile(
  candidates: GuidedExerciseCandidate[],
  profile: PlanningProfile,
) {
  if (
    !isPlanningProfileComplete(profile) ||
    profile.availableMinutes === null ||
    !candidates.every((candidate) => guidedCandidateMatchesPlanningProfile(candidate, profile))
  ) return false;

  const totalMinutes = candidates.reduce((total, candidate) => total + (candidate.estimatedMinutes ?? 0), 0);
  return totalMinutes <= profile.availableMinutes;
}

function compareCandidatesForProfile(
  left: GuidedExerciseCandidate,
  right: GuidedExerciseCandidate,
  profile: PlanningProfile,
) {
  const leftMinutes = left.estimatedMinutes ?? Number.MAX_SAFE_INTEGER;
  const rightMinutes = right.estimatedMinutes ?? Number.MAX_SAFE_INTEGER;
  if (leftMinutes !== rightMinutes) return leftMinutes - rightMinutes;

  if (profile.secondaryGoal !== null) {
    const leftSecondary = left.planningGoalTags.includes(profile.secondaryGoal);
    const rightSecondary = right.planningGoalTags.includes(profile.secondaryGoal);
    if (leftSecondary !== rightSecondary) return leftSecondary ? -1 : 1;
  }

  return compareCandidates(left, right);
}

function balancedSelection(
  candidates: GuidedExerciseCandidate[],
  itemCount: number,
  compare: (left: GuidedExerciseCandidate, right: GuidedExerciseCandidate) => number = compareCandidates,
) {
  const groups = new Map<string, GuidedExerciseCandidate[]>();

  for (const candidate of [...candidates].sort(compare)) {
    const key = primaryTargetArea(candidate);
    const existing = groups.get(key) ?? [];
    existing.push(candidate);
    groups.set(key, existing);
  }

  const keys = Array.from(groups.keys()).sort();
  const selected: GuidedExerciseCandidate[] = [];
  let round = 0;

  while (selected.length < itemCount) {
    let added = false;

    for (const key of keys) {
      const candidate = groups.get(key)?.[round];

      if (candidate) {
        selected.push(candidate);
        added = true;

        if (selected.length === itemCount) {
          break;
        }
      }
    }

    if (!added) {
      break;
    }

    round += 1;
  }

  return selected;
}

export function guidedFocusLabel(focus: GuidedRoutineFocus) {
  return (
    GUIDED_ROUTINE_FOCUS_OPTIONS.find((option) => option.value === focus)
      ?.label ?? "Guided"
  );
}

export function selectGuidedRoutineCandidates(
  candidates: GuidedExerciseCandidate[],
  focus: GuidedRoutineFocus,
  itemCount: number,
  profile: PlanningProfile,
): GuidedExerciseCandidate[] | null {
  if (!Number.isInteger(itemCount) || itemCount < 1 || itemCount > 6) {
    return null;
  }

  if (!isPlanningProfileComplete(profile)) return null;

  const eligible = candidates.filter(
    (candidate) => focusMatches(candidate, focus) && guidedCandidateMatchesPlanningProfile(candidate, profile),
  );

  if (eligible.length < itemCount) return null;

  const compare = (left: GuidedExerciseCandidate, right: GuidedExerciseCandidate) =>
    compareCandidatesForProfile(left, right, profile);

  const selected = focus === "balanced"
    ? balancedSelection(eligible, itemCount, compare)
    : [...eligible].sort(compare).slice(0, itemCount);

  return guidedSelectionFitsPlanningProfile(selected, profile) ? selected : null;
}

export function replacementOptionsForCandidate(
  candidate: GuidedExerciseCandidate,
  candidates: GuidedExerciseCandidate[],
): GuidedReplacementOption[] {
  const target = primaryTargetArea(candidate).toLowerCase();

  return candidates
    .filter((option) =>
      option.targetAreas.some(
        (targetArea) => targetArea.toLowerCase() === target,
      ),
    )
    .sort(compareCandidates)
    .map((option) => ({
      id: option.id,
      title: option.title,
      versionNumber: option.versionNumber,
    }));
}
