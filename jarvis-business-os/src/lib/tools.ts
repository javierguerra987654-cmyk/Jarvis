import { z } from "zod";

export type JarvisToolContext = {
  userId?: string;
  requestId: string;
};

export type JarvisTool<TInput extends z.ZodTypeAny = z.ZodTypeAny> = {
  name: string;
  description: string;
  input: TInput;
  execute: (input: z.infer<TInput>, context: JarvisToolContext) => Promise<unknown>;
};

const registry = new Map<string, JarvisTool>();

export function registerTool<TInput extends z.ZodTypeAny>(tool: JarvisTool<TInput>) {
  if (registry.has(tool.name)) throw new Error(`Tool duplicada: ${tool.name}`);
  registry.set(tool.name, tool);
}

export function listTools() {
  return [...registry.values()].map(({ name, description, input }) => ({ name, description, input }));
}

export function getTool(name: string) {
  return registry.get(name);
}

export async function executeTool(name: string, rawInput: unknown, context: JarvisToolContext) {
  const tool = registry.get(name);
  if (!tool) throw new Error(`Tool no registrada: ${name}`);
  const input = tool.input.parse(rawInput);
  return tool.execute(input, context);
}
