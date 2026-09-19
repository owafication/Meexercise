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
