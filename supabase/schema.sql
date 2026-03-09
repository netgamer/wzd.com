create table if not exists public.dashboard_layouts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  columns_json jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.widgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  collapsed boolean not null default false,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashboard_layouts enable row level security;
alter table public.widgets enable row level security;

create policy "layout owner read"
on public.dashboard_layouts
for select
using (auth.uid() = user_id);

create policy "layout owner upsert"
on public.dashboard_layouts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "widget owner read"
on public.widgets
for select
using (auth.uid() = user_id);

create policy "widget owner mutate"
on public.widgets
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  widget_id text not null,
  agent_id text not null,
  agent_type text not null check (agent_type in ('developer', 'planner', 'pm')),
  prompt text not null,
  schedule_cron text,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  attempts integer not null default 1 check (attempts > 0),
  workflow_id text,
  workflow_name text,
  result_summary text,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  step_index integer not null check (step_index > 0),
  step_type text not null,
  status text not null default 'ok' check (status in ('running', 'ok', 'error')),
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (run_id, step_index)
);

create table if not exists public.user_workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workflow_id text not null,
  workflow_name text not null,
  agent_type text not null check (agent_type in ('developer', 'planner', 'pm')),
  schedule_cron text,
  created_from_run_id uuid references public.agent_runs(id) on delete set null,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, workflow_id)
);

create index if not exists idx_agent_runs_user_started_at on public.agent_runs (user_id, started_at desc);
create index if not exists idx_agent_steps_run_step on public.agent_steps (run_id, step_index);
create index if not exists idx_user_workflows_user on public.user_workflows (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_agent_runs_updated_at on public.agent_runs;
create trigger set_agent_runs_updated_at
before update on public.agent_runs
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_user_workflows_updated_at on public.user_workflows;
create trigger set_user_workflows_updated_at
before update on public.user_workflows
for each row
execute procedure public.set_updated_at();

alter table public.agent_runs enable row level security;
alter table public.agent_steps enable row level security;
alter table public.user_workflows enable row level security;

drop policy if exists "agent run owner read" on public.agent_runs;
create policy "agent run owner read"
on public.agent_runs
for select
using (auth.uid() = user_id);

drop policy if exists "agent run owner mutate" on public.agent_runs;
create policy "agent run owner mutate"
on public.agent_runs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "agent step owner read" on public.agent_steps;
create policy "agent step owner read"
on public.agent_steps
for select
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.agent_runs runs
    where runs.id = run_id
      and runs.user_id = auth.uid()
  )
);

drop policy if exists "agent step owner mutate" on public.agent_steps;
create policy "agent step owner mutate"
on public.agent_steps
for all
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.agent_runs runs
    where runs.id = run_id
      and runs.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.agent_runs runs
    where runs.id = run_id
      and runs.user_id = auth.uid()
  )
);

drop policy if exists "workflow owner read" on public.user_workflows;
create policy "workflow owner read"
on public.user_workflows
for select
using (auth.uid() = user_id);

drop policy if exists "workflow owner mutate" on public.user_workflows;
create policy "workflow owner mutate"
on public.user_workflows
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
