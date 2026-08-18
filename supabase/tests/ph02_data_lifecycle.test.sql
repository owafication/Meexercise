begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (
  id,
  email,
  raw_user_meta_data
)
values (
  '55555555-5555-4555-8555-555555555555',
  'lifecycle@example.invalid',
  '{}'::jsonb
);

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  '55555555-5555-4555-8555-555555555555',
  true
);

select set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

insert into public.profiles (
  user_id,
  display_name
)
values (
  '55555555-5555-4555-8555-555555555555',
  'Lifecycle User'
);

insert into public.assessment_sessions (
  id,
  user_id,
  template_version_id,
  responses
)
values (
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  '55555555-5555-4555-8555-555555555555',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  '{
    "schemaVersion":1,
    "activity":{"frequency":"one_two_days"},
    "limitations":{
      "hasLimitations":true,
      "affectedAreas":"right knee",
      "avoidedMovements":"jumping"
    },
    "readiness":{
      "independentExercise":"yes",
      "professionalRestriction":"no"
    }
  }'::jsonb
);

update public.assessment_sessions
set
  status = 'completed',
  completed_at = now()
where id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
  and row_version = 1;

reset role;

select results_eq(
  $$
    select count(*)::bigint
    from public.profiles
    where user_id = '55555555-5555-4555-8555-555555555555'
  $$,
  array[1::bigint],
  'profile exists before account deletion'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.assessment_sessions
    where user_id = '55555555-5555-4555-8555-555555555555'
  $$,
  array[1::bigint],
  'assessment session exists before account deletion'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.assessment_safety_flags
    where user_id = '55555555-5555-4555-8555-555555555555'
  $$,
  array[1::bigint],
  'derived assessment safety flag exists before account deletion'
);

delete from auth.users
where id = '55555555-5555-4555-8555-555555555555';

select results_eq(
  $$
    select count(*)::bigint
    from public.profiles
    where user_id = '55555555-5555-4555-8555-555555555555'
  $$,
  array[0::bigint],
  'deleting the Auth user cascades to the private profile'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.assessment_sessions
    where user_id = '55555555-5555-4555-8555-555555555555'
  $$,
  array[0::bigint],
  'deleting the Auth user cascades to assessment sessions'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.assessment_safety_flags
    where user_id = '55555555-5555-4555-8555-555555555555'
  $$,
  array[0::bigint],
  'deleting the Auth user cascades to assessment safety flags'
);

select * from finish();

rollback;