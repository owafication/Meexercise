import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/modules/identity/server/auth";

const weekdayNames = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type ScheduleRoutineOption = {
  routineId: string;
  routineVersionId: string;
  routineVersionNumber: number;
  routineTitle: string;
};

export type PlanScheduleRuleSnapshot = ScheduleRoutineOption & {
  weekday: number;
  weekdayLabel: string;
  windowStart: string;
  windowEnd: string;
};

export type PlanScheduleSnapshot = {
  id: string;
  versionId: string;
  versionNumber: number;
  planVersionId: string;
  planVersionNumber: number;
  timezoneName: string;
  startsOn: string;
  isPaused: boolean;
  createdAt: string;
  rules: PlanScheduleRuleSnapshot[];
};

export type ScheduleOccurrence = {
  planId: string;
  planVersionNumber: number;
  planTitle: string;
  scheduleVersionNumber: number;
  timezoneName: string;
  localDate: string;
  localDateLabel: string;
  weekday: number;
  weekdayLabel: string;
  windowStart: string;
  windowEnd: string;
  startsAt: string;
  endsAt: string;
  routineVersionId: string;
  routineVersionNumber: number;
  routineTitle: string;
};

export type PlanSchedulePageState =
  | {
      kind: "authenticated";
      plan: {
        id: string;
        title: string;
        versionNumber: number;
        routines: ScheduleRoutineOption[];
      };
      schedule: PlanScheduleSnapshot | null;
      upcoming: ScheduleOccurrence[];
    }
  | { kind: "signed-out" }
  | { kind: "not-found" }
  | { kind: "unavailable" };

export type TodaySchedulePageState =
  | { kind: "authenticated"; occurrences: ScheduleOccurrence[] }
  | { kind: "signed-out" }
  | { kind: "unavailable" };

export type PlanScheduleExportRecord = {
  id: string;
  createdAt: string;
  versions: Array<{
    id: string;
    versionNumber: number;
    planVersionId: string;
    planVersionNumber: number;
    timezoneName: string;
    startsOn: string;
    isPaused: boolean;
    createdAt: string;
    rules: PlanScheduleRuleSnapshot[];
  }>;
};

function timeText(value: unknown) {
  return String(value).slice(0, 5);
}

function weekdayLabel(value: number) {
  return weekdayNames[value] ?? `Day ${value}`;
}

function localDateLabel(localDate: string) {
  const date = new Date(`${localDate}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return localDate;
  }

  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

async function routineDetailsByVersionId(
  supabase: SupabaseClient,
  routineVersionIds: string[],
) {
  if (routineVersionIds.length === 0) {
    return new Map<string, Record<string, unknown>>();
  }

  const { data, error } = await supabase
    .from("routine_versions")
    .select("id,routine_id,version_number,title")
    .in("id", routineVersionIds);

  if (error || !data) {
    throw new Error("routine-version-read-failed");
  }

  return new Map(
    (data as Array<Record<string, unknown>>).map((row) => [
      String(row.id),
      row,
    ]),
  );
}

async function currentPlanForSchedule(
  supabase: SupabaseClient,
  userId: string,
  planId: string,
) {
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id")
    .eq("id", planId)
    .eq("user_id", userId)
    .maybeSingle();

  if (planError) {
    throw new Error("plan-read-failed");
  }

  if (!plan) {
    return null;
  }

  const { data: version, error: versionError } = await supabase
    .from("plan_versions")
    .select("id,version_number,title")
    .eq("plan_id", plan.id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (versionError || !version) {
    throw new Error("plan-version-read-failed");
  }

  const { data: links, error: linksError } = await supabase
    .from("plan_version_routines")
    .select("position,routine_version_id")
    .eq("plan_version_id", version.id)
    .order("position", { ascending: true });

  if (linksError) {
    throw new Error("plan-routine-read-failed");
  }

  const ids = (links ?? []).map((link) => String(link.routine_version_id));
  const byId = await routineDetailsByVersionId(supabase, ids);
  const routines: ScheduleRoutineOption[] = [];

  for (const link of links ?? []) {
    const routineVersionId = String(link.routine_version_id);
    const routine = byId.get(routineVersionId);

    if (!routine) {
      throw new Error("plan-routine-version-missing");
    }

    routines.push({
      routineId: String(routine.routine_id),
      routineVersionId,
      routineVersionNumber: Number(routine.version_number),
      routineTitle: String(routine.title),
    });
  }

  return {
    id: String(plan.id),
    title: String(version.title),
    versionNumber: Number(version.version_number),
    routines,
  };
}

async function latestPlanSchedule(
  supabase: SupabaseClient,
  planId: string,
): Promise<PlanScheduleSnapshot | null> {
  const { data: schedule, error: scheduleError } = await supabase
    .from("plan_schedules")
    .select("id,created_at")
    .eq("plan_id", planId)
    .maybeSingle();

  if (scheduleError) {
    throw new Error("schedule-read-failed");
  }

  if (!schedule) {
    return null;
  }

  const { data: version, error: versionError } = await supabase
    .from("plan_schedule_versions")
    .select(
      "id,plan_version_id,version_number,timezone_name,starts_on,is_paused,created_at",
    )
    .eq("schedule_id", schedule.id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (versionError || !version) {
    throw new Error("schedule-version-read-failed");
  }

  const { data: planVersion, error: planVersionError } = await supabase
    .from("plan_versions")
    .select("version_number")
    .eq("id", version.plan_version_id)
    .maybeSingle();

  if (planVersionError || !planVersion) {
    throw new Error("schedule-plan-version-read-failed");
  }

  const { data: rules, error: rulesError } = await supabase
    .from("plan_schedule_rules")
    .select("weekday,window_start,window_end,routine_version_id")
    .eq("schedule_version_id", version.id)
    .order("weekday", { ascending: true });

  if (rulesError) {
    throw new Error("schedule-rule-read-failed");
  }

  const routineVersionIds = (rules ?? []).map((rule) =>
    String(rule.routine_version_id),
  );
  const routines = await routineDetailsByVersionId(
    supabase,
    routineVersionIds,
  );

  const mappedRules: PlanScheduleRuleSnapshot[] = [];

  for (const rule of rules ?? []) {
    const routineVersionId = String(rule.routine_version_id);
    const routine = routines.get(routineVersionId);

    if (!routine) {
      throw new Error("schedule-routine-version-missing");
    }

    const weekday = Number(rule.weekday);

    mappedRules.push({
      weekday,
      weekdayLabel: weekdayLabel(weekday),
      windowStart: timeText(rule.window_start),
      windowEnd: timeText(rule.window_end),
      routineId: String(routine.routine_id),
      routineVersionId,
      routineVersionNumber: Number(routine.version_number),
      routineTitle: String(routine.title),
    });
  }

  return {
    id: String(schedule.id),
    versionId: String(version.id),
    versionNumber: Number(version.version_number),
    planVersionId: String(version.plan_version_id),
    planVersionNumber: Number(planVersion.version_number),
    timezoneName: String(version.timezone_name),
    startsOn: String(version.starts_on),
    isPaused: Boolean(version.is_paused),
    createdAt: String(version.created_at),
    rules: mappedRules,
  };
}

function mapOccurrence(row: Record<string, unknown>): ScheduleOccurrence {
  const weekday = Number(row.weekday);
  const localDate = String(row.local_date);

  return {
    planId: String(row.plan_id),
    planVersionNumber: Number(row.plan_version_number),
    planTitle: String(row.plan_title),
    scheduleVersionNumber: Number(row.schedule_version_number),
    timezoneName: String(row.timezone_name),
    localDate,
    localDateLabel: localDateLabel(localDate),
    weekday,
    weekdayLabel: weekdayLabel(weekday),
    windowStart: timeText(row.window_start),
    windowEnd: timeText(row.window_end),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    routineVersionId: String(row.routine_version_id),
    routineVersionNumber: Number(row.routine_version_number),
    routineTitle: String(row.routine_title),
  };
}

async function upcomingOccurrences(
  supabase: SupabaseClient,
  days: number,
): Promise<ScheduleOccurrence[]> {
  const from = new Date();
  const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase.rpc(
    "get_my_plan_schedule_occurrences",
    {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    },
  );

  if (error || !data) {
    throw new Error("schedule-occurrence-read-failed");
  }

  return (data as Array<Record<string, unknown>>).map(mapOccurrence);
}

export async function getPlanSchedulePageState(
  planId: string,
): Promise<PlanSchedulePageState> {
  try {
    const supabase = await createClient();
    const userId = await getVerifiedUserId(supabase);

    if (!userId) {
      return { kind: "signed-out" };
    }

    const plan = await currentPlanForSchedule(supabase, userId, planId);

    if (!plan) {
      return { kind: "not-found" };
    }

    const [schedule, occurrences] = await Promise.all([
      latestPlanSchedule(supabase, planId),
      upcomingOccurrences(supabase, 28),
    ]);

    return {
      kind: "authenticated",
      plan,
      schedule,
      upcoming: occurrences.filter(
        (occurrence) => occurrence.planId === planId,
      ),
    };
  } catch {
    return { kind: "unavailable" };
  }
}

export async function getTodaySchedulePageState(): Promise<TodaySchedulePageState> {
  try {
    const supabase = await createClient();
    const userId = await getVerifiedUserId(supabase);

    if (!userId) {
      return { kind: "signed-out" };
    }

    const occurrences = await upcomingOccurrences(supabase, 14);

    return {
      kind: "authenticated",
      occurrences: occurrences.slice(0, 8),
    };
  } catch {
    return { kind: "unavailable" };
  }
}

export async function buildPlanScheduleExports(
  supabase: SupabaseClient,
  planIds: string[],
): Promise<Map<string, PlanScheduleExportRecord> | null> {
  if (planIds.length === 0) {
    return new Map();
  }

  const { data: schedules, error: schedulesError } = await supabase
    .from("plan_schedules")
    .select("id,plan_id,created_at")
    .in("plan_id", planIds)
    .order("created_at", { ascending: true });

  if (schedulesError) {
    return null;
  }

  const scheduleIds = (schedules ?? []).map((schedule) =>
    String(schedule.id),
  );

  if (scheduleIds.length === 0) {
    return new Map();
  }

  const { data: versions, error: versionsError } = await supabase
    .from("plan_schedule_versions")
    .select(
      "id,schedule_id,plan_version_id,version_number,timezone_name,starts_on,is_paused,created_at",
    )
    .in("schedule_id", scheduleIds)
    .order("version_number", { ascending: true });

  if (versionsError) {
    return null;
  }

  const versionIds = (versions ?? []).map((version) => String(version.id));
  const planVersionIds = Array.from(
    new Set((versions ?? []).map((version) => String(version.plan_version_id))),
  );

  const { data: rules, error: rulesError } =
    versionIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("plan_schedule_rules")
          .select(
            "schedule_version_id,weekday,window_start,window_end,routine_version_id",
          )
          .in("schedule_version_id", versionIds)
          .order("weekday", { ascending: true });

  if (rulesError) {
    return null;
  }

  const routineVersionIds = Array.from(
    new Set((rules ?? []).map((rule) => String(rule.routine_version_id))),
  );

  const routineMap = await routineDetailsByVersionId(
    supabase,
    routineVersionIds,
  );

  const { data: planVersionRows, error: planVersionError } =
    planVersionIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("plan_versions")
          .select("id,version_number")
          .in("id", planVersionIds);

  if (planVersionError) {
    return null;
  }

  const planVersionNumberById = new Map(
    (planVersionRows ?? []).map((row) => [
      String(row.id),
      Number(row.version_number),
    ]),
  );

  const rulesByVersion = new Map<string, PlanScheduleRuleSnapshot[]>();

  for (const rule of rules ?? []) {
    const scheduleVersionId = String(rule.schedule_version_id);
    const routineVersionId = String(rule.routine_version_id);
    const routine = routineMap.get(routineVersionId);

    if (!routine) {
      return null;
    }

    const weekday = Number(rule.weekday);
    const current = rulesByVersion.get(scheduleVersionId) ?? [];

    current.push({
      weekday,
      weekdayLabel: weekdayLabel(weekday),
      windowStart: timeText(rule.window_start),
      windowEnd: timeText(rule.window_end),
      routineId: String(routine.routine_id),
      routineVersionId,
      routineVersionNumber: Number(routine.version_number),
      routineTitle: String(routine.title),
    });

    rulesByVersion.set(scheduleVersionId, current);
  }

  const versionsBySchedule = new Map<
    string,
    PlanScheduleExportRecord["versions"]
  >();

  for (const version of versions ?? []) {
    const planVersionId = String(version.plan_version_id);
    const planVersionNumber = planVersionNumberById.get(planVersionId);

    if (!planVersionNumber) {
      return null;
    }

    const scheduleId = String(version.schedule_id);
    const current = versionsBySchedule.get(scheduleId) ?? [];

    current.push({
      id: String(version.id),
      versionNumber: Number(version.version_number),
      planVersionId,
      planVersionNumber,
      timezoneName: String(version.timezone_name),
      startsOn: String(version.starts_on),
      isPaused: Boolean(version.is_paused),
      createdAt: String(version.created_at),
      rules: rulesByVersion.get(String(version.id)) ?? [],
    });

    versionsBySchedule.set(scheduleId, current);
  }

  const result = new Map<string, PlanScheduleExportRecord>();

  for (const schedule of schedules ?? []) {
    const scheduleId = String(schedule.id);

    result.set(String(schedule.plan_id), {
      id: scheduleId,
      createdAt: String(schedule.created_at),
      versions: versionsBySchedule.get(scheduleId) ?? [],
    });
  }

  return result;
}
