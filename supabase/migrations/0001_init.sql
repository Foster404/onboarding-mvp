-- Employee Onboarding MVP - initial schema, RLS policies, and storage buckets.
-- Run this once in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  department text,
  role text not null default 'employee' check (role in ('employee', 'admin')),
  status text not null default 'working' check (status in ('working', 'vacation')),
  birthdate date,
  photo_url text,
  phone text,
  vacation_days_remaining integer not null default 0,
  onboarding_start_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.stages (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  title text not null,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages (id) on delete cascade,
  title text not null,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create table public.stage_media (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages (id) on delete cascade,
  type text not null check (type in ('video', 'presentation')),
  title text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create table public.employee_progress (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  checklist_item_id uuid not null references public.checklist_items (id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (profile_id, checklist_item_id)
);

-- Column subset safe for the colleagues directory - excludes vacation days,
-- role, and onboarding date (email/phone are shown as work contact info per
-- spec). Runs as the view owner so it can expose these columns to every
-- authenticated user regardless of the stricter row-level policies on
-- `profiles` below.
create view public.colleague_directory as
  select id, full_name, department, status, phone, email, birthdate, photo_url
  from public.profiles;

-- ---------------------------------------------------------------------------
-- Helper: is_admin() - security definer so it can read `profiles` without
-- triggering RLS recursion when used inside `profiles` policies themselves.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Guard against privilege escalation: an employee updating their own row
-- (photo/birthdate) must not be able to change role, vacation days, status,
-- department, name, email, or start date - only admins can change those.
-- RLS alone is row-level, not column-level, so this is enforced with a
-- trigger regardless of which client path performs the update.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_profile_update_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
    or new.vacation_days_remaining is distinct from old.vacation_days_remaining
    or new.status is distinct from old.status
    or new.department is distinct from old.department
    or new.full_name is distinct from old.full_name
    or new.email is distinct from old.email
    or new.onboarding_start_date is distinct from old.onboarding_start_date
  then
    raise exception 'Only an admin can change this field';
  end if;

  return new;
end;
$$;

create trigger profiles_enforce_update_scope
  before update on public.profiles
  for each row execute function public.enforce_profile_update_scope();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.stages enable row level security;
alter table public.checklist_items enable row level security;
alter table public.stage_media enable row level security;
alter table public.employee_progress enable row level security;

-- profiles: only self or admin can read/write the full row (colleagues use
-- the `colleague_directory` view instead, which is not subject to these).
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_admin_only" on public.profiles
  for insert with check (public.is_admin());

create policy "profiles_delete_admin_only" on public.profiles
  for delete using (public.is_admin());

grant select on public.colleague_directory to authenticated;

-- stages / checklist_items / stage_media: readable by any signed-in user,
-- writable only by admins.
create policy "stages_select_authenticated" on public.stages
  for select using (auth.role() = 'authenticated');
create policy "stages_write_admin_only" on public.stages
  for all using (public.is_admin()) with check (public.is_admin());

create policy "checklist_items_select_authenticated" on public.checklist_items
  for select using (auth.role() = 'authenticated');
create policy "checklist_items_write_admin_only" on public.checklist_items
  for all using (public.is_admin()) with check (public.is_admin());

create policy "stage_media_select_authenticated" on public.stage_media
  for select using (auth.role() = 'authenticated');
create policy "stage_media_write_admin_only" on public.stage_media
  for all using (public.is_admin()) with check (public.is_admin());

-- employee_progress: an employee only ever touches their own rows; admins
-- can read everyone's for the monitoring dashboard.
create policy "employee_progress_select_own_or_admin" on public.employee_progress
  for select using (profile_id = auth.uid() or public.is_admin());

create policy "employee_progress_insert_own_or_admin" on public.employee_progress
  for insert with check (profile_id = auth.uid() or public.is_admin());

create policy "employee_progress_update_own_or_admin" on public.employee_progress
  for update using (profile_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- avatars: anyone can view (public bucket); a user may only write into a
-- path prefixed with their own uid, e.g. avatars/<uid>/photo.jpg
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_own_folder_write" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_own_folder_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- media (stage videos/presentations): public read, admin-only write
create policy "media_public_read" on storage.objects
  for select using (bucket_id = 'media');

create policy "media_admin_write" on storage.objects
  for insert with check (bucket_id = 'media' and public.is_admin());

create policy "media_admin_update" on storage.objects
  for update using (bucket_id = 'media' and public.is_admin());

create policy "media_admin_delete" on storage.objects
  for delete using (bucket_id = 'media' and public.is_admin());
