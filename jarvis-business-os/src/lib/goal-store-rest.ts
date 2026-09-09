import { getSupabaseRestConfig } from "./supabase-server";
import type { Goal } from "./goals";

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

export type GoalInput = Pick<Goal, "title" | "description" | "status" | "metric_name" | "target_value" | "current_value" | "unit" | "due_at">;

export async function createGoal(userId: string, input: GoalInput) {
  const response = await request("jarvis_goals", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ user_id: userId, ...input }),
  });
  return (await response.json())[0];
}

export async function listGoals(userId: string) {
  const response = await request(`jarvis_goals?select=id,title,description,status,metric_name,target_value,current_value,unit,due_at,created_at,updated_at&user_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc&limit=20`);
  return response.json();
}

export async function getGoal(userId: string, goalId: string) {
  const response = await request(`jarvis_goals?select=id,title,description,status,metric_name,target_value,current_value,unit,due_at,created_at,updated_at&user_id=eq.${encodeURIComponent(userId)}&id=eq.${encodeURIComponent(goalId)}&limit=1`);
  return (await response.json())[0] ?? null;
}
