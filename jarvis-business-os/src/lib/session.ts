import crypto from "node:crypto";

const COOKIE_NAME = "jarvis_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secret() {
  const value = process.env.JARVIS_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("JARVIS_SESSION_SECRET debe tener al menos 32 caracteres.");
  }
  return value;
}

function sign(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function serialize(userId: string) {
  return `${userId}.${sign(userId)}`;
}

function parse(value?: string | null) {
  if (!value) return null;
  const [userId, signature] = value.split(".");
  if (!userId || !signature) return null;
  const expected = sign(userId);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return userId;
}

export function getSessionUserId(request: Request) {
  return parse(request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))?.[1]);
}

export function createSessionCookie(userId: string) {
  if (!crypto.randomUUID || !userId) throw new Error("Sesión inválida.");
  return `${COOKIE_NAME}=${serialize(userId)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
