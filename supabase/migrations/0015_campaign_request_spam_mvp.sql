alter table public.campaign_request_audit_events
  add column if not exists risk_flags text[] not null default '{}',
  add column if not exists turnstile_outcome text,
  add column if not exists rate_limit_key text;

alter table public.campaign_request_audit_events
  drop constraint if exists campaign_request_audit_events_event_type_check;

alter table public.campaign_request_audit_events
  add constraint campaign_request_audit_events_event_type_check
  check (event_type in ('created', 'blocked', 'suspicious'));

create table public.campaign_request_rate_limits (
  action text not null,
  bucket_key text not null,
  window_start timestamptz not null,
  attempt_count integer not null default 1 check (attempt_count > 0),
  first_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (action, bucket_key, window_start)
);

create index campaign_request_rate_limits_updated_at_idx
on public.campaign_request_rate_limits(updated_at desc);

alter table public.campaign_request_rate_limits enable row level security;

create policy "admins can read campaign request rate limits"
on public.campaign_request_rate_limits for select
to authenticated
using (public.is_admin());

create policy "service role can manage campaign request rate limits"
on public.campaign_request_rate_limits for all
to service_role
using (true)
with check (true);

do $$
begin
  alter type public.email_event_type add value if not exists 'campaign_spam_alert';
exception
  when duplicate_object then null;
end;
$$;
