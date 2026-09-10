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

function balancedSelection(
  candidates: GuidedExerciseCandidate[],
  itemCount: number,
) {
  const groups = new Map<string, GuidedExerciseCandidate[]>();

  for (const candidate of [...candidates].sort(compareCandidates)) {
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
): GuidedExerciseCandidate[] | null {
  if (!Number.isInteger(itemCount) || itemCount < 1 || itemCount > 6) {
    return null;
  }

  const eligible = candidates.filter((candidate) =>
    focusMatches(candidate, focus),
  );

  if (eligible.length < itemCount) {
    return null;
  }

  if (focus === "balanced") {
    return balancedSelection(eligible, itemCount);
  }

  return [...eligible].sort(compareCandidates).slice(0, itemCount);
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
