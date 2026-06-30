create table public.campaign_request_audit_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  contact_email text,
  event_type text not null check (event_type in ('created', 'blocked')),
  ip_address inet,
  ip_hash text,
  slug text,
  instagram_handle text,
  user_agent text,
  block_reason text,
  created_at timestamptz not null default now()
);

create table public.campaign_request_blocks (
  id uuid primary key default gen_random_uuid(),
  block_type text not null check (
    block_type in ('ip', 'email', 'email_domain', 'slug', 'instagram_handle')
  ),
  block_value text not null,
  reason text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (block_type, block_value)
);

create index campaign_request_audit_events_campaign_id_idx
on public.campaign_request_audit_events(campaign_id);

create index campaign_request_audit_events_created_at_idx
on public.campaign_request_audit_events(created_at desc);

create index campaign_request_audit_events_ip_hash_idx
on public.campaign_request_audit_events(ip_hash);

create index campaign_request_blocks_active_lookup_idx
on public.campaign_request_blocks(block_type, block_value)
where is_active;

alter table public.campaign_request_audit_events enable row level security;
alter table public.campaign_request_blocks enable row level security;

create policy "admins can read campaign request audit events"
on public.campaign_request_audit_events for select
to authenticated
using (public.is_admin());

create policy "admins can manage campaign request blocks"
on public.campaign_request_blocks for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "service role can manage campaign request audit events"
on public.campaign_request_audit_events for all
to service_role
using (true)
with check (true);

create policy "service role can manage campaign request blocks"
on public.campaign_request_blocks for all
to service_role
using (true)
with check (true);
