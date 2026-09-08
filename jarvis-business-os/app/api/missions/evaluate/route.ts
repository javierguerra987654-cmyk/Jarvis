import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/session";
import { audit } from "@/lib/audit";
import { evaluateMissionPlan } from "@/lib/evaluation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Input = z.object({
  objective: z.string().min(1).max(2000),
  successMetric: z.string().max(500).nullable(),
  riskLevel: z.string(),
  steps: z.array(z.object({ title: z.string(), description: z.string().nullable(), verification: z.string().nullable() })).min(1).max(20),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const userId = getSessionUserId(request);
  if (!userId) return NextResponse.json({ error: "SESSION_REQUIRED", requestId }, { status: 401 });
  try {
    const input = Input.parse(await request.json());
    const evaluation = evaluateMissionPlan(input);
    await audit({ requestId, userId, action: "missions.evaluate", status: "success" });
    return NextResponse.json({ evaluation, requestId }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof z.ZodError ? "Plan no válido." : error instanceof Error ? error.message : "No se pudo evaluar el plan.";
    await audit({ requestId, userId, action: "missions.evaluate", status: "error", detail: message });
    return NextResponse.json({ error: message, requestId }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
