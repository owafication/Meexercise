begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

select has_table(
  'assessment_safety_flags',
  'assessment safety flags table exists'
);

select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'assessment_safety_flags'
  ),
  'RLS is enabled on assessment safety flags'
);

insert into auth.users (
  id,
  email,
  raw_user_meta_data
)
values
  (
    '33333333-3333-4333-8333-333333333333',
    'assessment1@example.invalid',
    '{}'::jsonb
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'assessment2@example.invalid',
    '{}'::jsonb
  );

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);

select set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

select lives_ok(
  $$
    insert into public.assessment_sessions (
      id,
      user_id,
      template_version_id,
      responses
    )
    values (
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      '33333333-3333-4333-8333-333333333333',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      '{"schemaVersion":1}'::jsonb
    )
  $$,
  'an authenticated user can start an in-progress assessment'
);

select throws_ok(
  $$
    insert into public.assessment_sessions (
      id,
      user_id,
      template_version_id,
      status,
      responses,
      completed_at
    )
    values (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      '33333333-3333-4333-8333-333333333333',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      'completed',
      '{}'::jsonb,
      now()
    )
  $$,
  '55000',
  'assessment sessions must start in progress',
  'assessment sessions cannot bypass the in-progress start state'
);

select lives_ok(
  $$
    update public.assessment_sessions
    set responses = '{
      "schemaVersion":1,
      "activity":{"frequency":"one_two_days"},
      "limitations":{
        "hasLimitations":true,
        "affectedAreas":"left shoulder",
        "avoidedMovements":"overhead pressing"
      },
      "readiness":{
        "independentExercise":"yes",
        "professionalRestriction":"yes"
      }
    }'::jsonb
    where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
      and row_version = 1
  $$,
  'the owner can save assessment progress'
);

select results_eq(
  $$
    select row_version
    from public.assessment_sessions
    where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  $$,
  array[2::bigint],
  'saving assessment progress increments row_version'
);

select lives_ok(
  $$
    update public.assessment_sessions
    set
      status = 'completed',
      completed_at = now()
    where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
      and row_version = 2
  $$,
  'the owner can complete the saved assessment'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.assessment_safety_flags
    where session_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
      and flag_code = 'movement_restrictions_present'
      and outcome = 'restrict_generation'
  $$,
  array[1::bigint],
  'movement limitations derive a restrictive planning flag'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.assessment_safety_flags
    where session_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
      and flag_code = 'professional_review_recommended'
      and outcome = 'block_generation'
  $$,
  array[1::bigint],
  'professional restriction derives a block-generation flag'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.assessment_safety_flags
  $$,
  array[2::bigint],
  'the owner can read both safety flags'
);

select set_config(
  'request.jwt.claim.sub',
  '44444444-4444-4444-8444-444444444444',
  true
);

select set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

select results_eq(
  $$
    select count(*)::bigint
    from public.assessment_safety_flags
  $$,
  array[0::bigint],
  'another user cannot read assessment safety flags'
);

select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);

select set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

select throws_ok(
  $$
    update public.assessment_safety_flags
    set outcome = 'block_generation'
    where session_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
      and flag_code = 'movement_restrictions_present'
  $$,
  '42501',
  null,
  'authenticated users cannot rewrite derived safety flags'
);

select results_eq(
  $$
    select status::text
    from public.assessment_sessions
    where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  $$,
  array['completed'::text],
  'the assessment remains completed after safety flag checks'
);

select * from finish();

rollback;