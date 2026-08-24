begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

select ok(
  to_regtype('public.exercise_constraint_tag') is not null,
  'exercise constraint tag enum exists'
);

select has_column(
  'exercise_versions',
  'constraint_tags',
  'exercise versions carry exact-version constraint tags'
);

select has_column(
  'exercise_versions',
  'constraint_tags_complete',
  'exercise versions distinguish classified from unclassified planning metadata'
);

select is(
  (
    select max(tv.version_number)
    from public.assessment_template_versions tv
    join public.assessment_templates t
      on t.id = tv.template_id
    where t.template_key = 'readiness_baseline'
      and tv.status = 'published'
  ),
  2,
  'readiness template version two is the latest synthetic published version'
);

select is(
  (
    select tv.definition #>> '{sections,1,questions,3,key}'
    from public.assessment_template_versions tv
    where tv.id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
  ),
  'movementConstraints',
  'readiness version two records the structured movement-constraint question'
);

select is(
  (
    select constraint_tags_complete
    from public.exercise_versions
    where id = 'e3333333-3333-4333-8333-333333333334'
  ),
  true,
  'reviewed wall push-up version two is constraint-classified'
);

select ok(
  (
    select constraint_tags @> array[
      'surface_hand_loading'::public.exercise_constraint_tag
    ]
    from public.exercise_versions
    where id = 'e3333333-3333-4333-8333-333333333334'
  ),
  'wall push-up exact version is classified as surface hand loading'
);

select is(
  (
    select constraint_tags_complete
    from public.exercise_versions
    where id = 'e7777777-7777-4777-8777-777777777777'
  ),
  true,
  'standing resistance-band press is explicitly classified'
);

select is(
  (
    select cardinality(constraint_tags)
    from public.exercise_versions
    where id = 'e7777777-7777-4777-8777-777777777777'
  ),
  0,
  'standing resistance-band press has no current synthetic constraint tag'
);

select throws_ok(
  $$
    update public.exercise_versions
    set constraint_tags = '{}'::public.exercise_constraint_tag[]
    where id = 'e3333333-3333-4333-8333-333333333334'
  $$,
  '55000',
  'finalized exercise instruction content is immutable',
  'finalized exact-version constraint metadata is immutable'
);

select is(
  private.exercise_version_matches_constraints(
    'e3333333-3333-4333-8333-333333333334'::uuid,
    array['surface_hand_loading'::public.exercise_constraint_tag]
  ),
  false,
  'wall push-up conflicts with a surface-hand-loading avoidance'
);

select is(
  private.exercise_version_matches_constraints(
    'e7777777-7777-4777-8777-777777777777'::uuid,
    array['surface_hand_loading'::public.exercise_constraint_tag]
  ),
  true,
  'standing resistance-band press is compatible with that synthetic constraint'
);

select is(
  private.exercise_version_matches_constraints(
    'e3333333-3333-4333-8333-333333333334'::uuid,
    '{}'::public.exercise_constraint_tag[]
  ),
  true,
  'approved content remains compatible when no movement constraint applies'
);

select is(
  private.first_compatible_substitution(
    'e3333333-3333-4333-8333-333333333334'::uuid,
    array['surface_hand_loading'::public.exercise_constraint_tag]
  ),
  'e7777777-7777-4777-8777-777777777777'::uuid,
  'existing exact substitution relation resolves to a compatible band press'
);

insert into auth.users (id,email,raw_user_meta_data)
values
  ('88888888-8888-4888-8888-888888888881','structured-a@example.invalid','{}'::jsonb),
  ('88888888-8888-4888-8888-888888888882','structured-b@example.invalid','{}'::jsonb),
  ('88888888-8888-4888-8888-888888888883','structured-c@example.invalid','{}'::jsonb),
  ('88888888-8888-4888-8888-888888888884','structured-d@example.invalid','{}'::jsonb),
  ('88888888-8888-4888-8888-888888888885','structured-e@example.invalid','{}'::jsonb);

insert into public.assessment_sessions (
  id,user_id,template_version_id,responses
)
values
(
  '88888888-8888-4888-8888-888888888891',
  '88888888-8888-4888-8888-888888888881',
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
  '88888888-8888-4888-8888-888888888892',
  '88888888-8888-4888-8888-888888888882',
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
  '88888888-8888-4888-8888-888888888893',
  '88888888-8888-4888-8888-888888888883',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
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
  '88888888-8888-4888-8888-888888888894',
  '88888888-8888-4888-8888-888888888884',
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
),
(
  '88888888-8888-4888-8888-888888888895',
  '88888888-8888-4888-8888-888888888885',
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
);

update public.assessment_sessions
set status='completed',completed_at=now()
where id in (
  '88888888-8888-4888-8888-888888888891',
  '88888888-8888-4888-8888-888888888892',
  '88888888-8888-4888-8888-888888888893',
  '88888888-8888-4888-8888-888888888894',
  '88888888-8888-4888-8888-888888888895'
)
and row_version=1;

select is(
  (
    private.current_structured_planning_constraints(
      '88888888-8888-4888-8888-888888888881'::uuid
    )
  )[1]::text,
  'surface_hand_loading',
  'version-two restricted readiness exposes only the exact selected deterministic tag'
);

select throws_ok(
  $$
    select private.current_structured_planning_constraints(
      '88888888-8888-4888-8888-888888888882'::uuid
    )
  $$,
  '55000',
  'structured movement constraints are required before restricted planning',
  'restricted version-two readiness with no structured choice fails closed'
);

select throws_ok(
  $$
    select private.current_structured_planning_constraints(
      '88888888-8888-4888-8888-888888888883'::uuid
    )
  $$,
  '55000',
  'structured movement constraints are required before restricted planning',
  'legacy version-one restriction is not inferred from forged or free-text details'
);

select throws_ok(
  $$
    select private.current_structured_planning_constraints(
      '88888888-8888-4888-8888-888888888884'::uuid
    )
  $$,
  '55000',
  'planning is blocked by the current readiness assessment',
  'block-generation readiness remains stronger than structured movement constraints'
);

select is(
  cardinality(
    private.current_structured_planning_constraints(
      '88888888-8888-4888-8888-888888888885'::uuid
    )
  ),
  0,
  'unrestricted readiness returns an empty deterministic constraint set'
);

select * from finish();

rollback;
