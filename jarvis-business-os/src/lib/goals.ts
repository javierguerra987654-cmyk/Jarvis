export type GoalStatus = "active" | "paused" | "completed" | "archived";

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  metric_name: string | null;
  target_value: number | null;
  current_value: number;
  unit: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};
