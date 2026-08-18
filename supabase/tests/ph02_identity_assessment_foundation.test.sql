begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

select has_table('profiles', 'profiles table exists');
select has_table('assessment_templates', 'assessment_templates table exists');
select has_table('assessment_template_versions', 'assessment_template_versions table exists');
select has_table('assessment_sessions', 'assessment_sessions table exists');

select results_eq(
  $$
    select count(*)::bigint
    from pg_class c
    join pg_namespace n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'profiles',
        'assessment_templates',
        'assessment_template_versions',
        'assessment_sessions'
      )
      and c.relrowsecurity
  $$,
  array[4::bigint],
  'RLS is enabled on every PH-02 public table'
);

insert into auth.users (
  id,
  email,
  raw_user_meta_data
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'user1@example.invalid',
    '{}'::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'user2@example.invalid',
    '{}'::jsonb
  );

insert into public.profiles (
  user_id,
  display_name
)
values (
  '22222222-2222-4222-8222-222222222222',
  'User Two'
);

insert into public.assessment_template_versions (
  id,
  template_id,
  version_number,
  title,
  status,
  definition,
  published_at
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  2,
  'Draft readiness baseline',
  'draft',
  '{"sections":[]}'::jsonb,
  null
);

select throws_ok(
  $$
    update public.assessment_template_versions
    set title = 'Mutated published title'
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
  $$,
  '55000',
  'published assessment versions are immutable',
  'published assessment versions cannot be rewritten'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);

select set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

select lives_ok(
  $$
    insert into public.profiles (
      user_id,
      display_name
    )
    values (
      '11111111-1111-4111-8111-111111111111',
      'User One'
    )
  $$,
  'an authenticated user can create their own profile'
);

select results_eq(
  $$select count(*)::bigint from public.profiles$$,
  array[1::bigint],
  'a user can read only their own profile'
);

select results_eq(
  $$
    with changed as (
      update public.profiles
      set display_name = 'Should not change'
      where user_id = '22222222-2222-4222-8222-222222222222'
      returning 1
    )
    select count(*)::bigint from changed
  $$,
  array[0::bigint],
  'a user cannot update another user profile'
);

select results_eq(
  $$
    with changed as (
      update public.profiles
      set display_name = 'User One Updated'
      where user_id = '11111111-1111-4111-8111-111111111111'
        and row_version = 1
      returning 1
    )
    select count(*)::bigint from changed
  $$,
  array[1::bigint],
  'an update succeeds when the expected row version matches'
);

select results_eq(
  $$
    select row_version
    from public.profiles
    where user_id = '11111111-1111-4111-8111-111111111111'
  $$,
  array[2::bigint],
  'successful profile updates increment row_version'
);

select results_eq(
  $$
    with changed as (
      update public.profiles
      set display_name = 'Stale write'
      where user_id = '11111111-1111-4111-8111-111111111111'
        and row_version = 1
      returning 1
    )
    select count(*)::bigint from changed
  $$,
  array[0::bigint],
  'a stale optimistic-concurrency update changes no row'
);

select results_eq(
  $$select count(*)::bigint from public.assessment_template_versions$$,
  array[1::bigint],
  'authenticated users can read published assessment versions but not drafts'
);

select throws_ok(
  $$
    insert into public.assessment_sessions (
      id,
      user_id,
      template_version_id,
      responses
    )
    values (
      'cccccccc-cccc-4ccc-8ccc-ccccccccccd2',
      '11111111-1111-4111-8111-111111111111',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
      '{}'::jsonb
    )
  $$,
  '42501',
  null,
  'a user cannot start an assessment from an unpublished template version'
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
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      '11111111-1111-4111-8111-111111111111',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      '{"answers":{}}'::jsonb
    )
  $$,
  'an authenticated user can start their own published assessment session'
);

select results_eq(
  $$select count(*)::bigint from public.assessment_sessions$$,
  array[1::bigint],
  'a user can read their own assessment session'
);

select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);

select set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

select results_eq(
  $$select count(*)::bigint from public.assessment_sessions$$,
  array[0::bigint],
  'another user cannot read the first user assessment session'
);

select results_eq(
  $$
    with changed as (
      update public.assessment_sessions
      set responses = '{"answers":{"tampered":true}}'::jsonb
      where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
      returning 1
    )
    select count(*)::bigint from changed
  $$,
  array[0::bigint],
  'another user cannot update the first user assessment session'
);

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);

select set_config(
  'request.jwt.claim.role',
  'authenticated',
  true
);

select lives_ok(
  $$
    update public.assessment_sessions
    set
      status = 'completed',
      completed_at = now()
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
      and row_version = 1
  $$,
  'the owner can complete an in-progress assessment session'
);

select results_eq(
  $$
    select row_version
    from public.assessment_sessions
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  $$,
  array[2::bigint],
  'completing an assessment increments its row version'
);

select throws_ok(
  $$
    update public.assessment_sessions
    set responses = '{"answers":{"after_completion":true}}'::jsonb
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  $$,
  '55000',
  'completed assessment sessions are immutable',
  'completed assessment history cannot be rewritten'
);

select * from finish();

rollback;
