-- Campaign requests should become public immediately. Admin review only upgrades
-- verification_status to verified; it should not be required for publication.

update public.campaigns
set
  status = 'active',
  verification_status = 'pending',
  published_at = coalesce(published_at, created_at, now()),
  updated_at = now()
where status = 'pending_review'
  and verification_status in ('pending', 'unverified');

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
      and verification_status in ('pending', 'unverified', 'verified')
  );
$$;

create or replace view public.public_campaigns
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
  )::numeric(14, 2) as available_balance_usd,
  c.verification_status,
  (c.created_by is not null) as created_by_admin,
  (c.reviewed_by is not null) as reviewed_by_admin
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
