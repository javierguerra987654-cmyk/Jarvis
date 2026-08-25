export type IntegrationId = "github" | "shopify" | "gmail" | "calendar" | "web" | "automation";

export type IntegrationStatus = {
  id: IntegrationId;
  configured: boolean;
  mode: "REAL" | "DISCONNECTED";
  capabilities: string[];
};

const integrations: Record<IntegrationId, IntegrationStatus> = {
  github: {
    id: "github",
    configured: Boolean(process.env.GITHUB_TOKEN),
    mode: process.env.GITHUB_TOKEN ? "REAL" : "DISCONNECTED",
    capabilities: ["repo_read", "issues", "pull_requests"],
  },
  shopify: {
    id: "shopify",
    configured: Boolean(process.env.SHOPIFY_STORE && process.env.SHOPIFY_ACCESS_TOKEN),
    mode: process.env.SHOPIFY_STORE && process.env.SHOPIFY_ACCESS_TOKEN ? "REAL" : "DISCONNECTED",
    capabilities: ["products", "inventory", "orders", "analytics"],
  },
  gmail: {
    id: "gmail",
    configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    mode: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? "REAL" : "DISCONNECTED",
    capabilities: ["read", "send_after_approval"],
  },
  calendar: {
    id: "calendar",
    configured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    mode: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? "REAL" : "DISCONNECTED",
    capabilities: ["read", "create_after_approval"],
  },
  web: {
    id: "web",
    configured: Boolean(process.env.WEB_SEARCH_URL || process.env.OPENAI_WEB_SEARCH_ENABLED === "true"),
    mode: process.env.WEB_SEARCH_URL || process.env.OPENAI_WEB_SEARCH_ENABLED === "true" ? "REAL" : "DISCONNECTED",
    capabilities: ["search"],
  },
  automation: {
    id: "automation",
    configured: Boolean(process.env.AUTOMATION_WEBHOOK_SECRET),
    mode: process.env.AUTOMATION_WEBHOOK_SECRET ? "REAL" : "DISCONNECTED",
    capabilities: ["scheduled_jobs", "notifications"],
  },
};

export function getIntegrationStatus() {
  return Object.values(integrations);
}

export function requireIntegration(id: IntegrationId) {
  const integration = integrations[id];
  if (!integration?.configured) {
    throw new Error(`La integración '${id}' no está configurada. JARVIS no utilizará datos simulados.`);
  }
  return integration;
}
