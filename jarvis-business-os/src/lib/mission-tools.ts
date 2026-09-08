import { z } from "zod";
import { MissionPlanSchema } from "./missions";
import { evaluateMissionPlan } from "./evaluation";
import { createMission, getMission, listMissions } from "./mission-store-rest";

const MissionIdInput = z.object({ missionId: z.string().uuid() });
const CreateMissionInput = MissionPlanSchema;
const EvaluateMissionInput = MissionPlanSchema;

export const missionToolDefinitions = [
  {
    type: "function" as const,
    name: "mission_create",
    description: "Crea una misión persistente de JARVIS a partir de un plan validado. No ejecuta acciones externas.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        objective: { type: "string" },
        priority: { type: "integer", minimum: 0, maximum: 100 },
        successMetric: { type: ["string", "null"] },
        riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
        steps: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              description: { type: ["string", "null"] },
              verification: { type: ["string", "null"] },
            },
            required: ["title", "description", "verification"],
          },
        },
      },
      required: ["title", "objective", "priority", "successMetric", "riskLevel", "steps"],
    },
  },
  {
    type: "function" as const,
    name: "mission_list",
    description: "Lista las misiones persistentes del usuario actual.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {},
      required: [],
    },
  },
  {
    type: "function" as const,
    name: "mission_get",
    description: "Obtiene una misión concreta del usuario actual, incluyendo sus pasos.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { missionId: { type: "string" } },
      required: ["missionId"],
    },
  },
  {
    type: "function" as const,
    name: "mission_evaluate",
    description: "Evalúa un plan de misión sin ejecutar acciones externas.",
    strict: true,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        objective: { type: "string" },
        priority: { type: "integer", minimum: 0, maximum: 100 },
        successMetric: { type: ["string", "null"] },
        riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
        steps: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              description: { type: ["string", "null"] },
              verification: { type: ["string", "null"] },
            },
            required: ["title", "description", "verification"],
          },
        },
      },
      required: ["title", "objective", "priority", "successMetric", "riskLevel", "steps"],
    },
  },
] as const;

export async function runMissionTool(name: string, rawInput: unknown, context: { userId: string }) {
  if (name === "mission_create") {
    const input = CreateMissionInput.parse(rawInput);
    const mission = await createMission(context.userId, input);
    return { ok: true, mission };
  }

  if (name === "mission_list") {
    z.object({}).parse(rawInput);
    return { missions: await listMissions(context.userId) };
  }

  if (name === "mission_get") {
    const input = MissionIdInput.parse(rawInput);
    const mission = await getMission(context.userId, input.missionId);
    if (!mission) return { ok: false, error: "MISSION_NOT_FOUND" };
    return { ok: true, mission };
  }

  if (name === "mission_evaluate") {
    const input = EvaluateMissionInput.parse(rawInput);
    return { ok: true, evaluation: evaluateMissionPlan(input) };
  }

  throw new Error(`Tool de misión no soportada: ${name}`);
}
