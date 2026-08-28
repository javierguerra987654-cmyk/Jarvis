import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { memoryStore } from "@/lib/memory";
import { getSessionUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const userId = getSessionUserId(request);

  if (!userId) {
    await audit({ requestId, action: "memory_list", status: "error", detail: "SESSION_REQUIRED" });
    return NextResponse.json({ error: "Sesión JARVIS no válida o ausente.", requestId }, { status: 401 });
  }

  try {
    const memories = await memoryStore.list(userId);
    await audit({ requestId, userId, action: "memory_list", status: "success" });
    return NextResponse.json({ memories, requestId }, {
      headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar la memoria.";
    await audit({ requestId, userId, action: "memory_list", status: "error", detail: message });
    return NextResponse.json({ error: message, requestId }, { status: 500 });
  }
}
