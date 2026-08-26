begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

select has_function(
  'private',
  'require_routine_exercise_constraints',
  array['uuid','uuid[]'],
  'manual routine persistence has one private structured-constraint authority'
);

insert into auth.users (id,email,raw_user_meta_data)
values
  ('77777777-7777-4777-8777-777777777781','constraint-create@example.invalid','{}'::jsonb),
  ('77777777-7777-4777-8777-777777777782','constraint-edit@example.invalid','{}'::jsonb),
  ('77777777-7777-4777-8777-777777777783','constraint-unresolved@example.invalid','{}'::jsonb),
  ('77777777-7777-4777-8777-777777777784','constraint-blocked@example.invalid','{}'::jsonb);

insert into public.assessment_sessions (
  id,user_id,template_version_id,responses
)
values
(
  '77777777-7777-4777-8777-777777777791',
  '77777777-7777-4777-8777-777777777781',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  '{
    "schemaVersion":1,
    "activity":{"frequency":"one_two_days"},
    "limitations":{
      "hasLimitations":true,
      "affectedAreas":"Wrist",
      "avoidedMovements":"Weight through hands",
      "movementConstraints":["surface_hand_loading"]
    },
    "readiness":{"independentExercise":"yes","professionalRestriction":"no"}
  }'::jsonb
),
(
  '77777777-7777-4777-8777-777777777792',
  '77777777-7777-4777-8777-777777777782',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  '{
    "schemaVersion":1,
    "activity":{"frequency":"one_two_days"},
    "limitations":{
      "hasLimitations":false,
      "affectedAreas":"",
      "avoidedMovements":"",
      "movementConstraints":[]
    },
    "readiness":{"independentExercise":"yes","professionalRestriction":"no"}
  }'::jsonb
),
(
  '77777777-7777-4777-8777-777777777793',
  '77777777-7777-4777-8777-777777777783',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  '{
    "schemaVersion":1,
    "activity":{"frequency":"one_two_days"},
    "limitations":{
      "hasLimitations":true,
      "affectedAreas":"Wrist",
      "avoidedMovements":"Weight through hands",
      "movementConstraints":[]
    },
    "readiness":{"independentExercise":"yes","professionalRestriction":"no"}
  }'::jsonb
),
(
  '77777777-7777-4777-8777-777777777794',
  '77777777-7777-4777-8777-777777777784',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  '{
    "schemaVersion":1,
    "activity":{"frequency":"one_two_days"},
    "limitations":{
      "hasLimitations":false,
      "affectedAreas":"",
      "avoidedMovements":"",
      "movementConstraints":[]
    },
    "readiness":{"independentExercise":"yes","professionalRestriction":"yes"}
  }'::jsonb
);

update public.assessment_sessions
set status='completed',completed_at=now()
where id in (
  '77777777-7777-4777-8777-777777777791',
  '77777777-7777-4777-8777-777777777792',
  '77777777-7777-4777-8777-777777777793',
  '77777777-7777-4777-8777-777777777794'
)
and row_version=1;

set local role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777781',true);
select set_config('request.jwt.claim.role','authenticated',true);

create temp table ph04_constraint_create (routine_id uuid);

insert into ph04_constraint_create (routine_id)
select public.create_manual_routine(
  'Compatible restricted routine',
  array['e7777777-7777-4777-8777-777777777777'::uuid]
);

select ok(
  (select routine_id is not null from ph04_constraint_create),
  'supported structured restriction permits a fully compatible manual routine'
);

select is(
  (
    select ri.exercise_version_id
    from public.routine_items ri
    join public.routine_sections rs on rs.id=ri.routine_section_id
    join public.routine_versions rv on rv.id=rs.routine_version_id
    join ph04_constraint_create c on c.routine_id=rv.routine_id
    where rv.version_number=1 and ri.position=1
  ),
  'e7777777-7777-4777-8777-777777777777'::uuid,
  'restricted routine stores the exact compatible resistance-band press version'
);

select throws_ok(
  $$
    select public.create_manual_routine(
      'Incompatible restricted routine',
      array['e3333333-3333-4333-8333-333333333334'::uuid]
    )
  $$,
  '23514',
  'routine contains an exercise version that conflicts with current structured planning constraints',
  'surface-hand-loading restriction rejects wall push-up at the database boundary'
);

select is(
  (select count(*)::bigint from public.routines),
  1::bigint,
  'incompatible restricted create inserts no second owner routine'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777782',true);
select set_config('request.jwt.claim.role','authenticated',true);

create temp table ph04_constraint_edit (routine_id uuid);

insert into ph04_constraint_edit (routine_id)
select public.create_manual_routine(
  'Initially unrestricted',
  array['e3333333-3333-4333-8333-333333333334'::uuid]
);

select ok(
  (select routine_id is not null from ph04_constraint_edit),
  'unrestricted owner can create the initial wall-push-up routine'
);

reset role;

insert into public.assessment_sessions (
  id,user_id,template_version_id,responses,corrects_session_id
)
select
  '77777777-7777-4777-8777-777777777795'::uuid,
  s.user_id,
  s.template_version_id,
  s.responses,
  s.id
from public.assessment_sessions s
where s.id='77777777-7777-4777-8777-777777777792';

update public.assessment_sessions
set
  responses='{
    "schemaVersion":1,
    "activity":{"frequency":"one_two_days"},
    "limitations":{
      "hasLimitations":true,
      "affectedAreas":"Wrist",
      "avoidedMovements":"Weight through hands",
      "movementConstraints":["surface_hand_loading"]
    },
    "readiness":{"independentExercise":"yes","professionalRestriction":"no"}
  }'::jsonb,
  status='completed',
  completed_at=now()
where id='77777777-7777-4777-8777-777777777795'
  and row_version=1;

set local role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777782',true);
select set_config('request.jwt.claim.role','authenticated',true);

select is(
  public.create_manual_routine_version(
    (select routine_id from ph04_constraint_edit),
    1,
    'Restricted compatible edit',
    array['e7777777-7777-4777-8777-777777777777'::uuid]
  ),
  2,
  'restricted edit can append a fully compatible replacement version'
);

select is(
  (
    select ri.exercise_version_id
    from public.routine_items ri
    join public.routine_sections rs on rs.id=ri.routine_section_id
    join public.routine_versions rv on rv.id=rs.routine_version_id
    join ph04_constraint_edit c on c.routine_id=rv.routine_id
    where rv.version_number=1 and ri.position=1
  ),
  'e3333333-3333-4333-8333-333333333334'::uuid,
  'historical version one retains the formerly selected wall push-up'
);

select is(
  (
    select ri.exercise_version_id
    from public.routine_items ri
    join public.routine_sections rs on rs.id=ri.routine_section_id
    join public.routine_versions rv on rv.id=rs.routine_version_id
    join ph04_constraint_edit c on c.routine_id=rv.routine_id
    where rv.version_number=2 and ri.position=1
  ),
  'e7777777-7777-4777-8777-777777777777'::uuid,
  'new version two stores the user-selected compatible substitution'
);

select throws_ok(
  format(
    $sql$
      select public.create_manual_routine_version(
        %L::uuid,
        2,
        'Reintroduce incompatible wall push-up',
        array['e3333333-3333-4333-8333-333333333334'::uuid]
      )
    $sql$,
    (select routine_id from ph04_constraint_edit)
  ),
  '23514',
  'routine contains an exercise version that conflicts with current structured planning constraints',
  'restricted edit cannot reintroduce an incompatible exact version'
);

select is(
  (
    select count(*)::bigint
    from public.routine_versions rv
    join ph04_constraint_edit c on c.routine_id=rv.routine_id
  ),
  2::bigint,
  'incompatible edit creates no version three'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777783',true);
select set_config('request.jwt.claim.role','authenticated',true);

select throws_ok(
  $$
    select public.create_manual_routine(
      'Unresolved restricted routine',
      array['e7777777-7777-4777-8777-777777777777'::uuid]
    )
  $$,
  '55000',
  'structured movement constraints are required before restricted planning',
  'restricted readiness with no supported structured choice remains fail closed'
);

select is(
  (select count(*)::bigint from public.routines),
  0::bigint,
  'unresolved restricted owner receives no routine insert'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777784',true);
select set_config('request.jwt.claim.role','authenticated',true);

select throws_ok(
  $$
    select public.create_manual_routine(
      'Blocked routine',
      array['e7777777-7777-4777-8777-777777777777'::uuid]
    )
  $$,
  '55000',
  'planning is blocked by the current readiness assessment',
  'block-generation outcome remains stronger than compatible movement tags'
);

select is(
  (select count(*)::bigint from public.routines),
  0::bigint,
  'blocked owner receives no routine insert'
);

select * from finish();

rollback;
