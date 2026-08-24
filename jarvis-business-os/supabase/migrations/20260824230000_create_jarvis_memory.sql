create extension if not exists pgcrypto;

create table if not exists public.jarvis_memory (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  content text not null,
  category text not null check (category in ('fact', 'preference', 'goal', 'context')),
  importance numeric not null default 0.5 check (importance >= 0 and importance <= 1),
  created_at timestamptz not null default now()
);

create index if not exists jarvis_memory_user_created_idx
  on public.jarvis_memory (user_id, created_at desc);

create index if not exists jarvis_memory_user_category_idx
  on public.jarvis_memory (user_id, category);

alter table public.jarvis_memory enable row level security;

-- No client-facing policies are created intentionally.
-- JARVIS accesses this table server-side with a privileged key.
