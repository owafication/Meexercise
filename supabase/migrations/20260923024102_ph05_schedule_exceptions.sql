-- PH-05 second scheduling slice: immutable per-occurrence skip/reschedule exceptions.
-- Exceptions are pinned to one exact schedule rule from one exact schedule version.
-- A later recurring schedule version intentionally starts with a fresh exception set.

create table public.plan_schedule_occurrence_exceptions (
  id uuid primary key default gen_random_uuid(),
  schedule_rule_id uuid not null
    references public.plan_schedule_rules(id) on delete cascade,
  original_local_date date not null,
  created_at timestamptz not null default now(),
  unique (schedule_rule_id, original_local_date)
);

create index plan_schedule_occurrence_exceptions_rule_date_idx
on public.plan_schedule_occurrence_exceptions (
  schedule_rule_id,
  original_local_date
);

create table public.plan_schedule_occurrence_exception_versions (
  id uuid primary key default gen_random_uuid(),
  exception_id uuid not null
    references public.plan_schedule_occurrence_exceptions(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  action text not null check (action in ('skip', 'reschedule', 'restore')),
  rescheduled_local_date date,
  rescheduled_window_start time without time zone,
  rescheduled_window_end time without time zone,
  created_at timestamptz not null default now(),
  unique (exception_id, version_number),
  check (
    (
      action = 'reschedule'
      and rescheduled_local_date is not null
      and rescheduled_window_start is not null
      and rescheduled_window_end is not null
      and rescheduled_window_start < rescheduled_window_end
    )
    or
    (
      action in ('skip', 'restore')
      and rescheduled_local_date is null
      and rescheduled_window_start is null
      and rescheduled_window_end is null
    )
  )
);

create index plan_schedule_occurrence_exception_versions_latest_idx
on public.plan_schedule_occurrence_exception_versions (
  exception_id,
  version_number desc
);

create trigger plan_schedule_occurrence_exceptions_protect_update
before update on public.plan_schedule_occurrence_exceptions
for each row execute function private.protect_plan_schedule_snapshot_update();

create trigger plan_schedule_occurrence_exception_versions_protect_update
before update on public.plan_schedule_occurrence_exception_versions
for each row execute function private.protect_plan_schedule_snapshot_update();

alter table public.plan_schedule_occurrence_exceptions enable row level security;
alter table public.plan_schedule_occurrence_exception_versions enable row level security;

revoke all on public.plan_schedule_occurrence_exceptions
from public, anon, authenticated;

revoke all on public.plan_schedule_occurrence_exception_versions
from public, anon, authenticated;

grant select on public.plan_schedule_occurrence_exceptions to authenticated;
grant select on public.plan_schedule_occurrence_exception_versions to authenticated;

create policy plan_schedule_occurrence_exceptions_select_owner
on public.plan_schedule_occurrence_exceptions
for select
to authenticated
using (
  exists (
    select 1
    from public.plan_schedule_rules psr
    join public.plan_schedule_versions psv
      on psv.id = psr.schedule_version_id
    join public.plan_schedules ps
      on ps.id = psv.schedule_id
    join public.plans p
      on p.id = ps.plan_id
    where psr.id = plan_schedule_occurrence_exceptions.schedule_rule_id
      and p.user_id = auth.uid()
  )
);

create policy plan_schedule_occurrence_exception_versions_select_owner
on public.plan_schedule_occurrence_exception_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.plan_schedule_occurrence_exceptions psoe
    join public.plan_schedule_rules psr
      on psr.id = psoe.schedule_rule_id
    join public.plan_schedule_versions psv
      on psv.id = psr.schedule_version_id
    join public.plan_schedules ps
      on ps.id = psv.schedule_id
    join public.plans p
      on p.id = ps.plan_id
    where psoe.id =
      plan_schedule_occurrence_exception_versions.exception_id
      and p.user_id = auth.uid()
  )
);

create or replace function public.save_plan_schedule_occurrence_exception(
  p_plan_id uuid,
  p_expected_schedule_version_number integer,
  p_original_local_date date,
  p_action text,
  p_expected_exception_version_number integer,
  p_rescheduled_local_date date,
  p_rescheduled_window_start time without time zone,
  p_rescheduled_window_end time without time zone
)
returns integer
language plpgsql
security definer
set search_path = public, auth, private, pg_catalog, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_owner uuid;
  v_schedule_id uuid;
  v_schedule_version_id uuid;
  v_schedule_version_number integer;
  v_schedule_starts_on date;
  v_schedule_paused boolean;
  v_rule_id uuid;
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_exception_id uuid;
  v_current_exception_version_number integer := 0;
  v_next_exception_version_number integer;
begin
  if v_user_id is null then
    raise exception 'authenticated user required'
      using errcode = '42501';
  end if;

  if p_expected_schedule_version_number is null
     or p_expected_schedule_version_number < 1
     or p_expected_exception_version_number is null
     or p_expected_exception_version_number < 0
     or p_original_local_date is null then
    raise exception 'occurrence exception version expectations are invalid'
      using errcode = '23514';
  end if;

  if v_action not in ('skip', 'reschedule', 'restore') then
    raise exception 'occurrence exception action is invalid'
      using errcode = '23514';
  end if;

  if v_action = 'reschedule' then
    if p_rescheduled_local_date is null
       or p_rescheduled_window_start is null
       or p_rescheduled_window_end is null
       or p_rescheduled_window_start >= p_rescheduled_window_end then
      raise exception 'rescheduled occurrence needs a valid date and time window'
        using errcode = '23514';
    end if;
  elsif p_rescheduled_local_date is not null
        or p_rescheduled_window_start is not null
        or p_rescheduled_window_end is not null then
    raise exception 'skip and restore actions cannot include a rescheduled window'
      using errcode = '23514';
  end if;

  select p.user_id, ps.id
  into v_plan_owner, v_schedule_id
  from public.plans p
  join public.plan_schedules ps on ps.plan_id = p.id
  where p.id = p_plan_id
  for update of ps;

  if v_plan_owner is null
     or v_plan_owner <> v_user_id
     or v_schedule_id is null then
    raise exception 'plan unavailable'
      using errcode = '42501';
  end if;

  select
    psv.id,
    psv.version_number,
    psv.starts_on,
    psv.is_paused
  into
    v_schedule_version_id,
    v_schedule_version_number,
    v_schedule_starts_on,
    v_schedule_paused
  from public.plan_schedule_versions psv
  where psv.schedule_id = v_schedule_id
  order by psv.version_number desc
  limit 1;

  if v_schedule_version_id is null then
    raise exception 'schedule unavailable'
      using errcode = '42501';
  end if;

  if v_schedule_version_number <> p_expected_schedule_version_number then
    raise exception 'schedule changed; reload before changing an occurrence'
      using errcode = '40001';
  end if;

  if v_schedule_paused then
    raise exception 'paused schedule has no current occurrences to change'
      using errcode = '23514';
  end if;

  if p_original_local_date < v_schedule_starts_on then
    raise exception 'original occurrence is before the schedule start date'
      using errcode = '23514';
  end if;

  select psr.id
  into v_rule_id
  from public.plan_schedule_rules psr
  where psr.schedule_version_id = v_schedule_version_id
    and psr.weekday =
      extract(isodow from p_original_local_date)::integer;

  if v_rule_id is null then
    raise exception 'original occurrence does not exist in the current schedule'
      using errcode = '23514';
  end if;

  select psoe.id
  into v_exception_id
  from public.plan_schedule_occurrence_exceptions psoe
  where psoe.schedule_rule_id = v_rule_id
    and psoe.original_local_date = p_original_local_date
  for update;

  if v_exception_id is null then
    if p_expected_exception_version_number <> 0 then
      raise exception 'occurrence exception changed; reload before saving'
        using errcode = '40001';
    end if;

    if v_action = 'restore' then
      raise exception 'there is no occurrence exception to restore'
        using errcode = '23514';
    end if;

    insert into public.plan_schedule_occurrence_exceptions (
      schedule_rule_id,
      original_local_date
    )
    values (
      v_rule_id,
      p_original_local_date
    )
    returning id into v_exception_id;
  else
    select coalesce(max(psoev.version_number), 0)
    into v_current_exception_version_number
    from public.plan_schedule_occurrence_exception_versions psoev
    where psoev.exception_id = v_exception_id;

    if v_current_exception_version_number <>
       p_expected_exception_version_number then
      raise exception 'occurrence exception changed; reload before saving'
        using errcode = '40001';
    end if;
  end if;

  v_next_exception_version_number :=
    p_expected_exception_version_number + 1;

  insert into public.plan_schedule_occurrence_exception_versions (
    exception_id,
    version_number,
    action,
    rescheduled_local_date,
    rescheduled_window_start,
    rescheduled_window_end
  )
  values (
    v_exception_id,
    v_next_exception_version_number,
    v_action,
    case when v_action = 'reschedule'
      then p_rescheduled_local_date else null end,
    case when v_action = 'reschedule'
      then p_rescheduled_window_start else null end,
    case when v_action = 'reschedule'
      then p_rescheduled_window_end else null end
  );

  return v_next_exception_version_number;
end;
$$;

revoke all on function public.save_plan_schedule_occurrence_exception(
  uuid,
  integer,
  date,
  text,
  integer,
  date,
  time without time zone,
  time without time zone
)
from public, anon, authenticated;

grant execute on function public.save_plan_schedule_occurrence_exception(
  uuid,
  integer,
  date,
  text,
  integer,
  date,
  time without time zone,
  time without time zone
)
to authenticated;

drop function public.get_my_plan_schedule_occurrences(
  timestamptz,
  timestamptz
);

create function public.get_my_plan_schedule_occurrences(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  plan_id uuid,
  plan_version_number integer,
  plan_title text,
  schedule_version_number integer,
  timezone_name text,
  local_date date,
  weekday integer,
  window_start time without time zone,
  window_end time without time zone,
  starts_at timestamptz,
  ends_at timestamptz,
  routine_version_id uuid,
  routine_version_number integer,
  routine_title text,
  original_local_date date,
  exception_id uuid,
  exception_version_number integer,
  occurrence_status text
)
language plpgsql
security definer
set search_path = public, auth, pg_catalog, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authenticated user required'
      using errcode = '42501';
  end if;

  if p_from is null
     or p_to is null
     or p_to <= p_from
     or p_to > p_from + interval '31 days' then
    raise exception 'schedule occurrence range must be greater than zero and at most 31 days'
      using errcode = '23514';
  end if;

  return query
  with current_schedules as (
    select distinct on (ps.id)
      ps.id as schedule_id,
      ps.plan_id,
      psv.id as schedule_version_id,
      psv.plan_version_id,
      psv.version_number as schedule_version_number,
      psv.timezone_name,
      psv.starts_on,
      psv.is_paused
    from public.plan_schedules ps
    join public.plans p on p.id = ps.plan_id
    join public.plan_schedule_versions psv on psv.schedule_id = ps.id
    where p.user_id = v_user_id
    order by ps.id, psv.version_number desc
  ),
  latest_exception_versions as (
    select distinct on (psoe.id)
      psoe.id as exception_id,
      psoe.schedule_rule_id,
      psoe.original_local_date,
      psoev.version_number as exception_version_number,
      psoev.action,
      psoev.rescheduled_local_date,
      psoev.rescheduled_window_start,
      psoev.rescheduled_window_end
    from public.plan_schedule_occurrence_exceptions psoe
    join public.plan_schedule_occurrence_exception_versions psoev
      on psoev.exception_id = psoe.id
    order by psoe.id, psoev.version_number desc
  ),
  schedule_dates as (
    select
      current_schedules.*,
      generated.local_day::date as local_date
    from current_schedules
    cross join lateral generate_series(
      greatest(
        current_schedules.starts_on,
        (p_from at time zone current_schedules.timezone_name)::date
      )::timestamp,
      ((p_to at time zone current_schedules.timezone_name)::date)::timestamp,
      interval '1 day'
    ) as generated(local_day)
    where not current_schedules.is_paused
  ),
  ordinary_occurrences as (
    select
      sd.plan_id,
      sd.plan_version_id,
      sd.schedule_version_number,
      sd.timezone_name,
      sd.local_date,
      psr.weekday::integer as weekday,
      psr.window_start,
      psr.window_end,
      (sd.local_date + psr.window_start)
        at time zone sd.timezone_name as starts_at,
      (sd.local_date + psr.window_end)
        at time zone sd.timezone_name as ends_at,
      psr.routine_version_id,
      sd.local_date as original_local_date,
      lev.exception_id,
      coalesce(lev.exception_version_number, 0)::integer
        as exception_version_number,
      'scheduled'::text as occurrence_status
    from schedule_dates sd
    join public.plan_schedule_rules psr
      on psr.schedule_version_id = sd.schedule_version_id
     and psr.weekday =
       extract(isodow from sd.local_date)::integer
    left join latest_exception_versions lev
      on lev.schedule_rule_id = psr.id
     and lev.original_local_date = sd.local_date
    where (lev.action is null or lev.action = 'restore')
      and (sd.local_date + psr.window_start)
        at time zone sd.timezone_name >= p_from
      and (sd.local_date + psr.window_start)
        at time zone sd.timezone_name < p_to
  ),
  rescheduled_occurrences as (
    select
      cs.plan_id,
      cs.plan_version_id,
      cs.schedule_version_number,
      cs.timezone_name,
      lev.rescheduled_local_date as local_date,
      extract(isodow from lev.rescheduled_local_date)::integer as weekday,
      lev.rescheduled_window_start as window_start,
      lev.rescheduled_window_end as window_end,
      (lev.rescheduled_local_date + lev.rescheduled_window_start)
        at time zone cs.timezone_name as starts_at,
      (lev.rescheduled_local_date + lev.rescheduled_window_end)
        at time zone cs.timezone_name as ends_at,
      psr.routine_version_id,
      lev.original_local_date,
      lev.exception_id,
      lev.exception_version_number,
      'rescheduled'::text as occurrence_status
    from current_schedules cs
    join public.plan_schedule_rules psr
      on psr.schedule_version_id = cs.schedule_version_id
    join latest_exception_versions lev
      on lev.schedule_rule_id = psr.id
     and lev.action = 'reschedule'
    where not cs.is_paused
      and lev.original_local_date >= cs.starts_on
      and psr.weekday =
        extract(isodow from lev.original_local_date)::integer
      and (lev.rescheduled_local_date + lev.rescheduled_window_start)
        at time zone cs.timezone_name >= p_from
      and (lev.rescheduled_local_date + lev.rescheduled_window_start)
        at time zone cs.timezone_name < p_to
  ),
  effective_occurrences as (
    select * from ordinary_occurrences
    union all
    select * from rescheduled_occurrences
  )
  select
    eo.plan_id,
    pv.version_number,
    pv.title,
    eo.schedule_version_number,
    eo.timezone_name,
    eo.local_date,
    eo.weekday,
    eo.window_start,
    eo.window_end,
    eo.starts_at,
    eo.ends_at,
    rv.id,
    rv.version_number,
    rv.title,
    eo.original_local_date,
    eo.exception_id,
    eo.exception_version_number,
    eo.occurrence_status
  from effective_occurrences eo
  join public.plan_versions pv on pv.id = eo.plan_version_id
  join public.routine_versions rv on rv.id = eo.routine_version_id
  order by 10, 1, 12;
end;
$$;

revoke all on function public.get_my_plan_schedule_occurrences(
  timestamptz,
  timestamptz
)
from public, anon, authenticated;

grant execute on function public.get_my_plan_schedule_occurrences(
  timestamptz,
  timestamptz
)
to authenticated;

comment on table public.plan_schedule_occurrence_exceptions is
  'Stable identity for one owner occurrence exception pinned to one exact schedule rule and original local date.';

comment on table public.plan_schedule_occurrence_exception_versions is
  'Immutable append-only skip/reschedule/restore history for one exact scheduled occurrence.';
