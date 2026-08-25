type AuditEvent = {
  requestId: string;
  userId?: string;
  action: string;
  status: "started" | "success" | "error";
  detail?: string;
  latencyMs?: number;
};

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}

export async function audit(event: AuditEvent) {
  const c = config();
  if (!c) return;
  try {
    await fetch(`${c.url}/rest/v1/jarvis_audit`, {
      method: "POST",
      headers: {
        apikey: c.key,
        Authorization: `Bearer ${c.key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        request_id: event.requestId,
        user_id: event.userId ?? null,
        action: event.action,
        status: event.status,
        detail: event.detail?.slice(0, 1000) ?? null,
        latency_ms: event.latencyMs ?? null,
      }),
      cache: "no-store",
    });
  } catch {
    // Audit failure must never break the primary JARVIS request path.
  }
}
