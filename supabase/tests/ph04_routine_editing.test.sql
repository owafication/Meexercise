begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

select has_function(
  'public',
  'create_manual_routine_version',
  array['uuid','integer','text','uuid[]'],
  'append-only manual routine version function exists'
);

insert into auth.users (id,email,raw_user_meta_data)
values
  ('99999999-9999-4999-8999-999999999981','routine-edit-owner@example.invalid','{}'::jsonb),
  ('99999999-9999-4999-8999-999999999982','routine-edit-other@example.invalid','{}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999981',true);
select set_config('request.jwt.claim.role','authenticated',true);

insert into public.assessment_sessions (
  id,user_id,template_version_id,responses
)
values (
  '99999999-9999-4999-8999-999999999991',
  '99999999-9999-4999-8999-999999999981',
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
where id='99999999-9999-4999-8999-999999999991'
  and row_version=1;

create temp table ph04_edit_routine (routine_id uuid);

insert into ph04_edit_routine (routine_id)
select public.create_manual_routine(
  'Starter routine',
  array[
    'e3333333-3333-4333-8333-333333333334'::uuid,
    'e4444444-4444-4444-8444-444444444444'::uuid
  ]
);

select is(
  public.create_manual_routine_version(
    (select routine_id from ph04_edit_routine),
    1,
    'Edited routine',
    array[
      'e4444444-4444-4444-8444-444444444444'::uuid,
      'e6666666-6666-4666-8666-666666666666'::uuid
    ]
  ),
  2,
  'editing appends routine version two'
);

select is(
  (
    select count(*)::bigint
    from public.routine_versions rv
    join ph04_edit_routine r on r.routine_id=rv.routine_id
  ),
  2::bigint,
  'routine retains both version one and version two'
);

select is(
  (
    select title
    from public.routine_versions rv
    join ph04_edit_routine r on r.routine_id=rv.routine_id
    where rv.version_number=1
  ),
  'Starter routine'::text,
  'version one title remains unchanged'
);

select is(
  (
    select title
    from public.routine_versions rv
    join ph04_edit_routine r on r.routine_id=rv.routine_id
    where rv.version_number=2
  ),
  'Edited routine'::text,
  'version two carries the edited title'
);

select ok(
  (
    select ri.exercise_version_id='e3333333-3333-4333-8333-333333333334'::uuid
    from public.routine_items ri
    join public.routine_sections rs on rs.id=ri.routine_section_id
    join public.routine_versions rv on rv.id=rs.routine_version_id
    join ph04_edit_routine r on r.routine_id=rv.routine_id
    where rv.version_number=1 and ri.position=1
  ),
  'version one keeps wall push-up version two in position one'
);

select ok(
  (
    select ri.exercise_version_id='e4444444-4444-4444-8444-444444444444'::uuid
    from public.routine_items ri
    join public.routine_sections rs on rs.id=ri.routine_section_id
    join public.routine_versions rv on rv.id=rs.routine_version_id
    join ph04_edit_routine r on r.routine_id=rv.routine_id
    where rv.version_number=1 and ri.position=2
  ),
  'version one keeps incline push-up version one in position two'
);

select ok(
  (
    select ri.exercise_version_id='e4444444-4444-4444-8444-444444444444'::uuid
    from public.routine_items ri
    join public.routine_sections rs on rs.id=ri.routine_section_id
    join public.routine_versions rv on rv.id=rs.routine_version_id
    join ph04_edit_routine r on r.routine_id=rv.routine_id
    where rv.version_number=2 and ri.position=1
  ),
  'version two stores edited incline push-up first'
);

select ok(
  (
    select ri.exercise_version_id='e6666666-6666-4666-8666-666666666666'::uuid
    from public.routine_items ri
    join public.routine_sections rs on rs.id=ri.routine_section_id
    join public.routine_versions rv on rv.id=rs.routine_version_id
    join ph04_edit_routine r on r.routine_id=rv.routine_id
    where rv.version_number=2 and ri.position=2
  ),
  'version two stores counter push-up second'
);

select throws_ok(
  format(
    $sql$
      select public.create_manual_routine_version(
        %L::uuid,
        1,
        'Stale edit',
        array['e4444444-4444-4444-8444-444444444444'::uuid]
      )
    $sql$,
    (select routine_id from ph04_edit_routine)
  ),
  '40001',
  'routine changed; reload before saving another version',
  'stale expected version is rejected'
);

select is(
  (
    select count(*)::bigint
    from public.routine_versions rv
    join ph04_edit_routine r on r.routine_id=rv.routine_id
  ),
  2::bigint,
  'stale edit creates no extra version'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999982',true);
select set_config('request.jwt.claim.role','authenticated',true);

select throws_ok(
  format(
    $sql$
      select public.create_manual_routine_version(
        %L::uuid,
        2,
        'Other user edit',
        array['e4444444-4444-4444-8444-444444444444'::uuid]
      )
    $sql$,
    (select routine_id from ph04_edit_routine)
  ),
  '42501',
  'routine unavailable',
  'another authenticated user cannot append a version'
);

select is(
  (select count(*)::bigint from public.routines),
  0::bigint,
  'another authenticated user cannot read the owner routine'
);

reset role;

update public.exercise_versions
set status='withdrawn'
where id='e6666666-6666-4666-8666-666666666666';

set local role authenticated;
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999981',true);
select set_config('request.jwt.claim.role','authenticated',true);

select throws_ok(
  format(
    $sql$
      select public.create_manual_routine_version(
        %L::uuid,
        2,
        'Withdrawn carry-forward',
        array['e6666666-6666-4666-8666-666666666666'::uuid]
      )
    $sql$,
    (select routine_id from ph04_edit_routine)
  ),
  '23514',
  'routine can contain only currently approved visible exercise versions',
  'withdrawn historical exercise cannot be copied into a new version'
);

select is(
  (
    select count(*)::bigint
    from public.routine_versions rv
    join ph04_edit_routine r on r.routine_id=rv.routine_id
  ),
  2::bigint,
  'withdrawn-content rejection creates no extra version'
);

insert into public.assessment_sessions (
  id,user_id,template_version_id,responses,corrects_session_id
)
select
  '99999999-9999-4999-8999-999999999992'::uuid,
  s.user_id,
  s.template_version_id,
  s.responses,
  s.id
from public.assessment_sessions s
where s.id='99999999-9999-4999-8999-999999999991';

update public.assessment_sessions
set
  responses='{
    "schemaVersion":1,
    "activity":{"frequency":"one_two_days"},
    "limitations":{"hasLimitations":true,"affectedAreas":"Shoulder","avoidedMovements":"Overhead press"},
    "readiness":{"independentExercise":"yes","professionalRestriction":"no"}
  }'::jsonb,
  status='completed',
  completed_at=now()
where id='99999999-9999-4999-8999-999999999992'
  and row_version=1;

select throws_ok(
  format(
    $sql$
      select public.create_manual_routine_version(
        %L::uuid,
        2,
        'Restricted edit',
        array[
          'e3333333-3333-4333-8333-333333333334'::uuid,
          'e4444444-4444-4444-8444-444444444444'::uuid
        ]
      )
    $sql$,
    (select routine_id from ph04_edit_routine)
  ),
  '55000',
  'planning restrictions require deterministic constraint handling before saving a routine',
  'newly recorded movement restriction blocks routine editing'
);

select is(
  (
    select count(*)::bigint
    from public.routine_versions rv
    join ph04_edit_routine r on r.routine_id=rv.routine_id
  ),
  2::bigint,
  'restricted edit creates no extra version'
);

reset role;

delete from auth.users
where id='99999999-9999-4999-8999-999999999981';

select is(
  (
    select count(*)::bigint
    from public.routines
    where user_id='99999999-9999-4999-8999-999999999981'
  ),
  0::bigint,
  'account deletion removes routine identity after multiple versions'
);

select is(
  (
    select count(*)::bigint
    from public.routine_versions rv
    join ph04_edit_routine r on r.routine_id=rv.routine_id
  ),
  0::bigint,
  'account deletion cascades through all routine versions'
);

select is(
  (
    select count(*)::bigint
    from public.routine_items ri
    join public.routine_sections rs on rs.id=ri.routine_section_id
    join public.routine_versions rv on rv.id=rs.routine_version_id
    join ph04_edit_routine r on r.routine_id=rv.routine_id
  ),
  0::bigint,
  'account deletion cascades through all versioned routine items'
);

select * from finish();

rollback;
