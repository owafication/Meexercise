import { buildUserDataExport } from "@/modules/identity/server/account";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await buildUserDataExport();

  if (result.kind === "signed-out") {
    return new Response("Sign in to export your MeExercise data.\n", {
      status: 401,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  if (result.kind === "unavailable") {
    return new Response(
      "Your MeExercise data export is unavailable right now. Try again later.\n",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return new Response(`${JSON.stringify(result.data, null, 2)}\n`, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="meexercise-data-export.json"',
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}