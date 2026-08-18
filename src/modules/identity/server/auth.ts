import type { SupabaseClient } from "@supabase/supabase-js";

export async function getVerifiedUserId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    return null;
  }

  return String(data.claims.sub);
}
