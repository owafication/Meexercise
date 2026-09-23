import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/modules/identity/server/auth";
import {
  buildPlanScheduleExports,
  type PlanScheduleExportRecord,
} from "@/modules/planning/server/schedules";

export type PlanRoutineSnapshot = {
  position: number;
  routineId: string;
  routineVersionId: string;
  routineVersionNumber: number;
  routineTitle: string;
};

export type PlanListItem = {
  id: string;
  title: string;
  versionNumber: number;
  routineCount: number;
  createdAt: string;
};

export type PlanListPageState =
  | { kind: "authenticated"; plans: PlanListItem[] }
  | { kind: "signed-out" }
  | { kind: "unavailable" };

export type PlanDetail = {
  id: string;
  title: string;
  versionNumber: number;
  createdAt: string;
  routines: PlanRoutineSnapshot[];
};

export type PlanDetailPageState =
  | { kind: "authenticated"; plan: PlanDetail }
  | { kind: "signed-out" }
  | { kind: "not-found" }
  | { kind: "unavailable" };

export type PlanExportRecord = {
  id: string;
  createdAt: string;
  schedule: PlanScheduleExportRecord | null;
  versions: Array<{
    id: string;
    versionNumber: number;
    title: string;
    createdAt: string;
    routines: PlanRoutineSnapshot[];
  }>;
};

async function routineSnapshotsForLinks(
  supabase: SupabaseClient,
  links: Array<Record<string, unknown>>,
): Promise<PlanRoutineSnapshot[] | null> {
  const routineVersionIds = Array.from(
    new Set(links.map((link) => String(link.routine_version_id))),
  );

  if (routineVersionIds.length === 0) {
    return [];
  }

  const { data: routineVersions, error } = await supabase
    .from("routine_versions")
    .select("id,routine_id,version_number,title")
    .in("id", routineVersionIds);

  if (error || !routineVersions) {
    return null;
  }

  const byId = new Map(
    routineVersions.map((version) => [String(version.id), version]),
  );

  const result: PlanRoutineSnapshot[] = [];

  for (const link of links) {
    const version = byId.get(String(link.routine_version_id));

    if (!version) {
      return null;
    }

    result.push({
      position: Number(link.position),
      routineId: String(version.routine_id),
      routineVersionId: String(version.id),
      routineVersionNumber: Number(version.version_number),
      routineTitle: String(version.title),
    });
  }

  return result.sort((left, right) => left.position - right.position);
}

export async function getPlanListPageState(): Promise<PlanListPageState> {
  try {
    const supabase = await createClient();
    const userId = await getVerifiedUserId(supabase);

    if (!userId) {
      return { kind: "signed-out" };
    }

    const { data: plans, error: plansError } = await supabase
      .from("plans")
      .select("id,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (plansError) {
      return { kind: "unavailable" };
    }

    const planIds = (plans ?? []).map((plan) => String(plan.id));

    if (planIds.length === 0) {
      return { kind: "authenticated", plans: [] };
    }

    const { data: versions, error: versionsError } = await supabase
      .from("plan_versions")
      .select("id,plan_id,version_number,title,created_at")
      .in("plan_id", planIds)
      .order("version_number", { ascending: false });

    if (versionsError) {
      return { kind: "unavailable" };
    }

    const latestByPlan = new Map<string, Record<string, unknown>>();

    for (const version of (versions ?? []) as Array<Record<string, unknown>>) {
      const planId = String(version.plan_id);
      if (!latestByPlan.has(planId)) {
        latestByPlan.set(planId, version);
      }
    }

    const latestVersionIds = Array.from(latestByPlan.values()).map((version) =>
      String(version.id),
    );

    const { data: links, error: linksError } = await supabase
      .from("plan_version_routines")
      .select("plan_version_id")
      .in("plan_version_id", latestVersionIds);

    if (linksError) {
      return { kind: "unavailable" };
    }

    const counts = new Map<string, number>();

    for (const link of links ?? []) {
      const versionId = String(link.plan_version_id);
      counts.set(versionId, (counts.get(versionId) ?? 0) + 1);
    }

    const mapped: PlanListItem[] = [];

    for (const plan of plans ?? []) {
      const version = latestByPlan.get(String(plan.id));

      if (
        !version ||
        typeof version.id !== "string" ||
        typeof version.version_number !== "number" ||
        typeof version.title !== "string"
      ) {
        return { kind: "unavailable" };
      }

      mapped.push({
        id: String(plan.id),
        title: version.title,
        versionNumber: version.version_number,
        routineCount: counts.get(version.id) ?? 0,
        createdAt: String(plan.created_at),
      });
    }

    return { kind: "authenticated", plans: mapped };
  } catch {
    return { kind: "unavailable" };
  }
}

export async function getPlanDetailPageState(
  planId: string,
): Promise<PlanDetailPageState> {
  try {
    const supabase = await createClient();
    const userId = await getVerifiedUserId(supabase);

    if (!userId) {
      return { kind: "signed-out" };
    }

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id,created_at")
      .eq("id", planId)
      .eq("user_id", userId)
      .maybeSingle();

    if (planError) {
      return { kind: "unavailable" };
    }

    if (!plan) {
      return { kind: "not-found" };
    }

    const { data: version, error: versionError } = await supabase
      .from("plan_versions")
      .select("id,version_number,title,created_at")
      .eq("plan_id", plan.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError || !version) {
      return { kind: "unavailable" };
    }

    const { data: links, error: linksError } = await supabase
      .from("plan_version_routines")
      .select("position,routine_version_id")
      .eq("plan_version_id", version.id)
      .order("position", { ascending: true });

    if (linksError) {
      return { kind: "unavailable" };
    }

    const routines = await routineSnapshotsForLinks(
      supabase,
      (links ?? []) as Array<Record<string, unknown>>,
    );

    if (routines === null) {
      return { kind: "unavailable" };
    }

    return {
      kind: "authenticated",
      plan: {
        id: String(plan.id),
        title: String(version.title),
        versionNumber: Number(version.version_number),
        createdAt: String(version.created_at),
        routines,
      },
    };
  } catch {
    return { kind: "unavailable" };
  }
}

export async function buildUserPlanExport(
  supabase: SupabaseClient,
  userId: string,
): Promise<PlanExportRecord[] | null> {
  const { data: plans, error: plansError } = await supabase
    .from("plans")
    .select("id,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (plansError) {
    return null;
  }

  const planIds = (plans ?? []).map((plan) => String(plan.id));

  if (planIds.length === 0) {
    return [];
  }

  const { data: versions, error: versionsError } = await supabase
    .from("plan_versions")
    .select("id,plan_id,version_number,title,created_at")
    .in("plan_id", planIds)
    .order("version_number", { ascending: true });

  if (versionsError) {
    return null;
  }

  const versionIds = (versions ?? []).map((version) => String(version.id));

  const { data: links, error: linksError } = await supabase
    .from("plan_version_routines")
    .select("plan_version_id,position,routine_version_id")
    .in("plan_version_id", versionIds)
    .order("position", { ascending: true });

  if (linksError) {
    return null;
  }

  const linksByVersion = new Map<string, Array<Record<string, unknown>>>();

  for (const link of (links ?? []) as Array<Record<string, unknown>>) {
    const versionId = String(link.plan_version_id);
    const current = linksByVersion.get(versionId) ?? [];
    current.push(link);
    linksByVersion.set(versionId, current);
  }

  const snapshotsByVersion = new Map<string, PlanRoutineSnapshot[]>();

  for (const versionId of versionIds) {
    const snapshots = await routineSnapshotsForLinks(
      supabase,
      linksByVersion.get(versionId) ?? [],
    );

    if (snapshots === null) {
      return null;
    }

    snapshotsByVersion.set(versionId, snapshots);
  }

  const schedulesByPlan = await buildPlanScheduleExports(supabase, planIds);

  if (schedulesByPlan === null) {
    return null;
  }

  const versionsByPlan = new Map<string, PlanExportRecord["versions"]>();

  for (const version of versions ?? []) {
    const planId = String(version.plan_id);
    const current = versionsByPlan.get(planId) ?? [];

    current.push({
      id: String(version.id),
      versionNumber: Number(version.version_number),
      title: String(version.title),
      createdAt: String(version.created_at),
      routines: snapshotsByVersion.get(String(version.id)) ?? [],
    });

    versionsByPlan.set(planId, current);
  }

  return (plans ?? []).map((plan) => ({
    id: String(plan.id),
    createdAt: String(plan.created_at),
    schedule: schedulesByPlan.get(String(plan.id)) ?? null,
    versions: versionsByPlan.get(String(plan.id)) ?? [],
  }));
}