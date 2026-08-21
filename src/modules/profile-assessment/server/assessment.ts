import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/modules/identity/server/auth";
import {
  parseStoredReadinessAnswers,
  READINESS_TEMPLATE_KEY,
  type ReadinessAssessmentAnswers,
} from "@/modules/profile-assessment/readiness";

export type PublishedReadinessVersion = {
  id: string;
  versionNumber: number;
  title: string;
};

export type ReadinessTemplateContext = {
  templateId: string;
  versions: PublishedReadinessVersion[];
  latestVersion: PublishedReadinessVersion;
};

export type AssessmentSafetyFlag = {
  flagCode:
    | "movement_restrictions_present"
    | "professional_review_recommended";
  outcome: "restrict_generation" | "block_generation";
};

export type AssessmentSessionSnapshot = {
  id: string;
  status: "in_progress" | "completed";
  rowVersion: number;
  version: PublishedReadinessVersion;
  answers: ReadinessAssessmentAnswers;
  updatedAt: string;
  completedAt: string | null;
  correctsSessionId: string | null;
  safetyFlags: AssessmentSafetyFlag[];
};

export type ReadinessAssessmentPageState =
  | {
      kind: "authenticated";
      latestVersion: PublishedReadinessVersion;
      session: AssessmentSessionSnapshot | null;
    }
  | {
      kind: "signed-out";
    }
  | {
      kind: "unavailable";
    };

export async function getReadinessTemplateContext(
  supabase: SupabaseClient,
): Promise<ReadinessTemplateContext | null> {
  const { data: template, error: templateError } = await supabase
    .from("assessment_templates")
    .select("id")
    .eq("template_key", READINESS_TEMPLATE_KEY)
    .maybeSingle();

  if (templateError || !template) {
    return null;
  }

  const { data: versions, error: versionsError } = await supabase
    .from("assessment_template_versions")
    .select("id,version_number,title")
    .eq("template_id", template.id)
    .eq("status", "published")
    .order("version_number", { ascending: false });

  if (versionsError || !versions || versions.length === 0) {
    return null;
  }

  const mappedVersions = versions.map((version) => ({
    id: String(version.id),
    versionNumber: Number(version.version_number),
    title: String(version.title),
  }));

  return {
    templateId: String(template.id),
    versions: mappedVersions,
    latestVersion: mappedVersions[0],
  };
}

function versionForSession(
  context: ReadinessTemplateContext,
  templateVersionId: string,
): PublishedReadinessVersion | null {
  return (
    context.versions.find((version) => version.id === templateVersionId) ?? null
  );
}

export async function getReadinessAssessmentPageState(): Promise<ReadinessAssessmentPageState> {
  try {
    const supabase = await createClient();
    const userId = await getVerifiedUserId(supabase);

    if (!userId) {
      return { kind: "signed-out" };
    }

    const context = await getReadinessTemplateContext(supabase);

    if (!context) {
      return { kind: "unavailable" };
    }

    const versionIds = context.versions.map((version) => version.id);

    const { data: inProgress, error: inProgressError } = await supabase
      .from("assessment_sessions")
      .select(
        "id,template_version_id,status,responses,row_version,updated_at,completed_at,corrects_session_id",
      )
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .in("template_version_id", versionIds)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inProgressError) {
      return { kind: "unavailable" };
    }

    if (inProgress) {
      const version = versionForSession(
        context,
        String(inProgress.template_version_id),
      );

      if (!version) {
        return { kind: "unavailable" };
      }

      return {
        kind: "authenticated",
        latestVersion: context.latestVersion,
        session: {
          id: String(inProgress.id),
          status: "in_progress",
          rowVersion: Number(inProgress.row_version),
          version,
          answers: parseStoredReadinessAnswers(inProgress.responses),
          updatedAt: String(inProgress.updated_at),
          completedAt: null,
          correctsSessionId: inProgress.corrects_session_id
            ? String(inProgress.corrects_session_id)
            : null,
          safetyFlags: [],
        },
      };
    }

    const { data: completed, error: completedError } = await supabase
      .from("assessment_sessions")
      .select(
        "id,template_version_id,status,responses,row_version,updated_at,completed_at,corrects_session_id",
      )
      .eq("user_id", userId)
      .eq("status", "completed")
      .in("template_version_id", versionIds)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (completedError) {
      return { kind: "unavailable" };
    }

    if (!completed) {
      return {
        kind: "authenticated",
        latestVersion: context.latestVersion,
        session: null,
      };
    }

    const version = versionForSession(
      context,
      String(completed.template_version_id),
    );

    if (!version) {
      return { kind: "unavailable" };
    }

    const { data: safetyFlags, error: safetyError } = await supabase
      .from("assessment_safety_flags")
      .select("flag_code,outcome")
      .eq("user_id", userId)
      .eq("session_id", completed.id)
      .order("flag_code", { ascending: true });

    if (safetyError) {
      return { kind: "unavailable" };
    }

    return {
      kind: "authenticated",
      latestVersion: context.latestVersion,
      session: {
        id: String(completed.id),
        status: "completed",
        rowVersion: Number(completed.row_version),
        version,
        answers: parseStoredReadinessAnswers(completed.responses),
        updatedAt: String(completed.updated_at),
        completedAt: completed.completed_at
          ? String(completed.completed_at)
          : null,
        correctsSessionId: completed.corrects_session_id
          ? String(completed.corrects_session_id)
          : null,
        safetyFlags: (safetyFlags ?? []).map((flag) => ({
          flagCode: flag.flag_code as AssessmentSafetyFlag["flagCode"],
          outcome: flag.outcome as AssessmentSafetyFlag["outcome"],
        })),
      },
    };
  } catch {
    return { kind: "unavailable" };
  }
}

export type PlanningReadinessGate =
  | "ready"
  | "assessment_required"
  | "restricted"
  | "blocked"
  | "unavailable";

export async function getPlanningReadinessGate(
  supabase: SupabaseClient,
  userId: string,
): Promise<PlanningReadinessGate> {
  const context = await getReadinessTemplateContext(supabase);

  if (!context) {
    return "unavailable";
  }

  const versionIds = context.versions.map((version) => version.id);

  const { data: inProgress, error: inProgressError } = await supabase
    .from("assessment_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .in("template_version_id", versionIds)
    .limit(1);

  if (inProgressError) {
    return "unavailable";
  }

  if ((inProgress ?? []).length > 0) {
    return "assessment_required";
  }

  const { data: completed, error: completedError } = await supabase
    .from("assessment_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "completed")
    .in("template_version_id", versionIds)
    .order("completed_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (completedError) {
    return "unavailable";
  }

  if (!completed) {
    return "assessment_required";
  }

  const { data: flags, error: flagsError } = await supabase
    .from("assessment_safety_flags")
    .select("outcome")
    .eq("user_id", userId)
    .eq("session_id", completed.id);

  if (flagsError) {
    return "unavailable";
  }

  if ((flags ?? []).some((flag) => flag.outcome === "block_generation")) {
    return "blocked";
  }

  if ((flags ?? []).some((flag) => flag.outcome === "restrict_generation")) {
    return "restricted";
  }

  return "ready";
}
