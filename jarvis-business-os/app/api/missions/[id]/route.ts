import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/session";
import { audit } from "@/lib/audit";
import { getMission } from "@/lib/mission-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Params = z.object({ id: z.string().uuid() });

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  const userId = getSessionUserId(request);
  if (!userId) return NextResponse.json({ error: "SESSION_REQUIRED", requestId }, { status: 401 });
  try {
    const { id } = Params.parse(await context.params);
    const mission = await getMission(userId, id);
    if (!mission) return NextResponse.json({ error: "MISSION_NOT_FOUND", requestId }, { status: 404 });
    await audit({ requestId, userId, action: "missions.get", status: "success" });
    return NextResponse.json({ mission }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof z.ZodError ? "ID de misión no válido." : error instanceof Error ? error.message : "No se pudo cargar la misión.";
    await audit({ requestId, userId, action: "missions.get", status: "error", detail: message });
    return NextResponse.json({ error: message, requestId }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
