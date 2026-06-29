drop view if exists public.public_donations;

create view public.public_donations
with (security_barrier = true)
as
select
  d.id,
  d.campaign_id,
  c.slug as campaign_slug,
  c.title as campaign_title,
  d.public_code,
  d.status,
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
where d.status in ('pending', 'verified')
  and public.is_public_campaign(d.campaign_id);

grant select on public.public_donations to anon, authenticated;
