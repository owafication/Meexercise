-- PH-05 third scheduling slice: immutable in-app reminder settings.
-- Reminder lead time belongs to an exact schedule version.
-- Background push/email/SMS delivery is intentionally not introduced.

create table public.plan_schedule_reminder_settings (
  schedule_version_id uuid primary key
    references public.plan_schedule_versions(id) on delete cascade,
  minutes_before integer not null
    check (minutes_before between 15 and 10080),
  created_at timestamptz not null default now()
);

create trigger plan_schedule_reminder_settings_protect_update
before update on public.plan_schedule_reminder_settings
for each row execute function private.protect_plan_schedule_snapshot_update();

alter table public.plan_schedule_reminder_settings enable row level security;

revoke all on public.plan_schedule_reminder_settings
from public, anon, authenticated;

grant select on public.plan_schedule_reminder_settings to authenticated;

create policy plan_schedule_reminder_settings_select_owner
on public.plan_schedule_reminder_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.plan_schedule_versions psv
    join public.plan_schedules ps on ps.id = psv.schedule_id
    join public.plans p on p.id = ps.plan_id
    where psv.id = plan_schedule_reminder_settings.schedule_version_id
      and p.user_id = auth.uid()
  )
);

create or replace function public.save_plan_schedule_with_reminder(
  p_plan_id uuid,
  p_expected_plan_version_number integer,
  p_expected_schedule_version_number integer,
  p_timezone_name text,
  p_starts_on date,
  p_is_paused boolean,
  p_rules jsonb,
  p_reminder_minutes_before integer
)
returns integer
language plpgsql
security definer
set search_path = public, auth, private, pg_catalog, pg_temp
as $$
declare
  v_next_schedule_version_number integer;
  v_schedule_version_id uuid;
begin
  if p_reminder_minutes_before is not null
     and (
       p_reminder_minutes_before < 15
       or p_reminder_minutes_before > 10080
     ) then
    raise exception 'schedule reminder lead time must be between 15 and 10080 minutes'
      using errcode = '23514';
  end if;

  v_next_schedule_version_number := public.save_plan_schedule(
    p_plan_id,
    p_expected_plan_version_number,
    p_expected_schedule_version_number,
    p_timezone_name,
    p_starts_on,
    p_is_paused,
    p_rules
  );

  if p_reminder_minutes_before is not null then
    select psv.id
    into v_schedule_version_id
    from public.plan_schedules ps
    join public.plan_schedule_versions psv
      on psv.schedule_id = ps.id
    where ps.plan_id = p_plan_id
      and psv.version_number = v_next_schedule_version_number;

    if v_schedule_version_id is null then
      raise exception 'saved schedule version could not be resolved'
        using errcode = '55000';
    end if;

    insert into public.plan_schedule_reminder_settings (
      schedule_version_id,
      minutes_before
    )
    values (
      v_schedule_version_id,
      p_reminder_minutes_before
    );
  end if;

  return v_next_schedule_version_number;
end;
$$;

revoke all on function public.save_plan_schedule_with_reminder(
  uuid,
  integer,
  integer,
  text,
  date,
  boolean,
  jsonb,
  integer
)
from public, anon, authenticated;

grant execute on function public.save_plan_schedule_with_reminder(
  uuid,
  integer,
  integer,
  text,
  date,
  boolean,
  jsonb,
  integer
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
  occurrence_status text,
  reminder_minutes_before integer,
  reminder_at timestamptz
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
      sd.schedule_version_id,
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
      cs.schedule_version_id,
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
    eo.occurrence_status,
    psrs.minutes_before,
    case
      when psrs.minutes_before is null then null
      else eo.starts_at - (psrs.minutes_before * interval '1 minute')
    end
  from effective_occurrences eo
  join public.plan_versions pv on pv.id = eo.plan_version_id
  join public.routine_versions rv on rv.id = eo.routine_version_id
  left join public.plan_schedule_reminder_settings psrs
    on psrs.schedule_version_id = eo.schedule_version_id
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

comment on table public.plan_schedule_reminder_settings is
  'Immutable optional in-app reminder lead time for one exact schedule version.';
