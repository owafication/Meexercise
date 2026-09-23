begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

select has_table('public','plan_schedules','stable plan schedules table exists');
select has_table('public','plan_schedule_versions','immutable schedule versions table exists');
select has_table('public','plan_schedule_rules','weekly schedule rules table exists');
select has_function(
  'public',
  'save_plan_schedule',
  array['uuid','integer','integer','text','date','boolean','jsonb'],
  'schedule save function exists'
);
select has_function(
  'public',
  'get_my_plan_schedule_occurrences',
  array['timestamp with time zone','timestamp with time zone'],
  'schedule occurrence projection exists'
);
select ok(
  (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='plan_schedules'),
  'plan schedules have RLS enabled'
);
select ok(
  (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='plan_schedule_versions'),
  'schedule versions have RLS enabled'
);
select ok(
  (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='plan_schedule_rules'),
  'schedule rules have RLS enabled'
);

insert into auth.users(id,email,raw_user_meta_data) values
('88888888-8888-4888-8888-888888888881','schedule-owner@example.invalid','{}'::jsonb),
('88888888-8888-4888-8888-888888888882','schedule-other@example.invalid','{}'::jsonb);

insert into public.assessment_sessions(id,user_id,template_version_id,responses) values(
'88888888-8888-4888-8888-888888888891',
'88888888-8888-4888-8888-888888888881',
'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
'{"schemaVersion":1,"activity":{"frequency":"one_two_days"},"limitations":{"hasLimitations":false,"affectedAreas":"","avoidedMovements":"","movementConstraints":[]},"readiness":{"independentExercise":"yes","professionalRestriction":"no"}}'::jsonb
);
update public.assessment_sessions
set status='completed',completed_at=now()
where id='88888888-8888-4888-8888-888888888891' and row_version=1;

set local role authenticated;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888881',true);
select set_config('request.jwt.claim.role','authenticated',true);

create temp table schedule_routine_a(routine_id uuid);
insert into schedule_routine_a
select public.create_manual_routine(
  'Schedule routine A',
  array[
    'e3333333-3333-4333-8333-333333333334'::uuid,
    'e4444444-4444-4444-8444-444444444444'::uuid
  ]
);

create temp table schedule_routine_b(routine_id uuid);
insert into schedule_routine_b
select public.create_manual_routine(
  'Schedule routine B',
  array[
    'e1111111-1111-4111-8111-111111111111'::uuid,
    'e6666666-6666-4666-8666-666666666666'::uuid
  ]
);

create temp table schedule_routine_versions as
select
  (select rv.id from public.routine_versions rv where rv.routine_id=(select routine_id from schedule_routine_a) and rv.version_number=1) as routine_a_v1,
  (select rv.id from public.routine_versions rv where rv.routine_id=(select routine_id from schedule_routine_b) and rv.version_number=1) as routine_b_v1;

create temp table schedule_plan(plan_id uuid);
insert into schedule_plan
select public.create_plan(
  'DST schedule plan',
  array[
    (select routine_a_v1 from schedule_routine_versions),
    (select routine_b_v1 from schedule_routine_versions)
  ]
);

select is(
  public.save_plan_schedule(
    (select plan_id from schedule_plan),
    1,
    0,
    'Australia/Adelaide',
    '2026-09-20'::date,
    false,
    jsonb_build_array(
      jsonb_build_object(
        'weekday',7,
        'window_start','09:00',
        'window_end','10:00',
        'routine_version_id',(select routine_a_v1::text from schedule_routine_versions)
      )
    )
  ),
  1,
  'first weekly schedule save returns version one'
);

select results_eq(
  $$select count(*)::bigint from public.plan_schedules where plan_id=(select plan_id from schedule_plan)$$,
  array[1::bigint],
  'owner plan has one stable schedule identity'
);

select results_eq(
  $$select pv.version_number::bigint
    from public.plan_schedule_versions psv
    join public.plan_versions pv on pv.id=psv.plan_version_id
    join public.plan_schedules ps on ps.id=psv.schedule_id
    where ps.plan_id=(select plan_id from schedule_plan) and psv.version_number=1$$,
  array[1::bigint],
  'schedule version one pins exact plan version one'
);

select results_eq(
  $$select count(*)::bigint
    from public.plan_schedule_rules psr
    join public.plan_schedule_versions psv on psv.id=psr.schedule_version_id
    join public.plan_schedules ps on ps.id=psv.schedule_id
    where ps.plan_id=(select plan_id from schedule_plan) and psv.version_number=1$$,
  array[1::bigint],
  'schedule version stores one weekly rule'
);

select results_eq(
  $$select psv.timezone_name
    from public.plan_schedule_versions psv
    join public.plan_schedules ps on ps.id=psv.schedule_id
    where ps.plan_id=(select plan_id from schedule_plan) and psv.version_number=1$$,
  array['Australia/Adelaide'::text],
  'schedule stores recognized named timezone'
);

select results_eq(
  $$select count(*)::bigint
    from public.get_my_plan_schedule_occurrences(
      '2026-09-26 00:00:00+00'::timestamptz,
      '2026-10-12 00:00:00+00'::timestamptz
    )
    where plan_id=(select plan_id from schedule_plan)$$,
  array[3::bigint],
  'weekly recurrence expands across the Adelaide DST transition'
);

select results_eq(
  $$select to_char(local_date,'YYYY-MM-DD') || ' ' || to_char(window_start,'HH24:MI')
    from public.get_my_plan_schedule_occurrences(
      '2026-09-26 00:00:00+00'::timestamptz,
      '2026-10-12 00:00:00+00'::timestamptz
    )
    where plan_id=(select plan_id from schedule_plan)
    order by starts_at$$,
  array[
    '2026-09-27 09:00'::text,
    '2026-10-04 09:00'::text,
    '2026-10-11 09:00'::text
  ],
  'local wall-clock recurrence stays at 09:00 across DST'
);

select results_eq(
  $$select to_char(starts_at at time zone 'UTC','YYYY-MM-DD HH24:MI')
    from public.get_my_plan_schedule_occurrences(
      '2026-09-26 00:00:00+00'::timestamptz,
      '2026-10-12 00:00:00+00'::timestamptz
    )
    where plan_id=(select plan_id from schedule_plan)
    order by starts_at$$,
  array[
    '2026-09-26 23:30'::text,
    '2026-10-03 22:30'::text,
    '2026-10-10 22:30'::text
  ],
  'UTC projection changes with Adelaide DST while local time stays fixed'
);

select throws_ok(
  format(
    $sql$select public.save_plan_schedule(%L::uuid,1,1,'Definitely/Not_A_Zone','2026-09-20'::date,false,%L::jsonb)$sql$,
    (select plan_id from schedule_plan),
    jsonb_build_array(
      jsonb_build_object(
        'weekday',1,
        'window_start','09:00',
        'window_end','10:00',
        'routine_version_id',(select routine_a_v1::text from schedule_routine_versions)
      )
    )::text
  ),
  '23514',
  'schedule timezone must be a recognized time zone name',
  'unrecognized schedule timezone fails closed'
);

select throws_ok(
  format(
    $sql$select public.save_plan_schedule(%L::uuid,1,1,'Etc/UTC','2026-09-20'::date,false,%L::jsonb)$sql$,
    (select plan_id from schedule_plan),
    jsonb_build_array(
      jsonb_build_object(
        'weekday',1,
        'window_start','10:00',
        'window_end','10:00',
        'routine_version_id',(select routine_a_v1::text from schedule_routine_versions)
      )
    )::text
  ),
  '23514',
  'schedule window end must be later than its start',
  'invalid same-time window fails closed'
);

select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888882',true);

select results_eq(
  $$select count(*)::bigint from public.plan_schedules$$,
  array[0::bigint],
  'other authenticated user cannot read owner schedule'
);

select throws_ok(
  format(
    $sql$select public.save_plan_schedule(%L::uuid,1,0,'Etc/UTC','2026-09-20'::date,false,'[{"weekday":1,"window_start":"09:00","window_end":"10:00","routine_version_id":"%s"}]'::jsonb)$sql$,
    (select plan_id from schedule_plan),
    (select routine_a_v1::text from schedule_routine_versions)
  ),
  '42501',
  'plan unavailable',
  'other user cannot create or edit owner plan schedule'
);

select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888881',true);

select is(
  public.create_plan_version(
    (select plan_id from schedule_plan),
    1,
    'DST schedule plan updated',
    array[
      (select routine_a_v1 from schedule_routine_versions),
      (select routine_b_v1 from schedule_routine_versions)
    ]
  ),
  2,
  'source plan appends version two'
);

select throws_ok(
  format(
    $sql$select public.save_plan_schedule(%L::uuid,1,1,'Etc/UTC','2026-10-01'::date,false,%L::jsonb)$sql$,
    (select plan_id from schedule_plan),
    jsonb_build_array(
      jsonb_build_object(
        'weekday',1,
        'window_start','10:00',
        'window_end','11:00',
        'routine_version_id',(select routine_b_v1::text from schedule_routine_versions)
      )
    )::text
  ),
  '40001',
  'plan changed; reload before saving the schedule',
  'stale expected plan version cannot silently retarget a schedule'
);

select is(
  public.save_plan_schedule(
    (select plan_id from schedule_plan),
    2,
    1,
    'Etc/UTC',
    '2026-10-01'::date,
    false,
    jsonb_build_array(
      jsonb_build_object(
        'weekday',1,
        'window_start','10:00',
        'window_end','11:00',
        'routine_version_id',(select routine_b_v1::text from schedule_routine_versions)
      )
    )
  ),
  2,
  'schedule edit appends version two'
);

select results_eq(
  $$select pv.version_number::bigint
    from public.plan_schedule_versions psv
    join public.plan_versions pv on pv.id=psv.plan_version_id
    join public.plan_schedules ps on ps.id=psv.schedule_id
    where ps.plan_id=(select plan_id from schedule_plan) and psv.version_number=1$$,
  array[1::bigint],
  'historical schedule version remains pinned to plan version one'
);

select results_eq(
  $$select pv.version_number::bigint
    from public.plan_schedule_versions psv
    join public.plan_versions pv on pv.id=psv.plan_version_id
    join public.plan_schedules ps on ps.id=psv.schedule_id
    where ps.plan_id=(select plan_id from schedule_plan) and psv.version_number=2$$,
  array[2::bigint],
  'new schedule version pins current plan version two'
);

select throws_ok(
  $$update public.plan_schedule_versions
    set timezone_name='Australia/Darwin'
    where schedule_id=(select id from public.plan_schedules where plan_id=(select plan_id from schedule_plan))$$,
  '42501',
  'permission denied for table plan_schedule_versions',
  'authenticated owner cannot rewrite schedule history directly'
);

reset role;

select throws_ok(
  $$update public.plan_schedule_versions
    set timezone_name='Australia/Darwin'
    where schedule_id=(select id from public.plan_schedules where plan_id=(select plan_id from schedule_plan))$$,
  '55000',
  'saved plan schedule snapshot rows are immutable',
  'privileged direct update still hits schedule immutability'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888881',true);
select set_config('request.jwt.claim.role','authenticated',true);

select throws_ok(
  format(
    $sql$select public.save_plan_schedule(%L::uuid,2,1,'Etc/UTC','2026-10-01'::date,false,%L::jsonb)$sql$,
    (select plan_id from schedule_plan),
    jsonb_build_array(
      jsonb_build_object(
        'weekday',1,
        'window_start','11:00',
        'window_end','12:00',
        'routine_version_id',(select routine_b_v1::text from schedule_routine_versions)
      )
    )::text
  ),
  '40001',
  'schedule changed; reload before saving another version',
  'stale schedule edit is rejected'
);

select is(
  public.save_plan_schedule(
    (select plan_id from schedule_plan),
    2,
    2,
    'Etc/UTC',
    '2026-10-01'::date,
    true,
    jsonb_build_array(
      jsonb_build_object(
        'weekday',1,
        'window_start','10:00',
        'window_end','11:00',
        'routine_version_id',(select routine_b_v1::text from schedule_routine_versions)
      )
    )
  ),
  3,
  'pause appends schedule version three'
);

select results_eq(
  $$select count(*)::bigint
    from public.get_my_plan_schedule_occurrences(
      '2026-10-01 00:00:00+00'::timestamptz,
      '2026-10-20 00:00:00+00'::timestamptz
    )
    where plan_id=(select plan_id from schedule_plan)$$,
  array[0::bigint],
  'paused current schedule produces no upcoming occurrences'
);

reset role;

delete from auth.users
where id='88888888-8888-4888-8888-888888888881';

select results_eq(
  $$select count(*)::bigint from public.plan_schedules where plan_id=(select plan_id from schedule_plan)$$,
  array[0::bigint],
  'account deletion removes stable schedule identity'
);

select results_eq(
  $$select count(*)::bigint
    from public.plan_schedule_versions
    where schedule_id not in (select id from public.plan_schedules)$$,
  array[0::bigint],
  'account deletion leaves no orphan schedule versions'
);

select results_eq(
  $$select count(*)::bigint
    from public.plan_schedule_rules
    where schedule_version_id not in (select id from public.plan_schedule_versions)$$,
  array[0::bigint],
  'account deletion leaves no orphan schedule rules'
);

select * from finish();
rollback;
