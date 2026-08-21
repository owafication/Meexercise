begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

select has_table('routines', 'routines stable identity table exists');
select has_table('routine_versions', 'routine_versions table exists');
select has_table('routine_sections', 'routine_sections table exists');
select has_table('routine_items', 'routine_items table exists');

select results_eq(
  $$
    select count(*)::bigint
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('routines','routine_versions','routine_sections','routine_items')
      and c.relrowsecurity
  $$,
  array[4::bigint],
  'RLS is enabled on all private routine tables'
);

select has_function(
  'public',
  'create_manual_routine',
  array['text','uuid[]'],
  'manual routine creation function exists'
);

insert into auth.users (id,email,raw_user_meta_data)
values
  ('88888888-8888-4888-8888-888888888881','routine-owner@example.invalid','{}'::jsonb),
  ('88888888-8888-4888-8888-888888888882','routine-other@example.invalid','{}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888881',true);
select set_config('request.jwt.claim.role','authenticated',true);

insert into public.assessment_sessions (
  id,user_id,template_version_id,responses
)
values (
  '88888888-8888-4888-8888-888888888891',
  '88888888-8888-4888-8888-888888888881',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  '{
    "schemaVersion":1,
    "activity":{"frequency":"one_two_days"},
    "limitations":{"hasLimitations":false,"affectedAreas":"","avoidedMovements":""},
    "readiness":{"independentExercise":"yes","professionalRestriction":"no"}
  }'::jsonb
);

update public.assessment_sessions
set status='completed',completed_at=now()
where id='88888888-8888-4888-8888-888888888891'
  and row_version=1;

create temp table ph04_created_routine (routine_id uuid);

insert into ph04_created_routine (routine_id)
select public.create_manual_routine(
  'Owner routine',
  array[
    'e3333333-3333-4333-8333-333333333334'::uuid,
    'e4444444-4444-4444-8444-444444444444'::uuid
  ]
);

select results_eq(
  $$
    select count(*)::bigint
    from public.routines r
    join ph04_created_routine c on c.routine_id=r.id
    where r.user_id='88888888-8888-4888-8888-888888888881'
  $$,
  array[1::bigint],
  'manual routine belongs to the authenticated owner'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.routine_versions rv
    join ph04_created_routine c on c.routine_id=rv.routine_id
    where rv.version_number=1
      and rv.title='Owner routine'
  $$,
  array[1::bigint],
  'manual save creates immutable routine version one'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.routine_sections rs
    join public.routine_versions rv on rv.id=rs.routine_version_id
    join ph04_created_routine c on c.routine_id=rv.routine_id
    where rs.position=1
      and rs.title='Routine'
  $$,
  array[1::bigint],
  'manual routine contains the first explicit section'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.routine_items ri
    join public.routine_sections rs on rs.id=ri.routine_section_id
    join public.routine_versions rv on rv.id=rs.routine_version_id
    join ph04_created_routine c on c.routine_id=rv.routine_id
    where ri.exercise_version_id in (
      'e3333333-3333-4333-8333-333333333334'::uuid,
      'e4444444-4444-4444-8444-444444444444'::uuid
    )
  $$,
  array[2::bigint],
  'routine items retain the two exact selected exercise-version ids'
);

select throws_ok(
  $$
    select public.create_manual_routine(
      'Draft content attempt',
      array['e5555555-5555-4555-8555-555555555555'::uuid]
    )
  $$,
  '23514',
  'routine can contain only currently approved visible exercise versions',
  'manual routine creation rejects draft exercise content'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888882',true);
select set_config('request.jwt.claim.role','authenticated',true);

select throws_ok(
  $$
    select public.create_manual_routine(
      'No assessment',
      array['e4444444-4444-4444-8444-444444444444'::uuid]
    )
  $$,
  '55000',
  'completed readiness assessment required before saving a routine',
  'database creation boundary fails closed without completed readiness'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.routines
  $$,
  array[0::bigint],
  'another authenticated user cannot read the owner routine'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.routine_items
  $$,
  array[0::bigint],
  'another authenticated user cannot read owner routine items'
);

reset role;

select throws_ok(
  $$
    update public.routine_versions
    set title='Rewritten history'
    where routine_id=(select routine_id from ph04_created_routine)
  $$,
  '55000',
  'saved routine snapshot rows are immutable',
  'routine version content cannot be rewritten'
);

select lives_ok(
  $$
    update public.exercise_versions
    set status='withdrawn'
    where id='e3333333-3333-4333-8333-333333333334'
  $$,
  'a referenced reviewed exercise version can be withdrawn without rewriting the routine'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888881',true);
select set_config('request.jwt.claim.role','authenticated',true);

select results_eq(
  $$
    select count(*)::bigint
    from public.exercise_versions
    where id='e3333333-3333-4333-8333-333333333334'
      and status='withdrawn'
  $$,
  array[1::bigint],
  'routine owner retains read access to the exact withdrawn exercise version referenced by history'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.routine_items
    where exercise_version_id='e3333333-3333-4333-8333-333333333334'
  $$,
  array[1::bigint],
  'routine item still points at the exact withdrawn exercise version'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888882',true);
select set_config('request.jwt.claim.role','authenticated',true);

select results_eq(
  $$
    select count(*)::bigint
    from public.exercise_versions
    where id='e3333333-3333-4333-8333-333333333334'
  $$,
  array[0::bigint],
  'unrelated user cannot read another owners withdrawn historical exercise version'
);

reset role;

delete from auth.users
where id='88888888-8888-4888-8888-888888888881';

select results_eq(
  $$
    select count(*)::bigint
    from public.routines
    where user_id='88888888-8888-4888-8888-888888888881'
  $$,
  array[0::bigint],
  'deleting the Auth user cascades to routine identities'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.routine_versions rv
    join ph04_created_routine c on c.routine_id=rv.routine_id
  $$,
  array[0::bigint],
  'account deletion cascades through routine versions'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.routine_items ri
    join public.routine_sections rs on rs.id=ri.routine_section_id
    join public.routine_versions rv on rv.id=rs.routine_version_id
    join ph04_created_routine c on c.routine_id=rv.routine_id
  $$,
  array[0::bigint],
  'account deletion cascades through routine sections and items'
);

select * from finish();

rollback;
