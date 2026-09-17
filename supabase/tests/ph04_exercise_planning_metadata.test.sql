begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

select has_column(
  'public',
  'exercise_versions',
  'planning_goal_tags',
  'exercise versions own planning goal tags'
);
select has_column(
  'public',
  'exercise_versions',
  'planning_method_tags',
  'exercise versions own planning method tags'
);
select has_column(
  'public',
  'exercise_versions',
  'planning_equipment',
  'exercise versions own planning equipment tokens'
);
select has_column(
  'public',
  'exercise_versions',
  'planning_facilities',
  'exercise versions own planning facility tokens'
);
select has_column(
  'public',
  'exercise_versions',
  'estimated_minutes',
  'exercise versions own deterministic estimated minutes'
);
select has_column(
  'public',
  'exercise_versions',
  'planning_metadata_complete',
  'exercise versions expose explicit planning classification completeness'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.exercise_versions
    where status in ('general','reviewed')
      and planning_metadata_complete
  $$,
  array[7::bigint],
  'all seven visible synthetic versions have explicit complete planning metadata'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.exercise_versions
    where id='e1111111-1111-4111-8111-111111111111'
      and planning_goal_tags @> array['general_strength','balance']::text[]
      and planning_method_tags = array['bodyweight']::text[]
      and planning_equipment = array['chair']::text[]
      and planning_facilities @> array['home']::text[]
      and estimated_minutes=6
  $$,
  array[1::bigint],
  'chair sit-to-stand has explicit structured planning metadata'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.exercise_versions
    where id='e7777777-7777-4777-8777-777777777777'
      and planning_goal_tags @> array['general_strength']::text[]
      and planning_method_tags = array['resistance_band']::text[]
      and planning_equipment = array['resistance_band']::text[]
      and planning_facilities @> array['home','gym']::text[]
      and estimated_minutes=6
  $$,
  array[1::bigint],
  'resistance-band press has explicit method/equipment/facility metadata'
);

select throws_ok(
  $$
    update public.exercise_versions
    set planning_goal_tags=array['medical_rehab']
    where id='e5555555-5555-4555-8555-555555555555'
  $$,
  '23514',
  null,
  'unsupported planning goal tags are rejected'
);

select throws_ok(
  $$
    update public.exercise_versions
    set planning_method_tags=array['bodyweight','bodyweight']
    where id='e5555555-5555-4555-8555-555555555555'
  $$,
  '23514',
  null,
  'duplicate planning method tags are rejected'
);

select throws_ok(
  $$
    update public.exercise_versions
    set estimated_minutes=0
    where id='e5555555-5555-4555-8555-555555555555'
  $$,
  '23514',
  null,
  'invalid planning time estimates are rejected'
);

insert into public.exercises (id,exercise_key)
values (
  'd8888888-8888-4888-8888-888888888888',
  'planning_metadata_test'
);

insert into public.exercise_versions (
  id,
  exercise_id,
  version_number,
  status,
  title,
  summary,
  purpose,
  setup,
  steps,
  cues,
  dosage_guidance,
  common_errors,
  safety_notes,
  accessible_text,
  target_areas,
  equipment,
  side_rule,
  constraint_tags,
  constraint_tags_complete,
  published_at
)
values (
  'e8888888-8888-4888-8888-888888888888',
  'd8888888-8888-4888-8888-888888888888',
  1,
  'draft',
  'Planning metadata test',
  'Synthetic draft for planning metadata invariant tests.',
  'Test-only purpose.',
  'Test-only setup.',
  '["Test-only step."]'::jsonb,
  '[]'::jsonb,
  'Test-only dosage.',
  '[]'::jsonb,
  '[]'::jsonb,
  'Test-only accessible text.',
  array['Test'],
  '{}'::text[],
  'not_applicable',
  '{}'::public.exercise_constraint_tag[],
  true,
  null
);

select throws_ok(
  $$
    update public.exercise_versions
    set status='general',published_at=now()
    where id='e8888888-8888-4888-8888-888888888888'
  $$,
  '55000',
  'exercise planning metadata must be classified before finalization',
  'draft exercise cannot finalise without complete planning metadata'
);

select lives_ok(
  $$
    update public.exercise_versions
    set
      planning_goal_tags=array['general_strength'],
      planning_method_tags=array['bodyweight'],
      planning_equipment=array['none'],
      planning_facilities=array['home'],
      estimated_minutes=5,
      planning_metadata_complete=true
    where id='e8888888-8888-4888-8888-888888888888'
  $$,
  'draft planning metadata can be explicitly authored'
);

select lives_ok(
  $$
    update public.exercise_versions
    set status='general',published_at=now()
    where id='e8888888-8888-4888-8888-888888888888'
  $$,
  'classified draft can finalise'
);

select throws_ok(
  $$
    update public.exercise_versions
    set planning_goal_tags=array['balance']
    where id='e8888888-8888-4888-8888-888888888888'
  $$,
  '55000',
  'finalized exercise instruction content is immutable',
  'planning metadata is immutable after finalisation'
);

set local role anon;
select set_config('request.jwt.claim.role','anon',true);

select results_eq(
  $$
    select count(*)::bigint
    from public.exercise_versions
    where id='e1111111-1111-4111-8111-111111111111'
      and planning_metadata_complete
      and planning_goal_tags @> array['general_strength']::text[]
  $$,
  array[1::bigint],
  'existing visible metadata remains readable through the existing exercise RLS policy'
);

select * from finish();

rollback;
