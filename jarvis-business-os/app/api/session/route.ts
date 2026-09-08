import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createSessionCookie, getSessionUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const sessionSecret = process.env.JARVIS_SESSION_SECRET;
    if (!sessionSecret || sessionSecret.length < 32) {
      return NextResponse.json(
        {
          authenticated: false,
          code: "SESSION_SECRET_MISSING",
          error: "La sesión segura de JARVIS no está configurada en el entorno de despliegue.",
          requestId,
        },
        { status: 503, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } },
      );
    }

    const existing = getSessionUserId(request);
    const userId = existing || crypto.randomUUID();
    const response = NextResponse.json({ userId, authenticated: true, existingSession: Boolean(existing), requestId });
    if (!existing) response.headers.set("Set-Cookie", createSessionCookie(userId));
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Request-Id", requestId);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo inicializar la sesión.";
    return NextResponse.json(
      { authenticated: false, code: "SESSION_INIT_FAILED", error: message, requestId },
      { status: 500, headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } },
    );
  }
}
