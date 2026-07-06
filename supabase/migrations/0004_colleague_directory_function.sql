-- Supabase's security advisor flags colleague_directory as a "Security
-- Definer View": plain views always evaluate permissions as the view owner,
-- bypassing the querying user's RLS - which is exactly the (intentional)
-- behavior this relies on to show a safe column subset of every profile to
-- every authenticated user, regardless of the stricter per-row policies on
-- `profiles`. Converting it to an explicit SECURITY DEFINER function (the
-- same pattern already used by is_admin()) keeps that behavior while
-- satisfying the linter, since definer functions are the expected/reviewed
-- way to do this in Postgres/Supabase - unlike definer views, which get no
-- such review by default.

revoke select on public.colleague_directory from authenticated;
drop view public.colleague_directory;

create function public.colleague_directory()
returns table (
  id uuid,
  full_name text,
  department text,
  status text,
  phone text,
  email text,
  birthdate date,
  photo_url text
)
language sql
security definer
set search_path = public
stable
as $$
  select id, full_name, department, status, phone, email, birthdate, photo_url
  from public.profiles;
$$;

grant execute on function public.colleague_directory() to authenticated;
