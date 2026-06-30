-- Campaigns can now be public before admin verification. Payment methods and
-- copy tracking should follow the public campaign rule so a newly published
-- campaign is actually donatable.

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
      and verification_status in ('pending', 'unverified', 'verified')
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

create or replace view public.public_campaign_payment_methods
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

grant select on public.public_campaign_payment_methods to anon, authenticated;
