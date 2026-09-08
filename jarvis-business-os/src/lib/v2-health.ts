export type V2CapabilityStatus = "READY" | "DEGRADED" | "DISCONNECTED";

export function getV2Health(): { version: "v2"; capabilities: Record<string, V2CapabilityStatus> } {
  return {
    version: "v2",
    capabilities: {
      goals: process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "READY" : "DISCONNECTED",
      missions: process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "READY" : "DISCONNECTED",
      evaluation: "READY",
      approvals: "READY",
    },
  };
}
