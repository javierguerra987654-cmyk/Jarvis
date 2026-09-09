create index if not exists jarvis_missions_goal_id_idx on public.jarvis_missions (goal_id);

drop index if exists public.jarvis_steps_mission_order_idx;

create or replace function public.create_jarvis_mission(
  p_user_id text,
  p_title text,
  p_objective text,
  p_priority integer,
  p_success_metric text,
  p_risk_level text,
  p_steps jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_mission public.jarvis_missions;
  v_step jsonb;
  v_result jsonb;
  v_step_order integer := 0;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then raise exception 'user_id is required'; end if;
  if p_title is null or length(trim(p_title)) = 0 then raise exception 'title is required'; end if;
  if p_objective is null or length(trim(p_objective)) = 0 then raise exception 'objective is required'; end if;
  if p_priority < 0 or p_priority > 100 then raise exception 'priority out of range'; end if;
  if p_risk_level not in ('low','medium','high','critical') then raise exception 'invalid risk level'; end if;
  if jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) < 1 or jsonb_array_length(p_steps) > 20 then raise exception 'steps must contain between 1 and 20 items'; end if;

  insert into public.jarvis_missions (user_id, title, objective, priority, success_metric, risk_level, status)
  values (p_user_id, p_title, p_objective, p_priority, p_success_metric, p_risk_level, 'planned')
  returning * into v_mission;

  for v_step in select value from jsonb_array_elements(p_steps)
  loop
    v_step_order := v_step_order + 1;
    insert into public.jarvis_mission_steps (mission_id, step_order, title, description, verification)
    values (v_mission.id, v_step_order, v_step->>'title', v_step->>'description', v_step->>'verification');
  end loop;

  select jsonb_build_object(
    'id', v_mission.id,
    'user_id', v_mission.user_id,
    'goal_id', v_mission.goal_id,
    'title', v_mission.title,
    'objective', v_mission.objective,
    'status', v_mission.status,
    'priority', v_mission.priority,
    'success_metric', v_mission.success_metric,
    'risk_level', v_mission.risk_level,
    'created_at', v_mission.created_at,
    'updated_at', v_mission.updated_at
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.create_jarvis_mission(text, text, text, integer, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_jarvis_mission(text, text, text, integer, text, text, jsonb) to service_role;
