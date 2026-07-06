-- Adds an independently editable probation end date. It defaults to
-- start date + 90 days when an employee is created, but an admin can
-- later override it to any date (e.g. an extended or shortened probation).

alter table public.profiles
  add column if not exists probation_end_date date;

update public.profiles
  set probation_end_date = onboarding_start_date + interval '90 days'
  where probation_end_date is null;

alter table public.profiles
  alter column probation_end_date set not null;

-- Re-guard the new column the same way onboarding_start_date and the other
-- HR-managed fields are guarded: only an admin can change it.
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
    or new.probation_end_date is distinct from old.probation_end_date
  then
    raise exception 'Only an admin can change this field';
  end if;

  return new;
end;
$$;
