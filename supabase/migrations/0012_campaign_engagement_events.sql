create table public.campaign_engagement_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  event_type text not null check (
    event_type in ('campaign_view', 'payment_method_copy')
  ),
  payment_method_id uuid references public.campaign_payment_methods(id) on delete set null,
  daily_visitor_hash text not null,
  referrer_host text,
  path text,
  locale text check (locale is null or locale in ('es', 'en')),
  event_day date not null default (timezone('utc', now())::date),
  created_at timestamptz not null default now()
);

create index campaign_engagement_events_campaign_created_idx
on public.campaign_engagement_events(campaign_id, created_at desc);

create index campaign_engagement_events_type_created_idx
on public.campaign_engagement_events(event_type, created_at desc);

create unique index campaign_engagement_unique_daily_views_idx
on public.campaign_engagement_events(campaign_id, event_type, daily_visitor_hash, event_day)
where event_type = 'campaign_view';

alter table public.campaign_engagement_events enable row level security;

create policy "admins can read campaign engagement events"
on public.campaign_engagement_events for select
to authenticated
using (public.is_admin());

create policy "service role can manage campaign engagement events"
on public.campaign_engagement_events for all
to service_role
using (true)
with check (true);
