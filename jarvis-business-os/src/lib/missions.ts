import { z } from "zod";

export const MissionStatus = z.enum(["planned", "active", "blocked", "awaiting_approval", "completed", "cancelled"]);
export const MissionStepStatus = z.enum(["pending", "active", "blocked", "awaiting_approval", "completed", "skipped"]);

export const MissionPlanSchema = z.object({
  title: z.string().min(1).max(200),
  objective: z.string().min(1).max(2000),
  priority: z.number().int().min(0).max(100),
  successMetric: z.string().max(500).nullable(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  steps: z.array(z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).nullable(),
    verification: z.string().max(500).nullable(),
  })).min(1).max(20),
});

export type MissionPlan = z.infer<typeof MissionPlanSchema>;

export function buildMissionPlanPrompt(objective: string) {
  return [
    "Construye una misión ejecutable para J.A.R.V.I.S.",
    "No ejecutes acciones externas.",
    "Devuelve una estructura JSON válida con: title, objective, priority, successMetric, riskLevel y steps.",
    "Prioriza impacto, dependencias, verificabilidad y bajo riesgo.",
    `OBJETIVO DEL USUARIO:\n${objective}`,
  ].join("\n\n");
}
