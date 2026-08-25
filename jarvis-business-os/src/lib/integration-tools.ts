import { z } from "zod";
import { getIntegrationStatus, requireIntegration } from "@/lib/integrations";

const IntegrationStatusInput = z.object({ action: z.literal("status") });
const GithubRepoInput = z.object({ owner: z.string().regex(/^[A-Za-z0-9_.-]+$/), repo: z.string().regex(/^[A-Za-z0-9_.-]+$/) });
const ShopifyProductsInput = z.object({ limit: z.number().int().min(1).max(50).default(20) });

export const integrationToolDefinitions = [
  {
    type: "function" as const,
    name: "integration_status",
    description: "Devuelve el estado real de las integraciones configuradas. No inventa conexiones.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { action: { type: "string", enum: ["status"] } },
      required: ["action"],
    },
  },
  {
    type: "function" as const,
    name: "github_repo",
    description: "Lee metadatos de un repositorio GitHub usando un token real configurado en servidor.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
      },
      required: ["owner", "repo"],
    },
  },
  {
    type: "function" as const,
    name: "shopify_products",
    description: "Lee productos reales de Shopify usando credenciales de servidor. Solo lectura.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { limit: { type: "integer", minimum: 1, maximum: 50 } },
      required: ["limit"],
    },
  },
];

export async function runIntegrationTool(name: string, rawInput: unknown) {
  if (name === "integration_status") {
    IntegrationStatusInput.parse(rawInput);
    return getIntegrationStatus();
  }

  if (name === "github_repo") {
    const input = GithubRepoInput.parse(rawInput);
    requireIntegration("github");
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`GitHub respondió ${response.status}.`);
    const data = await response.json();
    return {
      fullName: data.full_name,
      private: data.private,
      defaultBranch: data.default_branch,
      openIssues: data.open_issues_count,
      stars: data.stargazers_count,
      updatedAt: data.updated_at,
      htmlUrl: data.html_url,
    };
  }

  if (name === "shopify_products") {
    const input = ShopifyProductsInput.parse(rawInput);
    const integration = requireIntegration("shopify");
    const apiVersion = process.env.SHOPIFY_API_VERSION;
    if (!apiVersion) throw new Error("SHOPIFY_API_VERSION no está configurado; JARVIS no asumirá una versión de API.");
    const store = process.env.SHOPIFY_STORE?.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!store) throw new Error("SHOPIFY_STORE no está configurado.");
    const response = await fetch(`https://${store}/admin/api/${encodeURIComponent(apiVersion)}/products.json?limit=${input.limit}`, {
      headers: {
        Accept: "application/json",
        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN || "",
      },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Shopify respondió ${response.status}.`);
    const data = await response.json() as { products?: Array<Record<string, unknown>> };
    return {
      integration: integration.id,
      count: data.products?.length ?? 0,
      products: (data.products ?? []).map((product) => ({
        id: product.id,
        title: product.title,
        status: product.status,
        vendor: product.vendor,
        productType: product.product_type,
        variants: product.variants,
        updatedAt: product.updated_at,
      })),
    };
  }

  throw new Error(`Tool de integración no soportada: ${name}`);
}
