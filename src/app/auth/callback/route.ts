import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

const allowedNextPaths = new Set(["/profile", "/auth/update-password"]);

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");
  const next = requestedNext && allowedNextPaths.has(requestedNext)
    ? requestedNext
    : "/profile";

  if (!code) {
    return NextResponse.redirect(
      new URL("/auth/sign-in?callback=invalid", request.url),
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL("/auth/sign-in?callback=invalid", request.url),
      );
    }
  } catch {
    return NextResponse.redirect(
      new URL("/auth/sign-in?callback=unavailable", request.url),
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
