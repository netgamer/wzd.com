-- =========================================================
-- Insight Reader MVP Schema for Supabase
-- Copy-paste into Supabase SQL Editor and run once
-- =========================================================

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

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('rss', 'bookmark', 'manual')),
  name text not null,
  url text,
  site_url text,
  is_active boolean not null default true,
  fetch_interval_min integer not null default 60,
  last_fetched_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_sources_type on public.sources(type);
create index if not exists idx_sources_active on public.sources(is_active);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  external_id text,
  url text not null unique,
  canonical_url text,
  title text not null,
  author text,
  published_at timestamptz,
  raw_content text,
  summary_short text,
  summary_long text,
  content_type text not null default 'article',
  language text not null default 'en',
  thumbnail_url text,
  status text not null default 'pending'
    check (status in ('pending', 'processed', 'failed')),
  score_importance numeric(5,2) not null default 0,
  score_monetization numeric(5,2) not null default 0,
  score_relevance numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_items_source_id on public.items(source_id);
create index if not exists idx_items_status on public.items(status);
create index if not exists idx_items_published_at on public.items(published_at desc);
create index if not exists idx_items_created_at on public.items(created_at desc);
create index if not exists idx_items_scores on public.items(score_importance desc, score_monetization desc, score_relevance desc);

drop trigger if exists trg_items_updated_at on public.items;
create trigger trg_items_updated_at
before update on public.items
for each row
execute function public.set_updated_at();

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.item_tags (
  item_id uuid not null references public.items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (item_id, tag_id)
);

create index if not exists idx_item_tags_tag_id on public.item_tags(tag_id);
create index if not exists idx_item_tags_item_id on public.item_tags(item_id);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid references public.items(id) on delete cascade,
  raw_url text,
  note text,
  saved_at timestamptz not null default now(),
  constraint bookmarks_item_or_raw_url_check
  check (item_id is not null or raw_url is not null)
);

create index if not exists idx_bookmarks_user_saved_at on public.bookmarks(user_id, saved_at desc);
create index if not exists idx_bookmarks_item_id on public.bookmarks(item_id);
create unique index if not exists uq_bookmarks_user_item
on public.bookmarks(user_id, item_id)
where item_id is not null;

create table if not exists public.clusters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  score_trend numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_clusters_name on public.clusters(lower(name));
create index if not exists idx_clusters_score_trend on public.clusters(score_trend desc);

drop trigger if exists trg_clusters_updated_at on public.clusters;
create trigger trg_clusters_updated_at
before update on public.clusters
for each row
execute function public.set_updated_at();

create table if not exists public.cluster_items (
  cluster_id uuid not null references public.clusters(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  primary key (cluster_id, item_id)
);

create index if not exists idx_cluster_items_cluster_id on public.cluster_items(cluster_id);
create index if not exists idx_cluster_items_item_id on public.cluster_items(item_id);

create table if not exists public.action_suggestions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items(id) on delete cascade,
  cluster_id uuid references public.clusters(id) on delete cascade,
  title text not null,
  description text,
  action_type text,
  difficulty text,
  expected_value text,
  created_at timestamptz not null default now(),
  constraint action_target_check
  check (item_id is not null or cluster_id is not null)
);

create index if not exists idx_action_suggestions_item_id on public.action_suggestions(item_id);
create index if not exists idx_action_suggestions_cluster_id on public.action_suggestions(cluster_id);
create index if not exists idx_action_suggestions_created_at on public.action_suggestions(created_at desc);

create or replace view public.v_item_preview as
select
  i.id,
  i.source_id,
  i.url,
  coalesce(i.canonical_url, i.url) as display_url,
  i.title,
  i.author,
  i.summary_short,
  i.content_type,
  i.language,
  i.thumbnail_url,
  i.status,
  i.score_importance,
  i.score_monetization,
  i.score_relevance,
  i.published_at,
  i.created_at
from public.items i
where i.status = 'processed';

create or replace view public.v_trending_clusters as
select
  c.id,
  c.name,
  c.description,
  c.score_trend,
  count(ci.item_id)::int as item_count,
  c.created_at,
  c.updated_at
from public.clusters c
left join public.cluster_items ci on ci.cluster_id = c.id
group by
  c.id, c.name, c.description, c.score_trend, c.created_at, c.updated_at;

create or replace view public.v_home_hero_candidates as
select
  i.id,
  i.title,
  i.summary_short,
  i.url,
  i.published_at,
  i.score_importance,
  i.score_monetization,
  i.score_relevance,
  (
    (i.score_importance * 0.45) +
    (i.score_monetization * 0.35) +
    (i.score_relevance * 0.20)
  ) as total_score
from public.items i
where i.status = 'processed';

create or replace function public.get_home_payload(p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hero jsonb;
  v_trends jsonb;
  v_feed jsonb;
  v_rediscovery jsonb;
  v_actions jsonb;
begin
  select to_jsonb(t)
  into v_hero
  from (
    select
      id,
      title,
      summary_short,
      url,
      published_at,
      score_importance,
      score_monetization,
      score_relevance,
      total_score
    from public.v_home_hero_candidates
    order by total_score desc, published_at desc nulls last
    limit 1
  ) t;

  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  into v_trends
  from (
    select
      id,
      name,
      description,
      score_trend,
      item_count
    from public.v_trending_clusters
    order by score_trend desc, item_count desc
    limit 5
  ) t;

  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  into v_feed
  from (
    select
      p.id,
      p.title,
      p.summary_short,
      p.url,
      p.published_at,
      p.score_importance,
      p.score_monetization,
      p.score_relevance
    from public.v_item_preview p
    order by p.published_at desc nulls last, p.created_at desc
    limit 12
  ) t;

  if p_user_id is null then
    v_rediscovery := '[]'::jsonb;
  else
    select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    into v_rediscovery
    from (
      select
        b.id as bookmark_id,
        b.saved_at,
        b.note,
        i.id as item_id,
        i.title,
        i.summary_short,
        i.url,
        i.score_importance,
        i.score_monetization
      from public.bookmarks b
      join public.items i on i.id = b.item_id
      where b.user_id = p_user_id
        and b.saved_at <= now() - interval '3 days'
      order by i.score_monetization desc, i.score_importance desc, b.saved_at asc
      limit 5
    ) t;
  end if;

  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  into v_actions
  from (
    select
      a.id,
      a.title,
      a.description,
      a.action_type,
      a.difficulty,
      a.expected_value,
      a.item_id,
      a.cluster_id,
      a.created_at
    from public.action_suggestions a
    order by a.created_at desc
    limit 6
  ) t;

  return jsonb_build_object(
    'hero', v_hero,
    'trends', v_trends,
    'feed', v_feed,
    'rediscovery', v_rediscovery,
    'actions', v_actions
  );
end;
$$;

grant execute on function public.get_home_payload(uuid) to anon, authenticated;

alter table public.sources enable row level security;
alter table public.items enable row level security;
alter table public.tags enable row level security;
alter table public.item_tags enable row level security;
alter table public.clusters enable row level security;
alter table public.cluster_items enable row level security;
alter table public.action_suggestions enable row level security;
alter table public.bookmarks enable row level security;

drop policy if exists "Public can read sources" on public.sources;
drop policy if exists "Public can read processed items" on public.items;
drop policy if exists "Public can read tags" on public.tags;
drop policy if exists "Public can read item_tags" on public.item_tags;
drop policy if exists "Public can read clusters" on public.clusters;
drop policy if exists "Public can read cluster_items" on public.cluster_items;
drop policy if exists "Public can read action_suggestions" on public.action_suggestions;
drop policy if exists "Users can view own bookmarks" on public.bookmarks;
drop policy if exists "Users can insert own bookmarks" on public.bookmarks;
drop policy if exists "Users can update own bookmarks" on public.bookmarks;
drop policy if exists "Users can delete own bookmarks" on public.bookmarks;

create policy "Public can read sources"
on public.sources
for select
using (true);

create policy "Public can read processed items"
on public.items
for select
using (status = 'processed');

create policy "Public can read tags"
on public.tags
for select
using (true);

create policy "Public can read item_tags"
on public.item_tags
for select
using (true);

create policy "Public can read clusters"
on public.clusters
for select
using (true);

create policy "Public can read cluster_items"
on public.cluster_items
for select
using (true);

create policy "Public can read action_suggestions"
on public.action_suggestions
for select
using (true);

create policy "Users can view own bookmarks"
on public.bookmarks
for select
using (auth.uid() = user_id);

create policy "Users can insert own bookmarks"
on public.bookmarks
for insert
with check (auth.uid() = user_id);

create policy "Users can update own bookmarks"
on public.bookmarks
for update
using (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
on public.bookmarks
for delete
using (auth.uid() = user_id);
