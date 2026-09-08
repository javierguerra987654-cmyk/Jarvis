import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/session";
import { audit } from "@/lib/audit";
import { createMission, listMissions } from "@/lib/mission-store-rest";
import { MissionPlanSchema } from "@/lib/missions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateMissionSchema = MissionPlanSchema;

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const userId = getSessionUserId(request);
  if (!userId) return NextResponse.json({ error: "SESSION_REQUIRED", requestId }, { status: 401 });
  try {
    const missions = await listMissions(userId);
    await audit({ requestId, userId, action: "missions.list", status: "success" });
    return NextResponse.json({ missions }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar las misiones.";
    await audit({ requestId, userId, action: "missions.list", status: "error", detail: message });
    return NextResponse.json({ error: message, requestId }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const userId = getSessionUserId(request);
  if (!userId) return NextResponse.json({ error: "SESSION_REQUIRED", requestId }, { status: 401 });
  try {
    const payload = CreateMissionSchema.parse(await request.json());
    const mission = await createMission(userId, payload);
    await audit({ requestId, userId, action: "missions.create", status: "success" });
    return NextResponse.json({ mission, requestId }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof z.ZodError ? "Plan de misión no válido." : error instanceof Error ? error.message : "No se pudo crear la misión.";
    await audit({ requestId, userId, action: "missions.create", status: "error", detail: message });
    return NextResponse.json({ error: message, requestId }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
