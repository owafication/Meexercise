import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ExerciseRelationType =
  | "substitution"
  | "regression"
  | "progression"
  | "equipment_alternative";

export type ExerciseSideRule =
  | "not_applicable"
  | "bilateral"
  | "unilateral"
  | "per_side"
  | "alternating";

export type ExerciseConstraintTag =
  | "surface_hand_loading"
  | "knee_bending";

export type ExercisePlanningGoal =
  | "general_strength"
  | "mobility"
  | "conditioning"
  | "balance"
  | "flexibility"
  | "activity_consistency";

export type ExercisePlanningMethod =
  | "bodyweight"
  | "resistance_band"
  | "free_weights"
  | "machines"
  | "mobility_drills"
  | "walking_cardio";

export type ExercisePlanningEquipment =
  | "none"
  | "chair"
  | "wall"
  | "stable_support"
  | "stable_elevated_surface"
  | "counter_height_surface"
  | "resistance_band"
  | "dumbbells"
  | "barbell"
  | "bench"
  | "cable_machine"
  | "cardio_machine"
  | "mat"
  | "pull_up_bar"
  | "step_box";

export type ExercisePlanningFacility =
  | "home"
  | "gym"
  | "outdoors"
  | "pool";

export type ExerciseLibraryItem = {
  id: string;
  exerciseKey: string;
  versionNumber: number;
  status: "general" | "reviewed";
  title: string;
  summary: string;
  purpose: string;
  targetAreas: string[];
  equipment: string[];
  constraintTags: ExerciseConstraintTag[];
  constraintsClassified: boolean;
  planningGoalTags: ExercisePlanningGoal[];
  planningMethodTags: ExercisePlanningMethod[];
  planningEquipment: ExercisePlanningEquipment[];
  planningFacilities: ExercisePlanningFacility[];
  estimatedMinutes: number | null;
  planningMetadataComplete: boolean;
};

export type ExerciseDetail = ExerciseLibraryItem & {
  purpose: string;
  setup: string;
  steps: string[];
  cues: string[];
  dosageGuidance: string;
  commonErrors: string[];
  safetyNotes: string[];
  accessibleText: string;
  sideRule: ExerciseSideRule;
  relations: Array<{
    relationType: ExerciseRelationType;
    guidance: string;
    target: {
      exerciseKey: string;
      versionNumber: number;
      title: string;
    };
  }>;
};

type Identity =
  | { exercise_key?: unknown }
  | Array<{ exercise_key?: unknown }>
  | null;

type RawVersion = {
  id?: unknown;
  version_number?: unknown;
  status?: unknown;
  title?: unknown;
  summary?: unknown;
  purpose?: unknown;
  setup?: unknown;
  steps?: unknown;
  cues?: unknown;
  dosage_guidance?: unknown;
  common_errors?: unknown;
  safety_notes?: unknown;
  accessible_text?: unknown;
  target_areas?: unknown;
  equipment?: unknown;
  side_rule?: unknown;
  constraint_tags?: unknown;
  constraint_tags_complete?: unknown;
  planning_goal_tags?: unknown;
  planning_method_tags?: unknown;
  planning_equipment?: unknown;
  planning_facilities?: unknown;
  estimated_minutes?: unknown;
  planning_metadata_complete?: unknown;
  exercises?: Identity;
};

type RelationTarget = {
  version_number?: unknown;
  title?: unknown;
  exercises?: Identity;
};

type RawRelation = {
  relation_type?: unknown;
  guidance?: unknown;
  target?: RelationTarget | RelationTarget[] | null;
};

function keyFrom(value: Identity): string | null {
  const record = Array.isArray(value) ? value[0] : value;
  return typeof record?.exercise_key === "string"
    ? record.exercise_key
    : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function constraintTags(value: unknown): ExerciseConstraintTag[] {
  return strings(value).filter(
    (item): item is ExerciseConstraintTag =>
      item === "surface_hand_loading" || item === "knee_bending",
  );
}

function planningGoals(value: unknown): ExercisePlanningGoal[] {
  return strings(value).filter(
    (item): item is ExercisePlanningGoal =>
      [
        "general_strength",
        "mobility",
        "conditioning",
        "balance",
        "flexibility",
        "activity_consistency",
      ].includes(item),
  );
}

function planningMethods(value: unknown): ExercisePlanningMethod[] {
  return strings(value).filter(
    (item): item is ExercisePlanningMethod =>
      [
        "bodyweight",
        "resistance_band",
        "free_weights",
        "machines",
        "mobility_drills",
        "walking_cardio",
      ].includes(item),
  );
}

function planningEquipment(value: unknown): ExercisePlanningEquipment[] {
  return strings(value).filter(
    (item): item is ExercisePlanningEquipment =>
      [
        "none",
        "chair",
        "wall",
        "stable_support",
        "stable_elevated_surface",
        "counter_height_surface",
        "resistance_band",
        "dumbbells",
        "barbell",
        "bench",
        "cable_machine",
        "cardio_machine",
        "mat",
        "pull_up_bar",
        "step_box",
      ].includes(item),
  );
}

function planningFacilities(value: unknown): ExercisePlanningFacility[] {
  return strings(value).filter(
    (item): item is ExercisePlanningFacility =>
      ["home", "gym", "outdoors", "pool"].includes(item),
  );
}

function libraryItem(row: RawVersion): ExerciseLibraryItem | null {
  const exerciseKey = keyFrom(row.exercises ?? null);

  if (
    typeof row.id !== "string" ||
    typeof row.version_number !== "number" ||
    (row.status !== "general" && row.status !== "reviewed") ||
    typeof row.title !== "string" ||
    typeof row.summary !== "string" ||
    typeof row.purpose !== "string" ||
    typeof row.constraint_tags_complete !== "boolean" ||
    typeof row.planning_metadata_complete !== "boolean" ||
    !(
      row.estimated_minutes === null ||
      typeof row.estimated_minutes === "number"
    ) ||
    !exerciseKey
  ) {
    return null;
  }

  return {
    id: row.id,
    exerciseKey,
    versionNumber: row.version_number,
    status: row.status,
    title: row.title,
    summary: row.summary,
    purpose: row.purpose,
    targetAreas: strings(row.target_areas),
    equipment: strings(row.equipment),
    constraintTags: constraintTags(row.constraint_tags),
    constraintsClassified: row.constraint_tags_complete,
    planningGoalTags: planningGoals(row.planning_goal_tags),
    planningMethodTags: planningMethods(row.planning_method_tags),
    planningEquipment: planningEquipment(row.planning_equipment),
    planningFacilities: planningFacilities(row.planning_facilities),
    estimatedMinutes:
      typeof row.estimated_minutes === "number" ? row.estimated_minutes : null,
    planningMetadataComplete: row.planning_metadata_complete,
  };
}

export async function getExerciseLibrary(): Promise<ExerciseLibraryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercise_versions")
    .select(
      "id,version_number,status,title,summary,purpose,target_areas,equipment,constraint_tags,constraint_tags_complete,planning_goal_tags,planning_method_tags,planning_equipment,planning_facilities,estimated_minutes,planning_metadata_complete,exercises!inner(exercise_key)",
    )
    .order("version_number", { ascending: false });

  if (error) {
    throw new Error("The exercise library could not be loaded.");
  }

  const latest = new Map<string, ExerciseLibraryItem>();

  for (const row of (data ?? []) as RawVersion[]) {
    const item = libraryItem(row);

    if (item && !latest.has(item.exerciseKey)) {
      latest.set(item.exerciseKey, item);
    }
  }

  return Array.from(latest.values()).sort((a, b) =>
    a.title.localeCompare(b.title),
  );
}

export async function getExerciseDetail(
  exerciseKey: string,
  requestedVersion?: number,
): Promise<ExerciseDetail | null> {
  const supabase = await createClient();

  const baseQuery = supabase
    .from("exercise_versions")
    .select(
      "id,version_number,status,title,summary,purpose,setup,steps,cues,dosage_guidance,common_errors,safety_notes,accessible_text,target_areas,equipment,side_rule,constraint_tags,constraint_tags_complete,planning_goal_tags,planning_method_tags,planning_equipment,planning_facilities,estimated_minutes,planning_metadata_complete,exercises!inner(exercise_key)",
    )
    .eq("exercises.exercise_key", exerciseKey);

  const versionQuery =
    requestedVersion === undefined
      ? baseQuery
      : baseQuery.eq("version_number", requestedVersion);

  const { data, error } = await versionQuery
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("The exercise could not be loaded.");
  }

  const row = data as RawVersion | null;
  const item = row ? libraryItem(row) : null;

  if (
    !row ||
    !item ||
    typeof row.purpose !== "string" ||
    typeof row.setup !== "string" ||
    typeof row.dosage_guidance !== "string" ||
    typeof row.accessible_text !== "string" ||
    ![
      "not_applicable",
      "bilateral",
      "unilateral",
      "per_side",
      "alternating",
    ].includes(String(row.side_rule))
  ) {
    return null;
  }

  const { data: relationData, error: relationError } = await supabase
    .from("exercise_version_relations")
    .select(
      "relation_type,guidance,target:exercise_versions!exercise_version_relations_target_version_id_fkey(version_number,title,exercises!inner(exercise_key))",
    )
    .eq("source_version_id", item.id)
    .order("sort_order", { ascending: true });

  if (relationError) {
    throw new Error("Exercise relationships could not be loaded.");
  }

  const relations: ExerciseDetail["relations"] = [];

  for (const relation of (relationData ?? []) as RawRelation[]) {
    const target = Array.isArray(relation.target)
      ? relation.target[0]
      : relation.target;
    const targetKey = keyFrom(target?.exercises ?? null);

    if (
      ![
        "substitution",
        "regression",
        "progression",
        "equipment_alternative",
      ].includes(String(relation.relation_type)) ||
      typeof relation.guidance !== "string" ||
      typeof target?.version_number !== "number" ||
      typeof target?.title !== "string" ||
      !targetKey
    ) {
      continue;
    }

    relations.push({
      relationType: relation.relation_type as ExerciseRelationType,
      guidance: relation.guidance,
      target: {
        exerciseKey: targetKey,
        versionNumber: target.version_number,
        title: target.title,
      },
    });
  }

  return {
    ...item,
    purpose: row.purpose,
    setup: row.setup,
    steps: strings(row.steps),
    cues: strings(row.cues),
    dosageGuidance: row.dosage_guidance,
    commonErrors: strings(row.common_errors),
    safetyNotes: strings(row.safety_notes),
    accessibleText: row.accessible_text,
    sideRule: row.side_rule as ExerciseSideRule,
    relations,
  };
}
export type ExercisePlanningSubstitution = {
  id: string;
  title: string;
  versionNumber: number;
  guidance: string;
};

export type ExercisePlanningCompatibility = {
  id: string;
  title: string;
  versionNumber: number;
  status: string;
  compatible: boolean;
  substitution: ExercisePlanningSubstitution | null;
};

type RawPlanningVersion = {
  id?: unknown;
  version_number?: unknown;
  status?: unknown;
  title?: unknown;
  constraint_tags?: unknown;
  constraint_tags_complete?: unknown;
};

type RawPlanningRelation = {
  source_version_id?: unknown;
  guidance?: unknown;
  target?: RawPlanningVersion | RawPlanningVersion[] | null;
};

function planningVersionCompatible(
  row: RawPlanningVersion,
  constraints: ExerciseConstraintTag[],
): boolean {
  if (row.status !== "general" && row.status !== "reviewed") {
    return false;
  }

  if (constraints.length === 0) {
    return true;
  }

  if (row.constraint_tags_complete !== true) {
    return false;
  }

  const tags = constraintTags(row.constraint_tags);

  return !tags.some((tag) => constraints.includes(tag));
}

export async function getExercisePlanningCompatibility(
  exerciseVersionIds: string[],
  constraints: ExerciseConstraintTag[],
): Promise<ExercisePlanningCompatibility[] | null> {
  const uniqueIds = Array.from(new Set(exerciseVersionIds));

  if (uniqueIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercise_versions")
    .select(
      "id,version_number,status,title,constraint_tags,constraint_tags_complete",
    )
    .in("id", uniqueIds);

  if (error || !data || data.length !== uniqueIds.length) {
    return null;
  }

  const mapped = new Map<string, ExercisePlanningCompatibility>();

  for (const row of data as RawPlanningVersion[]) {
    if (
      typeof row.id !== "string" ||
      typeof row.version_number !== "number" ||
      typeof row.status !== "string" ||
      typeof row.title !== "string"
    ) {
      return null;
    }

    mapped.set(row.id, {
      id: row.id,
      title: row.title,
      versionNumber: row.version_number,
      status: row.status,
      compatible: planningVersionCompatible(row, constraints),
      substitution: null,
    });
  }

  const incompatibleApprovedIds = Array.from(mapped.values())
    .filter(
      (item) =>
        !item.compatible &&
        (item.status === "general" || item.status === "reviewed"),
    )
    .map((item) => item.id);

  if (constraints.length > 0 && incompatibleApprovedIds.length > 0) {
    const { data: relations, error: relationError } = await supabase
      .from("exercise_version_relations")
      .select(
        "source_version_id,guidance,target:exercise_versions!exercise_version_relations_target_version_id_fkey(id,version_number,status,title,constraint_tags,constraint_tags_complete)",
      )
      .eq("relation_type", "substitution")
      .in("source_version_id", incompatibleApprovedIds)
      .order("sort_order", { ascending: true });

    if (relationError) {
      return null;
    }

    for (const relation of (relations ?? []) as RawPlanningRelation[]) {
      if (
        typeof relation.source_version_id !== "string" ||
        typeof relation.guidance !== "string"
      ) {
        continue;
      }

      const source = mapped.get(relation.source_version_id);

      if (!source || source.substitution) {
        continue;
      }

      const target = Array.isArray(relation.target)
        ? relation.target[0]
        : relation.target;

      if (
        !target ||
        typeof target.id !== "string" ||
        typeof target.version_number !== "number" ||
        typeof target.title !== "string" ||
        !planningVersionCompatible(target, constraints)
      ) {
        continue;
      }

      source.substitution = {
        id: target.id,
        title: target.title,
        versionNumber: target.version_number,
        guidance: relation.guidance,
      };
    }
  }

  return uniqueIds.map((id) => mapped.get(id)).filter(
    (item): item is ExercisePlanningCompatibility => Boolean(item),
  );
}
