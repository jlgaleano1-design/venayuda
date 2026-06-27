alter table public.campaigns
add column if not exists contact_email text;

update public.campaigns
set contact_email = lower(
  substring(
    contact_info from '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
  )
)
where contact_email is null
  and contact_info is not null;

alter table public.campaigns
add constraint campaigns_contact_email_format
check (
  contact_email is null
  or (
    contact_email = lower(contact_email)
    and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  )
);

create unique index campaigns_contact_email_unique
on public.campaigns(lower(contact_email))
where contact_email is not null;
