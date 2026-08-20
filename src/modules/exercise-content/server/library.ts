import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ExerciseRelationType =
  | "substitution"
  | "regression"
  | "progression"
  | "equipment_alternative";

export type ExerciseLibraryItem = {
  id: string;
  exerciseKey: string;
  versionNumber: number;
  status: "general" | "reviewed";
  title: string;
  summary: string;
  targetAreas: string[];
  equipment: string[];
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
  sideRule: "not_applicable" | "bilateral" | "unilateral" | "per_side" | "alternating";
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

type Identity = { exercise_key?: unknown } | Array<{ exercise_key?: unknown }> | null;

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
  return typeof record?.exercise_key === "string" ? record.exercise_key : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function libraryItem(row: RawVersion): ExerciseLibraryItem | null {
  const exerciseKey = keyFrom(row.exercises ?? null);

  if (
    typeof row.id !== "string" ||
    typeof row.version_number !== "number" ||
    (row.status !== "general" && row.status !== "reviewed") ||
    typeof row.title !== "string" ||
    typeof row.summary !== "string" ||
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
    targetAreas: strings(row.target_areas),
    equipment: strings(row.equipment),
  };
}

export async function getExerciseLibrary(): Promise<ExerciseLibraryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercise_versions")
    .select("id,version_number,status,title,summary,target_areas,equipment,exercises!inner(exercise_key)")
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

  return Array.from(latest.values()).sort((a,b) => a.title.localeCompare(b.title));
}

export async function getExerciseDetail(exerciseKey: string): Promise<ExerciseDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("exercise_versions")
    .select("id,version_number,status,title,summary,purpose,setup,steps,cues,dosage_guidance,common_errors,safety_notes,accessible_text,target_areas,equipment,side_rule,exercises!inner(exercise_key)")
    .eq("exercises.exercise_key", exerciseKey)
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
    !["not_applicable","bilateral","unilateral","per_side","alternating"].includes(String(row.side_rule))
  ) {
    return null;
  }

  const { data: relationData, error: relationError } = await supabase
    .from("exercise_version_relations")
    .select("relation_type,guidance,target:exercise_versions!exercise_version_relations_target_version_id_fkey(version_number,title,exercises!inner(exercise_key))")
    .eq("source_version_id", item.id)
    .order("sort_order", { ascending: true });

  if (relationError) {
    throw new Error("Exercise relationships could not be loaded.");
  }

  const relations: ExerciseDetail["relations"] = [];

  for (const relation of (relationData ?? []) as RawRelation[]) {
    const target = Array.isArray(relation.target) ? relation.target[0] : relation.target;
    const targetKey = keyFrom(target?.exercises ?? null);

    if (
      !["substitution","regression","progression","equipment_alternative"].includes(String(relation.relation_type)) ||
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
    sideRule: row.side_rule as ExerciseDetail["sideRule"],
    relations,
  };
}
