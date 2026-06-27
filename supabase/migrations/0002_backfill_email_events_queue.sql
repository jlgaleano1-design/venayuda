do $$
begin
  create type public.email_event_status as enum (
    'pending',
    'retrying',
    'sent',
    'failed'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.email_event_type as enum (
    'campaign_approved',
    'campaign_review',
    'donation_confirmation',
    'donation_report',
    'purchase_impact',
    'purchase_review'
  );
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.email_events (
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

create index if not exists email_events_status_scheduled_at_idx
  on public.email_events(status, scheduled_at, created_at);
create index if not exists email_events_created_at_idx
  on public.email_events(created_at desc);

drop trigger if exists set_email_events_updated_at on public.email_events;
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

alter table public.email_events enable row level security;
