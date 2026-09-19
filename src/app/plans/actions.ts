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