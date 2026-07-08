-- Prevent duplicate employee emails at the database level.
alter table public.profiles
  add constraint profiles_email_unique unique (email);

-- Let admins upload/replace any employee's avatar (previously only the
-- employee themselves could write to their own avatars/ folder).
create policy "avatars_admin_write" on storage.objects
  for insert with check (bucket_id = 'avatars' and public.is_admin());

create policy "avatars_admin_update" on storage.objects
  for update using (bucket_id = 'avatars' and public.is_admin());
