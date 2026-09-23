-- PH-05 first slice: owner-private versioned weekly plan schedules.
-- Each schedule version pins one exact plan version and exact routine versions.
-- Pause is versioned. Per-occurrence skip/reschedule and reminders remain later PH-05 work.

create table public.plan_schedules (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null unique references public.plans(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.plan_schedule_versions (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.plan_schedules(id) on delete cascade,
  plan_version_id uuid not null references public.plan_versions(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  timezone_name text not null check (
    char_length(btrim(timezone_name)) between 1 and 64
  ),
  starts_on date not null,
  is_paused boolean not null default false,
  created_at timestamptz not null default now(),
  unique (schedule_id, version_number)
);

create index plan_schedule_versions_schedule_version_idx
on public.plan_schedule_versions (schedule_id, version_number desc);

create table public.plan_schedule_rules (
  id uuid primary key default gen_random_uuid(),
  schedule_version_id uuid not null
    references public.plan_schedule_versions(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  window_start time without time zone not null,
  window_end time without time zone not null,
  routine_version_id uuid not null references public.routine_versions(id) on delete cascade,
  check (window_start < window_end),
  unique (schedule_version_id, weekday)
);

create index plan_schedule_rules_routine_version_idx
on public.plan_schedule_rules (routine_version_id);

create or replace function private.protect_plan_schedule_snapshot_update()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  raise exception 'saved plan schedule snapshot rows are immutable'
    using errcode = '55000';
end;
$$;

revoke all on function private.protect_plan_schedule_snapshot_update()
from public, anon, authenticated;

create trigger plan_schedules_protect_update
before update on public.plan_schedules
for each row execute function private.protect_plan_schedule_snapshot_update();

create trigger plan_schedule_versions_protect_update
before update on public.plan_schedule_versions
for each row execute function private.protect_plan_schedule_snapshot_update();

create trigger plan_schedule_rules_protect_update
before update on public.plan_schedule_rules
for each row execute function private.protect_plan_schedule_snapshot_update();

alter table public.plan_schedules enable row level security;
alter table public.plan_schedule_versions enable row level security;
alter table public.plan_schedule_rules enable row level security;

revoke all on public.plan_schedules from public, anon, authenticated;
revoke all on public.plan_schedule_versions from public, anon, authenticated;
revoke all on public.plan_schedule_rules from public, anon, authenticated;

grant select on public.plan_schedules to authenticated;
grant select on public.plan_schedule_versions to authenticated;
grant select on public.plan_schedule_rules to authenticated;

create policy plan_schedules_select_owner
on public.plan_schedules
for select
to authenticated
using (
  exists (
    select 1
    from public.plans p
    where p.id = plan_schedules.plan_id
      and p.user_id = auth.uid()
  )
);

create policy plan_schedule_versions_select_owner
on public.plan_schedule_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.plan_schedules ps
    join public.plans p on p.id = ps.plan_id
    where ps.id = plan_schedule_versions.schedule_id
      and p.user_id = auth.uid()
  )
);

create policy plan_schedule_rules_select_owner
on public.plan_schedule_rules
for select
to authenticated
using (
  exists (
    select 1
    from public.plan_schedule_versions psv
    join public.plan_schedules ps on ps.id = psv.schedule_id
    join public.plans p on p.id = ps.plan_id
    where psv.id = plan_schedule_rules.schedule_version_id
      and p.user_id = auth.uid()
  )
);

create or replace function public.save_plan_schedule(
  p_plan_id uuid,
  p_expected_plan_version_number integer,
  p_expected_schedule_version_number integer,
  p_timezone_name text,
  p_starts_on date,
  p_is_paused boolean,
  p_rules jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, auth, private, pg_catalog, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_owner uuid;
  v_plan_version_id uuid;
  v_plan_version_number integer;
  v_schedule_id uuid;
  v_current_schedule_version_number integer := 0;
  v_next_schedule_version_number integer;
  v_schedule_version_id uuid;
  v_rule jsonb;
  v_weekday integer;
  v_window_start time without time zone;
  v_window_end time without time zone;
  v_routine_version_id uuid;
  v_seen_weekdays integer[] := array[]::integer[];
  v_selected_routine_version_ids uuid[] := array[]::uuid[];
  v_unique_routine_version_ids uuid[];
begin
  if v_user_id is null then
    raise exception 'authenticated user required'
      using errcode = '42501';
  end if;

  if p_expected_plan_version_number is null
     or p_expected_plan_version_number < 1
     or p_expected_schedule_version_number is null
     or p_expected_schedule_version_number < 0 then
    raise exception 'schedule version expectations are invalid'
      using errcode = '23514';
  end if;

  if p_timezone_name is null
     or char_length(btrim(p_timezone_name)) < 1
     or char_length(btrim(p_timezone_name)) > 64
     or not exists (
       select 1
       from pg_catalog.pg_timezone_names t
       where t.name = btrim(p_timezone_name)
     ) then
    raise exception 'schedule timezone must be a recognized time zone name'
      using errcode = '23514';
  end if;

  if p_starts_on is null then
    raise exception 'schedule start date is required'
      using errcode = '23514';
  end if;

  if p_is_paused is null then
    raise exception 'schedule pause state is required'
      using errcode = '23514';
  end if;

  if p_rules is null
     or jsonb_typeof(p_rules) <> 'array'
     or jsonb_array_length(p_rules) < 1
     or jsonb_array_length(p_rules) > 7 then
    raise exception 'schedule must contain between 1 and 7 weekly rules'
      using errcode = '23514';
  end if;

  select p.user_id
  into v_plan_owner
  from public.plans p
  where p.id = p_plan_id
  for update;

  if v_plan_owner is null or v_plan_owner <> v_user_id then
    raise exception 'plan unavailable'
      using errcode = '42501';
  end if;

  select pv.id, pv.version_number
  into v_plan_version_id, v_plan_version_number
  from public.plan_versions pv
  where pv.plan_id = p_plan_id
  order by pv.version_number desc
  limit 1;

  if v_plan_version_id is null then
    raise exception 'plan unavailable'
      using errcode = '42501';
  end if;

  if v_plan_version_number <> p_expected_plan_version_number then
    raise exception 'plan changed; reload before saving the schedule'
      using errcode = '40001';
  end if;

  for v_rule in
    select value
    from jsonb_array_elements(p_rules)
  loop
    if jsonb_typeof(v_rule) <> 'object'
       or coalesce(v_rule->>'weekday', '') !~ '^[1-7]$'
       or coalesce(v_rule->>'window_start', '') !~
         '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'
       or coalesce(v_rule->>'window_end', '') !~
         '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'
       or coalesce(v_rule->>'routine_version_id', '') !~
         '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' then
      raise exception 'schedule rule is invalid'
        using errcode = '23514';
    end if;

    v_weekday := (v_rule->>'weekday')::integer;
    v_window_start := (v_rule->>'window_start')::time;
    v_window_end := (v_rule->>'window_end')::time;
    v_routine_version_id := (v_rule->>'routine_version_id')::uuid;

    if v_weekday = any(v_seen_weekdays) then
      raise exception 'schedule can contain only one rule per weekday'
        using errcode = '23514';
    end if;

    if v_window_start >= v_window_end then
      raise exception 'schedule window end must be later than its start'
        using errcode = '23514';
    end if;

    if not exists (
      select 1
      from public.plan_version_routines pvr
      where pvr.plan_version_id = v_plan_version_id
        and pvr.routine_version_id = v_routine_version_id
    ) then
      raise exception 'schedule routine must belong to the current plan version'
        using errcode = '23514';
    end if;

    v_seen_weekdays := array_append(v_seen_weekdays, v_weekday);
    v_selected_routine_version_ids :=
      array_append(v_selected_routine_version_ids, v_routine_version_id);
  end loop;

  select array_agg(distinct selected_id)
  into v_unique_routine_version_ids
  from unnest(v_selected_routine_version_ids) as selected(selected_id);

  perform private.require_plan_routine_versions(
    v_user_id,
    v_unique_routine_version_ids
  );

  select ps.id
  into v_schedule_id
  from public.plan_schedules ps
  where ps.plan_id = p_plan_id
  for update;

  if v_schedule_id is null then
    if p_expected_schedule_version_number <> 0 then
      raise exception 'schedule changed; reload before saving another version'
        using errcode = '40001';
    end if;

    insert into public.plan_schedules (plan_id)
    values (p_plan_id)
    returning id into v_schedule_id;
  else
    select coalesce(max(psv.version_number), 0)
    into v_current_schedule_version_number
    from public.plan_schedule_versions psv
    where psv.schedule_id = v_schedule_id;

    if v_current_schedule_version_number <>
       p_expected_schedule_version_number then
      raise exception 'schedule changed; reload before saving another version'
        using errcode = '40001';
    end if;
  end if;

  v_next_schedule_version_number :=
    p_expected_schedule_version_number + 1;

  insert into public.plan_schedule_versions (
    schedule_id,
    plan_version_id,
    version_number,
    timezone_name,
    starts_on,
    is_paused
  )
  values (
    v_schedule_id,
    v_plan_version_id,
    v_next_schedule_version_number,
    btrim(p_timezone_name),
    p_starts_on,
    p_is_paused
  )
  returning id into v_schedule_version_id;

  for v_rule in
    select value
    from jsonb_array_elements(p_rules)
  loop
    insert into public.plan_schedule_rules (
      schedule_version_id,
      weekday,
      window_start,
      window_end,
      routine_version_id
    )
    values (
      v_schedule_version_id,
      (v_rule->>'weekday')::integer,
      (v_rule->>'window_start')::time,
      (v_rule->>'window_end')::time,
      (v_rule->>'routine_version_id')::uuid
    );
  end loop;

  return v_next_schedule_version_number;
end;
$$;

revoke all on function public.save_plan_schedule(
  uuid,
  integer,
  integer,
  text,
  date,
  boolean,
  jsonb
)
from public, anon, authenticated;

grant execute on function public.save_plan_schedule(
  uuid,
  integer,
  integer,
  text,
  date,
  boolean,
  jsonb
)
to authenticated;

create or replace function public.get_my_plan_schedule_occurrences(
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
  routine_title text
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
  )
  select
    schedule_dates.plan_id,
    pv.version_number,
    pv.title,
    schedule_dates.schedule_version_number,
    schedule_dates.timezone_name,
    schedule_dates.local_date,
    psr.weekday::integer,
    psr.window_start,
    psr.window_end,
    (
      schedule_dates.local_date + psr.window_start
    ) at time zone schedule_dates.timezone_name,
    (
      schedule_dates.local_date + psr.window_end
    ) at time zone schedule_dates.timezone_name,
    rv.id,
    rv.version_number,
    rv.title
  from schedule_dates
  join public.plan_schedule_rules psr
    on psr.schedule_version_id = schedule_dates.schedule_version_id
   and psr.weekday =
     extract(isodow from schedule_dates.local_date)::integer
  join public.plan_versions pv
    on pv.id = schedule_dates.plan_version_id
  join public.routine_versions rv
    on rv.id = psr.routine_version_id
  where (
    schedule_dates.local_date + psr.window_start
  ) at time zone schedule_dates.timezone_name >= p_from
    and (
      schedule_dates.local_date + psr.window_start
    ) at time zone schedule_dates.timezone_name < p_to
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

comment on table public.plan_schedules is
  'Stable owner-private schedule identity for one plan. Meaning lives in immutable schedule versions.';

comment on table public.plan_schedule_versions is
  'Immutable weekly schedule snapshots pinned to one exact plan version and IANA/recognized named timezone.';

comment on table public.plan_schedule_rules is
  'Immutable weekday/local-time-window rules pinned to exact routine versions from the owning schedule version plan snapshot.';
