import { getSupabaseRestConfig } from "./supabase-server";
import type { MissionPlan } from "./missions";

async function request(path: string, init?: RequestInit) {
  const { url, key } = getSupabaseRestConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase respondió ${response.status}.`);
  return response;
}

export async function createMission(userId: string, plan: MissionPlan) {
  const response = await request("jarvis_missions", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ user_id: userId, title: plan.title, objective: plan.objective, priority: plan.priority, success_metric: plan.successMetric, risk_level: plan.riskLevel, status: "planned" }),
  });
  const mission = (await response.json())[0];
  const steps = plan.steps.map((step, index) => ({ mission_id: mission.id, step_order: index + 1, title: step.title, description: step.description, verification: step.verification }));
  await request("jarvis_mission_steps", { method: "POST", body: JSON.stringify(steps) });
  return mission;
}

export async function listMissions(userId: string) {
  const response = await request(`jarvis_missions?select=id,title,objective,priority,success_metric,risk_level,status,created_at,updated_at&user_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc&limit=20`);
  return response.json();
}

export async function getMission(userId: string, missionId: string) {
  const response = await request(`jarvis_missions?select=id,title,objective,priority,success_metric,risk_level,status,created_at,updated_at&user_id=eq.${encodeURIComponent(userId)}&id=eq.${encodeURIComponent(missionId)}&limit=1`);
  const missions = await response.json();
  const mission = missions[0];
  if (!mission) return null;
  const steps = await (await request(`jarvis_mission_steps?select=id,step_order,title,description,status,verification,created_at,updated_at&mission_id=eq.${encodeURIComponent(missionId)}&order=step_order.asc`)).json();
  return { ...mission, steps };
}
