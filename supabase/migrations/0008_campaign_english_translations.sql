alter table public.campaigns
  add column if not exists title_en text,
  add column if not exists description_en text;

drop view if exists public.public_campaigns;

create view public.public_campaigns
with (security_barrier = true)
as
select
  c.id,
  c.slug,
  c.title,
  c.title_en,
  c.description,
  c.description_en,
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

grant select on public.public_campaigns to anon, authenticated;
