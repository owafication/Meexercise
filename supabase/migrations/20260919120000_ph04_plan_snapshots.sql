-- PH-04 durable owner-private versioned plan-composition foundation.
-- Plans are stable identities. Plan versions and their exact routine-version
-- composition are immutable snapshots. Scheduling/progression remains PH-05.

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index plans_user_created_idx
on public.plans (user_id, created_at desc);

create table public.plan_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (plan_id, version_number)
);

create index plan_versions_plan_version_idx
on public.plan_versions (plan_id, version_number desc);

create table public.plan_version_routines (
  id uuid primary key default gen_random_uuid(),
  plan_version_id uuid not null references public.plan_versions(id) on delete cascade,
  position integer not null check (position >= 1),
  routine_version_id uuid not null references public.routine_versions(id) on delete cascade,
  unique (plan_version_id, position),
  unique (plan_version_id, routine_version_id)
);

create index plan_version_routines_routine_version_idx
on public.plan_version_routines (routine_version_id);

create or replace function private.protect_plan_snapshot_update()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  raise exception 'saved plan snapshot rows are immutable'
    using errcode = '55000';
end;
$$;

revoke all on function private.protect_plan_snapshot_update()
from public, anon, authenticated;

create trigger plan_versions_protect_update
before update on public.plan_versions
for each row execute function private.protect_plan_snapshot_update();

create trigger plan_version_routines_protect_update
before update on public.plan_version_routines
for each row execute function private.protect_plan_snapshot_update();

alter table public.plans enable row level security;
alter table public.plan_versions enable row level security;
alter table public.plan_version_routines enable row level security;

revoke all on public.plans from public, anon, authenticated;
revoke all on public.plan_versions from public, anon, authenticated;
revoke all on public.plan_version_routines from public, anon, authenticated;

grant select on public.plans to authenticated;
grant select on public.plan_versions to authenticated;
grant select on public.plan_version_routines to authenticated;

create policy plans_select_owner
on public.plans
for select
to authenticated
using (user_id = auth.uid());

create policy plan_versions_select_owner
on public.plan_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.plans p
    where p.id = plan_versions.plan_id
      and p.user_id = auth.uid()
  )
);

create policy plan_version_routines_select_owner
on public.plan_version_routines
for select
to authenticated
using (
  exists (
    select 1
    from public.plan_versions pv
    join public.plans p on p.id = pv.plan_id
    where pv.id = plan_version_routines.plan_version_id
      and p.user_id = auth.uid()
  )
);

create or replace function private.require_plan_routine_versions(
  p_user_id uuid,
  p_routine_version_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exercise_version_ids uuid[];
begin
  if p_user_id is null then
    raise exception 'authenticated user required'
      using errcode = '42501';
  end if;

  if p_routine_version_ids is null
     or cardinality(p_routine_version_ids) < 1
     or cardinality(p_routine_version_ids) > 12 then
    raise exception 'plan must contain between 1 and 12 routine versions'
      using errcode = '23514';
  end if;

  if (
    select count(distinct item_id)
    from unnest(p_routine_version_ids) as selected(item_id)
  ) <> cardinality(p_routine_version_ids) then
    raise exception 'plan routine versions must be unique'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(p_routine_version_ids) as selected(item_id)
    left join public.routine_versions rv on rv.id = selected.item_id
    left join public.routines r
      on r.id = rv.routine_id
     and r.user_id = p_user_id
    where rv.id is null or r.id is null
  ) then
    raise exception 'plan contains an unavailable routine version'
      using errcode = '42501';
  end if;

  if (
    select count(distinct rv.routine_id)
    from unnest(p_routine_version_ids) as selected(item_id)
    join public.routine_versions rv on rv.id = selected.item_id
  ) <> cardinality(p_routine_version_ids) then
    raise exception 'plan cannot contain multiple versions of the same routine'
      using errcode = '23514';
  end if;

  select array_agg(distinct ri.exercise_version_id)
  into v_exercise_version_ids
  from unnest(p_routine_version_ids) as selected(item_id)
  join public.routine_sections rs
    on rs.routine_version_id = selected.item_id
  join public.routine_items ri
    on ri.routine_section_id = rs.id;

  if v_exercise_version_ids is null
     or cardinality(v_exercise_version_ids) < 1 then
    raise exception 'plan routine content is unavailable'
      using errcode = '23514';
  end if;

  perform private.require_routine_exercise_constraints(
    p_user_id,
    v_exercise_version_ids
  );
end;
$$;

revoke all on function private.require_plan_routine_versions(uuid, uuid[])
from public, anon, authenticated;

create or replace function public.create_plan(
  p_title text,
  p_routine_version_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
  v_plan_version_id uuid;
  v_routine_version_id uuid;
  v_position integer := 0;
begin
  if v_user_id is null then
    raise exception 'authenticated user required'
      using errcode = '42501';
  end if;

  if p_title is null
     or char_length(btrim(p_title)) < 1
     or char_length(btrim(p_title)) > 80 then
    raise exception 'plan title must contain 1 to 80 characters'
      using errcode = '23514';
  end if;

  perform private.require_plan_routine_versions(
    v_user_id,
    p_routine_version_ids
  );

  insert into public.plans (user_id)
  values (v_user_id)
  returning id into v_plan_id;

  insert into public.plan_versions (
    plan_id,
    version_number,
    title
  )
  values (
    v_plan_id,
    1,
    btrim(p_title)
  )
  returning id into v_plan_version_id;

  foreach v_routine_version_id in array p_routine_version_ids
  loop
    v_position := v_position + 1;

    insert into public.plan_version_routines (
      plan_version_id,
      position,
      routine_version_id
    )
    values (
      v_plan_version_id,
      v_position,
      v_routine_version_id
    );
  end loop;

  return v_plan_id;
end;
$$;

revoke all on function public.create_plan(text, uuid[])
from public, anon, authenticated;

grant execute on function public.create_plan(text, uuid[])
to authenticated;

create or replace function public.create_plan_version(
  p_plan_id uuid,
  p_expected_version_number integer,
  p_title text,
  p_routine_version_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public, auth, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_owner uuid;
  v_current_version_number integer;
  v_next_version_number integer;
  v_plan_version_id uuid;
  v_routine_version_id uuid;
  v_position integer := 0;
begin
  if v_user_id is null then
    raise exception 'authenticated user required'
      using errcode = '42501';
  end if;

  if p_expected_version_number is null
     or p_expected_version_number < 1 then
    raise exception 'expected plan version must be positive'
      using errcode = '23514';
  end if;

  if p_title is null
     or char_length(btrim(p_title)) < 1
     or char_length(btrim(p_title)) > 80 then
    raise exception 'plan title must contain 1 to 80 characters'
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

  select max(pv.version_number)
  into v_current_version_number
  from public.plan_versions pv
  where pv.plan_id = p_plan_id;

  if v_current_version_number is null then
    raise exception 'plan unavailable'
      using errcode = '42501';
  end if;

  if v_current_version_number <> p_expected_version_number then
    raise exception 'plan changed; reload before saving another version'
      using errcode = '40001';
  end if;

  perform private.require_plan_routine_versions(
    v_user_id,
    p_routine_version_ids
  );

  v_next_version_number := v_current_version_number + 1;

  insert into public.plan_versions (
    plan_id,
    version_number,
    title
  )
  values (
    p_plan_id,
    v_next_version_number,
    btrim(p_title)
  )
  returning id into v_plan_version_id;

  foreach v_routine_version_id in array p_routine_version_ids
  loop
    v_position := v_position + 1;

    insert into public.plan_version_routines (
      plan_version_id,
      position,
      routine_version_id
    )
    values (
      v_plan_version_id,
      v_position,
      v_routine_version_id
    );
  end loop;

  return v_next_version_number;
end;
$$;

revoke all on function public.create_plan_version(
  uuid,
  integer,
  text,
  uuid[]
)
from public, anon, authenticated;

grant execute on function public.create_plan_version(
  uuid,
  integer,
  text,
  uuid[]
)
to authenticated;

comment on table public.plans is
  'Owner-private stable plan identities. Plan meaning lives in immutable version snapshots; PH-05 scheduling/progression is intentionally absent.';

comment on table public.plan_versions is
  'Immutable versioned plan titles with exact routine-version composition stored in plan_version_routines.';