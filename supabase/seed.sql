-- Synthetic/non-sensitive local development data only.

insert into public.assessment_templates (
  id,
  template_key
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'readiness_baseline'
);

insert into public.assessment_template_versions (
  id,
  template_id,
  version_number,
  title,
  status,
  definition,
  published_at
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  1,
  'Readiness baseline',
  'published',
  $definition$
  {
    "schemaVersion": 1,
    "purpose": "Self-directed general-wellness readiness and movement context. This is not a medical assessment or safety clearance.",
    "sections": [
      {
        "key": "activity",
        "title": "Current activity",
        "questions": [
          {
            "key": "frequency",
            "type": "single_choice",
            "required": true,
            "prompt": "How often are you currently physically active in a typical week?"
          }
        ]
      },
      {
        "key": "limitations",
        "title": "Movement context",
        "questions": [
          {
            "key": "hasLimitations",
            "type": "boolean",
            "required": true,
            "prompt": "Do you currently have areas or movements you want MeExercise to account for?"
          },
          {
            "key": "affectedAreas",
            "type": "text",
            "required": false,
            "maxLength": 300,
            "prompt": "Affected areas"
          },
          {
            "key": "avoidedMovements",
            "type": "text",
            "required": false,
            "maxLength": 300,
            "prompt": "Movements you avoid"
          }
        ]
      },
      {
        "key": "readiness",
        "title": "Independent exercise readiness",
        "questions": [
          {
            "key": "independentExercise",
            "type": "single_choice",
            "required": true,
            "prompt": "Are you currently comfortable exercising independently without individual professional supervision?"
          },
          {
            "key": "professionalRestriction",
            "type": "single_choice",
            "required": true,
            "prompt": "Has a qualified health professional told you to avoid or modify exercise right now?"
          }
        ]
      }
    ],
    "safetyRules": [
      {
        "code": "movement_restrictions_present",
        "outcome": "restrict_generation",
        "meaning": "Later routine generation must respect recorded movement limitations."
      },
      {
        "code": "professional_review_recommended",
        "outcome": "block_generation",
        "meaning": "Unrestricted routine generation is blocked and professional input is recommended."
      }
    ]
  }
  $definition$::jsonb,
  now()
);
-- PH-03 synthetic exercise content.
-- Development/test mechanics only; not a claim of production editorial review.

insert into public.exercises (id,exercise_key)
values
  ('d1111111-1111-4111-8111-111111111111','chair_sit_to_stand'),
  ('d2222222-2222-4222-8222-222222222222','supported_bodyweight_squat'),
  ('d3333333-3333-4333-8333-333333333333','wall_push_up'),
  ('d4444444-4444-4444-8444-444444444444','incline_push_up'),
  ('d5555555-5555-4555-8555-555555555555','internal_draft_example');

insert into public.exercise_versions (
  id,exercise_id,version_number,status,title,summary,purpose,setup,steps,cues,
  dosage_guidance,common_errors,safety_notes,accessible_text,target_areas,
  equipment,side_rule,published_at
)
values
(
  'e1111111-1111-4111-8111-111111111111','d1111111-1111-4111-8111-111111111111',1,'draft',
  'Chair sit-to-stand',
  'Stand up from a stable chair and sit back down with control.',
  'General lower-body strength and everyday sit-to-stand practice.',
  'Use a stable chair on a non-slip surface. Sit far enough forward that both feet are flat and comfortable.',
  '["Place both feet flat and about hip-width apart.","Lean the torso slightly forward while keeping the movement controlled.","Press through both feet and stand tall without rushing.","Reach the hips back and lower to the chair with control."]'::jsonb,
  '["Keep the whole foot in contact with the floor.","Use the chair for a controlled endpoint rather than dropping onto it."]'::jsonb,
  'Choose a comfortable number of controlled repetitions that leaves you able to maintain the same technique.',
  '["Rocking quickly to create momentum.","Dropping onto the chair at the end of the repetition."]'::jsonb,
  '["Stop the exercise if you cannot perform the movement with control or if it causes concerning symptoms."]'::jsonb,
  'From a stable chair, place both feet flat, lean slightly forward, stand up under control, then reach the hips back and sit down gently.',
  array['Lower body'],array['Chair'],'bilateral',null
),
(
  'e2222222-2222-4222-8222-222222222222','d2222222-2222-4222-8222-222222222222',1,'draft',
  'Supported bodyweight squat',
  'Perform a shallow squat while using a stable support for balance as needed.',
  'General lower-body strength and controlled squat-pattern practice.',
  'Stand facing a stable support that will not move. Place the feet in a comfortable stance and hold the support lightly if needed.',
  '["Stand tall with both feet secure.","Reach the hips back and bend the knees only as far as remains comfortable and controlled.","Keep the feet planted while lowering.","Press through the feet to return to standing."]'::jsonb,
  '["Use the support for balance rather than pulling yourself through the movement.","Choose a depth that remains controlled."]'::jsonb,
  'Use a comfortable range and repetition count that allows consistent control throughout the set.',
  '["Allowing the support to take most of the body weight.","Moving deeper than can be controlled comfortably."]'::jsonb,
  '["Use a shallower range or stop if control is lost or the movement causes concerning symptoms."]'::jsonb,
  'Stand at a stable support, move the hips back into a comfortable shallow squat, then press through the feet to stand again.',
  array['Lower body'],array['Stable support'],'bilateral',null
),
(
  'e3333333-3333-4333-8333-333333333333','d3333333-3333-4333-8333-333333333333',1,'draft',
  'Wall push-up',
  'Perform a push-up against a wall using a controlled body position.',
  'General upper-body pushing strength with a relatively upright body angle.',
  'Face a solid wall and place both palms on it around chest height. Step back until the body can remain straight and stable.',
  '["Start with the arms straight but not forcefully locked.","Bend the elbows and bring the chest toward the wall while keeping the body controlled.","Pause before contact if needed.","Press the wall away to return to the starting position."]'::jsonb,
  '["Keep the body moving as one controlled unit.","Use a hand position that feels comfortable for the shoulders and wrists."]'::jsonb,
  'Choose a wall distance and repetition count that lets you keep the same controlled body position.',
  '["Letting the hips sag toward the wall.","Moving so close that the shoulders or wrists feel forced."]'::jsonb,
  '["Stop or change the setup if the movement causes concerning symptoms or cannot be controlled."]'::jsonb,
  'Place both hands on a solid wall, keep the body controlled, bend the elbows to move the chest toward the wall, then press back to the start.',
  array['Upper body'],array['Wall'],'bilateral',null
),
(
  'e4444444-4444-4444-8444-444444444444','d4444444-4444-4444-8444-444444444444',1,'draft',
  'Incline push-up',
  'Perform a push-up with the hands on a stable elevated surface.',
  'General upper-body pushing strength at a body angle between a wall push-up and a floor push-up.',
  'Use a stable elevated surface that cannot slide or tip. Place both hands securely and step back into a controlled straight-body position.',
  '["Begin with the arms straight and the body stable.","Bend the elbows and lower the chest toward the support under control.","Keep the support stable and the feet secure.","Press through both hands to return to the starting position."]'::jsonb,
  '["Keep the trunk controlled throughout the repetition.","A higher support generally reduces the amount of body weight being pressed."]'::jsonb,
  'Choose a support height and repetition count that allows consistent technique without rushing.',
  '["Using furniture that can slide or tip.","Allowing the trunk to sag during the repetition."]'::jsonb,
  '["Only use a surface that is stable enough for the intended load.","Stop if the movement causes concerning symptoms or cannot be controlled."]'::jsonb,
  'Place both hands on a stable elevated surface, lower the chest toward it with the body controlled, then press back to the start.',
  array['Upper body'],array['Stable elevated surface'],'bilateral',null
),
(
  'e5555555-5555-4555-8555-555555555555','d5555555-5555-4555-8555-555555555555',1,'draft',
  'Internal draft example','A non-visible draft used to verify publication filtering.',
  'Test-only content.','Test-only setup.','["Test-only step."]'::jsonb,'[]'::jsonb,
  'Test-only dosage.','[]'::jsonb,'[]'::jsonb,'Test-only accessible text.',
  array['Test'],'{}'::text[],'not_applicable',null
);

insert into public.exercise_version_relations (
  source_version_id,target_version_id,relation_type,guidance,sort_order
)
values
(
  'e1111111-1111-4111-8111-111111111111','e2222222-2222-4222-8222-222222222222',
  'progression','A supported squat is a possible next variation when sit-to-stand repetitions are controlled and a deeper pattern is appropriate.',10
),
(
  'e2222222-2222-4222-8222-222222222222','e1111111-1111-4111-8111-111111111111',
  'regression','Use the chair sit-to-stand when a clear seated endpoint provides a more manageable movement range.',10
),
(
  'e3333333-3333-4333-8333-333333333333','e4444444-4444-4444-8444-444444444444',
  'progression','A stable elevated surface can provide a less upright progression from the wall while keeping the movement supported.',10
),
(
  'e4444444-4444-4444-8444-444444444444','e3333333-3333-4333-8333-333333333333',
  'regression','Move to the wall to reduce the body angle when the incline variation cannot be performed with consistent control.',10
);

update public.exercise_versions
set status='general',published_at=now()
where id in (
  'e1111111-1111-4111-8111-111111111111',
  'e2222222-2222-4222-8222-222222222222',
  'e3333333-3333-4333-8333-333333333333',
  'e4444444-4444-4444-8444-444444444444'
);
