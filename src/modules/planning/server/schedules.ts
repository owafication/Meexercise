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
  reminderMinutesBefore: number | null;
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
  reminderMinutesBefore: number | null;
  reminderAt: string | null;
  reminderDue: boolean;
  routineVersionId: string;
  routineVersionNumber: number;
  routineTitle: string;
  originalLocalDate: string;
  exceptionId: string | null;
  exceptionVersionNumber: number;
  status: "scheduled" | "rescheduled";
};

export type PlanScheduleExceptionSnapshot = ScheduleRoutineOption & {
  id: string;
  versionNumber: number;
  action: "skip" | "reschedule";
  originalLocalDate: string;
  originalLocalDateLabel: string;
  originalWeekday: number;
  originalWeekdayLabel: string;
  originalWindowStart: string;
  originalWindowEnd: string;
  rescheduledLocalDate: string | null;
  rescheduledWindowStart: string | null;
  rescheduledWindowEnd: string | null;
  createdAt: string;
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
      exceptions: PlanScheduleExceptionSnapshot[];
    }
  | { kind: "signed-out" }
  | { kind: "not-found" }
  | { kind: "unavailable" };

export type TodaySchedulePageState =
  | { kind: "authenticated"; occurrences: ScheduleOccurrence[] }
  | { kind: "signed-out" }
  | { kind: "unavailable" };

export type PlanScheduleExceptionExportRecord = ScheduleRoutineOption & {
  id: string;
  originalLocalDate: string;
  originalWeekday: number;
  originalWeekdayLabel: string;
  originalWindowStart: string;
  originalWindowEnd: string;
  createdAt: string;
  versions: Array<{
    id: string;
    versionNumber: number;
    action: "skip" | "reschedule" | "restore";
    rescheduledLocalDate: string | null;
    rescheduledWindowStart: string | null;
    rescheduledWindowEnd: string | null;
    createdAt: string;
  }>;
};

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
    reminderMinutesBefore: number | null;
    createdAt: string;
    rules: PlanScheduleRuleSnapshot[];
    exceptions: PlanScheduleExceptionExportRecord[];
  }>;
};

function timeText(value: unknown) {
  return String(value).slice(0, 5);
}

function optionalTimeText(value: unknown) {
  return value === null || value === undefined ? null : timeText(value);
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

export function describeReminderMinutes(minutes: number | null) {
  switch (minutes) {
    case null:
      return "off";
    case 15:
      return "15 minutes before";
    case 30:
      return "30 minutes before";
    case 60:
      return "1 hour before";
    case 120:
      return "2 hours before";
    case 1440:
      return "1 day before";
    case 2880:
      return "2 days before";
    case 10080:
      return "1 week before";
    default:
      return `${minutes} minutes before`;
  }
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

  const { data: reminder, error: reminderError } = await supabase
    .from("plan_schedule_reminder_settings")
    .select("minutes_before")
    .eq("schedule_version_id", version.id)
    .maybeSingle();

  if (reminderError) {
    throw new Error("schedule-reminder-read-failed");
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
    reminderMinutesBefore: reminder
      ? Number(reminder.minutes_before)
      : null,
    createdAt: String(version.created_at),
    rules: mappedRules,
  };
}

async function latestPlanScheduleExceptions(
  supabase: SupabaseClient,
  scheduleVersionId: string,
): Promise<PlanScheduleExceptionSnapshot[]> {
  const { data: rules, error: rulesError } = await supabase
    .from("plan_schedule_rules")
    .select("id,weekday,window_start,window_end,routine_version_id")
    .eq("schedule_version_id", scheduleVersionId);

  if (rulesError) {
    throw new Error("schedule-exception-rule-read-failed");
  }

  const ruleRows = (rules ?? []) as Array<Record<string, unknown>>;
  const ruleIds = ruleRows.map((rule) => String(rule.id));

  if (ruleIds.length === 0) {
    return [];
  }

  const { data: exceptions, error: exceptionsError } = await supabase
    .from("plan_schedule_occurrence_exceptions")
    .select("id,schedule_rule_id,original_local_date,created_at")
    .in("schedule_rule_id", ruleIds)
    .order("original_local_date", { ascending: true });

  if (exceptionsError) {
    throw new Error("schedule-exception-read-failed");
  }

  const exceptionRows = (exceptions ?? []) as Array<Record<string, unknown>>;
  const exceptionIds = exceptionRows.map((exception) => String(exception.id));

  if (exceptionIds.length === 0) {
    return [];
  }

  const { data: versions, error: versionsError } = await supabase
    .from("plan_schedule_occurrence_exception_versions")
    .select(
      "exception_id,version_number,action,rescheduled_local_date,rescheduled_window_start,rescheduled_window_end,created_at",
    )
    .in("exception_id", exceptionIds)
    .order("version_number", { ascending: false });

  if (versionsError) {
    throw new Error("schedule-exception-version-read-failed");
  }

  const latestByException = new Map<string, Record<string, unknown>>();

  for (const version of (versions ?? []) as Array<Record<string, unknown>>) {
    const exceptionId = String(version.exception_id);

    if (!latestByException.has(exceptionId)) {
      latestByException.set(exceptionId, version);
    }
  }

  const ruleById = new Map(
    ruleRows.map((rule) => [String(rule.id), rule]),
  );

  const routineVersionIds = Array.from(
    new Set(ruleRows.map((rule) => String(rule.routine_version_id))),
  );
  const routineById = await routineDetailsByVersionId(
    supabase,
    routineVersionIds,
  );

  const mapped: PlanScheduleExceptionSnapshot[] = [];

  for (const exception of exceptionRows) {
    const exceptionId = String(exception.id);
    const latest = latestByException.get(exceptionId);

    if (!latest) {
      throw new Error("schedule-exception-version-missing");
    }

    const action = String(latest.action);

    if (action === "restore") {
      continue;
    }

    if (action !== "skip" && action !== "reschedule") {
      throw new Error("schedule-exception-action-invalid");
    }

    const rule = ruleById.get(String(exception.schedule_rule_id));

    if (!rule) {
      throw new Error("schedule-exception-rule-missing");
    }

    const routineVersionId = String(rule.routine_version_id);
    const routine = routineById.get(routineVersionId);

    if (!routine) {
      throw new Error("schedule-exception-routine-missing");
    }

    const originalWeekday = Number(rule.weekday);
    const originalLocalDate = String(exception.original_local_date);

    mapped.push({
      id: exceptionId,
      versionNumber: Number(latest.version_number),
      action,
      originalLocalDate,
      originalLocalDateLabel: localDateLabel(originalLocalDate),
      originalWeekday,
      originalWeekdayLabel: weekdayLabel(originalWeekday),
      originalWindowStart: timeText(rule.window_start),
      originalWindowEnd: timeText(rule.window_end),
      rescheduledLocalDate: latest.rescheduled_local_date
        ? String(latest.rescheduled_local_date)
        : null,
      rescheduledWindowStart: optionalTimeText(
        latest.rescheduled_window_start,
      ),
      rescheduledWindowEnd: optionalTimeText(latest.rescheduled_window_end),
      createdAt: String(latest.created_at),
      routineId: String(routine.routine_id),
      routineVersionId,
      routineVersionNumber: Number(routine.version_number),
      routineTitle: String(routine.title),
    });
  }

  return mapped.sort((left, right) =>
    left.originalLocalDate.localeCompare(right.originalLocalDate),
  );
}

function mapOccurrence(row: Record<string, unknown>): ScheduleOccurrence {
  const weekday = Number(row.weekday);
  const localDate = String(row.local_date);
  const status =
    row.occurrence_status === "rescheduled" ? "rescheduled" : "scheduled";
  const startsAt = String(row.starts_at);
  const reminderAt = row.reminder_at ? String(row.reminder_at) : null;
  const now = Date.now();

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
    startsAt,
    endsAt: String(row.ends_at),
    reminderMinutesBefore:
      row.reminder_minutes_before === null ||
      row.reminder_minutes_before === undefined
        ? null
        : Number(row.reminder_minutes_before),
    reminderAt,
    reminderDue:
      reminderAt !== null &&
      new Date(reminderAt).getTime() <= now &&
      new Date(startsAt).getTime() > now,
    routineVersionId: String(row.routine_version_id),
    routineVersionNumber: Number(row.routine_version_number),
    routineTitle: String(row.routine_title),
    originalLocalDate: String(row.original_local_date),
    exceptionId: row.exception_id ? String(row.exception_id) : null,
    exceptionVersionNumber: Number(row.exception_version_number ?? 0),
    status,
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

    const schedule = await latestPlanSchedule(supabase, planId);
    const [occurrences, exceptions] = await Promise.all([
      upcomingOccurrences(supabase, 28),
      schedule
        ? latestPlanScheduleExceptions(supabase, schedule.versionId)
        : Promise.resolve([]),
    ]);

    return {
      kind: "authenticated",
      plan,
      schedule,
      upcoming: occurrences.filter(
        (occurrence) => occurrence.planId === planId,
      ),
      exceptions,
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

  const { data: reminderRows, error: reminderRowsError } =
    versionIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("plan_schedule_reminder_settings")
          .select("schedule_version_id,minutes_before")
          .in("schedule_version_id", versionIds);

  if (reminderRowsError) {
    return null;
  }

  const reminderMinutesByVersionId = new Map(
    (reminderRows ?? []).map((row) => [
      String(row.schedule_version_id),
      Number(row.minutes_before),
    ]),
  );

  const { data: rules, error: rulesError } =
    versionIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("plan_schedule_rules")
          .select(
            "id,schedule_version_id,weekday,window_start,window_end,routine_version_id",
          )
          .in("schedule_version_id", versionIds)
          .order("weekday", { ascending: true });

  if (rulesError) {
    return null;
  }

  const ruleRows = (rules ?? []) as Array<Record<string, unknown>>;
  const routineVersionIds = Array.from(
    new Set(ruleRows.map((rule) => String(rule.routine_version_id))),
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
  const ruleMetadataById = new Map<
    string,
    {
      scheduleVersionId: string;
      snapshot: PlanScheduleRuleSnapshot;
    }
  >();

  for (const rule of ruleRows) {
    const scheduleVersionId = String(rule.schedule_version_id);
    const routineVersionId = String(rule.routine_version_id);
    const routine = routineMap.get(routineVersionId);

    if (!routine) {
      return null;
    }

    const weekday = Number(rule.weekday);
    const snapshot: PlanScheduleRuleSnapshot = {
      weekday,
      weekdayLabel: weekdayLabel(weekday),
      windowStart: timeText(rule.window_start),
      windowEnd: timeText(rule.window_end),
      routineId: String(routine.routine_id),
      routineVersionId,
      routineVersionNumber: Number(routine.version_number),
      routineTitle: String(routine.title),
    };
    const current = rulesByVersion.get(scheduleVersionId) ?? [];

    current.push(snapshot);
    rulesByVersion.set(scheduleVersionId, current);
    ruleMetadataById.set(String(rule.id), {
      scheduleVersionId,
      snapshot,
    });
  }

  const ruleIds = Array.from(ruleMetadataById.keys());

  const { data: exceptionRows, error: exceptionsError } =
    ruleIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("plan_schedule_occurrence_exceptions")
          .select("id,schedule_rule_id,original_local_date,created_at")
          .in("schedule_rule_id", ruleIds)
          .order("original_local_date", { ascending: true });

  if (exceptionsError) {
    return null;
  }

  const exceptionIds = (exceptionRows ?? []).map((row) => String(row.id));

  const { data: exceptionVersionRows, error: exceptionVersionsError } =
    exceptionIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("plan_schedule_occurrence_exception_versions")
          .select(
            "id,exception_id,version_number,action,rescheduled_local_date,rescheduled_window_start,rescheduled_window_end,created_at",
          )
          .in("exception_id", exceptionIds)
          .order("version_number", { ascending: true });

  if (exceptionVersionsError) {
    return null;
  }

  const exceptionVersionsByException = new Map<
    string,
    PlanScheduleExceptionExportRecord["versions"]
  >();

  for (const version of exceptionVersionRows ?? []) {
    const exceptionId = String(version.exception_id);
    const action = String(version.action);

    if (
      action !== "skip" &&
      action !== "reschedule" &&
      action !== "restore"
    ) {
      return null;
    }

    const current = exceptionVersionsByException.get(exceptionId) ?? [];

    current.push({
      id: String(version.id),
      versionNumber: Number(version.version_number),
      action,
      rescheduledLocalDate: version.rescheduled_local_date
        ? String(version.rescheduled_local_date)
        : null,
      rescheduledWindowStart: optionalTimeText(
        version.rescheduled_window_start,
      ),
      rescheduledWindowEnd: optionalTimeText(
        version.rescheduled_window_end,
      ),
      createdAt: String(version.created_at),
    });

    exceptionVersionsByException.set(exceptionId, current);
  }

  const exceptionsByScheduleVersion = new Map<
    string,
    PlanScheduleExceptionExportRecord[]
  >();

  for (const exception of exceptionRows ?? []) {
    const metadata = ruleMetadataById.get(String(exception.schedule_rule_id));

    if (!metadata) {
      return null;
    }

    const current =
      exceptionsByScheduleVersion.get(metadata.scheduleVersionId) ?? [];

    current.push({
      id: String(exception.id),
      originalLocalDate: String(exception.original_local_date),
      originalWeekday: metadata.snapshot.weekday,
      originalWeekdayLabel: metadata.snapshot.weekdayLabel,
      originalWindowStart: metadata.snapshot.windowStart,
      originalWindowEnd: metadata.snapshot.windowEnd,
      routineId: metadata.snapshot.routineId,
      routineVersionId: metadata.snapshot.routineVersionId,
      routineVersionNumber: metadata.snapshot.routineVersionNumber,
      routineTitle: metadata.snapshot.routineTitle,
      createdAt: String(exception.created_at),
      versions:
        exceptionVersionsByException.get(String(exception.id)) ?? [],
    });

    exceptionsByScheduleVersion.set(metadata.scheduleVersionId, current);
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
    const versionId = String(version.id);
    const current = versionsBySchedule.get(scheduleId) ?? [];

    current.push({
      id: versionId,
      versionNumber: Number(version.version_number),
      planVersionId,
      planVersionNumber,
      timezoneName: String(version.timezone_name),
      startsOn: String(version.starts_on),
      isPaused: Boolean(version.is_paused),
      reminderMinutesBefore:
        reminderMinutesByVersionId.get(versionId) ?? null,
      createdAt: String(version.created_at),
      rules: rulesByVersion.get(versionId) ?? [],
      exceptions: exceptionsByScheduleVersion.get(versionId) ?? [],
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
