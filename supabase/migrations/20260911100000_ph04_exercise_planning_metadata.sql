-- PH-04 exact-version planning metadata prerequisite.
-- No generator behaviour, inference, runtime AI, or production catalogue claim
-- is introduced by this migration.

alter table public.exercise_versions
  add column planning_goal_tags text[] not null default '{}'::text[],
  add column planning_method_tags text[] not null default '{}'::text[],
  add column planning_equipment text[] not null default '{}'::text[],
  add column planning_facilities text[] not null default '{}'::text[],
  add column estimated_minutes integer,
  add column planning_metadata_complete boolean not null default false;

alter table public.exercise_versions
  add constraint exercise_versions_planning_goals_supported
  check (
    planning_goal_tags <@ array[
      'general_strength',
      'mobility',
      'conditioning',
      'balance',
      'flexibility',
      'activity_consistency'
    ]::text[]
  ),
  add constraint exercise_versions_planning_goals_unique
  check (
    cardinality(planning_goal_tags) =
      (case when 'general_strength'=any(planning_goal_tags) then 1 else 0 end) +
      (case when 'mobility'=any(planning_goal_tags) then 1 else 0 end) +
      (case when 'conditioning'=any(planning_goal_tags) then 1 else 0 end) +
      (case when 'balance'=any(planning_goal_tags) then 1 else 0 end) +
      (case when 'flexibility'=any(planning_goal_tags) then 1 else 0 end) +
      (case when 'activity_consistency'=any(planning_goal_tags) then 1 else 0 end)
  ),
  add constraint exercise_versions_planning_methods_supported
  check (
    planning_method_tags <@ array[
      'bodyweight',
      'resistance_band',
      'free_weights',
      'machines',
      'mobility_drills',
      'walking_cardio'
    ]::text[]
  ),
  add constraint exercise_versions_planning_methods_unique
  check (
    cardinality(planning_method_tags) =
      (case when 'bodyweight'=any(planning_method_tags) then 1 else 0 end) +
      (case when 'resistance_band'=any(planning_method_tags) then 1 else 0 end) +
      (case when 'free_weights'=any(planning_method_tags) then 1 else 0 end) +
      (case when 'machines'=any(planning_method_tags) then 1 else 0 end) +
      (case when 'mobility_drills'=any(planning_method_tags) then 1 else 0 end) +
      (case when 'walking_cardio'=any(planning_method_tags) then 1 else 0 end)
  ),
  add constraint exercise_versions_planning_equipment_supported
  check (
    planning_equipment <@ array[
      'none',
      'chair',
      'wall',
      'stable_support',
      'stable_elevated_surface',
      'counter_height_surface',
      'resistance_band',
      'dumbbells',
      'barbell',
      'bench',
      'cable_machine',
      'cardio_machine',
      'mat',
      'pull_up_bar',
      'step_box'
    ]::text[]
  ),
  add constraint exercise_versions_planning_equipment_unique
  check (
    cardinality(planning_equipment) =
      (case when 'none'=any(planning_equipment) then 1 else 0 end) +
      (case when 'chair'=any(planning_equipment) then 1 else 0 end) +
      (case when 'wall'=any(planning_equipment) then 1 else 0 end) +
      (case when 'stable_support'=any(planning_equipment) then 1 else 0 end) +
      (case when 'stable_elevated_surface'=any(planning_equipment) then 1 else 0 end) +
      (case when 'counter_height_surface'=any(planning_equipment) then 1 else 0 end) +
      (case when 'resistance_band'=any(planning_equipment) then 1 else 0 end) +
      (case when 'dumbbells'=any(planning_equipment) then 1 else 0 end) +
      (case when 'barbell'=any(planning_equipment) then 1 else 0 end) +
      (case when 'bench'=any(planning_equipment) then 1 else 0 end) +
      (case when 'cable_machine'=any(planning_equipment) then 1 else 0 end) +
      (case when 'cardio_machine'=any(planning_equipment) then 1 else 0 end) +
      (case when 'mat'=any(planning_equipment) then 1 else 0 end) +
      (case when 'pull_up_bar'=any(planning_equipment) then 1 else 0 end) +
      (case when 'step_box'=any(planning_equipment) then 1 else 0 end)
  ),
  add constraint exercise_versions_planning_facilities_supported
  check (
    planning_facilities <@ array[
      'home',
      'gym',
      'outdoors',
      'pool'
    ]::text[]
  ),
  add constraint exercise_versions_planning_facilities_unique
  check (
    cardinality(planning_facilities) =
      (case when 'home'=any(planning_facilities) then 1 else 0 end) +
      (case when 'gym'=any(planning_facilities) then 1 else 0 end) +
      (case when 'outdoors'=any(planning_facilities) then 1 else 0 end) +
      (case when 'pool'=any(planning_facilities) then 1 else 0 end)
  ),
  add constraint exercise_versions_estimated_minutes_bounded
  check (
    estimated_minutes is null
    or estimated_minutes between 1 and 60
  ),
  add constraint exercise_versions_planning_metadata_state
  check (
    not planning_metadata_complete
    or (
      cardinality(planning_goal_tags) >= 1
      and cardinality(planning_method_tags) >= 1
      and cardinality(planning_equipment) >= 1
      and cardinality(planning_facilities) >= 1
      and estimated_minutes is not null
    )
  );

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

  if old.status='draft'
     and new.status<>'draft'
     and not new.planning_metadata_complete then
    raise exception 'exercise planning metadata must be classified before finalization'
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
       or new.constraint_tags_complete is distinct from old.constraint_tags_complete
       or new.planning_goal_tags is distinct from old.planning_goal_tags
       or new.planning_method_tags is distinct from old.planning_method_tags
       or new.planning_equipment is distinct from old.planning_equipment
       or new.planning_facilities is distinct from old.planning_facilities
       or new.estimated_minutes is distinct from old.estimated_minutes
       or new.planning_metadata_complete is distinct from old.planning_metadata_complete then
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

comment on column public.exercise_versions.planning_goal_tags is
  'Reviewed exact-version general-wellness goals supported by this exercise.';
comment on column public.exercise_versions.planning_method_tags is
  'Reviewed exact-version method categories used for deterministic planning.';
comment on column public.exercise_versions.planning_equipment is
  'Reviewed exact-version equipment tokens required for deterministic planning.';
comment on column public.exercise_versions.planning_facilities is
  'Reviewed exact-version facility contexts supported for deterministic planning.';
comment on column public.exercise_versions.estimated_minutes is
  'Reviewed deterministic per-exercise routine-time estimate used only for bounded planning.';
comment on column public.exercise_versions.planning_metadata_complete is
  'True only after all current deterministic planning metadata has been explicitly classified.';
