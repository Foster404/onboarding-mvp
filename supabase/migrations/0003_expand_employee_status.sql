-- Adds "On maternity leave" and "Resigned" as additional employee statuses,
-- alongside the existing "At work" (working) and "On vacation" (vacation).

alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('working', 'vacation', 'maternity_leave', 'resigned'));
