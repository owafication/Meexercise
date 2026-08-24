-- PH-04 deterministic structured-constraint prerequisite.
-- This migration does not unlock restricted routine creation/editing.
-- It adds exact-version planning metadata and private deterministic primitives.

create type public.exercise_constraint_tag as enum (
  'surface_hand_loading',
  'knee_bending'
);

alter table public.exercise_versions
  add column constraint_tags public.exercise_constraint_tag[]
    not null default '{}'::public.exercise_constraint_tag[],
  add column constraint_tags_complete boolean
    not null default false;

alter table public.exercise_versions
  add constraint exercise_versions_constraint_tag_state
  check (
    constraint_tags_complete
    or cardinality(constraint_tags) = 0
  );

-- One-time classification for the current synthetic fixture IDs if this
-- migration is applied over an already-seeded local database. No production
-- classification is inferred from names, instructions, or free text.
update public.exercise_versions
set
  constraint_tags = array[
    'knee_bending'::public.exercise_constraint_tag
  ],
  constraint_tags_complete = true
where id in (
  'e1111111-1111-4111-8111-111111111111'::uuid,
  'e2222222-2222-4222-8222-222222222222'::uuid
);

update public.exercise_versions
set
  constraint_tags = array[
    'surface_hand_loading'::public.exercise_constraint_tag
  ],
  constraint_tags_complete = true
where id in (
  'e3333333-3333-4333-8333-333333333333'::uuid,
  'e3333333-3333-4333-8333-333333333334'::uuid,
  'e4444444-4444-4444-8444-444444444444'::uuid,
  'e6666666-6666-4666-8666-666666666666'::uuid
);

update public.exercise_versions
set
  constraint_tags = '{}'::public.exercise_constraint_tag[],
  constraint_tags_complete = true
where id = 'e7777777-7777-4777-8777-777777777777'::uuid;

create or replace function private.protect_exercise_version()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if tg_op='DELETE' then
    if old.status<>'draft' then
      raise exception 'finalized exercise versions cannot be deleted'
        using errcode='55000';
    end if;
    return old;
  end if;

  if new.exercise_id is distinct from old.exercise_id
     or new.version_number is distinct from old.version_number then
    raise exception 'exercise version identity is immutable'
      using errcode='55000';
  end if;

  if old.status='draft'
     and new.status<>'draft'
     and not new.constraint_tags_complete then
    raise exception 'exercise constraint tags must be classified before finalization'
      using errcode='55000';
  end if;

  if old.status<>'draft' then
    if new.title is distinct from old.title
       or new.summary is distinct from old.summary
       or new.purpose is distinct from old.purpose
       or new.setup is distinct from old.setup
       or new.steps is distinct from old.steps
       or new.cues is distinct from old.cues
       or new.dosage_guidance is distinct from old.dosage_guidance
       or new.common_errors is distinct from old.common_errors
       or new.safety_notes is distinct from old.safety_notes
       or new.accessible_text is distinct from old.accessible_text
       or new.target_areas is distinct from old.target_areas
       or new.equipment is distinct from old.equipment
       or new.side_rule is distinct from old.side_rule
       or new.constraint_tags is distinct from old.constraint_tags
       or new.constraint_tags_complete is distinct from old.constraint_tags_complete then
      raise exception 'finalized exercise instruction content is immutable'
        using errcode='55000';
    end if;

    if new.published_at is distinct from old.published_at then
      raise exception 'exercise publication timestamp is immutable after finalization'
        using errcode='55000';
    end if;

    if new.status is distinct from old.status and not (
      (old.status='general' and new.status in ('reviewed','withdrawn','restricted'))
      or (old.status='professionally_authored' and new.status in ('reviewed','withdrawn','restricted'))
      or (old.status='reviewed' and new.status in ('withdrawn','restricted'))
      or (old.status='restricted' and new.status='withdrawn')
    ) then
      raise exception 'exercise publication status transition is not allowed'
        using errcode='55000';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.protect_exercise_version()
from public, anon, authenticated;

create or replace function private.current_readiness_leaf(
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_leaf_ids uuid[];
begin
  if p_user_id is null then
    raise exception 'authenticated user required'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.assessment_sessions s
    join public.assessment_template_versions tv
      on tv.id = s.template_version_id
    join public.assessment_templates t
      on t.id = tv.template_id
    where s.user_id = p_user_id
      and t.template_key = 'readiness_baseline'
      and s.status = 'in_progress'
  ) then
    raise exception 'complete the current readiness assessment before saving a routine'
      using errcode = '55000';
  end if;

  with completed as (
    select
      s.id,
      s.corrects_session_id,
      tv.version_number
    from public.assessment_sessions s
    join public.assessment_template_versions tv
      on tv.id = s.template_version_id
    join public.assessment_templates t
      on t.id = tv.template_id
    where s.user_id = p_user_id
      and t.template_key = 'readiness_baseline'
      and s.status = 'completed'
  ),
  highest_version as (
    select max(version_number) as version_number
    from completed
  ),
  eligible as (
    select c.id, c.corrects_session_id
    from completed c
    join highest_version h
      on h.version_number = c.version_number
  ),
  leaves as (
    select e.id
    from eligible e
    where not exists (
      select 1
      from eligible successor
      where successor.corrects_session_id = e.id
    )
  )
  select array_agg(id)
  into v_leaf_ids
  from leaves;

  if coalesce(cardinality(v_leaf_ids), 0) = 0 then
    raise exception 'completed readiness assessment required before saving a routine'
      using errcode = '55000';
  end if;

  if cardinality(v_leaf_ids) <> 1 then
    raise exception 'planning readiness history is ambiguous; resolve assessment corrections before saving a routine'
      using errcode = '55000';
  end if;

  return v_leaf_ids[1];
end;
$$;

revoke all on function private.current_readiness_leaf(uuid)
from public, anon, authenticated;

create or replace function private.require_current_planning_readiness(
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_completed_session_id uuid;
begin
  v_completed_session_id :=
    private.current_readiness_leaf(p_user_id);

  if exists (
    select 1
    from public.assessment_safety_flags f
    where f.user_id = p_user_id
      and f.session_id = v_completed_session_id
      and f.outcome in ('restrict_generation', 'block_generation')
  ) then
    raise exception 'planning restrictions require deterministic constraint handling before saving a routine'
      using errcode = '55000';
  end if;

  return v_completed_session_id;
end;
$$;

revoke all on function private.require_current_planning_readiness(uuid)
from public, anon, authenticated;

create or replace function private.current_structured_planning_constraints(
  p_user_id uuid
)
returns public.exercise_constraint_tag[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_template_version integer;
  v_responses jsonb;
  v_raw jsonb;
  v_tags public.exercise_constraint_tag[];
begin
  v_session_id := private.current_readiness_leaf(p_user_id);

  if exists (
    select 1
    from public.assessment_safety_flags f
    where f.user_id = p_user_id
      and f.session_id = v_session_id
      and f.outcome = 'block_generation'
  ) then
    raise exception 'planning is blocked by the current readiness assessment'
      using errcode = '55000';
  end if;

  if not exists (
    select 1
    from public.assessment_safety_flags f
    where f.user_id = p_user_id
      and f.session_id = v_session_id
      and f.outcome = 'restrict_generation'
  ) then
    return '{}'::public.exercise_constraint_tag[];
  end if;

  select tv.version_number, s.responses
  into v_template_version, v_responses
  from public.assessment_sessions s
  join public.assessment_template_versions tv
    on tv.id = s.template_version_id
  where s.id = v_session_id
    and s.user_id = p_user_id;

  if v_template_version is null or v_template_version < 2 then
    raise exception 'structured movement constraints are required before restricted planning'
      using errcode = '55000';
  end if;

  v_raw := coalesce(
    v_responses #> '{limitations,movementConstraints}',
    '[]'::jsonb
  );

  if jsonb_typeof(v_raw) <> 'array'
     or jsonb_array_length(v_raw) = 0 then
    raise exception 'structured movement constraints are required before restricted planning'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(v_raw) as item(value)
    where item.value not in (
      'surface_hand_loading',
      'knee_bending'
    )
  ) then
    raise exception 'structured movement constraints are required before restricted planning'
      using errcode = '55000';
  end if;

  select array_agg(
    distinct item.value::public.exercise_constraint_tag
    order by item.value::public.exercise_constraint_tag
  )
  into v_tags
  from jsonb_array_elements_text(v_raw) as item(value);

  if coalesce(cardinality(v_tags), 0) = 0 then
    raise exception 'structured movement constraints are required before restricted planning'
      using errcode = '55000';
  end if;

  return v_tags;
end;
$$;

revoke all on function private.current_structured_planning_constraints(uuid)
from public, anon, authenticated;

create or replace function private.exercise_version_matches_constraints(
  p_exercise_version_id uuid,
  p_constraint_tags public.exercise_constraint_tag[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select
        ev.status in ('general', 'reviewed')
        and (
          coalesce(cardinality(p_constraint_tags), 0) = 0
          or (
            ev.constraint_tags_complete
            and not (
              ev.constraint_tags
              && p_constraint_tags
            )
          )
        )
      from public.exercise_versions ev
      where ev.id = p_exercise_version_id
    ),
    false
  );
$$;

revoke all on function private.exercise_version_matches_constraints(
  uuid,
  public.exercise_constraint_tag[]
)
from public, anon, authenticated;

create or replace function private.first_compatible_substitution(
  p_source_version_id uuid,
  p_constraint_tags public.exercise_constraint_tag[]
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.target_version_id
  from public.exercise_version_relations r
  where r.source_version_id = p_source_version_id
    and r.relation_type = 'substitution'
    and private.exercise_version_matches_constraints(
      r.target_version_id,
      p_constraint_tags
    )
  order by r.sort_order, r.id
  limit 1;
$$;

revoke all on function private.first_compatible_substitution(
  uuid,
  public.exercise_constraint_tag[]
)
from public, anon, authenticated;
