import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  getRequiredSiteUrl,
  getRequiredSupabasePublicConfig,
} from "@/lib/supabase/config";

const allowedNextPaths = new Set(["/profile", "/auth/update-password"]);

function redirectResponse(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function callbackFailure(
  request: NextRequest,
  reason: "invalid" | "unavailable",
  siteUrl?: string,
) {
  return redirectResponse(
    new URL(
      `/auth/sign-in?callback=${reason}`,
      siteUrl ?? request.url,
    ),
  );
}

function createCallbackClient(
  request: NextRequest,
  response: NextResponse,
) {
  const { url, publishableKey } = getRequiredSupabasePublicConfig();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const requestedNext = requestUrl.searchParams.get("next");
  const next =
    requestedNext && allowedNextPaths.has(requestedNext)
      ? requestedNext
      : "/profile";

  let siteUrl: string;

  try {
    siteUrl = getRequiredSiteUrl();
  } catch {
    return callbackFailure(request, "unavailable");
  }

  if (!code && !(tokenHash && type === "recovery")) {
    return callbackFailure(request, "invalid", siteUrl);
  }

  const response = redirectResponse(new URL(next, siteUrl));

  try {
    const supabase = createCallbackClient(request, response);

    if (tokenHash && type === "recovery") {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });

      if (error) {
        return callbackFailure(request, "invalid", siteUrl);
      }
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        return callbackFailure(request, "invalid", siteUrl);
      }
    }
  } catch {
    return callbackFailure(request, "unavailable", siteUrl);
  }

  return response;
}