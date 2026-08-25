import { z } from "zod";

export type JarvisToolRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type JarvisToolPermission = "AUTO" | "APPROVAL_REQUIRED" | "OPERATOR_ONLY";

export type JarvisToolContext = {
  userId?: string;
  requestId: string;
  approved?: boolean;
  operatorAuthorized?: boolean;
};

export type JarvisTool<TInput extends z.ZodTypeAny = z.ZodTypeAny> = {
  name: string;
  description: string;
  input: TInput;
  risk: JarvisToolRisk;
  permission: JarvisToolPermission;
  execute: (input: z.infer<TInput>, context: JarvisToolContext) => Promise<unknown>;
};

const registry = new Map<string, JarvisTool>();

export function registerTool<TInput extends z.ZodTypeAny>(tool: JarvisTool<TInput>) {
  if (registry.has(tool.name)) throw new Error(`Tool duplicada: ${tool.name}`);
  registry.set(tool.name, tool);
}

export function listTools() {
  return [...registry.values()].map(({ name, description, input, risk, permission }) => ({
    name,
    description,
    input,
    risk,
    permission,
  }));
}

export function getTool(name: string) {
  return registry.get(name);
}

function authorizeTool(tool: JarvisTool, context: JarvisToolContext) {
  if (tool.permission === "AUTO") return;
  if (tool.permission === "APPROVAL_REQUIRED" && context.approved) return;
  if (tool.permission === "OPERATOR_ONLY" && context.operatorAuthorized) return;
  throw new Error(`La herramienta '${tool.name}' requiere autorización para ejecutarse.`);
}

export async function executeTool(name: string, rawInput: unknown, context: JarvisToolContext) {
  const tool = registry.get(name);
  if (!tool) throw new Error(`Tool no registrada: ${name}`);
  authorizeTool(tool, context);
  const input = tool.input.parse(rawInput);
  return tool.execute(input, context);
}
