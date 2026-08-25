import { NextResponse } from "next/server";
import { getIntegrationStatus } from "@/lib/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const integrations = getIntegrationStatus();
  const configuredCount = integrations.filter((item) => item.configured).length;
  return NextResponse.json({
    service: "J.A.R.V.I.S.",
    status: "ok",
    model: process.env.OPENAI_MODEL || "gpt-5.6",
    memory: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    integrations,
    configuredIntegrations: configuredCount,
    checkedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
