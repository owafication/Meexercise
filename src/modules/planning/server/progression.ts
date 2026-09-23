import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/modules/identity/server/auth";

export type ProgressionFeedbackKind =
  | "excessive_difficulty"
  | "discomfort"
  | "user_requested_reduction";

export type ProgressionReviewEvent = {
  id: string;
  versionNumber: number;
  action: "proposed" | "dismissed";
  createdAt: string;
};

export type ProgressionReviewSnapshot = {
  id: string;
  planId: string;
  sourcePlanVersionId: string;
  sourceScheduleVersionId: string;
  feedbackKind: ProgressionFeedbackKind;
  proposedAction: "pause" | "reduce_frequency";
  oldWeeklySessions: number;
  newWeeklySessions: number;
  removeWeekday: number | null;
  createdAt: string;
  events: ProgressionReviewEvent[];
};

export type PlanProgressionPageState =
  | { kind: "authenticated"; reviews: ProgressionReviewSnapshot[] }
  | { kind: "signed-out" }
  | { kind: "not-found" }
  | { kind: "unavailable" };

function mapReview(row: Record<string, unknown>): ProgressionReviewSnapshot | null {
  const feedback = String(row.feedback_kind);
  const action = String(row.proposed_action);
  const oldWeeklySessions = Number(row.old_weekly_sessions);
  const newWeeklySessions = Number(row.new_weekly_sessions);
  const removeWeekday =
    row.remove_weekday === null || row.remove_weekday === undefined
      ? null
      : Number(row.remove_weekday);

  if (
    (feedback !== "discomfort" &&
      feedback !== "excessive_difficulty" &&
      feedback !== "user_requested_reduction") ||
    (action !== "pause" && action !== "reduce_frequency") ||
    !Number.isInteger(oldWeeklySessions) ||
    !Number.isInteger(newWeeklySessions) ||
    (removeWeekday !== null && !Number.isInteger(removeWeekday))
  ) {
    return null;
  }

  return {
    id: String(row.id),
    planId: String(row.plan_id),
    sourcePlanVersionId: String(row.source_plan_version_id),
    sourceScheduleVersionId: String(row.source_schedule_version_id),
    feedbackKind: feedback,
    proposedAction: action,
    oldWeeklySessions,
    newWeeklySessions,
    removeWeekday,
    createdAt: String(row.created_at),
    events: [],
  };
}

async function progressionReviewsForPlans(
  supabase: SupabaseClient,
  planIds: string[],
): Promise<Map<string, ProgressionReviewSnapshot[]> | null> {
  const result = new Map<string, ProgressionReviewSnapshot[]>();

  if (planIds.length === 0) {
    return result;
  }

  const { data: rows, error } = await supabase
    .from("plan_progression_reviews")
    .select(
      "id,plan_id,source_plan_version_id,source_schedule_version_id,feedback_kind,proposed_action,old_weekly_sessions,new_weekly_sessions,remove_weekday,created_at",
    )
    .in("plan_id", planIds)
    .order("created_at", { ascending: true });

  if (error || !rows) {
    return null;
  }

  const byId = new Map<string, ProgressionReviewSnapshot>();

  for (const row of rows as Array<Record<string, unknown>>) {
    const review = mapReview(row);

    if (!review) {
      return null;
    }

    byId.set(review.id, review);
    const current = result.get(review.planId) ?? [];
    current.push(review);
    result.set(review.planId, current);
  }

  const reviewIds = Array.from(byId.keys());

  if (reviewIds.length === 0) {
    return result;
  }

  const { data: eventRows, error: eventError } = await supabase
    .from("plan_progression_review_events")
    .select("id,review_id,version_number,action,created_at")
    .in("review_id", reviewIds)
    .order("version_number", { ascending: true });

  if (eventError || !eventRows) {
    return null;
  }

  for (const row of eventRows) {
    const review = byId.get(String(row.review_id));
    const action = String(row.action);

    if (
      !review ||
      (action !== "proposed" && action !== "dismissed")
    ) {
      return null;
    }

    review.events.push({
      id: String(row.id),
      versionNumber: Number(row.version_number),
      action,
      createdAt: String(row.created_at),
    });
  }

  for (const review of byId.values()) {
    if (
      review.events.length === 0 ||
      review.events[0].versionNumber !== 1 ||
      review.events[0].action !== "proposed" ||
      review.events.some(
        (event, index) => event.versionNumber !== index + 1,
      )
    ) {
      return null;
    }
  }

  return result;
}

export async function getPlanProgressionPageState(
  planId: string,
): Promise<PlanProgressionPageState> {
  try {
    const supabase = await createClient();
    const userId = await getVerifiedUserId(supabase);

    if (!userId) {
      return { kind: "signed-out" };
    }

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id")
      .eq("id", planId)
      .eq("user_id", userId)
      .maybeSingle();

    if (planError) {
      return { kind: "unavailable" };
    }

    if (!plan) {
      return { kind: "not-found" };
    }

    const byPlan = await progressionReviewsForPlans(supabase, [planId]);

    if (byPlan === null) {
      return { kind: "unavailable" };
    }

    return {
      kind: "authenticated",
      reviews: (byPlan.get(planId) ?? []).reverse(),
    };
  } catch {
    return { kind: "unavailable" };
  }
}

export async function buildPlanProgressionExports(
  supabase: SupabaseClient,
  planIds: string[],
): Promise<Map<string, ProgressionReviewSnapshot[]> | null> {
  return progressionReviewsForPlans(supabase, planIds);
}
