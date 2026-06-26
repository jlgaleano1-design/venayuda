create extension if not exists "pgcrypto";

create type public.admin_role as enum ('owner', 'admin', 'reviewer');
create type public.donation_status as enum ('pending', 'validated', 'rejected');
create type public.need_status as enum ('open', 'partially_funded', 'purchased', 'cancelled');
create type public.purchase_status as enum ('draft', 'approved', 'rejected');

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.admin_role not null default 'reviewer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.donations (
  id uuid primary key default gen_random_uuid(),
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
create index donations_reporting_currency_idx on public.donations(reporting_currency);
create index needs_status_priority_idx on public.needs(status, priority, created_at desc);
create index purchases_status_purchased_at_idx on public.purchases(status, purchased_at desc);
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

alter table public.admin_profiles enable row level security;
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

create policy "anyone can create pending donations"
on public.donations for insert
to anon, authenticated
with check (
  status = 'pending'
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

create view public.public_donations
with (security_barrier = true)
as
select
  id,
  coalesce(nullif(donor_display_name, ''), 'Donante anonimo') as donor_name,
  amount,
  currency,
  reporting_amount,
  reporting_currency,
  transferred_at,
  reference_last4,
  created_at
from public.donations
where status = 'validated';

create view public.public_purchases
with (security_barrier = true)
as
select
  id,
  purchased_at,
  vendor,
  description,
  total_amount,
  currency,
  reporting_amount,
  reporting_currency,
  invoice_is_public,
  photo_is_public,
  created_at
from public.purchases
where status = 'approved';

create view public.public_purchase_items
with (security_barrier = true)
as
select
  pi.id,
  pi.purchase_id,
  pi.need_id,
  pi.description,
  pi.quantity,
  pi.unit_amount,
  pi.total_amount,
  pi.created_at
from public.purchase_items pi
join public.purchases p on p.id = pi.purchase_id
where p.status = 'approved';

create view public.public_needs
with (security_barrier = true)
as
select
  id,
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
  and status in ('open', 'partially_funded');

create view public.public_ledger_summary
with (security_barrier = true)
as
select
  coalesce(d.reporting_currency, p.reporting_currency, 'MXN') as reporting_currency,
  coalesce(d.total_donated, 0)::numeric(14, 2) as total_donated,
  coalesce(p.total_spent, 0)::numeric(14, 2) as total_spent,
  (coalesce(d.total_donated, 0) - coalesce(p.total_spent, 0))::numeric(14, 2) as available_balance
from (
  select reporting_currency, sum(reporting_amount) as total_donated
  from public.donations
  where status = 'validated'
  group by reporting_currency
) d
full join (
  select reporting_currency, sum(reporting_amount) as total_spent
  from public.purchases
  where status = 'approved'
  group by reporting_currency
) p using (reporting_currency);

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
