import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/modules/identity/server/auth";

export type ProfileSnapshot = {
  displayName: string | null;
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
      .select("display_name,row_version")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return { kind: "unavailable" };
    }

    return {
      kind: "authenticated",
      profile: data
        ? {
            displayName: data.display_name,
            rowVersion: Number(data.row_version),
          }
        : null,
    };
  } catch {
    return { kind: "unavailable" };
  }
}
