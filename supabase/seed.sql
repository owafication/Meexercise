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