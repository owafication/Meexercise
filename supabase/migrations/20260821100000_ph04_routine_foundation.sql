create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index routines_user_created_idx
on public.routines (user_id, created_at desc);

create table public.routine_versions (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (routine_id, version_number)
);

create index routine_versions_routine_version_idx
on public.routine_versions (routine_id, version_number desc);

create table public.routine_sections (
  id uuid primary key default gen_random_uuid(),
  routine_version_id uuid not null references public.routine_versions(id) on delete cascade,
  position integer not null check (position >= 1),
  title text not null check (char_length(btrim(title)) between 1 and 80),
  unique (routine_version_id, position)
);

create table public.routine_items (
  id uuid primary key default gen_random_uuid(),
  routine_section_id uuid not null references public.routine_sections(id) on delete cascade,
  position integer not null check (position >= 1),
  exercise_version_id uuid not null references public.exercise_versions(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (routine_section_id, position)
);

create index routine_items_exercise_version_idx
on public.routine_items (exercise_version_id);

create or replace function private.protect_routine_snapshot_update()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  raise exception 'saved routine snapshot rows are immutable'
    using errcode = '55000';
end;
$$;

revoke all on function private.protect_routine_snapshot_update()
from public, anon, authenticated;

create trigger routine_versions_protect_update
before update on public.routine_versions
for each row execute function private.protect_routine_snapshot_update();

create trigger routine_sections_protect_update
before update on public.routine_sections
for each row execute function private.protect_routine_snapshot_update();

create trigger routine_items_protect_update
before update on public.routine_items
for each row execute function private.protect_routine_snapshot_update();

alter table public.routines enable row level security;
alter table public.routine_versions enable row level security;
alter table public.routine_sections enable row level security;
alter table public.routine_items enable row level security;

revoke all on public.routines from public, anon, authenticated;
revoke all on public.routine_versions from public, anon, authenticated;
revoke all on public.routine_sections from public, anon, authenticated;
revoke all on public.routine_items from public, anon, authenticated;

grant select on public.routines to authenticated;
grant select on public.routine_versions to authenticated;
grant select on public.routine_sections to authenticated;
grant select on public.routine_items to authenticated;

create policy routines_select_owner
on public.routines
for select
to authenticated
using (user_id = auth.uid());

create policy routine_versions_select_owner
on public.routine_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.routines r
    where r.id = routine_versions.routine_id
      and r.user_id = auth.uid()
  )
);

create policy routine_sections_select_owner
on public.routine_sections
for select
to authenticated
using (
  exists (
    select 1
    from public.routine_versions rv
    join public.routines r on r.id = rv.routine_id
    where rv.id = routine_sections.routine_version_id
      and r.user_id = auth.uid()
  )
);

create policy routine_items_select_owner
on public.routine_items
for select
to authenticated
using (
  exists (
    select 1
    from public.routine_sections rs
    join public.routine_versions rv on rv.id = rs.routine_version_id
    join public.routines r on r.id = rv.routine_id
    where rs.id = routine_items.routine_section_id
      and r.user_id = auth.uid()
  )
);

create or replace function private.user_owns_routine_exercise_version(
  p_exercise_version_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.routine_items ri
      join public.routine_sections rs on rs.id = ri.routine_section_id
      join public.routine_versions rv on rv.id = rs.routine_version_id
      join public.routines r on r.id = rv.routine_id
      where ri.exercise_version_id = p_exercise_version_id
        and r.user_id = auth.uid()
    );
$$;

revoke all on function private.user_owns_routine_exercise_version(uuid)
from public, anon;

grant execute on function private.user_owns_routine_exercise_version(uuid)
to authenticated;

create policy exercise_versions_select_owned_routine_history
on public.exercise_versions
for select
to authenticated
using (
  private.user_owns_routine_exercise_version(id)
);

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
  v_completed_session_id uuid;
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

  if exists (
    select 1
    from public.assessment_sessions s
    join public.assessment_template_versions tv on tv.id = s.template_version_id
    join public.assessment_templates t on t.id = tv.template_id
    where s.user_id = v_user_id
      and t.template_key = 'readiness_baseline'
      and s.status = 'in_progress'
  ) then
    raise exception 'complete the current readiness assessment before saving a routine'
      using errcode = '55000';
  end if;

  select s.id
  into v_completed_session_id
  from public.assessment_sessions s
  join public.assessment_template_versions tv on tv.id = s.template_version_id
  join public.assessment_templates t on t.id = tv.template_id
  where s.user_id = v_user_id
    and t.template_key = 'readiness_baseline'
    and s.status = 'completed'
  order by s.completed_at desc nulls last, s.updated_at desc
  limit 1;

  if v_completed_session_id is null then
    raise exception 'completed readiness assessment required before saving a routine'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.assessment_safety_flags f
    where f.user_id = v_user_id
      and f.session_id = v_completed_session_id
      and f.outcome in ('restrict_generation', 'block_generation')
  ) then
    raise exception 'planning restrictions require deterministic constraint handling before saving a routine'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from unnest(p_exercise_version_ids) as selected(item_id)
    left join public.exercise_versions ev on ev.id = selected.item_id
    where ev.id is null
       or ev.status not in ('general', 'reviewed')
  ) then
    raise exception 'routine can contain only currently approved visible exercise versions'
      using errcode = '23514';
  end if;

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
