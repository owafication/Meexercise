"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/modules/identity/server/auth";

export type RoutineTemplateActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function normalizedText(value: FormDataEntryValue | null) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ")
    : "";
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function saveRoutineTemplateAction(
  previousState: RoutineTemplateActionState,
  formData: FormData,
): Promise<RoutineTemplateActionState> {
  void previousState;

  const routineId = normalizedText(formData.get("routineId"));
  const title = normalizedText(formData.get("templateTitle"));

  if (!validUuid(routineId)) {
    return { status: "error", message: "Routine could not be verified." };
  }

  if (title.length < 1 || title.length > 80) {
    return {
      status: "error",
      message: "Enter a template name between 1 and 80 characters.",
    };
  }

  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return {
      status: "error",
      message: "Template storage is unavailable right now.",
    };
  }

  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    return {
      status: "error",
      message: "Sign in again before saving a template.",
    };
  }

  const { data, error } = await supabase.rpc(
    "create_routine_template_from_routine",
    {
      p_routine_id: routineId,
      p_title: title,
    },
  );

  if (error?.code === "42501") {
    return {
      status: "error",
      message: "That routine is not available to save as a template.",
    };
  }

  if (error?.code === "23514") {
    return {
      status: "error",
      message:
        "The current routine version cannot become a reusable template because its content is no longer currently approved.",
    };
  }

  if (error || typeof data !== "string") {
    return {
      status: "error",
      message: "Template could not be saved. Try again later.",
    };
  }

  revalidatePath("/plans");

  return {
    status: "success",
    message: "Template saved.",
  };
}

export async function createRoutineFromTemplateAction(
  previousState: RoutineTemplateActionState,
  formData: FormData,
): Promise<RoutineTemplateActionState> {
  void previousState;

  const templateId = normalizedText(formData.get("templateId"));
  const title = normalizedText(formData.get("routineTitle"));

  if (!validUuid(templateId)) {
    return { status: "error", message: "Template could not be verified." };
  }

  if (title.length < 1 || title.length > 80) {
    return {
      status: "error",
      message: "Enter a routine title between 1 and 80 characters.",
    };
  }

  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return {
      status: "error",
      message: "Routine creation is unavailable right now.",
    };
  }

  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    return {
      status: "error",
      message: "Sign in again before using a template.",
    };
  }

  const { data, error } = await supabase.rpc("create_routine_from_template", {
    p_template_id: templateId,
    p_title: title,
  });

  if (error?.code === "42501") {
    return {
      status: "error",
      message: "That template is not available.",
    };
  }

  if (error?.code === "23514") {
    return {
      status: "error",
      message:
        "This template contains content that is no longer currently approved. Keep the template as history, but choose another routine source before creating a new routine.",
    };
  }

  if (error?.code === "55000") {
    return {
      status: "error",
      message:
        "Current readiness or movement constraints do not permit this template to create a routine. Review your current assessment first.",
    };
  }

  if (error || typeof data !== "string") {
    return {
      status: "error",
      message: "Routine could not be created from this template.",
    };
  }

  revalidatePath("/plans");
  redirect(`/routines/${data}`);
}
export type PlanActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function selectedRoutineVersionIds(formData: FormData) {
  return formData
    .getAll("routineVersionId")
    .map((value) => normalizedText(value))
    .filter((value) => value.length > 0);
}

function validatePlanInput(title: string, routineVersionIds: string[]) {
  if (title.length < 1 || title.length > 80) {
    return "Enter a plan title between 1 and 80 characters.";
  }

  if (routineVersionIds.length < 1 || routineVersionIds.length > 12) {
    return "Select between 1 and 12 routine snapshots for this plan.";
  }

  if (routineVersionIds.some((id) => !validUuid(id))) {
    return "One or more routine snapshots could not be verified.";
  }

  if (new Set(routineVersionIds).size !== routineVersionIds.length) {
    return "Select each exact routine snapshot only once.";
  }

  return null;
}

function planMutationMessage(code: string | undefined) {
  if (code === "42501") {
    return "One or more selected routine snapshots are not available to this account.";
  }

  if (code === "23514") {
    return "The selected plan composition is invalid or contains routine content that is no longer currently approved.";
  }

  if (code === "55000") {
    return "Current readiness or movement constraints do not permit this plan composition. Review your current assessment first.";
  }

  return "Plan could not be saved. Try again later.";
}

export async function createPlanAction(
  previousState: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  void previousState;

  const title = normalizedText(formData.get("planTitle"));
  const routineVersionIds = selectedRoutineVersionIds(formData);
  const validationMessage = validatePlanInput(title, routineVersionIds);

  if (validationMessage) {
    return { status: "error", message: validationMessage };
  }

  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return { status: "error", message: "Plan storage is unavailable right now." };
  }

  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    return { status: "error", message: "Sign in again before saving a plan." };
  }

  const { data, error } = await supabase.rpc("create_plan", {
    p_title: title,
    p_routine_version_ids: routineVersionIds,
  });

  if (error || typeof data !== "string") {
    return {
      status: "error",
      message: planMutationMessage(error?.code),
    };
  }

  revalidatePath("/plans");
  redirect(`/plans/${data}`);
}

export async function createPlanVersionAction(
  previousState: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  void previousState;

  const planId = normalizedText(formData.get("planId"));
  const expectedVersionText = normalizedText(
    formData.get("expectedVersionNumber"),
  );
  const title = normalizedText(formData.get("planTitle"));
  const routineVersionIds = selectedRoutineVersionIds(formData);
  const expectedVersionNumber = Number(expectedVersionText);

  if (!validUuid(planId)) {
    return { status: "error", message: "Plan could not be verified." };
  }

  if (
    !Number.isInteger(expectedVersionNumber) ||
    expectedVersionNumber < 1
  ) {
    return { status: "error", message: "Plan version could not be verified." };
  }

  const validationMessage = validatePlanInput(title, routineVersionIds);

  if (validationMessage) {
    return { status: "error", message: validationMessage };
  }

  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return { status: "error", message: "Plan storage is unavailable right now." };
  }

  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    return {
      status: "error",
      message: "Sign in again before saving a plan version.",
    };
  }

  const { data, error } = await supabase.rpc("create_plan_version", {
    p_plan_id: planId,
    p_expected_version_number: expectedVersionNumber,
    p_title: title,
    p_routine_version_ids: routineVersionIds,
  });

  if (error?.code === "40001") {
    return {
      status: "error",
      message:
        "This plan changed in another session. Reload before saving another version.",
    };
  }

  if (error || typeof data !== "number") {
    return {
      status: "error",
      message: planMutationMessage(error?.code),
    };
  }

  revalidatePath("/plans");
  revalidatePath(`/plans/${planId}`);
  redirect(`/plans/${planId}`);
}

export type ScheduleActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function validDateText(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validTimeText(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export async function savePlanScheduleAction(
  previousState: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  void previousState;

  const planId = normalizedText(formData.get("planId"));
  const expectedPlanVersionNumber = Number(
    normalizedText(formData.get("expectedPlanVersionNumber")),
  );
  const expectedScheduleVersionNumber = Number(
    normalizedText(formData.get("expectedScheduleVersionNumber")),
  );
  const timezoneName = normalizedText(formData.get("timezoneName"));
  const startsOn = normalizedText(formData.get("startsOn"));
  const isPaused = formData.get("schedulePaused") === "on";
  const reminderMinutesText = normalizedText(
    formData.get("reminderMinutesBefore"),
  );
  const reminderMinutesBefore = reminderMinutesText
    ? Number(reminderMinutesText)
    : null;

  if (!validUuid(planId)) {
    return { status: "error", message: "Plan could not be verified." };
  }

  if (
    !Number.isInteger(expectedPlanVersionNumber) ||
    expectedPlanVersionNumber < 1 ||
    !Number.isInteger(expectedScheduleVersionNumber) ||
    expectedScheduleVersionNumber < 0
  ) {
    return {
      status: "error",
      message: "Plan or schedule version could not be verified.",
    };
  }

  if (timezoneName.length < 1 || timezoneName.length > 64) {
    return {
      status: "error",
      message: "Enter a valid named schedule timezone.",
    };
  }

  if (!validDateText(startsOn)) {
    return {
      status: "error",
      message: "Choose the date when this recurring schedule starts.",
    };
  }

  const allowedReminderMinutes = [15, 30, 60, 120, 1440, 2880, 10080];

  if (
    reminderMinutesBefore !== null &&
    (
      !Number.isInteger(reminderMinutesBefore) ||
      !allowedReminderMinutes.includes(reminderMinutesBefore)
    )
  ) {
    return {
      status: "error",
      message: "Choose a supported in-app reminder lead time.",
    };
  }

  const rules: Array<{
    weekday: number;
    window_start: string;
    window_end: string;
    routine_version_id: string;
  }> = [];

  for (let weekday = 1; weekday <= 7; weekday += 1) {
    const routineVersionId = normalizedText(
      formData.get(`scheduleRoutine-${weekday}`),
    );

    if (!routineVersionId) {
      continue;
    }

    const windowStart = normalizedText(
      formData.get(`scheduleStart-${weekday}`),
    );
    const windowEnd = normalizedText(formData.get(`scheduleEnd-${weekday}`));

    if (!validUuid(routineVersionId)) {
      return {
        status: "error",
        message: "One scheduled routine could not be verified.",
      };
    }

    if (!validTimeText(windowStart) || !validTimeText(windowEnd)) {
      return {
        status: "error",
        message: "Each scheduled routine needs a valid start and end time.",
      };
    }

    if (windowStart >= windowEnd) {
      return {
        status: "error",
        message:
          "Each schedule window must end later than it starts on the same day.",
      };
    }

    rules.push({
      weekday,
      window_start: windowStart,
      window_end: windowEnd,
      routine_version_id: routineVersionId,
    });
  }

  if (rules.length < 1) {
    return {
      status: "error",
      message: "Choose at least one weekday and routine for this schedule.",
    };
  }

  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return {
      status: "error",
      message: "Schedule storage is unavailable right now.",
    };
  }

  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    return {
      status: "error",
      message: "Sign in again before saving a schedule.",
    };
  }

  const { data, error } = await supabase.rpc(
    "save_plan_schedule_with_reminder",
    {
      p_plan_id: planId,
      p_expected_plan_version_number: expectedPlanVersionNumber,
      p_expected_schedule_version_number: expectedScheduleVersionNumber,
      p_timezone_name: timezoneName,
      p_starts_on: startsOn,
      p_is_paused: isPaused,
      p_rules: rules,
      p_reminder_minutes_before: reminderMinutesBefore,
    },
  );

  if (error?.code === "40001") {
    return {
      status: "error",
      message:
        "This plan or schedule changed in another session. Reload before saving another schedule version.",
    };
  }

  if (error?.code === "42501") {
    return {
      status: "error",
      message: "This plan is not available to schedule.",
    };
  }

  if (error?.code === "55000") {
    return {
      status: "error",
      message:
        "Current readiness or movement constraints do not permit the selected scheduled routine snapshots. Review your current assessment or plan first.",
    };
  }

  if (error?.code === "23514") {
    return {
      status: "error",
      message:
        "The schedule timezone, dates, time windows, reminder setting, or selected routine snapshots are not valid for the current plan.",
    };
  }

  if (error || typeof data !== "number") {
    return {
      status: "error",
      message: "Schedule could not be saved. Try again later.",
    };
  }

  revalidatePath("/");
  revalidatePath("/plans");
  revalidatePath(`/plans/${planId}`);
  revalidatePath(`/plans/${planId}/schedule`);
  revalidatePath("/profile/export");
  redirect(`/plans/${planId}`);
}

export type ScheduleExceptionActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function savePlanScheduleOccurrenceExceptionAction(
  previousState: ScheduleExceptionActionState,
  formData: FormData,
): Promise<ScheduleExceptionActionState> {
  void previousState;

  const planId = normalizedText(formData.get("planId"));
  const expectedScheduleVersionNumber = Number(
    normalizedText(formData.get("expectedScheduleVersionNumber")),
  );
  const originalLocalDate = normalizedText(
    formData.get("originalLocalDate"),
  );
  const exceptionAction = normalizedText(formData.get("exceptionAction"));
  const expectedExceptionVersionNumber = Number(
    normalizedText(formData.get("expectedExceptionVersionNumber")),
  );
  const rescheduledLocalDate = normalizedText(
    formData.get("rescheduledLocalDate"),
  );
  const rescheduledWindowStart = normalizedText(
    formData.get("rescheduledWindowStart"),
  );
  const rescheduledWindowEnd = normalizedText(
    formData.get("rescheduledWindowEnd"),
  );

  if (!validUuid(planId)) {
    return { status: "error", message: "Plan could not be verified." };
  }

  if (
    !Number.isInteger(expectedScheduleVersionNumber) ||
    expectedScheduleVersionNumber < 1 ||
    !Number.isInteger(expectedExceptionVersionNumber) ||
    expectedExceptionVersionNumber < 0
  ) {
    return {
      status: "error",
      message: "Schedule or occurrence exception version could not be verified.",
    };
  }

  if (!validDateText(originalLocalDate)) {
    return {
      status: "error",
      message: "The original scheduled date could not be verified.",
    };
  }

  if (
    exceptionAction !== "skip" &&
    exceptionAction !== "reschedule" &&
    exceptionAction !== "restore"
  ) {
    return {
      status: "error",
      message: "Choose a valid occurrence action.",
    };
  }

  if (exceptionAction === "reschedule") {
    if (
      !validDateText(rescheduledLocalDate) ||
      !validTimeText(rescheduledWindowStart) ||
      !validTimeText(rescheduledWindowEnd) ||
      rescheduledWindowStart >= rescheduledWindowEnd
    ) {
      return {
        status: "error",
        message:
          "Choose a valid rescheduled date and a window whose end is later than its start.",
      };
    }
  }

  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return {
      status: "error",
      message: "Schedule exception storage is unavailable right now.",
    };
  }

  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    return {
      status: "error",
      message: "Sign in again before changing a scheduled occurrence.",
    };
  }

  const { data, error } = await supabase.rpc(
    "save_plan_schedule_occurrence_exception",
    {
      p_plan_id: planId,
      p_expected_schedule_version_number: expectedScheduleVersionNumber,
      p_original_local_date: originalLocalDate,
      p_action: exceptionAction,
      p_expected_exception_version_number: expectedExceptionVersionNumber,
      p_rescheduled_local_date:
        exceptionAction === "reschedule" ? rescheduledLocalDate : null,
      p_rescheduled_window_start:
        exceptionAction === "reschedule" ? rescheduledWindowStart : null,
      p_rescheduled_window_end:
        exceptionAction === "reschedule" ? rescheduledWindowEnd : null,
    },
  );

  if (error?.code === "40001") {
    return {
      status: "error",
      message:
        "This schedule or occurrence changed in another session. Reload before saving another occurrence exception.",
    };
  }

  if (error?.code === "42501") {
    return {
      status: "error",
      message: "This scheduled occurrence is not available.",
    };
  }

  if (error?.code === "23514") {
    return {
      status: "error",
      message:
        "This occurrence is no longer valid for the current schedule, or the requested reschedule window is invalid.",
    };
  }

  if (error || typeof data !== "number") {
    return {
      status: "error",
      message: "Scheduled occurrence could not be changed. Try again later.",
    };
  }

  revalidatePath("/");
  revalidatePath(`/plans/${planId}`);
  revalidatePath(`/plans/${planId}/schedule`);
  revalidatePath("/profile/export");
  redirect(`/plans/${planId}/schedule`);
}
