import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createSessionCookie, getSessionUserId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const existing = getSessionUserId(request);
    const userId = existing || crypto.randomUUID();
    const response = NextResponse.json({ userId, authenticated: true });
    if (!existing) response.headers.append("Set-Cookie", createSessionCookie(userId));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo inicializar la sesión.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
