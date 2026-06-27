drop view if exists public.public_ledger_summary;
drop view if exists public.public_purchase_items;
drop view if exists public.public_purchases;
drop view if exists public.public_donations;
drop view if exists public.public_campaign_receiving_categories;
drop view if exists public.public_campaign_payment_methods;
drop view if exists public.public_campaigns;

alter table public.donations
  drop constraint if exists donations_verified_amount_usd;

alter table public.purchases
  drop constraint if exists purchases_approved_amount_usd;

alter table public.donations
  rename column amount to amount_original;

alter table public.donations
  rename column currency to currency_original;

alter table public.donations
  rename column amount_usd to amount_usd_estimated;

alter table public.purchases
  rename column amount to amount_original;

alter table public.purchases
  rename column currency to currency_original;

alter table public.purchases
  rename column amount_usd to amount_usd_estimated;

alter table public.donations
  alter column currency_original type text using trim(currency_original::text),
  add column exchange_rate_used numeric(18, 8) check (
    exchange_rate_used is null or exchange_rate_used >= 0
  ),
  add column exchange_rate_date date,
  add column exchange_rate_source text,
  add column conversion_notes text,
  add constraint donations_verified_amount_usd_estimated check (
    status <> 'verified' or amount_usd_estimated is not null
  );

alter table public.purchases
  alter column currency_original type text using trim(currency_original::text),
  add column exchange_rate_used numeric(18, 8) check (
    exchange_rate_used is null or exchange_rate_used >= 0
  ),
  add column exchange_rate_date date,
  add column exchange_rate_source text,
  add column conversion_notes text,
  add constraint purchases_approved_amount_usd_estimated check (
    status <> 'approved' or amount_usd_estimated is not null
  );

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
  select campaign_id, sum(amount_usd_estimated) as total_verified_donations
  from public.donations
  where status = 'verified'
    and amount_usd_estimated is not null
  group by campaign_id
) d on d.campaign_id = c.id
left join (
  select campaign_id, sum(amount_usd_estimated) as total_approved_purchases
  from public.purchases
  where status = 'approved'
    and amount_usd_estimated is not null
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
  d.amount_original,
  d.currency_original,
  d.amount_usd_estimated,
  d.exchange_rate_used,
  d.exchange_rate_date,
  d.exchange_rate_source,
  d.conversion_notes,
  d.public_message,
  d.created_at,
  d.verified_at
from public.donations d
join public.campaigns c on c.id = d.campaign_id
where d.status = 'verified'
  and d.amount_usd_estimated is not null
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
  p.amount_original,
  p.currency_original,
  p.amount_usd_estimated,
  p.exchange_rate_used,
  p.exchange_rate_date,
  p.exchange_rate_source,
  p.conversion_notes,
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
  and p.amount_usd_estimated is not null
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

create view public.public_ledger_summary
with (security_barrier = true)
as
with donated as (
  select campaign_id, sum(amount_usd_estimated) as total_verified_donations
  from public.donations
  where status = 'verified'
    and amount_usd_estimated is not null
    and public.is_public_campaign(campaign_id)
  group by campaign_id
),
spent as (
  select campaign_id, sum(amount_usd_estimated) as total_approved_purchases
  from public.purchases
  where status = 'approved'
    and amount_usd_estimated is not null
    and public.is_public_campaign(campaign_id)
  group by campaign_id
)
select
  c.id as campaign_id,
  c.slug as campaign_slug,
  c.title as campaign_title,
  'USD'::text as reporting_currency,
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
