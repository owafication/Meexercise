import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getRequiredSupabasePublicConfig } from "@/lib/supabase/config";

export async function createClient() {
  const { url, publishableKey } = getRequiredSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. src/proxy.ts performs
          // session refresh before authenticated routes render.
        }
      },
    },
  });
}
