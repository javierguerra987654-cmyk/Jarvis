import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { ok: false, supabaseConfigured: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const response = await fetch(
      `${url}/rest/v1/jarvis_memory?select=id&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        cache: "no-store",
      },
    );

    return NextResponse.json(
      {
        ok: response.ok,
        supabaseConfigured: true,
        databaseReachable: response.ok,
      },
      {
        status: response.ok ? 200 : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        supabaseConfigured: true,
        databaseReachable: false,
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
