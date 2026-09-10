-- PH-04 structured planning profile prerequisite for REQ-003.
-- Current editable profile state only; immutable routine/assessment history is unchanged.

alter table public.profiles
  add column primary_goal text,
  add column secondary_goal text,
  add column preferred_methods text[] not null default '{}'::text[],
  add column available_equipment text[] not null default '{}'::text[],
  add column available_facilities text[] not null default '{}'::text[],
  add column available_minutes integer,
  add column routine_frequency_days integer;


alter table public.profiles
  add constraint profiles_primary_goal_supported
    check (
      primary_goal is null
      or primary_goal = any (
        array[
          'general_strength',
          'mobility',
          'conditioning',
          'balance',
          'flexibility',
          'activity_consistency'
        ]::text[]
      )
    ),
  add constraint profiles_secondary_goal_supported
    check (
      secondary_goal is null
      or secondary_goal = any (
        array[
          'general_strength',
          'mobility',
          'conditioning',
          'balance',
          'flexibility',
          'activity_consistency'
        ]::text[]
      )
    ),
  add constraint profiles_secondary_goal_requires_primary
    check (secondary_goal is null or primary_goal is not null),
  add constraint profiles_goal_priorities_distinct
    check (
      primary_goal is null
      or secondary_goal is null
      or primary_goal <> secondary_goal
    ),
  add constraint profiles_preferred_methods_supported
    check (
      preferred_methods <@ array[
        'bodyweight',
        'resistance_band',
        'free_weights',
        'machines',
        'mobility_drills',
        'walking_cardio'
      ]::text[]
    ),
  add constraint profiles_preferred_methods_unique
    check (
      cardinality(preferred_methods) =
        (case when 'bodyweight' = any(preferred_methods) then 1 else 0 end) +
        (case when 'resistance_band' = any(preferred_methods) then 1 else 0 end) +
        (case when 'free_weights' = any(preferred_methods) then 1 else 0 end) +
        (case when 'machines' = any(preferred_methods) then 1 else 0 end) +
        (case when 'mobility_drills' = any(preferred_methods) then 1 else 0 end) +
        (case when 'walking_cardio' = any(preferred_methods) then 1 else 0 end)
    ),
  add constraint profiles_preferred_methods_bounded
    check (cardinality(preferred_methods) <= 6),
  add constraint profiles_available_equipment_supported
    check (
      available_equipment <@ array[
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
  add constraint profiles_available_equipment_unique
    check (
      cardinality(available_equipment) =
        (case when 'none' = any(available_equipment) then 1 else 0 end) +
        (case when 'chair' = any(available_equipment) then 1 else 0 end) +
        (case when 'wall' = any(available_equipment) then 1 else 0 end) +
        (case when 'stable_support' = any(available_equipment) then 1 else 0 end) +
        (case when 'stable_elevated_surface' = any(available_equipment) then 1 else 0 end) +
        (case when 'counter_height_surface' = any(available_equipment) then 1 else 0 end) +
        (case when 'resistance_band' = any(available_equipment) then 1 else 0 end) +
        (case when 'dumbbells' = any(available_equipment) then 1 else 0 end) +
        (case when 'barbell' = any(available_equipment) then 1 else 0 end) +
        (case when 'bench' = any(available_equipment) then 1 else 0 end) +
        (case when 'cable_machine' = any(available_equipment) then 1 else 0 end) +
        (case when 'cardio_machine' = any(available_equipment) then 1 else 0 end) +
        (case when 'mat' = any(available_equipment) then 1 else 0 end) +
        (case when 'pull_up_bar' = any(available_equipment) then 1 else 0 end) +
        (case when 'step_box' = any(available_equipment) then 1 else 0 end)
    ),
  add constraint profiles_available_equipment_bounded
    check (cardinality(available_equipment) <= 15),
  add constraint profiles_available_equipment_none_exclusive
    check (
      not (
        'none' = any (available_equipment)
        and cardinality(available_equipment) > 1
      )
    ),
  add constraint profiles_available_facilities_supported
    check (
      available_facilities <@ array[
        'home',
        'gym',
        'outdoors',
        'pool'
      ]::text[]
    ),
  add constraint profiles_available_facilities_unique
    check (
      cardinality(available_facilities) =
        (case when 'home' = any(available_facilities) then 1 else 0 end) +
        (case when 'gym' = any(available_facilities) then 1 else 0 end) +
        (case when 'outdoors' = any(available_facilities) then 1 else 0 end) +
        (case when 'pool' = any(available_facilities) then 1 else 0 end)
    ),
  add constraint profiles_available_facilities_bounded
    check (cardinality(available_facilities) <= 4),
  add constraint profiles_available_minutes_bounded
    check (
      available_minutes is null
      or (
        available_minutes between 10 and 180
        and available_minutes % 5 = 0
      )
    ),
  add constraint profiles_routine_frequency_bounded
    check (
      routine_frequency_days is null
      or routine_frequency_days between 1 and 7
    );

comment on column public.profiles.primary_goal is
  'Current optional primary general-wellness planning goal.';
comment on column public.profiles.secondary_goal is
  'Current optional lower-priority general-wellness planning goal.';
comment on column public.profiles.preferred_methods is
  'Current optional bounded planning-method preferences.';
comment on column public.profiles.available_equipment is
  'Current optional bounded equipment availability tokens.';
comment on column public.profiles.available_facilities is
  'Current optional bounded facility availability tokens.';
comment on column public.profiles.available_minutes is
  'Current optional minutes available for a routine.';
comment on column public.profiles.routine_frequency_days is
  'Current optional preferred routine days per week.';
