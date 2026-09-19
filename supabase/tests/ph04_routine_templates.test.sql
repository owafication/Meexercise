begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

select has_table('public','routine_templates','private routine template table exists');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='routine_templates'),'routine templates have RLS enabled');
select has_function('public','create_routine_template_from_routine',array['uuid','text'],'template creation function exists');
select has_function('public','create_routine_from_template',array['uuid','text'],'template instantiation function exists');

insert into auth.users(id,email,raw_user_meta_data) values
('66666666-6666-4666-8666-666666666681','template-owner@example.invalid','{}'::jsonb),
('66666666-6666-4666-8666-666666666682','template-other@example.invalid','{}'::jsonb);

insert into public.assessment_sessions(id,user_id,template_version_id,responses) values(
'66666666-6666-4666-8666-666666666691','66666666-6666-4666-8666-666666666681','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
'{"schemaVersion":1,"activity":{"frequency":"one_two_days"},"limitations":{"hasLimitations":false,"affectedAreas":"","avoidedMovements":"","movementConstraints":[]},"readiness":{"independentExercise":"yes","professionalRestriction":"no"}}'::jsonb);
update public.assessment_sessions set status='completed',completed_at=now() where id='66666666-6666-4666-8666-666666666691' and row_version=1;

set local role authenticated;
select set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666681',true);
select set_config('request.jwt.claim.role','authenticated',true);

create temp table src(routine_id uuid);
insert into src select public.create_manual_routine('Template source routine',array['e3333333-3333-4333-8333-333333333334'::uuid,'e4444444-4444-4444-8444-444444444444'::uuid]);
create temp table saved(template_id uuid);
insert into saved select public.create_routine_template_from_routine((select routine_id from src),'Reusable starter');

select results_eq($$select count(*)::bigint from public.routine_templates where id=(select template_id from saved) and user_id='66666666-6666-4666-8666-666666666681' and title='Reusable starter'$$,array[1::bigint],'template belongs to owner');
select results_eq($$select rv.version_number::bigint from public.routine_templates t join public.routine_versions rv on rv.id=t.source_routine_version_id where t.id=(select template_id from saved)$$,array[1::bigint],'template captures source version one');
select throws_ok(
  $$update public.routine_templates set title='Rewrite' where id=(select template_id from saved)$$,
  '42501',
  'permission denied for table routine_templates',
  'authenticated owner has no update privilege on saved templates'
);

reset role;

select throws_ok(
  $$update public.routine_templates set title='Rewrite' where id=(select template_id from saved)$$,
  '55000',
  'saved routine snapshot rows are immutable',
  'privileged direct update still hits the immutable snapshot trigger'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666681',true);
select set_config('request.jwt.claim.role','authenticated',true);

do $$declare i integer; begin for i in 1..25 loop perform public.create_routine_template_from_routine((select routine_id from src),'Reusable copy '||i::text); end loop; end$$;
select results_eq($$select count(*)::bigint from public.routine_templates where user_id='66666666-6666-4666-8666-666666666681'$$,array[26::bigint],'owner can save many templates without a count or entitlement gate');

set local role authenticated;
select set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666682',true);
select set_config('request.jwt.claim.role','authenticated',true);
select results_eq($$select count(*)::bigint from public.routine_templates$$,array[0::bigint],'other user cannot read owner templates');
select throws_ok(format($sql$select public.create_routine_from_template(%L::uuid,'Foreign template')$sql$,(select template_id from saved)),'42501','template unavailable','other user cannot instantiate owner template');

set local role authenticated;
select set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666681',true);
select set_config('request.jwt.claim.role','authenticated',true);
select is(public.create_manual_routine_version((select routine_id from src),1,'Edited source',array['e4444444-4444-4444-8444-444444444444'::uuid,'e6666666-6666-4666-8666-666666666666'::uuid]),2,'source routine appends version two');
select results_eq($$select rv.version_number::bigint from public.routine_templates t join public.routine_versions rv on rv.id=t.source_routine_version_id where t.id=(select template_id from saved)$$,array[1::bigint],'template remains pinned to source version one');

create temp table instantiated(routine_id uuid);
insert into instantiated select public.create_routine_from_template((select template_id from saved),'Routine from template');
select ok((select routine_id is not null from instantiated),'template creates ordinary routine');
select results_eq($$select count(*)::bigint from public.routine_versions rv join instantiated i on i.routine_id=rv.routine_id where rv.version_number=1 and rv.title='Routine from template'$$,array[1::bigint],'instantiated routine has ordinary version-one snapshot');
select results_eq($$select ri.exercise_version_id from public.routine_items ri join public.routine_sections rs on rs.id=ri.routine_section_id join public.routine_versions rv on rv.id=rs.routine_version_id join instantiated i on i.routine_id=rv.routine_id where ri.position=1$$,array['e3333333-3333-4333-8333-333333333334'::uuid],'instantiated item one preserved');
select results_eq($$select ri.exercise_version_id from public.routine_items ri join public.routine_sections rs on rs.id=ri.routine_section_id join public.routine_versions rv on rv.id=rs.routine_version_id join instantiated i on i.routine_id=rv.routine_id where ri.position=2$$,array['e4444444-4444-4444-8444-444444444444'::uuid],'instantiated item two preserved');

reset role;
select lives_ok($$update public.exercise_versions set status='withdrawn' where id='e3333333-3333-4333-8333-333333333334'$$,'source exercise may later be withdrawn');
set local role authenticated;
select set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666681',true);
select set_config('request.jwt.claim.role','authenticated',true);
select results_eq($$select count(*)::bigint from public.routine_templates where id=(select template_id from saved)$$,array[1::bigint],'template remains readable after source withdrawal');
select results_eq($$select count(*)::bigint from public.exercise_versions where id='e3333333-3333-4333-8333-333333333334' and status='withdrawn'$$,array[1::bigint],'owner still reads exact withdrawn source through routine history');
select throws_ok(format($sql$select public.create_routine_from_template(%L::uuid,'Stale withdrawn template')$sql$,(select template_id from saved)),'23514','routine can contain only currently approved visible exercise versions','instantiation rechecks current approval');

reset role;
delete from auth.users where id='66666666-6666-4666-8666-666666666681';
select results_eq($$select count(*)::bigint from public.routine_templates where user_id='66666666-6666-4666-8666-666666666681'$$,array[0::bigint],'account deletion removes templates');
select results_eq($$select count(*)::bigint from public.routines where user_id='66666666-6666-4666-8666-666666666681'$$,array[0::bigint],'account deletion removes source and instantiated routines');
select * from finish();
rollback;
