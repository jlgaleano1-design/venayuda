create extension if not exists "pgcrypto";

create type public.admin_role as enum ('owner', 'admin', 'reviewer');
create type public.campaign_status as enum (
  'pending_review',
  'draft',
  'active',
  'paused',
  'completed',
  'archived'
);
create type public.verification_status as enum (
  'unverified',
  'pending',
  'verified',
  'rejected'
);
create type public.receiving_category as enum (
  'crypto',
  'mexico',
  'united_states',
  'venezuela',
  'spain',
  'panama',
  'colombia',
  'chile',
  'argentina',
  'international',
  'other'
);
create type public.donation_status as enum ('pending', 'verified', 'rejected');
create type public.purchase_status as enum ('pending', 'approved', 'rejected');
create type public.need_status as enum (
  'open',
  'partially_funded',
  'purchased',
  'cancelled'
);
create type public.email_event_status as enum (
  'pending',
  'retrying',
  'sent',
  'failed'
);
create type public.email_event_type as enum (
  'campaign_approved',
  'campaign_review',
  'donation_confirmation',
  'donation_report',
  'purchase_impact',
  'purchase_review'
);

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
  title text not null,
  slug text not null unique,
  description text not null,
  responsible_person_name text not null,
  responsible_organization text,
  instagram_handle text,
  contact_info text,
  location text,
  affected_area text,
  cover_image_path text,
  status public.campaign_status not null default 'pending_review',
  verification_status public.verification_status not null default 'pending',
  internal_notes text,
  created_by uuid references public.admin_profiles(user_id),
  reviewed_by uuid references public.admin_profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint campaigns_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.campaign_payment_methods (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  receiving_category public.receiving_category not null,
  method_name text,
  currency char(3),
  account_holder text,
  transfer_instructions text not null,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaign_creator_access_links (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  token_hash text not null unique,
  label text,
  recipient_contact text,
  is_active boolean not null default true,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by uuid references public.admin_profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  public_code text not null unique default (
    'DON-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5))
  ),
  donor_name text,
  donor_contact text,
  is_anonymous boolean not null default false,
  amount numeric(14, 2) not null check (amount > 0),
  currency char(3) not null,
  amount_usd numeric(14, 2) check (amount_usd is null or amount_usd >= 0),
  payment_method_id uuid references public.campaign_payment_methods(id) on delete set null,
  transfer_reference text,
  transfer_date date,
  proof_file_path text,
  status public.donation_status not null default 'pending',
  public_message text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references public.admin_profiles(user_id),
  rejected_at timestamptz,
  rejected_by uuid references public.admin_profiles(user_id),
  rejection_reason text,
  constraint donations_verified_amount_usd check (
    status <> 'verified' or amount_usd is not null
  )
);

create table public.needs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  description text,
  category text,
  priority integer not null default 3 check (priority between 1 and 5),
  quantity integer not null default 1 check (quantity > 0),
  estimated_amount numeric(14, 2) check (
    estimated_amount is null or estimated_amount >= 0
  ),
  currency char(3) default 'USD',
  status public.need_status not null default 'open',
  is_public boolean not null default true,
  internal_notes text,
  created_by uuid references public.admin_profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  description text,
  category text,
  amount numeric(14, 2) not null check (amount >= 0),
  currency char(3) not null,
  amount_usd numeric(14, 2) check (amount_usd is null or amount_usd >= 0),
  purchase_date date,
  vendor text,
  invoice_file_path text,
  is_invoice_public boolean not null default false,
  photo_file_path text,
  is_photo_public boolean not null default false,
  status public.purchase_status not null default 'pending',
  admin_notes text,
  submitted_by_creator_access_id uuid references public.campaign_creator_access_links(id) on delete set null,
  created_by uuid references public.admin_profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.admin_profiles(user_id),
  rejected_at timestamptz,
  rejected_by uuid references public.admin_profiles(user_id),
  rejection_reason text,
  constraint purchases_approved_amount_usd check (
    status <> 'approved' or amount_usd is not null
  )
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

create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  event_type public.email_event_type not null,
  payload jsonb not null,
  status public.email_event_status not null default 'pending',
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  scheduled_at timestamptz default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_events_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint email_events_terminal_sent_at check (
    status <> 'sent' or sent_at is not null
  )
);

create index campaigns_status_slug_idx on public.campaigns(status, slug);
create index campaigns_verification_status_idx on public.campaigns(verification_status);
create index campaign_payment_methods_campaign_id_idx
  on public.campaign_payment_methods(campaign_id);
create index campaign_payment_methods_receiving_category_idx
  on public.campaign_payment_methods(receiving_category);
create index campaign_creator_access_links_campaign_id_idx
  on public.campaign_creator_access_links(campaign_id);
create index campaign_creator_access_links_active_idx
  on public.campaign_creator_access_links(is_active, expires_at);
create index donations_status_created_at_idx on public.donations(status, created_at desc);
create index donations_campaign_id_idx on public.donations(campaign_id);
create index donations_payment_method_id_idx on public.donations(payment_method_id);
create index needs_status_priority_idx on public.needs(status, priority, created_at desc);
create index needs_campaign_id_idx on public.needs(campaign_id);
create index purchases_status_purchase_date_idx
  on public.purchases(status, purchase_date desc);
create index purchases_campaign_id_idx on public.purchases(campaign_id);
create index purchase_items_purchase_id_idx on public.purchase_items(purchase_id);
create index email_events_status_scheduled_at_idx
  on public.email_events(status, scheduled_at, created_at);
create index email_events_created_at_idx on public.email_events(created_at desc);

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

create trigger set_campaign_payment_methods_updated_at
before update on public.campaign_payment_methods
for each row execute function public.set_updated_at();

create trigger set_campaign_creator_access_links_updated_at
before update on public.campaign_creator_access_links
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

create trigger set_email_events_updated_at
before update on public.email_events
for each row execute function public.set_updated_at();

create or replace function public.claim_email_events(batch_size integer default 8)
returns setof public.email_events
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select id
    from public.email_events
    where status in ('pending', 'retrying')
      and scheduled_at <= now()
      and (locked_at is null or locked_at < now() - interval '5 minutes')
      and attempts < max_attempts
    order by scheduled_at asc, created_at asc
    limit greatest(1, least(batch_size, 8))
    for update skip locked
  )
  update public.email_events email_event
  set
    attempts = email_event.attempts + 1,
    locked_at = now(),
    status = 'retrying',
    updated_at = now()
  from candidates
  where email_event.id = candidates.id
  returning email_event.*;
$$;

revoke all on function public.claim_email_events(integer) from public;
grant execute on function public.claim_email_events(integer) to service_role;

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
  select exists (
    select 1
    from public.campaigns
    where id = campaign_id
      and status in ('active', 'paused', 'completed')
      and verification_status = 'verified'
  );
$$;

create or replace function public.is_donatable_campaign(campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaigns
    where id = campaign_id
      and status = 'active'
      and verification_status = 'verified'
  );
$$;

create or replace function public.is_submittable_campaign(campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaigns
    where id = campaign_id
      and status in ('pending_review', 'draft')
      and verification_status in ('unverified', 'pending')
  );
$$;

create or replace function public.is_public_payment_method(payment_method_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_payment_methods pm
    where pm.id = payment_method_id
      and pm.is_active = true
      and public.is_donatable_campaign(pm.campaign_id)
  );
$$;

alter table public.admin_profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_payment_methods enable row level security;
alter table public.campaign_creator_access_links enable row level security;
alter table public.donations enable row level security;
alter table public.needs enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.email_events enable row level security;

create policy "admins can read admin profiles"
on public.admin_profiles for select
to authenticated
using (public.is_admin());

create policy "owners can manage admin profiles"
on public.admin_profiles for all
to authenticated
using (public.is_admin_with_role(array['owner']::public.admin_role[]))
with check (public.is_admin_with_role(array['owner']::public.admin_role[]));

create policy "anyone can submit campaign requests"
on public.campaigns for insert
to anon, authenticated
with check (
  status in ('pending_review', 'draft')
  and verification_status in ('unverified', 'pending')
  and created_by is null
  and published_at is null
  and reviewed_by is null
  and internal_notes is null
);

create policy "admins can manage campaigns"
on public.campaigns for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "anyone can submit payment methods with campaign requests"
on public.campaign_payment_methods for insert
to anon, authenticated
with check (public.is_submittable_campaign(campaign_id));

create policy "admins can manage payment methods"
on public.campaign_payment_methods for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins can manage creator access links"
on public.campaign_creator_access_links for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "anyone can submit pending donation reports"
on public.donations for insert
to anon, authenticated
with check (
  status = 'pending'
  and public.is_donatable_campaign(campaign_id)
  and (
    payment_method_id is null
    or public.is_public_payment_method(payment_method_id)
  )
  and verified_at is null
  and verified_by is null
  and rejected_at is null
  and rejected_by is null
  and rejection_reason is null
  and admin_notes is null
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
  c.id,
  c.slug,
  c.title,
  c.description,
  c.responsible_person_name,
  c.responsible_organization,
  c.instagram_handle,
  c.location,
  c.affected_area,
  c.cover_image_path,
  c.status,
  c.published_at,
  c.created_at,
  c.updated_at,
  coalesce(d.total_verified_donations, 0)::numeric(14, 2) as total_verified_donations_usd,
  coalesce(p.total_approved_purchases, 0)::numeric(14, 2) as total_approved_purchases_usd,
  (
    coalesce(d.total_verified_donations, 0)
    - coalesce(p.total_approved_purchases, 0)
  )::numeric(14, 2) as available_balance_usd
from public.campaigns c
left join (
  select campaign_id, sum(amount_usd) as total_verified_donations
  from public.donations
  where status = 'verified'
  group by campaign_id
) d on d.campaign_id = c.id
left join (
  select campaign_id, sum(amount_usd) as total_approved_purchases
  from public.purchases
  where status = 'approved'
  group by campaign_id
) p on p.campaign_id = c.id
where public.is_public_campaign(c.id);

create view public.public_campaign_payment_methods
with (security_barrier = true)
as
select
  pm.id,
  pm.campaign_id,
  pm.receiving_category,
  pm.method_name,
  pm.currency,
  pm.account_holder,
  pm.transfer_instructions,
  pm.notes,
  pm.created_at,
  pm.updated_at
from public.campaign_payment_methods pm
where pm.is_active = true
  and public.is_donatable_campaign(pm.campaign_id);

create view public.public_campaign_receiving_categories
with (security_barrier = true)
as
select distinct
  pm.campaign_id,
  pm.receiving_category
from public.campaign_payment_methods pm
where pm.is_active = true
  and public.is_public_campaign(pm.campaign_id);

create view public.public_donations
with (security_barrier = true)
as
select
  d.id,
  d.campaign_id,
  c.slug as campaign_slug,
  c.title as campaign_title,
  d.public_code,
  case
    when d.is_anonymous then 'Donante anonimo'
    else coalesce(nullif(d.donor_name, ''), 'Donante anonimo')
  end as donor_name,
  d.amount,
  d.currency,
  d.amount_usd,
  d.public_message,
  d.created_at,
  d.verified_at
from public.donations d
join public.campaigns c on c.id = d.campaign_id
where d.status = 'verified'
  and public.is_public_campaign(d.campaign_id);

create view public.public_purchases
with (security_barrier = true)
as
select
  p.id,
  p.campaign_id,
  c.slug as campaign_slug,
  c.title as campaign_title,
  p.title,
  p.description,
  p.category,
  p.amount,
  p.currency,
  p.amount_usd,
  p.purchase_date,
  p.vendor,
  p.is_invoice_public,
  case when p.is_invoice_public then p.invoice_file_path end as invoice_file_path,
  p.is_photo_public,
  case when p.is_photo_public then p.photo_file_path end as photo_file_path,
  p.created_at,
  p.approved_at
from public.purchases p
join public.campaigns c on c.id = p.campaign_id
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
  estimated_amount,
  currency,
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
  select campaign_id, sum(amount_usd) as total_verified_donations
  from public.donations
  where status = 'verified'
    and public.is_public_campaign(campaign_id)
  group by campaign_id
),
spent as (
  select campaign_id, sum(amount_usd) as total_approved_purchases
  from public.purchases
  where status = 'approved'
    and public.is_public_campaign(campaign_id)
  group by campaign_id
)
select
  c.id as campaign_id,
  c.slug as campaign_slug,
  c.title as campaign_title,
  'USD'::char(3) as reporting_currency,
  coalesce(d.total_verified_donations, 0)::numeric(14, 2) as total_verified_donations,
  coalesce(s.total_approved_purchases, 0)::numeric(14, 2) as total_approved_purchases,
  (
    coalesce(d.total_verified_donations, 0)
    - coalesce(s.total_approved_purchases, 0)
  )::numeric(14, 2) as available_balance
from public.campaigns c
left join donated d on d.campaign_id = c.id
left join spent s on s.campaign_id = c.id
where public.is_public_campaign(c.id);

grant select on public.public_campaigns to anon, authenticated;
grant select on public.public_campaign_payment_methods to anon, authenticated;
grant select on public.public_campaign_receiving_categories to anon, authenticated;
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
  ),
  (
    'campaign-assets',
    'campaign-assets',
    false,
    10485760,
    array['image/png', 'image/jpeg', 'image/webp']
  )
on conflict (id) do nothing;

create or replace function public.storage_campaign_id(object_name text)
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
        (object_name like '%/invoice/%' and p.is_invoice_public = true)
        or (object_name like '%/photo/%' and p.is_photo_public = true)
      )
  );
$$;

create policy "public can upload campaign assets for requests"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'campaign-assets'
  and (auth.role() = 'anon' or owner = auth.uid())
);

create policy "public can read public campaign assets"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'campaign-assets'
  and public.is_public_campaign(public.storage_campaign_id(storage.objects.name))
);

create policy "admins can manage campaign assets"
on storage.objects for all
to authenticated
using (
  bucket_id = 'campaign-assets'
  and public.is_admin()
)
with check (
  bucket_id = 'campaign-assets'
  and public.is_admin()
);

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

create policy "anyone can upload purchase documents"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'purchase-documents'
  and (auth.role() = 'anon' or owner = auth.uid())
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
