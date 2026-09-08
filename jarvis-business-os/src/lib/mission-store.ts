import { createClient } from "@supabase/supabase-js";
import type { MissionPlan } from "./missions";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase no está configurado.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function createMission(userId: string, plan: MissionPlan) {
  const client = db();
  const { data: mission, error } = await client
    .from("jarvis_missions")
    .insert({ user_id: userId, title: plan.title, objective: plan.objective, priority: plan.priority, success_metric: plan.successMetric, risk_level: plan.riskLevel, status: "planned" })
    .select("id,title,objective,priority,success_metric,risk_level,status,created_at,updated_at")
    .single();
  if (error) throw error;

  const steps = plan.steps.map((step, index) => ({
    mission_id: mission.id,
    step_order: index + 1,
    title: step.title,
    description: step.description,
    verification: step.verification,
  }));
  const { error: stepError } = await client.from("jarvis_mission_steps").insert(steps);
  if (stepError) throw stepError;
  return mission;
}

export async function listMissions(userId: string) {
  const client = db();
  const { data, error } = await client
    .from("jarvis_missions")
    .select("id,title,objective,priority,success_metric,risk_level,status,created_at,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function getMission(userId: string, missionId: string) {
  const client = db();
  const { data: mission, error } = await client
    .from("jarvis_missions")
    .select("id,title,objective,priority,success_metric,risk_level,status,created_at,updated_at")
    .eq("id", missionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!mission) return null;
  const { data: steps, error: stepError } = await client
    .from("jarvis_mission_steps")
    .select("id,step_order,title,description,status,verification,created_at,updated_at")
    .eq("mission_id", mission.id)
    .order("step_order", { ascending: true });
  if (stepError) throw stepError;
  return { ...mission, steps: steps ?? [] };
}
