begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

select has_column(
  'public',
  'profiles',
  'primary_goal',
  'profiles expose a primary planning goal'
);
select has_column(
  'public',
  'profiles',
  'secondary_goal',
  'profiles expose a secondary planning goal'
);
select has_column(
  'public',
  'profiles',
  'preferred_methods',
  'profiles expose preferred methods'
);
select has_column(
  'public',
  'profiles',
  'available_equipment',
  'profiles expose available equipment'
);
select has_column(
  'public',
  'profiles',
  'available_facilities',
  'profiles expose available facilities'
);
select has_column(
  'public',
  'profiles',
  'available_minutes',
  'profiles expose available routine minutes'
);
select has_column(
  'public',
  'profiles',
  'routine_frequency_days',
  'profiles expose preferred routine frequency'
);

insert into auth.users (id,email,raw_user_meta_data)
values
  ('88888888-8888-4888-8888-888888888801','planning-1@example.invalid','{}'::jsonb),
  ('88888888-8888-4888-8888-888888888802','planning-2@example.invalid','{}'::jsonb),
  ('88888888-8888-4888-8888-888888888803','planning-3@example.invalid','{}'::jsonb),
  ('88888888-8888-4888-8888-888888888804','planning-4@example.invalid','{}'::jsonb),
  ('88888888-8888-4888-8888-888888888805','planning-5@example.invalid','{}'::jsonb),
  ('88888888-8888-4888-8888-888888888806','planning-6@example.invalid','{}'::jsonb),
  ('88888888-8888-4888-8888-888888888807','planning-7@example.invalid','{}'::jsonb),
  ('88888888-8888-4888-8888-888888888808','planning-8@example.invalid','{}'::jsonb),
  ('88888888-8888-4888-8888-888888888809','planning-9@example.invalid','{}'::jsonb),
  ('88888888-8888-4888-8888-888888888810','planning-10@example.invalid','{}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888801',true);
select set_config('request.jwt.claim.role','authenticated',true);

select lives_ok(
  $$
    insert into public.profiles (
      user_id,
      display_name,
      primary_goal,
      secondary_goal,
      preferred_methods,
      available_equipment,
      available_facilities,
      available_minutes,
      routine_frequency_days
    )
    values (
      '88888888-8888-4888-8888-888888888801',
      'Planning user',
      'general_strength',
      'mobility',
      array['bodyweight','resistance_band'],
      array['chair','resistance_band'],
      array['home'],
      30,
      3
    )
  $$,
  'an authenticated owner can save a structured planning profile'
);

select is(
  (
    select primary_goal
    from public.profiles
    where user_id='88888888-8888-4888-8888-888888888801'
  ),
  'general_strength',
  'primary goal is stored exactly'
);

select is(
  (
    select available_minutes
    from public.profiles
    where user_id='88888888-8888-4888-8888-888888888801'
  ),
  30,
  'available routine minutes are stored exactly'
);

select lives_ok(
  $$
    update public.profiles
    set available_minutes=45
    where user_id='88888888-8888-4888-8888-888888888801'
      and row_version=1
  $$,
  'planning fields use the existing optimistic profile update path'
);

select is(
  (
    select row_version
    from public.profiles
    where user_id='88888888-8888-4888-8888-888888888801'
  ),
  2::bigint,
  'planning updates increment the existing profile row version'
);

reset role;

select throws_ok(
  $$
    insert into public.profiles (user_id,primary_goal)
    values ('88888888-8888-4888-8888-888888888802','medical_rehab')
  $$,
  '23514',
  null,
  'unsupported primary goals are rejected'
);

select throws_ok(
  $$
    insert into public.profiles (user_id,secondary_goal)
    values ('88888888-8888-4888-8888-888888888803','mobility')
  $$,
  '23514',
  null,
  'secondary goal cannot exist without a primary goal'
);

select throws_ok(
  $$
    insert into public.profiles (user_id,primary_goal,secondary_goal)
    values (
      '88888888-8888-4888-8888-888888888804',
      'balance',
      'balance'
    )
  $$,
  '23514',
  null,
  'primary and secondary goal priorities must differ'
);

select throws_ok(
  $$
    insert into public.profiles (user_id,preferred_methods)
    values (
      '88888888-8888-4888-8888-888888888805',
      array['bodyweight','unsupported']
    )
  $$,
  '23514',
  null,
  'unsupported preferred methods are rejected'
);

select throws_ok(
  $$
    insert into public.profiles (user_id,preferred_methods)
    values (
      '88888888-8888-4888-8888-888888888806',
      array['bodyweight','bodyweight']
    )
  $$,
  '23514',
  null,
  'duplicate preferred methods are rejected'
);

select throws_ok(
  $$
    insert into public.profiles (user_id,available_equipment)
    values (
      '88888888-8888-4888-8888-888888888807',
      array['none','chair']
    )
  $$,
  '23514',
  null,
  'no-equipment choice cannot be combined with equipment'
);

select throws_ok(
  $$
    insert into public.profiles (user_id,available_equipment)
    values (
      '88888888-8888-4888-8888-888888888808',
      array['unsupported']
    )
  $$,
  '23514',
  null,
  'unsupported equipment tokens are rejected'
);

select throws_ok(
  $$
    insert into public.profiles (user_id,available_facilities)
    values (
      '88888888-8888-4888-8888-888888888809',
      array['clinic']
    )
  $$,
  '23514',
  null,
  'unsupported facility tokens are rejected'
);

select throws_ok(
  $$
    insert into public.profiles (user_id,available_minutes)
    values ('88888888-8888-4888-8888-888888888809',17)
  $$,
  '23514',
  null,
  'available minutes must use the bounded five-minute planning contract'
);

select throws_ok(
  $$
    insert into public.profiles (user_id,routine_frequency_days)
    values ('88888888-8888-4888-8888-888888888810',8)
  $$,
  '23514',
  null,
  'routine frequency is limited to seven days per week'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888802',true);
select set_config('request.jwt.claim.role','authenticated',true);

select results_eq(
  $$
    select count(*)::bigint
    from public.profiles
    where user_id='88888888-8888-4888-8888-888888888801'
  $$,
  array[0::bigint],
  'another user cannot read the first user planning profile'
);

select results_eq(
  $$
    with changed as (
      update public.profiles
      set primary_goal='mobility'
      where user_id='88888888-8888-4888-8888-888888888801'
      returning 1
    )
    select count(*)::bigint from changed
  $$,
  array[0::bigint],
  'another user cannot update the first user planning profile'
);

select * from finish();

rollback;
