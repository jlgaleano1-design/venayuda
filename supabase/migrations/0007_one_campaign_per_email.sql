alter table public.campaigns
add column if not exists contact_email text;

with extracted_contact_emails as (
  select
    id,
    lower(
      substring(
        contact_info from '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
      )
    ) as contact_email,
    row_number() over (
      partition by lower(
        substring(
          contact_info from '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
        )
      )
      order by created_at asc, id asc
    ) as email_rank
  from public.campaigns
  where contact_email is null
    and contact_info is not null
)
update public.campaigns
set contact_email = extracted_contact_emails.contact_email
from extracted_contact_emails
where campaigns.id = extracted_contact_emails.id
  and extracted_contact_emails.contact_email is not null
  and extracted_contact_emails.email_rank = 1;

with ranked_contact_emails as (
  select
    id,
    row_number() over (
      partition by lower(contact_email)
      order by created_at asc, id asc
    ) as email_rank
  from public.campaigns
  where contact_email is not null
)
update public.campaigns
set contact_email = null
from ranked_contact_emails
where campaigns.id = ranked_contact_emails.id
  and ranked_contact_emails.email_rank > 1;

do $$
begin
  alter table public.campaigns
  add constraint campaigns_contact_email_format
  check (
    contact_email is null
    or (
      contact_email = lower(contact_email)
      and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  );
exception
  when duplicate_object then null;
end $$;

create unique index if not exists campaigns_contact_email_unique
on public.campaigns(lower(contact_email))
where contact_email is not null;
