import { NextResponse } from "next/server";
import { getIntegrationStatus } from "@/lib/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkMemory() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { configured: false, reachable: false };

  try {
    const response = await fetch(`${url}/rest/v1/jarvis_memory?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
    });
    return { configured: true, reachable: response.ok };
  } catch {
    return { configured: true, reachable: false };
  }
}

export async function GET() {
  const [memory, integrations] = await Promise.all([
    checkMemory(),
    Promise.resolve(getIntegrationStatus()),
  ]);
  const openai = Boolean(process.env.OPENAI_API_KEY);
  const session = Boolean(
    process.env.JARVIS_SESSION_SECRET && process.env.JARVIS_SESSION_SECRET.length >= 32,
  );
  const coreReady = openai && session;

  return NextResponse.json(
    {
      ok: coreReady && memory.reachable,
      service: "J.A.R.V.I.S.",
      version: "v2",
      checks: {
        openai,
        session,
        memory: memory.reachable,
      },
      integrations: integrations.map(({ id, configured, mode }) => ({ id, configured, mode })),
      checkedAt: new Date().toISOString(),
    },
    {
      status: coreReady && memory.reachable ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
