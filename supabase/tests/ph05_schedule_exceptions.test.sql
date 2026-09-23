begin;
create extension if not exists pgtap with schema extensions;
select plan(39);

-- 1
select has_table(
  'public',
  'plan_schedule_occurrence_exceptions',
  'schedule occurrence exceptions table exists'
);

-- 2
select has_table(
  'public',
  'plan_schedule_occurrence_exception_versions',
  'schedule occurrence exception versions table exists'
);

-- 3
select has_function(
  'public',
  'save_plan_schedule_occurrence_exception',
  array[
    'uuid',
    'integer',
    'date',
    'text',
    'integer',
    'date',
    'time without time zone',
    'time without time zone'
  ],
  'occurrence exception save function exists'
);

-- 4
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'plan_schedule_occurrence_exceptions'
  ),
  'occurrence exceptions have RLS enabled'
);

-- 5
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'plan_schedule_occurrence_exception_versions'
  ),
  'occurrence exception versions have RLS enabled'
);

insert into auth.users(id,email,raw_user_meta_data) values
('99999999-9999-4999-8999-999999999981','exception-owner@example.invalid','{}'::jsonb),
('99999999-9999-4999-8999-999999999982','exception-other@example.invalid','{}'::jsonb);

insert into public.assessment_sessions(
  id,
  user_id,
  template_version_id,
  responses
)
values(
  '99999999-9999-4999-8999-999999999991',
  '99999999-9999-4999-8999-999999999981',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  '{"schemaVersion":1,"activity":{"frequency":"one_two_days"},"limitations":{"hasLimitations":false,"affectedAreas":"","avoidedMovements":"","movementConstraints":[]},"readiness":{"independentExercise":"yes","professionalRestriction":"no"}}'::jsonb
);

update public.assessment_sessions
set status = 'completed',
    completed_at = now()
where id = '99999999-9999-4999-8999-999999999991'
  and row_version = 1;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '99999999-9999-4999-8999-999999999981',
  true
);
select set_config('request.jwt.claim.role','authenticated',true);

create temp table exception_routine(routine_id uuid);

insert into exception_routine
select public.create_manual_routine(
  'Exception routine',
  array[
    'e3333333-3333-4333-8333-333333333334'::uuid,
    'e4444444-4444-4444-8444-444444444444'::uuid
  ]
);

create temp table exception_routine_version(routine_version_id uuid);

insert into exception_routine_version
select rv.id
from public.routine_versions rv
where rv.routine_id = (select routine_id from exception_routine)
  and rv.version_number = 1;

create temp table exception_plan(plan_id uuid);

insert into exception_plan
select public.create_plan(
  'Occurrence exception plan',
  array[(select routine_version_id from exception_routine_version)]
);

-- 6
select is(
  public.save_plan_schedule(
    (select plan_id from exception_plan),
    1,
    0,
    'Etc/UTC',
    '2030-01-07'::date,
    false,
    jsonb_build_array(
      jsonb_build_object(
        'weekday', 1,
        'window_start', '09:00',
        'window_end', '10:00',
        'routine_version_id',
        (select routine_version_id::text from exception_routine_version)
      )
    )
  ),
  1,
  'baseline weekly schedule saves as version one'
);

-- 7
select results_eq(
  $$select count(*)::bigint
    from public.get_my_plan_schedule_occurrences(
      '2030-01-07 00:00:00+00'::timestamptz,
      '2030-01-08 00:00:00+00'::timestamptz
    )$$,
  array[1::bigint],
  'baseline Monday occurrence is projected'
);

-- 8
select is(
  public.save_plan_schedule_occurrence_exception(
    (select plan_id from exception_plan),
    1,
    '2030-01-07'::date,
    'skip',
    0,
    null,
    null,
    null
  ),
  1,
  'first skip saves exception version one'
);

-- 9
select results_eq(
  $$select count(*)::bigint
    from public.plan_schedule_occurrence_exceptions$$,
  array[1::bigint],
  'skip creates one stable exception identity'
);

-- 10
select results_eq(
  $$select action
    from public.plan_schedule_occurrence_exception_versions
    where version_number = 1$$,
  array['skip'::text],
  'exception version one records skip'
);

-- 11
select results_eq(
  $$select count(*)::bigint
    from public.get_my_plan_schedule_occurrences(
      '2030-01-07 00:00:00+00'::timestamptz,
      '2030-01-08 00:00:00+00'::timestamptz
    )$$,
  array[0::bigint],
  'skip suppresses the original occurrence'
);

-- 12
select throws_ok(
  $$select public.save_plan_schedule_occurrence_exception(
    (select plan_id from exception_plan),
    1,
    '2030-01-07'::date,
    'skip',
    0,
    null,
    null,
    null
  )$$,
  '40001',
  'occurrence exception changed; reload before saving',
  'stale exception version is rejected'
);

-- 13
select is(
  public.save_plan_schedule_occurrence_exception(
    (select plan_id from exception_plan),
    1,
    '2030-01-07'::date,
    'reschedule',
    1,
    '2030-01-08'::date,
    '11:00'::time,
    '12:00'::time
  ),
  2,
  'skip can be changed to reschedule as exception version two'
);

-- 14
select results_eq(
  $$select count(*)::bigint
    from public.plan_schedule_occurrence_exception_versions$$,
  array[2::bigint],
  'exception history keeps both immutable versions'
);

-- 15
select results_eq(
  $$select count(*)::bigint
    from public.get_my_plan_schedule_occurrences(
      '2030-01-07 00:00:00+00'::timestamptz,
      '2030-01-08 00:00:00+00'::timestamptz
    )$$,
  array[0::bigint],
  'reschedule suppresses the original window'
);

-- 16
select results_eq(
  $$select count(*)::bigint
    from public.get_my_plan_schedule_occurrences(
      '2030-01-08 00:00:00+00'::timestamptz,
      '2030-01-09 00:00:00+00'::timestamptz
    )$$,
  array[1::bigint],
  'rescheduled occurrence appears in its target window'
);

-- 17
select results_eq(
  $$select local_date
    from public.get_my_plan_schedule_occurrences(
      '2030-01-08 00:00:00+00'::timestamptz,
      '2030-01-09 00:00:00+00'::timestamptz
    )$$,
  array['2030-01-08'::date],
  'rescheduled occurrence reports the effective local date'
);

-- 18
select results_eq(
  $$select window_start
    from public.get_my_plan_schedule_occurrences(
      '2030-01-08 00:00:00+00'::timestamptz,
      '2030-01-09 00:00:00+00'::timestamptz
    )$$,
  array['11:00'::time],
  'rescheduled occurrence reports the effective start time'
);

-- 19
select results_eq(
  $$select original_local_date
    from public.get_my_plan_schedule_occurrences(
      '2030-01-08 00:00:00+00'::timestamptz,
      '2030-01-09 00:00:00+00'::timestamptz
    )$$,
  array['2030-01-07'::date],
  'rescheduled occurrence retains its original local date'
);

-- 20
select results_eq(
  $$select routine_version_id
    from public.get_my_plan_schedule_occurrences(
      '2030-01-08 00:00:00+00'::timestamptz,
      '2030-01-09 00:00:00+00'::timestamptz
    )$$,
  array[(select routine_version_id from exception_routine_version)],
  'reschedule preserves the exact routine version'
);

-- 21
select results_eq(
  $$select occurrence_status
    from public.get_my_plan_schedule_occurrences(
      '2030-01-08 00:00:00+00'::timestamptz,
      '2030-01-09 00:00:00+00'::timestamptz
    )$$,
  array['rescheduled'::text],
  'rescheduled occurrence is explicitly labelled'
);

-- 22
select ok(
  (
    select exception_id is not null
    from public.get_my_plan_schedule_occurrences(
      '2030-01-08 00:00:00+00'::timestamptz,
      '2030-01-09 00:00:00+00'::timestamptz
    )
  ),
  'rescheduled occurrence exposes its exception identity'
);

-- 23
select results_eq(
  $$select exception_version_number::bigint
    from public.get_my_plan_schedule_occurrences(
      '2030-01-08 00:00:00+00'::timestamptz,
      '2030-01-09 00:00:00+00'::timestamptz
    )$$,
  array[2::bigint],
  'rescheduled occurrence exposes current exception version'
);

-- 24
select is(
  public.save_plan_schedule_occurrence_exception(
    (select plan_id from exception_plan),
    1,
    '2030-01-07'::date,
    'restore',
    2,
    null,
    null,
    null
  ),
  3,
  'restore appends exception version three'
);

-- 25
select results_eq(
  $$select count(*)::bigint
    from public.get_my_plan_schedule_occurrences(
      '2030-01-07 00:00:00+00'::timestamptz,
      '2030-01-08 00:00:00+00'::timestamptz
    )$$,
  array[1::bigint],
  'restore brings the original occurrence back'
);

-- 26
select results_eq(
  $$select occurrence_status
    from public.get_my_plan_schedule_occurrences(
      '2030-01-07 00:00:00+00'::timestamptz,
      '2030-01-08 00:00:00+00'::timestamptz
    )$$,
  array['scheduled'::text],
  'restored occurrence returns to scheduled status'
);

-- 27
select results_eq(
  $$select exception_version_number::bigint
    from public.get_my_plan_schedule_occurrences(
      '2030-01-07 00:00:00+00'::timestamptz,
      '2030-01-08 00:00:00+00'::timestamptz
    )$$,
  array[3::bigint],
  'restored occurrence carries the latest exception version for safe future edits'
);

-- 28
select throws_ok(
  $$select public.save_plan_schedule_occurrence_exception(
    (select plan_id from exception_plan),
    1,
    '2030-01-08'::date,
    'skip',
    0,
    null,
    null,
    null
  )$$,
  '23514',
  'original occurrence does not exist in the current schedule',
  'an unscheduled weekday cannot receive an exception'
);

-- 29
select throws_ok(
  $$select public.save_plan_schedule_occurrence_exception(
    (select plan_id from exception_plan),
    1,
    '2030-01-07'::date,
    'reschedule',
    3,
    '2030-01-08'::date,
    '12:00'::time,
    '11:00'::time
  )$$,
  '23514',
  'rescheduled occurrence needs a valid date and time window',
  'invalid reschedule window is rejected'
);

-- 30
select is(
  public.save_plan_schedule(
    (select plan_id from exception_plan),
    1,
    1,
    'Etc/UTC',
    '2030-01-07'::date,
    false,
    jsonb_build_array(
      jsonb_build_object(
        'weekday', 1,
        'window_start', '14:00',
        'window_end', '15:00',
        'routine_version_id',
        (select routine_version_id::text from exception_routine_version)
      )
    )
  ),
  2,
  'recurring schedule can advance to version two'
);

-- 31
select results_eq(
  $$select window_start
    from public.get_my_plan_schedule_occurrences(
      '2030-01-07 00:00:00+00'::timestamptz,
      '2030-01-08 00:00:00+00'::timestamptz
    )$$,
  array['14:00'::time],
  'new schedule version projects its own recurrence'
);

-- 32
select results_eq(
  $$select exception_version_number::bigint
    from public.get_my_plan_schedule_occurrences(
      '2030-01-07 00:00:00+00'::timestamptz,
      '2030-01-08 00:00:00+00'::timestamptz
    )$$,
  array[0::bigint],
  'old schedule-version exceptions are not silently inherited'
);

-- 33
select results_eq(
  $$select count(*)::bigint
    from public.plan_schedule_occurrence_exception_versions$$,
  array[3::bigint],
  'old exact-schedule exception history remains preserved'
);

set local request.jwt.claim.sub =
  '99999999-9999-4999-8999-999999999982';

-- 34
select results_eq(
  $$select count(*)::bigint
    from public.plan_schedule_occurrence_exceptions$$,
  array[0::bigint],
  'another authenticated user cannot read the owner exception identity'
);

-- 35
select throws_ok(
  $$select public.save_plan_schedule_occurrence_exception(
    (select plan_id from exception_plan),
    2,
    '2030-01-07'::date,
    'skip',
    0,
    null,
    null,
    null
  )$$,
  '42501',
  'plan unavailable',
  'another authenticated user cannot mutate the owner schedule occurrence'
);

reset role;

-- 36
select throws_ok(
  $$update public.plan_schedule_occurrence_exception_versions
    set action = 'skip'
    where version_number = 3$$,
  '55000',
  'saved plan schedule snapshot rows are immutable',
  'privileged direct exception-version rewrite is rejected'
);

-- 37
select lives_ok(
  $$delete from auth.users
    where id = '99999999-9999-4999-8999-999999999981'$$,
  'owner account deletion succeeds with occurrence exception history present'
);

-- 38
select results_eq(
  $$select count(*)::bigint
    from public.plan_schedule_occurrence_exceptions$$,
  array[0::bigint],
  'account deletion cascades occurrence exception identities'
);

-- 39
select results_eq(
  $$select count(*)::bigint
    from public.plan_schedule_occurrence_exception_versions$$,
  array[0::bigint],
  'account deletion leaves no orphan occurrence exception versions'
);

select * from finish();
rollback;
