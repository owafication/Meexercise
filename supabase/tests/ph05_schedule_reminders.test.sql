begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

-- 1
select has_table(
  'public',
  'plan_schedule_reminder_settings',
  'schedule reminder settings table exists'
);

-- 2
select has_function(
  'public',
  'save_plan_schedule_with_reminder',
  array[
    'uuid',
    'integer',
    'integer',
    'text',
    'date',
    'boolean',
    'jsonb',
    'integer'
  ],
  'schedule save with reminder function exists'
);

-- 3
select ok(
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'plan_schedule_reminder_settings'
  ),
  'schedule reminder settings have RLS enabled'
);

insert into auth.users(id,email,raw_user_meta_data) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa81','reminder-owner@example.invalid','{}'::jsonb),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa82','reminder-other@example.invalid','{}'::jsonb);

insert into public.assessment_sessions(
  id,
  user_id,
  template_version_id,
  responses
)
values(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa91',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa81',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  '{"schemaVersion":1,"activity":{"frequency":"one_two_days"},"limitations":{"hasLimitations":false,"affectedAreas":"","avoidedMovements":"","movementConstraints":[]},"readiness":{"independentExercise":"yes","professionalRestriction":"no"}}'::jsonb
);

update public.assessment_sessions
set status = 'completed',
    completed_at = now()
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa91'
  and row_version = 1;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa81',
  true
);
select set_config('request.jwt.claim.role','authenticated',true);

create temp table reminder_routine(routine_id uuid);

insert into reminder_routine
select public.create_manual_routine(
  'Reminder routine',
  array[
    'e3333333-3333-4333-8333-333333333334'::uuid,
    'e4444444-4444-4444-8444-444444444444'::uuid
  ]
);

create temp table reminder_routine_version(routine_version_id uuid);

insert into reminder_routine_version
select rv.id
from public.routine_versions rv
where rv.routine_id = (select routine_id from reminder_routine)
  and rv.version_number = 1;

create temp table reminder_plan(plan_id uuid);

insert into reminder_plan
select public.create_plan(
  'Reminder plan',
  array[(select routine_version_id from reminder_routine_version)]
);

-- 4
select is(
  public.save_plan_schedule_with_reminder(
    (select plan_id from reminder_plan),
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
        (select routine_version_id::text from reminder_routine_version)
      )
    ),
    60
  ),
  1,
  'schedule version one saves with a one-hour in-app reminder'
);

-- 5
select results_eq(
  $$select count(*)::bigint
    from public.plan_schedule_reminder_settings$$,
  array[1::bigint],
  'one reminder setting is stored for schedule version one'
);

-- 6
select results_eq(
  $$select minutes_before::bigint
    from public.plan_schedule_reminder_settings$$,
  array[60::bigint],
  'reminder setting stores the configured lead time'
);

-- 7
select results_eq(
  $$select reminder_minutes_before::bigint
    from public.get_my_plan_schedule_occurrences(
      '2030-01-07 00:00:00+00'::timestamptz,
      '2030-01-08 00:00:00+00'::timestamptz
    )$$,
  array[60::bigint],
  'occurrence projection exposes reminder lead time'
);

-- 8
select results_eq(
  $$select reminder_at
    from public.get_my_plan_schedule_occurrences(
      '2030-01-07 00:00:00+00'::timestamptz,
      '2030-01-08 00:00:00+00'::timestamptz
    )$$,
  array['2030-01-07 08:00:00+00'::timestamptz],
  'reminder time is derived from the effective occurrence start'
);

-- 9
select throws_ok(
  $$select public.save_plan_schedule_with_reminder(
    (select plan_id from reminder_plan),
    1,
    1,
    'Etc/UTC',
    '2030-01-07'::date,
    false,
    jsonb_build_array(
      jsonb_build_object(
        'weekday', 1,
        'window_start', '10:00',
        'window_end', '11:00',
        'routine_version_id',
        (select routine_version_id::text from reminder_routine_version)
      )
    ),
    14
  )$$,
  '23514',
  'schedule reminder lead time must be between 15 and 10080 minutes',
  'reminder lead time below the supported bound is rejected'
);

-- 10
select is(
  public.save_plan_schedule_with_reminder(
    (select plan_id from reminder_plan),
    1,
    1,
    'Etc/UTC',
    '2030-01-07'::date,
    false,
    jsonb_build_array(
      jsonb_build_object(
        'weekday', 1,
        'window_start', '10:00',
        'window_end', '11:00',
        'routine_version_id',
        (select routine_version_id::text from reminder_routine_version)
      )
    ),
    null
  ),
  2,
  'schedule version two can deliberately disable the in-app reminder'
);

-- 11
select results_eq(
  $$select coalesce(reminder_minutes_before, -1)::bigint
    from public.get_my_plan_schedule_occurrences(
      '2030-01-07 00:00:00+00'::timestamptz,
      '2030-01-08 00:00:00+00'::timestamptz
    )$$,
  array[-1::bigint],
  'current occurrence has no reminder after reminder-off schedule version'
);

-- 12
select results_eq(
  $$select count(*)::bigint
    from public.plan_schedule_reminder_settings$$,
  array[1::bigint],
  'historical reminder setting remains attached to schedule version one'
);

-- 13
select is(
  public.save_plan_schedule_with_reminder(
    (select plan_id from reminder_plan),
    1,
    2,
    'Etc/UTC',
    '2030-01-07'::date,
    false,
    jsonb_build_array(
      jsonb_build_object(
        'weekday', 1,
        'window_start', '11:00',
        'window_end', '12:00',
        'routine_version_id',
        (select routine_version_id::text from reminder_routine_version)
      )
    ),
    2880
  ),
  3,
  'schedule version three saves a two-day reminder'
);

-- 14
select results_eq(
  $$select reminder_minutes_before::bigint
    from public.get_my_plan_schedule_occurrences(
      '2030-01-07 00:00:00+00'::timestamptz,
      '2030-01-08 00:00:00+00'::timestamptz
    )$$,
  array[2880::bigint],
  'current occurrence projects the new two-day reminder'
);

-- 15
select is(
  public.save_plan_schedule_occurrence_exception(
    (select plan_id from reminder_plan),
    3,
    '2030-01-07'::date,
    'reschedule',
    0,
    '2030-01-08'::date,
    '13:00'::time,
    '14:00'::time
  ),
  1,
  'occurrence can be rescheduled while retaining schedule reminder settings'
);

-- 16
select results_eq(
  $$select occurrence_status
    from public.get_my_plan_schedule_occurrences(
      '2030-01-08 00:00:00+00'::timestamptz,
      '2030-01-09 00:00:00+00'::timestamptz
    )$$,
  array['rescheduled'::text],
  'rescheduled occurrence remains explicit'
);

-- 17
select results_eq(
  $$select reminder_at
    from public.get_my_plan_schedule_occurrences(
      '2030-01-08 00:00:00+00'::timestamptz,
      '2030-01-09 00:00:00+00'::timestamptz
    )$$,
  array['2030-01-06 13:00:00+00'::timestamptz],
  'reschedule moves reminder time with the effective occurrence start'
);

-- 18
select results_eq(
  $$select routine_version_id
    from public.get_my_plan_schedule_occurrences(
      '2030-01-08 00:00:00+00'::timestamptz,
      '2030-01-09 00:00:00+00'::timestamptz
    )$$,
  array[(select routine_version_id from reminder_routine_version)],
  'rescheduled reminder occurrence preserves the exact routine version'
);

-- 19
select is(
  public.save_plan_schedule_occurrence_exception(
    (select plan_id from reminder_plan),
    3,
    '2030-01-07'::date,
    'skip',
    1,
    null,
    null,
    null
  ),
  2,
  'skip appends over the reschedule exception'
);

-- 20
select results_eq(
  $$select count(*)::bigint
    from public.get_my_plan_schedule_occurrences(
      '2030-01-08 00:00:00+00'::timestamptz,
      '2030-01-09 00:00:00+00'::timestamptz
    )$$,
  array[0::bigint],
  'skip suppresses both the occurrence and its projected reminder'
);

-- 21
select is(
  public.save_plan_schedule_occurrence_exception(
    (select plan_id from reminder_plan),
    3,
    '2030-01-07'::date,
    'restore',
    2,
    null,
    null,
    null
  ),
  3,
  'restore reactivates the original occurrence'
);

-- 22
select results_eq(
  $$select reminder_minutes_before::bigint
    from public.get_my_plan_schedule_occurrences(
      '2030-01-07 00:00:00+00'::timestamptz,
      '2030-01-08 00:00:00+00'::timestamptz
    )$$,
  array[2880::bigint],
  'restore reactivates the schedule-version reminder'
);

set local request.jwt.claim.sub =
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa82';

-- 23
select results_eq(
  $$select count(*)::bigint
    from public.plan_schedule_reminder_settings$$,
  array[0::bigint],
  'another authenticated user cannot read owner reminder settings'
);

-- 24
select throws_ok(
  $$select public.save_plan_schedule_with_reminder(
    (select plan_id from reminder_plan),
    1,
    3,
    'Etc/UTC',
    '2030-01-07'::date,
    false,
    jsonb_build_array(
      jsonb_build_object(
        'weekday', 1,
        'window_start', '12:00',
        'window_end', '13:00',
        'routine_version_id',
        (select routine_version_id::text from reminder_routine_version)
      )
    ),
    60
  )$$,
  '42501',
  'plan unavailable',
  'another authenticated user cannot create reminder schedule versions'
);

reset role;

-- 25
select throws_ok(
  $$update public.plan_schedule_reminder_settings
    set minutes_before = 30$$,
  '55000',
  'saved plan schedule snapshot rows are immutable',
  'privileged direct reminder-setting rewrite is rejected'
);

-- Capture both settings of this plan before its schedule versions disappear.
create temp table deleting_reminder_fixture(schedule_version_id uuid primary key) on commit drop;
insert into deleting_reminder_fixture(schedule_version_id)
select rs.schedule_version_id
from public.plan_schedule_reminder_settings rs
join public.plan_schedule_versions sv on sv.id = rs.schedule_version_id
join public.plan_schedules ps on ps.id = sv.schedule_id
where ps.plan_id = (select plan_id from reminder_plan);

do $fixture$
begin
  if (select count(*) from deleting_reminder_fixture) <> 2 then
    raise exception 'reminder deletion fixture must contain both historical settings';
  end if;
end
$fixture$;

-- 26
select lives_ok(
  $$delete from auth.users
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa81'$$,
  'owner account deletion succeeds with reminder history present'
);

-- 27
select results_eq(
  $$select count(*)::bigint
    from public.plan_schedule_reminder_settings
    where schedule_version_id in (select schedule_version_id from deleting_reminder_fixture)$$,
  array[0::bigint],
  'account deletion removes both fixture reminder settings'
);

select * from finish();
rollback;
