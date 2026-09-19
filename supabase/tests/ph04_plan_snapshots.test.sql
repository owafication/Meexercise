begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

select has_table('public','plans','private plans table exists');
select has_table('public','plan_versions','immutable plan versions table exists');
select has_table('public','plan_version_routines','exact plan routine-version composition table exists');
select has_function('public','create_plan',array['text','uuid[]'],'plan creation function exists');
select has_function('public','create_plan_version',array['uuid','integer','text','uuid[]'],'plan version function exists');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='plans'),'plans have RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='plan_versions'),'plan versions have RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='plan_version_routines'),'plan routine snapshots have RLS enabled');

insert into auth.users(id,email,raw_user_meta_data) values
('77777777-7777-4777-8777-777777777781','plan-owner@example.invalid','{}'::jsonb),
('77777777-7777-4777-8777-777777777782','plan-other@example.invalid','{}'::jsonb);

insert into public.assessment_sessions(id,user_id,template_version_id,responses) values(
'77777777-7777-4777-8777-777777777791',
'77777777-7777-4777-8777-777777777781',
'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
'{"schemaVersion":1,"activity":{"frequency":"one_two_days"},"limitations":{"hasLimitations":false,"affectedAreas":"","avoidedMovements":"","movementConstraints":[]},"readiness":{"independentExercise":"yes","professionalRestriction":"no"}}'::jsonb
);
update public.assessment_sessions
set status='completed',completed_at=now()
where id='77777777-7777-4777-8777-777777777791' and row_version=1;

set local role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777781',true);
select set_config('request.jwt.claim.role','authenticated',true);

create temp table routine_source_a(routine_id uuid);
insert into routine_source_a
select public.create_manual_routine(
  'Plan routine A',
  array[
    'e3333333-3333-4333-8333-333333333334'::uuid,
    'e4444444-4444-4444-8444-444444444444'::uuid
  ]
);

create temp table routine_source_b(routine_id uuid);
insert into routine_source_b
select public.create_manual_routine(
  'Plan routine B',
  array[
    'e1111111-1111-4111-8111-111111111111'::uuid,
    'e6666666-6666-4666-8666-666666666666'::uuid
  ]
);

create temp table routine_versions_exact as
select
  (select rv.id from public.routine_versions rv where rv.routine_id=(select routine_id from routine_source_a) and rv.version_number=1) as routine_a_v1,
  (select rv.id from public.routine_versions rv where rv.routine_id=(select routine_id from routine_source_b) and rv.version_number=1) as routine_b_v1;

create temp table saved_plan(plan_id uuid);
insert into saved_plan
select public.create_plan(
  'Durable plan',
  array[
    (select routine_a_v1 from routine_versions_exact),
    (select routine_b_v1 from routine_versions_exact)
  ]
);

select ok((select plan_id is not null from saved_plan),'plan creation returns an identity');
select results_eq(
  $$select count(*)::bigint from public.plans where id=(select plan_id from saved_plan) and user_id='77777777-7777-4777-8777-777777777781'$$,
  array[1::bigint],
  'plan belongs to owner'
);
select results_eq(
  $$select version_number::bigint from public.plan_versions where plan_id=(select plan_id from saved_plan)$$,
  array[1::bigint],
  'new plan starts at version one'
);
select results_eq(
  $$select count(*)::bigint from public.plan_version_routines pvr join public.plan_versions pv on pv.id=pvr.plan_version_id where pv.plan_id=(select plan_id from saved_plan) and pv.version_number=1$$,
  array[2::bigint],
  'plan version one stores two routine snapshots'
);
select results_eq(
  $$select pvr.routine_version_id from public.plan_version_routines pvr join public.plan_versions pv on pv.id=pvr.plan_version_id where pv.plan_id=(select plan_id from saved_plan) and pv.version_number=1 order by pvr.position$$,
  array[
    (select routine_a_v1 from routine_versions_exact),
    (select routine_b_v1 from routine_versions_exact)
  ],
  'plan preserves exact ordered routine-version composition'
);

select throws_ok(
  $$update public.plan_versions set title='Rewrite' where plan_id=(select plan_id from saved_plan)$$,
  '42501',
  'permission denied for table plan_versions',
  'authenticated owner cannot update a stored plan version directly'
);

reset role;

select throws_ok(
  $$update public.plan_versions set title='Rewrite' where plan_id=(select plan_id from saved_plan)$$,
  '55000',
  'saved plan snapshot rows are immutable',
  'privileged direct update still hits plan snapshot immutability'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777781',true);
select set_config('request.jwt.claim.role','authenticated',true);

do $$
declare i integer;
begin
  for i in 1..25 loop
    perform public.create_plan(
      'Saved plan '||i::text,
      array[(select routine_b_v1 from routine_versions_exact)]
    );
  end loop;
end
$$;

select results_eq(
  $$select count(*)::bigint from public.plans where user_id='77777777-7777-4777-8777-777777777781'$$,
  array[26::bigint],
  'owner can save many plans without a count or entitlement gate'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777782',true);
select set_config('request.jwt.claim.role','authenticated',true);

select results_eq(
  $$select count(*)::bigint from public.plans$$,
  array[0::bigint],
  'other user cannot read owner plans'
);

select throws_ok(
  format(
    $sql$select public.create_plan_version(%L::uuid,1,'Foreign plan',array[%L::uuid])$sql$,
    (select plan_id from saved_plan),
    (select routine_b_v1 from routine_versions_exact)
  ),
  '42501',
  'plan unavailable',
  'other user cannot append a version to owner plan'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777781',true);
select set_config('request.jwt.claim.role','authenticated',true);

select is(
  public.create_manual_routine_version(
    (select routine_id from routine_source_a),
    1,
    'Plan routine A updated',
    array[
      'e4444444-4444-4444-8444-444444444444'::uuid,
      'e6666666-6666-4666-8666-666666666666'::uuid
    ]
  ),
  2,
  'source routine appends version two'
);

alter table routine_versions_exact add column routine_a_v2 uuid;
update routine_versions_exact
set routine_a_v2=(
  select rv.id
  from public.routine_versions rv
  where rv.routine_id=(select routine_id from routine_source_a)
    and rv.version_number=2
);

select results_eq(
  $$select pvr.routine_version_id from public.plan_version_routines pvr join public.plan_versions pv on pv.id=pvr.plan_version_id where pv.plan_id=(select plan_id from saved_plan) and pv.version_number=1 and pvr.position=1$$,
  array[(select routine_a_v1 from routine_versions_exact)],
  'existing plan version remains pinned after source routine changes'
);

select is(
  public.create_plan_version(
    (select plan_id from saved_plan),
    1,
    'Durable plan updated',
    array[
      (select routine_a_v2 from routine_versions_exact),
      (select routine_b_v1 from routine_versions_exact)
    ]
  ),
  2,
  'plan update appends version two'
);

select results_eq(
  $$select count(*)::bigint from public.plan_versions where plan_id=(select plan_id from saved_plan)$$,
  array[2::bigint],
  'plan retains both immutable versions'
);

select results_eq(
  $$select pvr.routine_version_id from public.plan_version_routines pvr join public.plan_versions pv on pv.id=pvr.plan_version_id where pv.plan_id=(select plan_id from saved_plan) and pv.version_number=2 order by pvr.position$$,
  array[
    (select routine_a_v2 from routine_versions_exact),
    (select routine_b_v1 from routine_versions_exact)
  ],
  'new plan version records the new exact routine composition'
);

select throws_ok(
  format(
    $sql$select public.create_plan_version(%L::uuid,1,'Stale plan',array[%L::uuid])$sql$,
    (select plan_id from saved_plan),
    (select routine_b_v1 from routine_versions_exact)
  ),
  '40001',
  'plan changed; reload before saving another version',
  'stale plan edit is rejected'
);

reset role;

select lives_ok(
  $$update public.exercise_versions set status='withdrawn' where id='e3333333-3333-4333-8333-333333333334'$$,
  'historical routine exercise may later be withdrawn'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777781',true);
select set_config('request.jwt.claim.role','authenticated',true);

select results_eq(
  $$select count(*)::bigint from public.plan_versions where plan_id=(select plan_id from saved_plan) and version_number=1$$,
  array[1::bigint],
  'existing plan history remains readable after source withdrawal'
);

select throws_ok(
  format(
    $sql$select public.create_plan_version(%L::uuid,2,'Unsafe carry forward',array[%L::uuid,%L::uuid])$sql$,
    (select plan_id from saved_plan),
    (select routine_a_v1 from routine_versions_exact),
    (select routine_b_v1 from routine_versions_exact)
  ),
  '23514',
  'routine can contain only currently approved visible exercise versions',
  'new plan version revalidates current approval of exact routine content'
);

reset role;

delete from auth.users where id='77777777-7777-4777-8777-777777777781';

select results_eq(
  $$select count(*)::bigint from public.plans where user_id='77777777-7777-4777-8777-777777777781'$$,
  array[0::bigint],
  'account deletion removes plans'
);

select results_eq(
  $$select count(*)::bigint from public.plan_versions where plan_id=(select plan_id from saved_plan)$$,
  array[0::bigint],
  'account deletion cascades through plan versions'
);

select results_eq(
  $$select count(*)::bigint from public.routines where user_id='77777777-7777-4777-8777-777777777781'$$,
  array[0::bigint],
  'account deletion still removes routine sources'
);

select * from finish();
rollback;