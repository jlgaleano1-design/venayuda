create extension if not exists "pgcrypto";

create type public.admin_role as enum ('owner', 'admin', 'reviewer');
create type public.donation_status as enum ('pending', 'validated', 'rejected');
create type public.need_status as enum ('open', 'partially_funded', 'purchased', 'cancelled');
create type public.purchase_status as enum ('draft', 'approved', 'rejected');
create type public.campaign_status as enum ('draft', 'active', 'paused', 'completed', 'archived');

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.admin_role not null default 'reviewer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  beneficiary_name text not null,
  location text,
  help_focus text not null,
  story text,
  goal_amount numeric(14, 2) check (goal_amount is null or goal_amount >= 0),
  reporting_currency char(3) not null default 'MXN',
  status public.campaign_status not null default 'draft',
  internal_notes text,
  created_by uuid references public.admin_profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  donor_display_name text,
  donor_email text,
  donor_phone text,
  amount numeric(14, 2) not null check (amount > 0),
  currency char(3) not null,
  reporting_amount numeric(14, 2) check (reporting_amount is null or reporting_amount >= 0),
  reporting_currency char(3) not null default 'MXN',
  transferred_at date not null,
  reference_last4 text,
  reference_full text,
  proof_storage_path text,
  status public.donation_status not null default 'pending',
  reviewed_by uuid references public.admin_profiles(user_id),
  reviewed_at timestamptz,
  rejection_reason text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint donations_reference_last4_length check (
    reference_last4 is null or char_length(reference_last4) <= 8
  ),
  constraint donations_validated_reporting_amount check (
    status <> 'validated' or reporting_amount is not null
  )
);

create table public.needs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  title text not null,
  description text,
  category text,
  priority integer not null default 3 check (priority between 1 and 5),
  quantity integer not null default 1 check (quantity > 0),
  estimated_unit_amount numeric(14, 2) check (
    estimated_unit_amount is null or estimated_unit_amount >= 0
  ),
  reporting_currency char(3) not null default 'MXN',
  status public.need_status not null default 'open',
  is_public boolean not null default true,
  internal_notes text,
  created_by uuid references public.admin_profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  purchased_at date not null,
  vendor text,
  description text,
  total_amount numeric(14, 2) not null check (total_amount >= 0),
  currency char(3) not null default 'MXN',
  reporting_amount numeric(14, 2) not null check (reporting_amount >= 0),
  reporting_currency char(3) not null default 'MXN',
  status public.purchase_status not null default 'draft',
  invoice_storage_path text,
  invoice_is_public boolean not null default false,
  photo_storage_path text,
  photo_is_public boolean not null default false,
  approved_by uuid references public.admin_profiles(user_id),
  approved_at timestamptz,
  rejection_reason text,
  internal_notes text,
  created_by uuid references public.admin_profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  need_id uuid references public.needs(id) on delete set null,
  description text not null,
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  unit_amount numeric(14, 2) not null check (unit_amount >= 0),
  total_amount numeric(14, 2) generated always as (quantity * unit_amount) stored,
  created_at timestamptz not null default now()
);

create index donations_status_created_at_idx on public.donations(status, created_at desc);
create index donations_campaign_id_idx on public.donations(campaign_id);
create index donations_reporting_currency_idx on public.donations(reporting_currency);
create index campaigns_status_slug_idx on public.campaigns(status, slug);
create index needs_status_priority_idx on public.needs(status, priority, created_at desc);
create index needs_campaign_id_idx on public.needs(campaign_id);
create index purchases_status_purchased_at_idx on public.purchases(status, purchased_at desc);
create index purchases_campaign_id_idx on public.purchases(campaign_id);
create index purchase_items_purchase_id_idx on public.purchase_items(purchase_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_admin_profiles_updated_at
before update on public.admin_profiles
for each row execute function public.set_updated_at();

create trigger set_campaigns_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

create trigger set_donations_updated_at
before update on public.donations
for each row execute function public.set_updated_at();

create trigger set_needs_updated_at
before update on public.needs
for each row execute function public.set_updated_at();

create trigger set_purchases_updated_at
before update on public.purchases
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
      and active = true
  );
$$;

create or replace function public.is_admin_with_role(allowed_roles public.admin_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
      and active = true
      and role = any(allowed_roles)
  );
$$;

create or replace function public.is_public_campaign(campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select campaign_id is null
    or exists (
      select 1
      from public.campaigns
      where id = campaign_id
        and status in ('active', 'completed')
    );
$$;

alter table public.admin_profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.donations enable row level security;
alter table public.needs enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;

create policy "admins can read admin profiles"
on public.admin_profiles for select
to authenticated
using (public.is_admin());

create policy "owners can manage admin profiles"
on public.admin_profiles for all
to authenticated
using (public.is_admin_with_role(array['owner']::public.admin_role[]))
with check (public.is_admin_with_role(array['owner']::public.admin_role[]));

create policy "admins can manage campaigns"
on public.campaigns for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "anyone can create pending donations"
on public.donations for insert
to anon, authenticated
with check (
  status = 'pending'
  and public.is_public_campaign(campaign_id)
  and reviewed_by is null
  and reviewed_at is null
  and rejection_reason is null
  and internal_notes is null
);

create policy "admins can manage donations"
on public.donations for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins can manage needs"
on public.needs for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins can manage purchases"
on public.purchases for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins can manage purchase items"
on public.purchase_items for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create view public.public_campaigns
with (security_barrier = true)
as
select
  id,
  slug,
  title,
  beneficiary_name,
  location,
  help_focus,
  story,
  goal_amount,
  reporting_currency,
  status,
  created_at,
  updated_at
from public.campaigns
where status in ('active', 'completed');

create view public.public_donations
with (security_barrier = true)
as
select
  d.id,
  case when public.is_public_campaign(d.campaign_id) then d.campaign_id end as campaign_id,
  c.slug as campaign_slug,
  c.title as campaign_title,
  coalesce(nullif(d.donor_display_name, ''), 'Donante anonimo') as donor_name,
  d.amount,
  d.currency,
  d.reporting_amount,
  d.reporting_currency,
  d.transferred_at,
  d.reference_last4,
  d.created_at
from public.donations d
left join public.campaigns c
  on c.id = d.campaign_id
  and c.status in ('active', 'completed')
where d.status = 'validated'
  and public.is_public_campaign(d.campaign_id);

create view public.public_purchases
with (security_barrier = true)
as
select
  p.id,
  p.campaign_id,
  c.slug as campaign_slug,
  c.title as campaign_title,
  p.purchased_at,
  p.vendor,
  p.description,
  p.total_amount,
  p.currency,
  p.reporting_amount,
  p.reporting_currency,
  p.invoice_is_public,
  p.photo_is_public,
  p.created_at
from public.purchases p
left join public.campaigns c
  on c.id = p.campaign_id
  and c.status in ('active', 'completed')
where p.status = 'approved'
  and public.is_public_campaign(p.campaign_id);

create view public.public_purchase_items
with (security_barrier = true)
as
select
  pi.id,
  pi.purchase_id,
  p.campaign_id,
  pi.need_id,
  pi.description,
  pi.quantity,
  pi.unit_amount,
  pi.total_amount,
  pi.created_at
from public.purchase_items pi
join public.purchases p on p.id = pi.purchase_id
where p.status = 'approved'
  and public.is_public_campaign(p.campaign_id);

create view public.public_needs
with (security_barrier = true)
as
select
  id,
  campaign_id,
  title,
  description,
  category,
  priority,
  quantity,
  estimated_unit_amount,
  reporting_currency,
  status,
  created_at,
  updated_at
from public.needs
where is_public = true
  and status in ('open', 'partially_funded')
  and public.is_public_campaign(campaign_id);

create view public.public_ledger_summary
with (security_barrier = true)
as
with donated as (
  select campaign_id, reporting_currency, sum(reporting_amount) as total_donated
  from public.donations
  where status = 'validated'
    and public.is_public_campaign(campaign_id)
  group by campaign_id, reporting_currency
),
spent as (
  select campaign_id, reporting_currency, sum(reporting_amount) as total_spent
  from public.purchases
  where status = 'approved'
    and public.is_public_campaign(campaign_id)
  group by campaign_id, reporting_currency
)
select
  coalesce(d.campaign_id, p.campaign_id) as campaign_id,
  c.slug as campaign_slug,
  c.title as campaign_title,
  coalesce(d.reporting_currency, p.reporting_currency, 'MXN') as reporting_currency,
  coalesce(d.total_donated, 0)::numeric(14, 2) as total_donated,
  coalesce(p.total_spent, 0)::numeric(14, 2) as total_spent,
  (coalesce(d.total_donated, 0) - coalesce(p.total_spent, 0))::numeric(14, 2) as available_balance
from donated d
full join spent p
  on p.campaign_id is not distinct from d.campaign_id
  and p.reporting_currency = d.reporting_currency
left join public.campaigns c
  on c.id = coalesce(d.campaign_id, p.campaign_id)
  and c.status in ('active', 'completed');

grant select on public.public_campaigns to anon, authenticated;
grant select on public.public_donations to anon, authenticated;
grant select on public.public_purchases to anon, authenticated;
grant select on public.public_purchase_items to anon, authenticated;
grant select on public.public_needs to anon, authenticated;
grant select on public.public_ledger_summary to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'donation-proofs',
    'donation-proofs',
    false,
    10485760,
    array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
  ),
  (
    'purchase-documents',
    'purchase-documents',
    false,
    10485760,
    array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
  )
on conflict (id) do nothing;

create or replace function public.storage_purchase_id(object_name text)
returns uuid
language plpgsql
immutable
as $$
declare
  first_segment text;
begin
  first_segment := (storage.foldername(object_name))[1];
  return first_segment::uuid;
exception
  when others then
    return null;
end;
$$;

create or replace function public.is_public_purchase_document(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select exists (
    select 1
    from public.purchases p
    where p.id = public.storage_purchase_id(object_name)
      and p.status = 'approved'
      and public.is_public_campaign(p.campaign_id)
      and (
        (object_name like '%/invoice/%' and p.invoice_is_public = true)
        or (object_name like '%/photo/%' and p.photo_is_public = true)
      )
  );
$$;

create policy "admins can read donation proofs"
on storage.objects for select
to authenticated
using (
  bucket_id = 'donation-proofs'
  and public.is_admin()
);

create policy "anyone can upload donation proofs"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'donation-proofs'
  and (auth.role() = 'anon' or owner = auth.uid())
);

create policy "admins can manage donation proofs"
on storage.objects for all
to authenticated
using (
  bucket_id = 'donation-proofs'
  and public.is_admin()
)
with check (
  bucket_id = 'donation-proofs'
  and public.is_admin()
);

create policy "admins can read purchase documents"
on storage.objects for select
to authenticated
using (
  bucket_id = 'purchase-documents'
  and public.is_admin()
);

create policy "public can read approved public purchase documents"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'purchase-documents'
  and public.is_public_purchase_document(storage.objects.name)
);

create policy "admins can manage purchase documents"
on storage.objects for all
to authenticated
using (
  bucket_id = 'purchase-documents'
  and public.is_admin()
)
with check (
  bucket_id = 'purchase-documents'
  and public.is_admin()
);
