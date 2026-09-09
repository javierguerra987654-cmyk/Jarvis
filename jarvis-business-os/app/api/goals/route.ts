import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/session";
import { audit } from "@/lib/audit";
import { createGoal, listGoals } from "@/lib/goal-store-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GoalInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  status: z.enum(["active", "paused", "completed", "archived"]),
  metric_name: z.string().max(200).nullable(),
  target_value: z.number().nullable(),
  current_value: z.number().default(0),
  unit: z.string().max(80).nullable(),
  due_at: z.string().datetime().nullable(),
});

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const userId = getSessionUserId(request);
  if (!userId) return NextResponse.json({ error: "SESSION_REQUIRED", requestId }, { status: 401 });
  try {
    const goals = await listGoals(userId);
    await audit({ requestId, userId, action: "goals.list", status: "success" });
    return NextResponse.json({ goals }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron cargar los objetivos.";
    await audit({ requestId, userId, action: "goals.list", status: "error", detail: message });
    return NextResponse.json({ error: message, requestId }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const userId = getSessionUserId(request);
  if (!userId) return NextResponse.json({ error: "SESSION_REQUIRED", requestId }, { status: 401 });
  try {
    const payload = GoalInput.parse(await request.json());
    const goal = await createGoal(userId, payload);
    await audit({ requestId, userId, action: "goals.create", status: "success" });
    return NextResponse.json({ goal, requestId }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof z.ZodError ? "Objetivo no válido." : error instanceof Error ? error.message : "No se pudo crear el objetivo.";
    await audit({ requestId, userId, action: "goals.create", status: "error", detail: message });
    return NextResponse.json({ error: message, requestId }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
