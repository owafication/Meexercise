-- PH-04 manual routine structured-constraint consumption.
-- Restricted routine persistence is permitted only when every selected exact
-- exercise version passes the explicit structured readiness constraints.
-- Existing substitution relations are suggestions; persistence never silently
-- replaces user selections.

create or replace function private.require_routine_exercise_constraints(
  p_user_id uuid,
  p_exercise_version_ids uuid[]
)
returns public.exercise_constraint_tag[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_constraints public.exercise_constraint_tag[];
begin
  v_constraints :=
    private.current_structured_planning_constraints(p_user_id);

  if exists (
    select 1
    from unnest(p_exercise_version_ids) as selected(item_id)
    left join public.exercise_versions ev
      on ev.id = selected.item_id
    where ev.id is null
       or ev.status not in ('general', 'reviewed')
  ) then
    raise exception 'routine can contain only currently approved visible exercise versions'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(p_exercise_version_ids) as selected(item_id)
    where not private.exercise_version_matches_constraints(
      selected.item_id,
      v_constraints
    )
  ) then
    raise exception 'routine contains an exercise version that conflicts with current structured planning constraints'
      using errcode = '23514';
  end if;

  return v_constraints;
end;
$$;

revoke all on function private.require_routine_exercise_constraints(
  uuid,
  uuid[]
)
from public, anon, authenticated;

create or replace function public.create_manual_routine(
  p_title text,
  p_exercise_version_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_routine_id uuid;
  v_routine_version_id uuid;
  v_section_id uuid;
  v_exercise_version_id uuid;
  v_position integer := 0;
begin
  if v_user_id is null then
    raise exception 'authenticated user required'
      using errcode = '42501';
  end if;

  if p_title is null
     or char_length(btrim(p_title)) < 1
     or char_length(btrim(p_title)) > 80 then
    raise exception 'routine title must contain 1 to 80 characters'
      using errcode = '23514';
  end if;

  if p_exercise_version_ids is null
     or cardinality(p_exercise_version_ids) < 1
     or cardinality(p_exercise_version_ids) > 12 then
    raise exception 'routine must contain between 1 and 12 exercises'
      using errcode = '23514';
  end if;

  if (
    select count(distinct item_id)
    from unnest(p_exercise_version_ids) as selected(item_id)
  ) <> cardinality(p_exercise_version_ids) then
    raise exception 'routine exercise versions must be unique'
      using errcode = '23514';
  end if;

  perform private.require_routine_exercise_constraints(
    v_user_id,
    p_exercise_version_ids
  );

  insert into public.routines (user_id)
  values (v_user_id)
  returning id into v_routine_id;

  insert into public.routine_versions (
    routine_id,
    version_number,
    title
  )
  values (
    v_routine_id,
    1,
    btrim(p_title)
  )
  returning id into v_routine_version_id;

  insert into public.routine_sections (
    routine_version_id,
    position,
    title
  )
  values (
    v_routine_version_id,
    1,
    'Routine'
  )
  returning id into v_section_id;

  foreach v_exercise_version_id in array p_exercise_version_ids
  loop
    v_position := v_position + 1;

    insert into public.routine_items (
      routine_section_id,
      position,
      exercise_version_id
    )
    values (
      v_section_id,
      v_position,
      v_exercise_version_id
    );
  end loop;

  return v_routine_id;
end;
$$;

revoke all on function public.create_manual_routine(text, uuid[])
from public, anon, authenticated;

grant execute on function public.create_manual_routine(text, uuid[])
to authenticated;

create or replace function public.create_manual_routine_version(
  p_routine_id uuid,
  p_expected_version_number integer,
  p_title text,
  p_exercise_version_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public, auth, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_routine_owner uuid;
  v_current_version_number integer;
  v_next_version_number integer;
  v_routine_version_id uuid;
  v_section_id uuid;
  v_exercise_version_id uuid;
  v_position integer := 0;
begin
  if v_user_id is null then
    raise exception 'authenticated user required'
      using errcode = '42501';
  end if;

  if p_expected_version_number is null or p_expected_version_number < 1 then
    raise exception 'expected routine version must be positive'
      using errcode = '23514';
  end if;

  if p_title is null
     or char_length(btrim(p_title)) < 1
     or char_length(btrim(p_title)) > 80 then
    raise exception 'routine title must contain 1 to 80 characters'
      using errcode = '23514';
  end if;

  if p_exercise_version_ids is null
     or cardinality(p_exercise_version_ids) < 1
     or cardinality(p_exercise_version_ids) > 12 then
    raise exception 'routine must contain between 1 and 12 exercises'
      using errcode = '23514';
  end if;

  if (
    select count(distinct item_id)
    from unnest(p_exercise_version_ids) as selected(item_id)
  ) <> cardinality(p_exercise_version_ids) then
    raise exception 'routine exercise versions must be unique'
      using errcode = '23514';
  end if;

  select r.user_id
  into v_routine_owner
  from public.routines r
  where r.id = p_routine_id
  for update;

  if v_routine_owner is null or v_routine_owner <> v_user_id then
    raise exception 'routine unavailable'
      using errcode = '42501';
  end if;

  select max(rv.version_number)
  into v_current_version_number
  from public.routine_versions rv
  where rv.routine_id = p_routine_id;

  if v_current_version_number is null then
    raise exception 'routine unavailable'
      using errcode = '42501';
  end if;

  if v_current_version_number <> p_expected_version_number then
    raise exception 'routine changed; reload before saving another version'
      using errcode = '40001';
  end if;

  perform private.require_routine_exercise_constraints(
    v_user_id,
    p_exercise_version_ids
  );

  v_next_version_number := v_current_version_number + 1;

  insert into public.routine_versions (
    routine_id,
    version_number,
    title
  )
  values (
    p_routine_id,
    v_next_version_number,
    btrim(p_title)
  )
  returning id into v_routine_version_id;

  insert into public.routine_sections (
    routine_version_id,
    position,
    title
  )
  values (
    v_routine_version_id,
    1,
    'Routine'
  )
  returning id into v_section_id;

  foreach v_exercise_version_id in array p_exercise_version_ids
  loop
    v_position := v_position + 1;

    insert into public.routine_items (
      routine_section_id,
      position,
      exercise_version_id
    )
    values (
      v_section_id,
      v_position,
      v_exercise_version_id
    );
  end loop;

  return v_next_version_number;
end;
$$;

revoke all on function public.create_manual_routine_version(
  uuid,
  integer,
  text,
  uuid[]
)
from public, anon, authenticated;

grant execute on function public.create_manual_routine_version(
  uuid,
  integer,
  text,
  uuid[]
)
to authenticated;
