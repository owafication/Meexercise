"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/modules/identity/server/auth";
import {
  emptyReadinessAnswers,
  hasReadinessFieldErrors,
  parseReadinessForm,
  toReadinessResponse,
  validateReadinessAnswers,
} from "@/modules/profile-assessment/readiness";
import { getReadinessTemplateContext } from "@/modules/profile-assessment/server/assessment";
import { parseRowVersion } from "@/modules/profile-assessment/validation";

import type {
  AssessmentActionState,
  AssessmentStartState,
} from "./state";

function validUuid(value: FormDataEntryValue | null): string | null {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return null;
  }

  return value;
}

function saveUnavailable(rowVersion: number): AssessmentActionState {
  return {
    status: "error",
    message:
      "Assessment progress could not be saved right now. Your entered answers remain on this page.",
    rowVersion,
  };
}

export async function startAssessmentAction(
  _previousState: AssessmentStartState,
  _formData: FormData,
): Promise<AssessmentStartState> {
  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return {
      status: "error",
      message: "Assessment services are not available right now.",
    };
  }

  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    return {
      status: "error",
      message: "Your session has expired. Sign in again to start an assessment.",
    };
  }

  const context = await getReadinessTemplateContext(supabase);

  if (!context) {
    return {
      status: "error",
      message: "The readiness assessment is not available right now.",
    };
  }

  const versionIds = context.versions.map((version) => version.id);

  const { data: existing, error: existingError } = await supabase
    .from("assessment_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .in("template_version_id", versionIds)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return {
      status: "error",
      message: "Assessment progress could not be checked right now.",
    };
  }

  if (!existing) {
    const { error } = await supabase.from("assessment_sessions").insert({
      user_id: userId,
      template_version_id: context.latestVersion.id,
      responses: toReadinessResponse(emptyReadinessAnswers()),
    });

    if (error && error.code !== "23505") {
      return {
        status: "error",
        message: "The readiness assessment could not be started right now.",
      };
    }
  }

  revalidatePath("/profile/assessment");
  redirect("/profile/assessment");
}

export async function startAssessmentCorrectionAction(
  _previousState: AssessmentStartState,
  formData: FormData,
): Promise<AssessmentStartState> {
  const sourceSessionId = validUuid(formData.get("correctsSessionId"));

  if (!sourceSessionId) {
    return {
      status: "error",
      message: "The completed assessment to correct is invalid. Reload and try again.",
    };
  }

  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return {
      status: "error",
      message: "Assessment services are not available right now.",
    };
  }

  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    return {
      status: "error",
      message: "Your session has expired. Sign in again to correct an assessment.",
    };
  }

  const { data: source, error: sourceError } = await supabase
    .from("assessment_sessions")
    .select("id,template_version_id,responses")
    .eq("id", sourceSessionId)
    .eq("user_id", userId)
    .eq("status", "completed")
    .maybeSingle();

  if (sourceError || !source) {
    return {
      status: "error",
      message: "The completed assessment to correct is not available.",
    };
  }

  const { error } = await supabase.from("assessment_sessions").insert({
    user_id: userId,
    template_version_id: source.template_version_id,
    responses: source.responses,
    corrects_session_id: source.id,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        message: "Another assessment is already in progress. Reload before starting a correction.",
      };
    }

    return {
      status: "error",
      message: "The assessment correction could not be started right now.",
    };
  }

  revalidatePath("/profile/assessment");
  redirect("/profile/assessment");
}
export async function saveAssessmentAction(
  previousState: AssessmentActionState,
  formData: FormData,
): Promise<AssessmentActionState> {
  const sessionId = validUuid(formData.get("sessionId"));
  const rowVersion = parseRowVersion(formData.get("rowVersion"));
  const intent = formData.get("intent");
  const requireComplete = intent === "complete";
  const answers = parseReadinessForm(formData);
  const fieldErrors = validateReadinessAnswers(answers, requireComplete);

  if (!sessionId || rowVersion === null || rowVersion === undefined) {
    return {
      status: "error",
      message: "Assessment version is invalid. Reload before saving again.",
      rowVersion: previousState.rowVersion,
    };
  }

  if (intent !== "save" && intent !== "complete") {
    return {
      status: "error",
      message: "Choose save progress or complete assessment.",
      rowVersion,
    };
  }

  if (hasReadinessFieldErrors(fieldErrors)) {
    return {
      status: "error",
      message: requireComplete
        ? "Complete the highlighted assessment fields."
        : "Check the highlighted assessment fields.",
      rowVersion,
      fieldErrors,
    };
  }

  let supabase;

  try {
    supabase = await createClient();
  } catch {
    return saveUnavailable(rowVersion);
  }

  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    return {
      status: "error",
      message: "Your session has expired. Sign in again before saving.",
      rowVersion,
    };
  }

  const updateValues: Record<string, unknown> = {
    responses: toReadinessResponse(answers),
  };

  if (requireComplete) {
    updateValues.status = "completed";
    updateValues.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("assessment_sessions")
    .update(updateValues)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .eq("row_version", rowVersion)
    .select("row_version,status")
    .maybeSingle();

  if (error) {
    return saveUnavailable(rowVersion);
  }

  if (!data) {
    return {
      status: "conflict",
      message:
        "Assessment changed in another session. Reload before saving again.",
      rowVersion,
    };
  }

  revalidatePath("/profile/assessment");
  revalidatePath("/profile");

  if (requireComplete) {
    return {
      status: "completed",
      message: "Assessment completed.",
      rowVersion: Number(data.row_version),
    };
  }

  return {
    status: "success",
    message: "Assessment progress saved.",
    rowVersion: Number(data.row_version),
  };
}
