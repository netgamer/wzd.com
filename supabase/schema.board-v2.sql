-- WZD Board V2 schema (cork board + sticky notes)
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'My Board',
  description text not null default '',
  background_style text not null default 'cork' check (background_style in ('cork', 'whiteboard', 'paper')),
  settings jsonb not null default '{}'::jsonb,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  color text not null default 'yellow'
    check (color in ('yellow', 'pink', 'blue', 'green', 'orange', 'purple', 'mint', 'white')),
  x integer not null default 120,
  y integer not null default 120,
  w integer not null default 240 check (w between 140 and 520),
  h integer not null default 220 check (h between 120 and 640),
  z_index integer not null default 1,
  rotation numeric(5,2) not null default 0 check (rotation between -20 and 20),
  pinned boolean not null default false,
  archived boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.note_tags (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tag text not null check (char_length(tag) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (note_id, tag)
);

create index if not exists idx_boards_user_updated_at
  on public.boards (user_id, updated_at desc);

create index if not exists idx_notes_board_z
  on public.notes (board_id, z_index desc, updated_at desc);

create index if not exists idx_notes_user_updated
  on public.notes (user_id, updated_at desc);

create index if not exists idx_note_tags_user_tag
  on public.note_tags (user_id, tag);

drop trigger if exists set_boards_updated_at on public.boards;
create trigger set_boards_updated_at
before update on public.boards
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
before update on public.notes
for each row
execute procedure public.set_updated_at();

alter table public.boards enable row level security;
alter table public.notes enable row level security;
alter table public.note_tags enable row level security;

drop policy if exists "boards owner read" on public.boards;
create policy "boards owner read"
on public.boards
for select
using (auth.uid() = user_id);

drop policy if exists "boards owner mutate" on public.boards;
create policy "boards owner mutate"
on public.boards
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "notes owner read" on public.notes;
create policy "notes owner read"
on public.notes
for select
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.boards b
    where b.id = board_id
      and b.user_id = auth.uid()
  )
);

drop policy if exists "notes owner mutate" on public.notes;
create policy "notes owner mutate"
on public.notes
for all
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.boards b
    where b.id = board_id
      and b.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.boards b
    where b.id = board_id
      and b.user_id = auth.uid()
  )
);

drop policy if exists "note tags owner read" on public.note_tags;
create policy "note tags owner read"
on public.note_tags
for select
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.notes n
    where n.id = note_id
      and n.user_id = auth.uid()
  )
);

drop policy if exists "note tags owner mutate" on public.note_tags;
create policy "note tags owner mutate"
on public.note_tags
for all
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.notes n
    where n.id = note_id
      and n.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.notes n
    where n.id = note_id
      and n.user_id = auth.uid()
  )
);
