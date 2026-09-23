begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

-- 1-6: exposure, ownership and mutation authority.
select has_table('public','plan_progression_reviews','review snapshots exist');
select has_table('public','plan_progression_review_events','append-only review events exist');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n
  on n.oid=c.relnamespace where n.nspname='public'
  and c.relname='plan_progression_reviews'), 'review snapshots have RLS');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n
  on n.oid=c.relnamespace where n.nspname='public'
  and c.relname='plan_progression_review_events'), 'review events have RLS');
select has_function('public','create_conservative_plan_progression_review',
  array['uuid','integer','integer','text','smallint'],
  'conservative proposal RPC exists');
select has_function('public','dismiss_conservative_plan_progression_review',
  array['uuid','integer'], 'proposal dismissal RPC exists');

insert into auth.users(id,email,raw_user_meta_data) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa71','progression-owner@example.invalid','{}'::jsonb),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa72','progression-other@example.invalid','{}'::jsonb);

insert into public.assessment_sessions(
  id,user_id,template_version_id,responses
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa73',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa71',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  '{"schemaVersion":1,"activity":{"frequency":"one_two_days"},"limitations":{"hasLimitations":false,"affectedAreas":"","avoidedMovements":"","movementConstraints":[]},"readiness":{"independentExercise":"yes","professionalRestriction":"no"}}'::jsonb
);
update public.assessment_sessions
set status='completed', completed_at=now()
where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa73'
  and row_version=1;

set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa71',true);
select set_config('request.jwt.claim.role','authenticated',true);

create temp table progression_routine(routine_id uuid);
insert into progression_routine
select public.create_manual_routine('Progression fixture routine', array[
  'e3333333-3333-4333-8333-333333333334'::uuid,
  'e4444444-4444-4444-8444-444444444444'::uuid
]);

create temp table progression_routine_version(routine_version_id uuid);
insert into progression_routine_version
select rv.id from public.routine_versions rv
where rv.routine_id=(select routine_id from progression_routine)
  and rv.version_number=1;

create temp table progression_plan(plan_id uuid);
insert into progression_plan
select public.create_plan('Progression fixture plan',
  array[(select routine_version_id from progression_routine_version)]);

select public.save_plan_schedule_with_reminder(
  (select plan_id from progression_plan),
  1, 0, 'Etc/UTC', '2031-01-06'::date, false,
  jsonb_build_array(
    jsonb_build_object('weekday',1,'window_start','09:00',
      'window_end','10:00','routine_version_id',
      (select routine_version_id::text from progression_routine_version)),
    jsonb_build_object('weekday',2,'window_start','09:00',
      'window_end','10:00','routine_version_id',
      (select routine_version_id::text from progression_routine_version))
  ),60
);

create temp table difficulty_review(review_id uuid);
insert into difficulty_review
select public.create_conservative_plan_progression_review(
  (select plan_id from progression_plan),1,1,
  'excessive_difficulty',2::smallint
);

-- 7-11: a bounded, explicit frequency reduction proposal, not an applied change.
select results_eq($$select count(*)::bigint from difficulty_review where review_id is not null$$,
  array[1::bigint],'owner can create a proposal');
select results_eq($$select old_weekly_sessions::integer from public.plan_progression_reviews
  where id=(select review_id from difficulty_review)$$,
  array[2::integer],'proposal records previous weekly frequency');
select results_eq($$select new_weekly_sessions::integer from public.plan_progression_reviews
  where id=(select review_id from difficulty_review)$$,
  array[1::integer],'proposal displays conservative new frequency');
select results_eq($$select remove_weekday::integer from public.plan_progression_reviews
  where id=(select review_id from difficulty_review)$$,
  array[2::integer],'proposal records explicitly selected weekday');
select results_eq($$select action from public.plan_progression_review_events
  where review_id=(select review_id from difficulty_review)$$,
  array['proposed'::text],'proposal starts at immutable event one');

select results_eq($$select public.create_conservative_plan_progression_review(
  (select plan_id from progression_plan),1,1,
  'excessive_difficulty',2::smallint
)$$,
  array[(select review_id from difficulty_review)],
  'identical still-pending feedback returns the same review idempotently');

-- 12: no silent selection of a day to remove.
select throws_ok($$select public.create_conservative_plan_progression_review(
  (select plan_id from progression_plan),1,1,
  'user_requested_reduction',null::smallint
)$$,'23514','choose one scheduled weekday to remove',
  'multi-day reductions require user choice of the removed weekday');

create temp table discomfort_review(review_id uuid);
insert into discomfort_review
select public.create_conservative_plan_progression_review(
  (select plan_id from progression_plan),1,1,
  'discomfort',null::smallint
);

-- 13-16: discomfort proposes pause, no diagnosis and NO schedule mutation.
select results_eq($$select proposed_action from public.plan_progression_reviews
  where id=(select review_id from discomfort_review)$$,
  array['pause'::text],'discomfort yields conservative pause proposal');
select results_eq($$select new_weekly_sessions::integer from public.plan_progression_reviews
  where id=(select review_id from discomfort_review)$$,
  array[0::integer],'pause preview shows zero effective weekly sessions');
select results_eq($$select count(*)::bigint from public.plan_schedule_versions
  where schedule_id=(select id from public.plan_schedules
    where plan_id=(select plan_id from progression_plan))$$,
  array[1::bigint],'proposals do not change the active schedule snapshot');
select results_eq($$select count(*)::bigint from public.plan_progression_reviews$$,
  array[2::bigint],'both user feedback proposals remain owner-visible');

-- 17-19: cross-account denial, including privileged RPC boundaries.
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa72',true);
select results_eq($$select count(*)::bigint from public.plan_progression_reviews$$,
  array[0::bigint],'another user cannot see private progression feedback');
select throws_ok($$select public.create_conservative_plan_progression_review(
  (select plan_id from progression_plan),1,1,'discomfort',null::smallint
)$$,'42501','plan unavailable',
  'another user cannot propose changes for a foreign plan');
select throws_ok($$select public.dismiss_conservative_plan_progression_review(
  (select review_id from difficulty_review),1
)$$,'42501','review unavailable',
  'another user cannot dismiss private feedback');

select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa71',true);

-- 20-22: immutable dismissal, stale rejection and complete event history.
select is(public.dismiss_conservative_plan_progression_review(
  (select review_id from difficulty_review),1),2,
  'owner can append a dismissal event');
select throws_ok($$select public.dismiss_conservative_plan_progression_review(
  (select review_id from difficulty_review),1
)$$,'40001','progression review changed; reload before dismissing',
  'duplicate/stale dismissal cannot rewrite the decision');
select results_eq($$select count(*)::bigint from public.plan_progression_review_events
  where review_id=(select review_id from difficulty_review)$$,
  array[2::bigint],'proposal and dismissal events both remain in history');

reset role;
-- 23: update immutability even for privileged access paths.
select throws_ok($$update public.plan_progression_reviews
  set new_weekly_sessions=0
  where id=(select review_id from difficulty_review)$$,
  '55000','saved plan schedule snapshot rows are immutable',
  'privileged direct review snapshot rewrite is blocked');

-- 24: explicit account lifecycle and no orphan sensitive feedback records.
delete from auth.users where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa71';
select results_eq($$
  select count(*)::bigint from (
    select id from public.plan_progression_reviews
      where id in (
        (select review_id from difficulty_review),
        (select review_id from discomfort_review)
      )
    union all
    select id from public.plan_progression_review_events
      where review_id in (
        (select review_id from difficulty_review),
        (select review_id from discomfort_review)
      )
  ) as fixture_records_remaining
$$, array[0::bigint],
  'account deletion removes its own progression reviews and events');

select * from finish();
rollback;
