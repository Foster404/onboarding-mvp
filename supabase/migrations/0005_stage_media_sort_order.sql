-- Explicit manual ordering for stage media, independent of insertion time or
-- title. Backfilled from created_at (oldest first) so existing content keeps
-- its current chronological order; new items append after the current max.

alter table public.stage_media
  add column if not exists sort_order integer;

with ranked as (
  select id, row_number() over (partition by stage_id order by created_at asc) as rn
  from public.stage_media
)
update public.stage_media m
set sort_order = ranked.rn
from ranked
where m.id = ranked.id
  and m.sort_order is null;

alter table public.stage_media
  alter column sort_order set not null,
  alter column sort_order set default 0;
