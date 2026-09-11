import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/modules/identity/server/auth";
import {
  isPlanningProfileComplete,
  parseStoredPlanningProfile,
  type PlanningProfile,
} from "@/modules/profile-assessment/planning-profile";

export type ProfileSnapshot = {
  displayName: string | null;
  planning: PlanningProfile;
  planningComplete: boolean;
  rowVersion: number;
};

export type ProfilePageState =
  | {
      kind: "authenticated";
      profile: ProfileSnapshot | null;
    }
  | {
      kind: "signed-out";
    }
  | {
      kind: "unavailable";
    };

export async function getProfilePageState(): Promise<ProfilePageState> {
  try {
    const supabase = await createClient();
    const userId = await getVerifiedUserId(supabase);

    if (!userId) {
      return { kind: "signed-out" };
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "display_name,primary_goal,secondary_goal,preferred_methods,available_equipment,available_facilities,available_minutes,routine_frequency_days,row_version",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return { kind: "unavailable" };
    }

    if (!data) {
      return {
        kind: "authenticated",
        profile: null,
      };
    }

    const planning = parseStoredPlanningProfile({
      primaryGoal: data.primary_goal,
      secondaryGoal: data.secondary_goal,
      preferredMethods: data.preferred_methods,
      equipment: data.available_equipment,
      facilities: data.available_facilities,
      availableMinutes: data.available_minutes,
      routineFrequencyDays: data.routine_frequency_days,
    });

    if (!planning) {
      return { kind: "unavailable" };
    }

    return {
      kind: "authenticated",
      profile: {
        displayName: data.display_name,
        planning,
        planningComplete: isPlanningProfileComplete(planning),
        rowVersion: Number(data.row_version),
      },
    };
  } catch {
    return { kind: "unavailable" };
  }
}
