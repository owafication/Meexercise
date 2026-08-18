import { createClient } from "@supabase/supabase-js";

import { getRequiredSupabaseAdminConfig } from "@/lib/supabase/config";

export function createAdminClient() {
  const { url, serviceRoleKey } = getRequiredSupabaseAdminConfig();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}