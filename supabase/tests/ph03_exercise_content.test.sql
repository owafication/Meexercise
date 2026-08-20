begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

select has_table('exercises','exercises stable-identity table exists');
select has_table('exercise_versions','exercise_versions table exists');
select has_table('exercise_version_relations','exercise_version_relations table exists');

select results_eq(
  $$
    select count(*)::bigint
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname in ('exercises','exercise_versions','exercise_version_relations')
      and c.relrowsecurity
  $$,
  array[3::bigint],
  'RLS is enabled on every PH-03 public content table'
);

select is(
  (
    select string_agg(e.enumlabel::text collate "C", ',' order by e.enumsortorder)
    from pg_type t
    join pg_enum e on e.enumtypid=t.oid
    where t.typname='exercise_content_status'
  ),
  'draft,general,professionally_authored,reviewed,withdrawn,restricted'::text collate "C",
  'publication states retain governed distinctions'
);

select is(
  (
    select string_agg(e.enumlabel::text collate "C", ',' order by e.enumsortorder)
    from pg_type t
    join pg_enum e on e.enumtypid=t.oid
    where t.typname='exercise_relation_type'
  ),
  'substitution,regression,progression,equipment_alternative'::text collate "C",
  'relationship types cover substitutions and variation paths'
);

select is(
  (
    select string_agg(e.enumlabel::text collate "C", ',' order by e.enumsortorder)
    from pg_type t
    join pg_enum e on e.enumtypid=t.oid
    where t.typname='exercise_side_rule'
  ),
  'not_applicable,bilateral,unilateral,per_side,alternating'::text collate "C",
  'side rules retain all governed bilateral and per-side semantics'
);

set local role anon;
select set_config('request.jwt.claim.role','anon',true);

select results_eq(
  $$select count(*)::bigint from public.exercise_versions$$,
  array[7::bigint],
  'normal readers see seven visible synthetic versions across six identities'
);

select results_eq(
  $$select count(*)::bigint from public.exercise_versions where title='Internal draft example'$$,
  array[0::bigint],
  'draft versions are not exposed'
);

select results_eq(
  $$select count(*)::bigint from public.exercises$$,
  array[6::bigint],
  'stable identities without a visible version are not exposed'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.exercise_versions
    where exercise_id='d3333333-3333-4333-8333-333333333333'
  $$,
  array[2::bigint],
  'one stable exercise identity can expose multiple immutable visible versions'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.exercise_versions
    where id='e3333333-3333-4333-8333-333333333334'
      and version_number=2
      and status='reviewed'
  $$,
  array[1::bigint],
  'reviewed version two is visible without rewriting version one'
);

select results_eq(
  $$select count(distinct relation_type)::bigint from public.exercise_version_relations$$,
  array[4::bigint],
  'visible synthetic relationships exercise all four governed relation types'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.exercise_version_relations
    where source_version_id='e4444444-4444-4444-8444-444444444444'
      and target_version_id='e3333333-3333-4333-8333-333333333333'
      and relation_type='regression'
  $$,
  array[1::bigint],
  'a finalized relationship retains the exact target exercise version'
);

reset role;

select throws_ok(
  $$
    update public.exercise_versions
    set title='Mutated published content'
    where id='e3333333-3333-4333-8333-333333333333'
  $$,
  '55000',
  'finalized exercise instruction content is immutable',
  'published instruction content cannot be rewritten'
);

select throws_ok(
  $$
    insert into public.exercise_version_relations (
      source_version_id,target_version_id,relation_type,guidance
    )
    values (
      'e3333333-3333-4333-8333-333333333334',
      'e1111111-1111-4111-8111-111111111111',
      'substitution',
      'Should be rejected because the source version is finalized.'
    )
  $$,
  '55000',
  'relationships can only be edited while the source exercise version is draft',
  'finalized source-version relationships cannot be edited'
);

select lives_ok(
  $$
    update public.exercise_versions
    set status='withdrawn'
    where id='e3333333-3333-4333-8333-333333333334'
  $$,
  'a finalized reviewed exercise can be withdrawn without rewriting content'
);

set local role anon;
select set_config('request.jwt.claim.role','anon',true);

select results_eq(
  $$select count(*)::bigint from public.exercise_versions$$,
  array[6::bigint],
  'withdrawn latest version disappears from normal reads'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.exercise_versions
    where exercise_id='d3333333-3333-4333-8333-333333333333'
  $$,
  array[1::bigint],
  'the earlier visible version remains readable after a later version is withdrawn'
);

select results_eq(
  $$select count(*)::bigint from public.exercises$$,
  array[6::bigint],
  'stable identity remains visible while any allowed version is still visible'
);

select * from finish();

rollback;
