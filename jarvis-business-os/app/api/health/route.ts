import { NextResponse } from "next/server";
import { getIntegrationStatus } from "@/lib/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const integrations = getIntegrationStatus();
  const coreReady = Boolean(
    process.env.OPENAI_API_KEY &&
    process.env.JARVIS_SESSION_SECRET &&
    process.env.JARVIS_SESSION_SECRET.length >= 32,
  );
  const memoryConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  return NextResponse.json(
    {
      ok: coreReady,
      service: "J.A.R.V.I.S.",
      version: "foundation-v1",
      checks: {
        openai: Boolean(process.env.OPENAI_API_KEY),
        session: Boolean(process.env.JARVIS_SESSION_SECRET && process.env.JARVIS_SESSION_SECRET.length >= 32),
        memory: memoryConfigured,
      },
      integrations: integrations.map(({ id, configured, mode }) => ({ id, configured, mode })),
      checkedAt: new Date().toISOString(),
    },
    { status: coreReady ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
