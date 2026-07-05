-- Default onboarding content from the spec (section 2). Content is fully
-- editable afterwards from the admin panel - this just seeds a sensible
-- starting point so the app isn't empty on first run.

insert into public.stages (key, title, sort_order) values
  ('pre_boarding', 'Pre-boarding', 1),
  ('day_1', 'Day 1', 2),
  ('week_1', 'Week 1', 3),
  ('30_days', '30 Days', 4),
  ('60_days', '60 Days', 5),
  ('90_days', '90 Days', 6);

insert into public.checklist_items (stage_id, title, sort_order)
select s.id, i.title, i.sort_order
from public.stages s
join (values
  ('pre_boarding', 'Welcome package (document/letter)', 1),
  ('pre_boarding', 'Access checklist (email, phone, groups, equipment)', 2),
  ('pre_boarding', 'Ready for Day 1', 3),
  ('day_1', 'Welcome module (video/presentation)', 1),
  ('day_1', 'Meet the team', 2),
  ('day_1', 'Mentor assigned', 3),
  ('week_1', 'System modules (internal tools, CRM, etc.)', 1),
  ('week_1', 'Workstation setup', 2),
  ('week_1', 'Information security training (test/checklist)', 3),
  ('30_days', 'Role processes and responsibilities', 1),
  ('30_days', 'Study SLAs', 2),
  ('30_days', '30-day check-in (with manager/HR)', 3),
  ('60_days', 'Specialized modules', 1),
  ('60_days', 'Independent tasks', 2),
  ('60_days', '60-day check-in', 3),
  ('90_days', 'Final modules', 1),
  ('90_days', 'Final check-in', 2),
  ('90_days', 'Probation period review', 3)
) as i(stage_key, title, sort_order) on i.stage_key = s.key;
