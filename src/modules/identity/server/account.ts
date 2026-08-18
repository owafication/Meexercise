import { createClient } from "@/lib/supabase/server";

export type AccountLifecyclePageState =
  | {
      kind: "authenticated";
      email: string;
    }
  | {
      kind: "signed-out";
    }
  | {
      kind: "unavailable";
    };

export type UserDataExportResult =
  | {
      kind: "ok";
      data: {
        exportVersion: 1;
        generatedAt: string;
        account: {
          id: string;
          email: string | null;
          createdAt: string;
          updatedAt: string | null;
        };
        profile: {
          displayName: string | null;
          rowVersion: number;
          createdAt: string;
          updatedAt: string;
        } | null;
        assessments: Array<{
          id: string;
          status: string;
          rowVersion: number;
          startedAt: string;
          updatedAt: string;
          completedAt: string | null;
          responses: unknown;
          templateVersion: {
            id: string;
            templateKey: string;
            versionNumber: number;
            title: string;
            status: string;
            definition: unknown;
            createdAt: string;
            publishedAt: string | null;
          };
          safetyFlags: Array<{
            flagCode: string;
            outcome: string;
            createdAt: string;
          }>;
        }>;
      };
    }
  | {
      kind: "signed-out";
    }
  | {
      kind: "unavailable";
    };

export async function getAccountLifecyclePageState(): Promise<AccountLifecyclePageState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { kind: "signed-out" };
    }

    if (!user.email) {
      return { kind: "unavailable" };
    }

    return {
      kind: "authenticated",
      email: user.email,
    };
  } catch {
    return { kind: "unavailable" };
  }
}

export async function buildUserDataExport(): Promise<UserDataExportResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { kind: "signed-out" };
    }

    const userId = user.id;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name,row_version,created_at,updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      return { kind: "unavailable" };
    }

    const { data: sessions, error: sessionsError } = await supabase
      .from("assessment_sessions")
      .select(
        "id,template_version_id,status,responses,row_version,started_at,updated_at,completed_at",
      )
      .eq("user_id", userId)
      .order("started_at", { ascending: true });

    if (sessionsError) {
      return { kind: "unavailable" };
    }

    const { data: safetyFlags, error: flagsError } = await supabase
      .from("assessment_safety_flags")
      .select("session_id,flag_code,outcome,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (flagsError) {
      return { kind: "unavailable" };
    }

    const versionIds = Array.from(
      new Set(
        (sessions ?? []).map((session) =>
          String(session.template_version_id),
        ),
      ),
    );

    let versionRows: Array<Record<string, unknown>> = [];

    if (versionIds.length > 0) {
      const { data, error } = await supabase
        .from("assessment_template_versions")
        .select(
          "id,template_id,version_number,title,status,definition,created_at,published_at",
        )
        .in("id", versionIds);

      if (error || !data) {
        return { kind: "unavailable" };
      }

      versionRows = data as Array<Record<string, unknown>>;
    }

    const templateIds = Array.from(
      new Set(versionRows.map((version) => String(version.template_id))),
    );

    let templateRows: Array<Record<string, unknown>> = [];

    if (templateIds.length > 0) {
      const { data, error } = await supabase
        .from("assessment_templates")
        .select("id,template_key")
        .in("id", templateIds);

      if (error || !data) {
        return { kind: "unavailable" };
      }

      templateRows = data as Array<Record<string, unknown>>;
    }

    const versionsById = new Map(
      versionRows.map((version) => [String(version.id), version]),
    );

    const templatesById = new Map(
      templateRows.map((template) => [String(template.id), template]),
    );

    const flagsBySession = new Map<
      string,
      Array<{
        flagCode: string;
        outcome: string;
        createdAt: string;
      }>
    >();

    for (const flag of safetyFlags ?? []) {
      const sessionId = String(flag.session_id);
      const current = flagsBySession.get(sessionId) ?? [];

      current.push({
        flagCode: String(flag.flag_code),
        outcome: String(flag.outcome),
        createdAt: String(flag.created_at),
      });

      flagsBySession.set(sessionId, current);
    }

    const exportedAssessments = [];

    for (const session of sessions ?? []) {
      const version = versionsById.get(String(session.template_version_id));

      if (!version) {
        return { kind: "unavailable" };
      }

      const template = templatesById.get(String(version.template_id));

      if (!template) {
        return { kind: "unavailable" };
      }

      exportedAssessments.push({
        id: String(session.id),
        status: String(session.status),
        rowVersion: Number(session.row_version),
        startedAt: String(session.started_at),
        updatedAt: String(session.updated_at),
        completedAt: session.completed_at
          ? String(session.completed_at)
          : null,
        responses: session.responses,
        templateVersion: {
          id: String(version.id),
          templateKey: String(template.template_key),
          versionNumber: Number(version.version_number),
          title: String(version.title),
          status: String(version.status),
          definition: version.definition,
          createdAt: String(version.created_at),
          publishedAt: version.published_at
            ? String(version.published_at)
            : null,
        },
        safetyFlags: flagsBySession.get(String(session.id)) ?? [],
      });
    }

    return {
      kind: "ok",
      data: {
        exportVersion: 1,
        generatedAt: new Date().toISOString(),
        account: {
          id: user.id,
          email: user.email ?? null,
          createdAt: user.created_at,
          updatedAt: user.updated_at ?? null,
        },
        profile: profile
          ? {
              displayName: profile.display_name,
              rowVersion: Number(profile.row_version),
              createdAt: String(profile.created_at),
              updatedAt: String(profile.updated_at),
            }
          : null,
        assessments: exportedAssessments,
      },
    };
  } catch {
    return { kind: "unavailable" };
  }
}