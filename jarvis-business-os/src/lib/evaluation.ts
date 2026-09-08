import { z } from "zod";

export const MissionEvaluationSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string().max(300)).max(8),
  risks: z.array(z.string().max(300)).max(8),
  missingInformation: z.array(z.string().max(300)).max(8),
  nextAction: z.string().max(500),
});

export type MissionEvaluation = z.infer<typeof MissionEvaluationSchema>;

export function evaluateMissionPlan(plan: { objective: string; successMetric: string | null; steps: Array<{ title: string; description: string | null; verification: string | null }>; riskLevel: string }) {
  let score = 0;
  const strengths: string[] = [];
  const risks: string[] = [];
  const missingInformation: string[] = [];

  if (plan.objective.length >= 20) { score += 25; strengths.push("Objetivo suficientemente específico."); } else missingInformation.push("El objetivo necesita más precisión.");
  if (plan.successMetric) { score += 25; strengths.push("Existe una métrica de éxito explícita."); } else missingInformation.push("Falta una métrica de éxito medible.");
  if (plan.steps.length >= 3) { score += 25; strengths.push("La misión contiene una secuencia de ejecución."); } else risks.push("La misión tiene pocos pasos para una ejecución verificable.");
  const verified = plan.steps.filter((step) => Boolean(step.verification)).length;
  if (verified / Math.max(plan.steps.length, 1) >= 0.7) { score += 25; strengths.push("La mayoría de pasos tienen criterio de verificación."); } else risks.push("Faltan criterios de verificación en varios pasos.");
  if (plan.riskLevel === "high" || plan.riskLevel === "critical") risks.push("La misión requiere control humano reforzado antes de cualquier acción externa.");

  return MissionEvaluationSchema.parse({
    score,
    strengths,
    risks,
    missingInformation,
    nextAction: plan.steps[0]?.title ?? "Definir el primer paso ejecutable.",
  });
}
