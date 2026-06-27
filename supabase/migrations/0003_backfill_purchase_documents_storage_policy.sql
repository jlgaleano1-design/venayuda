insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'purchase-documents',
  'purchase-documents',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anyone can upload purchase documents" on storage.objects;
create policy "anyone can upload purchase documents"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'purchase-documents'
  and (auth.role() = 'anon' or owner = auth.uid())
);
