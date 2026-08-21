import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/modules/identity/server/auth";

export type RoutineListItem = {
  id: string;
  title: string;
  versionNumber: number;
  itemCount: number;
  createdAt: string;
};

export type RoutineListPageState =
  | { kind: "authenticated"; routines: RoutineListItem[] }
  | { kind: "signed-out" }
  | { kind: "unavailable" };

export type RoutineExerciseSnapshot = {
  id: string;
  versionNumber: number;
  title: string;
  status: string;
  summary: string;
  purpose: string;
  setup: string;
  steps: string[];
  cues: string[];
  dosageGuidance: string;
  commonErrors: string[];
  safetyNotes: string[];
  accessibleText: string;
  targetAreas: string[];
  equipment: string[];
  sideRule: string;
};

export type RoutineDetail = {
  id: string;
  title: string;
  versionNumber: number;
  createdAt: string;
  sections: Array<{
    id: string;
    title: string;
    position: number;
    items: Array<{
      id: string;
      position: number;
      exerciseVersion: RoutineExerciseSnapshot;
    }>;
  }>;
};

export type RoutineDetailPageState =
  | { kind: "authenticated"; routine: RoutineDetail }
  | { kind: "signed-out" }
  | { kind: "not-found" }
  | { kind: "unavailable" };

export type RoutineExportRecord = {
  id: string;
  createdAt: string;
  versions: Array<{
    id: string;
    versionNumber: number;
    title: string;
    createdAt: string;
    sections: Array<{
      id: string;
      position: number;
      title: string;
      items: Array<{
        id: string;
        position: number;
        exerciseVersion: RoutineExerciseSnapshot;
      }>;
    }>;
  }>;
};

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function exerciseSnapshot(row: Record<string, unknown>): RoutineExerciseSnapshot | null {
  if (
    typeof row.id !== "string" ||
    typeof row.version_number !== "number" ||
    typeof row.title !== "string" ||
    typeof row.status !== "string" ||
    typeof row.summary !== "string" ||
    typeof row.purpose !== "string" ||
    typeof row.setup !== "string" ||
    typeof row.dosage_guidance !== "string" ||
    typeof row.accessible_text !== "string" ||
    typeof row.side_rule !== "string"
  ) {
    return null;
  }

  return {
    id: row.id,
    versionNumber: row.version_number,
    title: row.title,
    status: row.status,
    summary: row.summary,
    purpose: row.purpose,
    setup: row.setup,
    steps: strings(row.steps),
    cues: strings(row.cues),
    dosageGuidance: row.dosage_guidance,
    commonErrors: strings(row.common_errors),
    safetyNotes: strings(row.safety_notes),
    accessibleText: row.accessible_text,
    targetAreas: strings(row.target_areas),
    equipment: strings(row.equipment),
    sideRule: row.side_rule,
  };
}

const EXERCISE_SELECT =
  "id,version_number,title,status,summary,purpose,setup,steps,cues,dosage_guidance,common_errors,safety_notes,accessible_text,target_areas,equipment,side_rule";

export async function getRoutineListPageState(): Promise<RoutineListPageState> {
  try {
    const supabase = await createClient();
    const userId = await getVerifiedUserId(supabase);

    if (!userId) {
      return { kind: "signed-out" };
    }

    const { data: routines, error: routinesError } = await supabase
      .from("routines")
      .select("id,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (routinesError) {
      return { kind: "unavailable" };
    }

    const routineIds = (routines ?? []).map((routine) => String(routine.id));

    if (routineIds.length === 0) {
      return { kind: "authenticated", routines: [] };
    }

    const { data: versions, error: versionsError } = await supabase
      .from("routine_versions")
      .select("id,routine_id,version_number,title,created_at")
      .in("routine_id", routineIds)
      .order("version_number", { ascending: false });

    if (versionsError) {
      return { kind: "unavailable" };
    }

    const latestByRoutine = new Map<string, Record<string, unknown>>();

    for (const version of (versions ?? []) as Array<Record<string, unknown>>) {
      const routineId = String(version.routine_id);
      if (!latestByRoutine.has(routineId)) {
        latestByRoutine.set(routineId, version);
      }
    }

    const latestVersionIds = Array.from(latestByRoutine.values()).map((version) =>
      String(version.id),
    );

    const { data: sections, error: sectionsError } = await supabase
      .from("routine_sections")
      .select("id,routine_version_id")
      .in("routine_version_id", latestVersionIds);

    if (sectionsError) {
      return { kind: "unavailable" };
    }

    const sectionIds = (sections ?? []).map((section) => String(section.id));
    const sectionToVersion = new Map(
      (sections ?? []).map((section) => [
        String(section.id),
        String(section.routine_version_id),
      ]),
    );

    let items: Array<Record<string, unknown>> = [];

    if (sectionIds.length > 0) {
      const { data, error } = await supabase
        .from("routine_items")
        .select("id,routine_section_id")
        .in("routine_section_id", sectionIds);

      if (error) {
        return { kind: "unavailable" };
      }

      items = (data ?? []) as Array<Record<string, unknown>>;
    }

    const itemCountByVersion = new Map<string, number>();

    for (const item of items) {
      const versionId = sectionToVersion.get(String(item.routine_section_id));
      if (versionId) {
        itemCountByVersion.set(
          versionId,
          (itemCountByVersion.get(versionId) ?? 0) + 1,
        );
      }
    }

    const mapped: RoutineListItem[] = [];

    for (const routine of routines ?? []) {
      const version = latestByRoutine.get(String(routine.id));

      if (
        !version ||
        typeof version.id !== "string" ||
        typeof version.version_number !== "number" ||
        typeof version.title !== "string"
      ) {
        return { kind: "unavailable" };
      }

      mapped.push({
        id: String(routine.id),
        title: version.title,
        versionNumber: version.version_number,
        itemCount: itemCountByVersion.get(version.id) ?? 0,
        createdAt: String(routine.created_at),
      });
    }

    return { kind: "authenticated", routines: mapped };
  } catch {
    return { kind: "unavailable" };
  }
}

export async function getRoutineDetailPageState(
  routineId: string,
): Promise<RoutineDetailPageState> {
  try {
    const supabase = await createClient();
    const userId = await getVerifiedUserId(supabase);

    if (!userId) {
      return { kind: "signed-out" };
    }

    const { data: routine, error: routineError } = await supabase
      .from("routines")
      .select("id,created_at")
      .eq("id", routineId)
      .eq("user_id", userId)
      .maybeSingle();

    if (routineError) {
      return { kind: "unavailable" };
    }

    if (!routine) {
      return { kind: "not-found" };
    }

    const { data: version, error: versionError } = await supabase
      .from("routine_versions")
      .select("id,version_number,title,created_at")
      .eq("routine_id", routine.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError || !version) {
      return { kind: "unavailable" };
    }

    const { data: sections, error: sectionsError } = await supabase
      .from("routine_sections")
      .select("id,position,title")
      .eq("routine_version_id", version.id)
      .order("position", { ascending: true });

    if (sectionsError) {
      return { kind: "unavailable" };
    }

    const sectionIds = (sections ?? []).map((section) => String(section.id));

    let items: Array<Record<string, unknown>> = [];

    if (sectionIds.length > 0) {
      const { data, error } = await supabase
        .from("routine_items")
        .select("id,routine_section_id,position,exercise_version_id")
        .in("routine_section_id", sectionIds)
        .order("position", { ascending: true });

      if (error) {
        return { kind: "unavailable" };
      }

      items = (data ?? []) as Array<Record<string, unknown>>;
    }

    const exerciseVersionIds = Array.from(
      new Set(items.map((item) => String(item.exercise_version_id))),
    );

    let exerciseRows: Array<Record<string, unknown>> = [];

    if (exerciseVersionIds.length > 0) {
      const { data, error } = await supabase
        .from("exercise_versions")
        .select(EXERCISE_SELECT)
        .in("id", exerciseVersionIds);

      if (error || !data) {
        return { kind: "unavailable" };
      }

      exerciseRows = data as Array<Record<string, unknown>>;
    }

    const exerciseById = new Map<string, RoutineExerciseSnapshot>();

    for (const row of exerciseRows) {
      const snapshot = exerciseSnapshot(row);

      if (!snapshot) {
        return { kind: "unavailable" };
      }

      exerciseById.set(snapshot.id, snapshot);
    }

    const itemsBySection = new Map<string, RoutineDetail["sections"][number]["items"]>();

    for (const item of items) {
      const sectionId = String(item.routine_section_id);
      const exerciseVersion = exerciseById.get(String(item.exercise_version_id));

      if (!exerciseVersion) {
        return { kind: "unavailable" };
      }

      const current = itemsBySection.get(sectionId) ?? [];
      current.push({
        id: String(item.id),
        position: Number(item.position),
        exerciseVersion,
      });
      itemsBySection.set(sectionId, current);
    }

    return {
      kind: "authenticated",
      routine: {
        id: String(routine.id),
        title: String(version.title),
        versionNumber: Number(version.version_number),
        createdAt: String(version.created_at),
        sections: (sections ?? []).map((section) => ({
          id: String(section.id),
          title: String(section.title),
          position: Number(section.position),
          items: itemsBySection.get(String(section.id)) ?? [],
        })),
      },
    };
  } catch {
    return { kind: "unavailable" };
  }
}

export async function buildUserRoutineExport(
  supabase: SupabaseClient,
  userId: string,
): Promise<RoutineExportRecord[] | null> {
  const { data: routines, error: routinesError } = await supabase
    .from("routines")
    .select("id,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (routinesError) {
    return null;
  }

  const routineIds = (routines ?? []).map((routine) => String(routine.id));

  if (routineIds.length === 0) {
    return [];
  }

  const { data: versions, error: versionsError } = await supabase
    .from("routine_versions")
    .select("id,routine_id,version_number,title,created_at")
    .in("routine_id", routineIds)
    .order("version_number", { ascending: true });

  if (versionsError) {
    return null;
  }

  const versionIds = (versions ?? []).map((version) => String(version.id));

  const { data: sections, error: sectionsError } = await supabase
    .from("routine_sections")
    .select("id,routine_version_id,position,title")
    .in("routine_version_id", versionIds)
    .order("position", { ascending: true });

  if (sectionsError) {
    return null;
  }

  const sectionIds = (sections ?? []).map((section) => String(section.id));

  let items: Array<Record<string, unknown>> = [];

  if (sectionIds.length > 0) {
    const { data, error } = await supabase
      .from("routine_items")
      .select("id,routine_section_id,position,exercise_version_id")
      .in("routine_section_id", sectionIds)
      .order("position", { ascending: true });

    if (error) {
      return null;
    }

    items = (data ?? []) as Array<Record<string, unknown>>;
  }

  const exerciseVersionIds = Array.from(
    new Set(items.map((item) => String(item.exercise_version_id))),
  );

  let exerciseRows: Array<Record<string, unknown>> = [];

  if (exerciseVersionIds.length > 0) {
    const { data, error } = await supabase
      .from("exercise_versions")
      .select(EXERCISE_SELECT)
      .in("id", exerciseVersionIds);

    if (error || !data) {
      return null;
    }

    exerciseRows = data as Array<Record<string, unknown>>;
  }

  const exerciseById = new Map<string, RoutineExerciseSnapshot>();

  for (const row of exerciseRows) {
    const snapshot = exerciseSnapshot(row);

    if (!snapshot) {
      return null;
    }

    exerciseById.set(snapshot.id, snapshot);
  }

  const itemsBySection = new Map<string, RoutineExportRecord["versions"][number]["sections"][number]["items"]>();

  for (const item of items) {
    const exerciseVersion = exerciseById.get(String(item.exercise_version_id));

    if (!exerciseVersion) {
      return null;
    }

    const sectionId = String(item.routine_section_id);
    const current = itemsBySection.get(sectionId) ?? [];
    current.push({
      id: String(item.id),
      position: Number(item.position),
      exerciseVersion,
    });
    itemsBySection.set(sectionId, current);
  }

  const sectionsByVersion = new Map<string, RoutineExportRecord["versions"][number]["sections"]>();

  for (const section of sections ?? []) {
    const versionId = String(section.routine_version_id);
    const current = sectionsByVersion.get(versionId) ?? [];

    current.push({
      id: String(section.id),
      position: Number(section.position),
      title: String(section.title),
      items: itemsBySection.get(String(section.id)) ?? [],
    });

    sectionsByVersion.set(versionId, current);
  }

  const versionsByRoutine = new Map<string, RoutineExportRecord["versions"]>();

  for (const version of versions ?? []) {
    const routineId = String(version.routine_id);
    const current = versionsByRoutine.get(routineId) ?? [];

    current.push({
      id: String(version.id),
      versionNumber: Number(version.version_number),
      title: String(version.title),
      createdAt: String(version.created_at),
      sections: sectionsByVersion.get(String(version.id)) ?? [],
    });

    versionsByRoutine.set(routineId, current);
  }

  return (routines ?? []).map((routine) => ({
    id: String(routine.id),
    createdAt: String(routine.created_at),
    versions: versionsByRoutine.get(String(routine.id)) ?? [],
  }));
}
