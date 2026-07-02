alter table public.purchases
  drop constraint if exists purchases_approved_amount_usd_estimated;

alter table public.purchases
  alter column amount_original drop not null;

create or replace view public.public_purchases
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
  and public.is_public_campaign(p.campaign_id);

grant select on public.public_purchases to anon, authenticated;
