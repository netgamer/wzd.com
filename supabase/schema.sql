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
