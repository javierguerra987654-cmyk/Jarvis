import { z } from "zod";
import { executeTool, registerTool } from "@/lib/tools";
import type { JarvisTool, JarvisToolContext } from "@/lib/tools";
import { memoryStore } from "@/lib/memory";

const MemoryInput = z.object({
  action: z.enum(["search", "save"]),
  query: z.string().trim().max(200).optional(),
  content: z.string().trim().min(1).max(4000).optional(),
  category: z.enum(["fact", "preference", "goal", "context"]).optional(),
  importance: z.number().min(0).max(1).optional(),
});

export const memoryTool: JarvisTool<typeof MemoryInput> = {
  name: "memory",
  description: "Busca o guarda memoria persistente de J.A.R.V.I.S. Solo usa save cuando el usuario pida recordar, guardar o memorizar algo.",
  input: MemoryInput,
  risk: "LOW",
  permission: "AUTO",
  async execute(input: z.infer<typeof MemoryInput>, context: JarvisToolContext) {
    if (!context.userId) throw new Error("Memoria requiere un identificador de usuario.");

    if (input.action === "search") {
      const query = input.query?.trim();
      if (!query) throw new Error("La búsqueda de memoria requiere query.");
      return await memoryStore.search(context.userId, query, 8);
    }

    if (!input.content || !input.category) {
      throw new Error("Guardar memoria requiere content y category.");
    }

    return await memoryStore.save({
      userId: context.userId,
      content: input.content,
      category: input.category,
      importance: input.importance ?? 0.7,
    });
  },
};

let initialized = false;
export function ensureMemoryToolRegistered() {
  if (initialized) return;
  registerTool(memoryTool);
  initialized = true;
}

export async function runMemoryTool(rawInput: unknown, context: JarvisToolContext) {
  ensureMemoryToolRegistered();
  return executeTool("memory", rawInput, context);
}
