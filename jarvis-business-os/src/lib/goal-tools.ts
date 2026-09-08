import { z } from "zod";
import { createGoal, getGoal, listGoals } from "./goal-store-rest";

const GoalInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  status: z.enum(["active", "paused", "completed", "archived"]),
  metric_name: z.string().max(200).nullable(),
  target_value: z.number().nullable(),
  current_value: z.number().default(0),
  unit: z.string().max(80).nullable(),
  due_at: z.string().datetime().nullable(),
});

const GoalIdInput = z.object({ goalId: z.string().uuid() });

export const goalToolDefinitions = [
  { type: "function" as const, name: "goal_create", description: "Crea un objetivo persistente para el usuario actual.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, description: { type: ["string", "null"] }, status: { type: "string", enum: ["active", "paused", "completed", "archived"] }, metric_name: { type: ["string", "null"] }, target_value: { type: ["number", "null"] }, current_value: { type: "number" }, unit: { type: ["string", "null"] }, due_at: { type: ["string", "null"] } }, required: ["title", "description", "status", "metric_name", "target_value", "current_value", "unit", "due_at"] } },
  { type: "function" as const, name: "goal_list", description: "Lista los objetivos persistentes del usuario actual.", strict: true, parameters: { type: "object", additionalProperties: false, properties: {}, required: [] } },
  { type: "function" as const, name: "goal_get", description: "Obtiene un objetivo concreto del usuario actual.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { goalId: { type: "string" } }, required: ["goalId"] } },
] as const;

export async function runGoalTool(name: string, rawInput: unknown, context: { userId: string }) {
  if (name === "goal_create") return { ok: true, goal: await createGoal(context.userId, GoalInput.parse(rawInput)) };
  if (name === "goal_list") { z.object({}).parse(rawInput); return { goals: await listGoals(context.userId) }; }
  if (name === "goal_get") { const input = GoalIdInput.parse(rawInput); const goal = await getGoal(context.userId, input.goalId); return goal ? { ok: true, goal } : { ok: false, error: "GOAL_NOT_FOUND" }; }
  throw new Error(`Tool de objetivo no soportada: ${name}`);
}
