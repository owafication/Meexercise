begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

select has_column(
  'assessment_sessions',
  'corrects_session_id',
  'assessment sessions expose a correction predecessor link'
);

insert into auth.users (
  id,
  email,
  raw_user_meta_data
)
values
  (
    '66666666-6666-4666-8666-666666666666',
    'correction-owner@example.invalid',
    '{}'::jsonb
  ),
  (
    '77777777-7777-4777-8777-777777777777',
    'correction-other@example.invalid',
    '{}'::jsonb
  );

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  '66666666-6666-4666-8666-666666666666',
  true
);

select set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

insert into public.assessment_sessions (
  id,
  user_id,
  template_version_id,
  responses
)
values (
  '11111111-aaaa-4111-8111-111111111111',
  '66666666-6666-4666-8666-666666666666',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  '{
    "schemaVersion":1,
    "activity":{"frequency":"one_two_days"},
    "limitations":{
      "hasLimitations":true,
      "affectedAreas":"left shoulder",
      "avoidedMovements":"overhead pressing"
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
where id = '11111111-aaaa-4111-8111-111111111111'
  and row_version = 1;

select lives_ok(
  $$
    insert into public.assessment_sessions (
      id,
      user_id,
      template_version_id,
      responses,
      corrects_session_id
    )
    select
      '22222222-bbbb-4222-8222-222222222222',
      user_id,
      template_version_id,
      responses,
      id
    from public.assessment_sessions
    where id = '11111111-aaaa-4111-8111-111111111111'
  $$,
  'owner can start a correction from an owned completed assessment'
);

select results_eq(
  $$
    select corrects_session_id
    from public.assessment_sessions
    where id = '22222222-bbbb-4222-8222-222222222222'
  $$,
  array['11111111-aaaa-4111-8111-111111111111'::uuid],
  'correction records the immediate completed predecessor'
);

select results_eq(
  $$
    select template_version_id
    from public.assessment_sessions
    where id = '22222222-bbbb-4222-8222-222222222222'
  $$,
  array['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid],
  'correction preserves the exact assessment template version'
);

select results_eq(
  $$
    select responses #>> '{limitations,affectedAreas}'
    from public.assessment_sessions
    where id = '22222222-bbbb-4222-8222-222222222222'
  $$,
  array['left shoulder'::text],
  'correction starts from the source answers'
);

select throws_ok(
  $$
    update public.assessment_sessions
    set corrects_session_id = null
    where id = '22222222-bbbb-4222-8222-222222222222'
  $$,
  '55000',
  'assessment correction source is immutable',
  'correction predecessor cannot be changed after creation'
);

select set_config(
  'request.jwt.claim.sub',
  '77777777-7777-4777-8777-777777777777',
  true
);

select throws_ok(
  $$
    insert into public.assessment_sessions (
      id,
      user_id,
      template_version_id,
      responses,
      corrects_session_id
    )
    values (
      '33333333-cccc-4333-8333-333333333333',
      '77777777-7777-4777-8777-777777777777',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      '{}'::jsonb,
      '11111111-aaaa-4111-8111-111111111111'
    )
  $$,
  '55000',
  'assessment correction source is not available',
  'another authenticated user cannot create a correction of the owner record'
);

select set_config(
  'request.jwt.claim.sub',
  '66666666-6666-4666-8666-666666666666',
  true
);

select lives_ok(
  $$
    update public.assessment_sessions
    set
      responses = jsonb_set(
        responses,
        '{limitations,affectedAreas}',
        '"right shoulder"'::jsonb
      ),
      status = 'completed',
      completed_at = now()
    where id = '22222222-bbbb-4222-8222-222222222222'
      and row_version = 1
  $$,
  'owner can complete the corrected successor'
);

select results_eq(
  $$
    select responses #>> '{limitations,affectedAreas}'
    from public.assessment_sessions
    where id = '11111111-aaaa-4111-8111-111111111111'
  $$,
  array['left shoulder'::text],
  'original completed assessment remains unchanged'
);

select results_eq(
  $$
    select responses #>> '{limitations,affectedAreas}'
    from public.assessment_sessions
    where id = '22222222-bbbb-4222-8222-222222222222'
  $$,
  array['right shoulder'::text],
  'corrected successor stores the corrected answer'
);

reset role;

delete from auth.users
where id = '66666666-6666-4666-8666-666666666666';

select results_eq(
  $$
    select count(*)::bigint
    from public.assessment_sessions
    where id in (
      '11111111-aaaa-4111-8111-111111111111',
      '22222222-bbbb-4222-8222-222222222222'
    )
  $$,
  array[0::bigint],
  'account deletion removes both source and correction primary records'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.assessment_safety_flags
    where user_id = '66666666-6666-4666-8666-666666666666'
  $$,
  array[0::bigint],
  'account deletion removes safety flags from the correction chain'
);

select * from finish();

rollback;
