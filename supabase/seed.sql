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
  '{"sections":[]}'::jsonb,
  now()
);
