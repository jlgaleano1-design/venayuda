create table if not exists public.collection_centers (
  id text primary key,
  name text not null,
  address text not null default '',
  city text not null default '',
  country text not null default '',
  coordinates text,
  receives text not null default 'Centro de acopio',
  contact text,
  categories text[] not null default '{}',
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collection_centers_categories_valid check (
    categories <@ array[
      'medicines',
      'food',
      'hygiene',
      'clothing',
      'supplies',
      'pets'
    ]::text[]
  )
);

create table if not exists public.collection_center_sync_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('success', 'failed')),
  center_count integer not null default 0 check (center_count >= 0),
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists collection_centers_country_city_name_idx
  on public.collection_centers(country, city, name);
create index if not exists collection_centers_synced_at_idx
  on public.collection_centers(synced_at desc);
create index if not exists collection_center_sync_runs_created_at_idx
  on public.collection_center_sync_runs(created_at desc);

drop trigger if exists set_collection_centers_updated_at
  on public.collection_centers;
create trigger set_collection_centers_updated_at
before update on public.collection_centers
for each row execute function public.set_updated_at();

alter table public.collection_centers enable row level security;
alter table public.collection_center_sync_runs enable row level security;

drop policy if exists "anyone can read collection centers"
  on public.collection_centers;
create policy "anyone can read collection centers"
on public.collection_centers for select
to anon, authenticated
using (true);

drop policy if exists "admins can manage collection centers"
  on public.collection_centers;
create policy "admins can manage collection centers"
on public.collection_centers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can read collection center sync runs"
  on public.collection_center_sync_runs;
create policy "admins can read collection center sync runs"
on public.collection_center_sync_runs for select
to authenticated
using (public.is_admin());

drop policy if exists "admins can manage collection center sync runs"
  on public.collection_center_sync_runs;
create policy "admins can manage collection center sync runs"
on public.collection_center_sync_runs for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
