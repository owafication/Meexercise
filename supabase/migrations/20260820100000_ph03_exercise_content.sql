-- PH-03 exercise-content foundation.
-- No routine generation, professional-user access, runtime AI, or production
-- content-management workflow is introduced by this slice.

create type public.exercise_content_status as enum (
  'draft',
  'general',
  'professionally_authored',
  'reviewed',
  'withdrawn',
  'restricted'
);

create type public.exercise_relation_type as enum (
  'substitution',
  'regression',
  'progression',
  'equipment_alternative'
);

create type public.exercise_side_rule as enum (
  'not_applicable',
  'bilateral',
  'unilateral',
  'per_side',
  'alternating'
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  exercise_key text not null unique,
  created_at timestamptz not null default now(),
  constraint exercises_key_format
    check (exercise_key ~ '^[a-z][a-z0-9_]{2,63}$')
);

create table public.exercise_versions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  version_number integer not null,
  status public.exercise_content_status not null default 'draft',
  title text not null,
  summary text not null,
  purpose text not null,
  setup text not null,
  steps jsonb not null,
  cues jsonb not null default '[]'::jsonb,
  dosage_guidance text not null,
  common_errors jsonb not null default '[]'::jsonb,
  safety_notes jsonb not null default '[]'::jsonb,
  accessible_text text not null,
  target_areas text[] not null,
  equipment text[] not null default '{}'::text[],
  side_rule public.exercise_side_rule not null default 'not_applicable',
  created_at timestamptz not null default now(),
  published_at timestamptz,
  constraint exercise_versions_version_positive check (version_number > 0),
  constraint exercise_versions_title_length check (char_length(btrim(title)) between 1 and 120),
  constraint exercise_versions_summary_length check (char_length(btrim(summary)) between 1 and 300),
  constraint exercise_versions_purpose_length check (char_length(btrim(purpose)) between 1 and 1000),
  constraint exercise_versions_setup_length check (char_length(btrim(setup)) between 1 and 2000),
  constraint exercise_versions_steps_array check (jsonb_typeof(steps)='array' and jsonb_array_length(steps) between 1 and 30),
  constraint exercise_versions_cues_array check (jsonb_typeof(cues)='array' and jsonb_array_length(cues) <= 30),
  constraint exercise_versions_common_errors_array check (jsonb_typeof(common_errors)='array' and jsonb_array_length(common_errors) <= 30),
  constraint exercise_versions_safety_notes_array check (jsonb_typeof(safety_notes)='array' and jsonb_array_length(safety_notes) <= 30),
  constraint exercise_versions_dosage_length check (char_length(btrim(dosage_guidance)) between 1 and 1000),
  constraint exercise_versions_accessible_text_length check (char_length(btrim(accessible_text)) between 1 and 4000),
  constraint exercise_versions_target_count check (cardinality(target_areas) between 1 and 12),
  constraint exercise_versions_equipment_count check (cardinality(equipment) <= 12),
  constraint exercise_versions_publication_state check (
    (status='draft' and published_at is null)
    or
    (status<>'draft' and published_at is not null)
  ),
  constraint exercise_versions_identity_unique unique (exercise_id,version_number)
);

create table public.exercise_version_relations (
  id uuid primary key default gen_random_uuid(),
  source_version_id uuid not null references public.exercise_versions(id) on delete restrict,
  target_version_id uuid not null references public.exercise_versions(id) on delete restrict,
  relation_type public.exercise_relation_type not null,
  guidance text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint exercise_version_relations_not_self check (source_version_id<>target_version_id),
  constraint exercise_version_relations_guidance_length check (char_length(btrim(guidance)) between 1 and 1000),
  constraint exercise_version_relations_sort_order check (sort_order>=0),
  constraint exercise_version_relations_unique unique (source_version_id,target_version_id,relation_type)
);

create index exercise_versions_exercise_id_idx on public.exercise_versions(exercise_id);
create index exercise_versions_visible_idx on public.exercise_versions(status,exercise_id,version_number desc);
create index exercise_version_relations_source_idx on public.exercise_version_relations(source_version_id,sort_order);

create or replace function private.protect_exercise_version()
returns trigger
language plpgsql
set search_path=''
as $$
begin
  if tg_op='DELETE' then
    if old.status<>'draft' then
      raise exception 'finalized exercise versions cannot be deleted' using errcode='55000';
    end if;
    return old;
  end if;

  if new.exercise_id is distinct from old.exercise_id
     or new.version_number is distinct from old.version_number then
    raise exception 'exercise version identity is immutable' using errcode='55000';
  end if;

  if old.status<>'draft' then
    if new.title is distinct from old.title
       or new.summary is distinct from old.summary
       or new.purpose is distinct from old.purpose
       or new.setup is distinct from old.setup
       or new.steps is distinct from old.steps
       or new.cues is distinct from old.cues
       or new.dosage_guidance is distinct from old.dosage_guidance
       or new.common_errors is distinct from old.common_errors
       or new.safety_notes is distinct from old.safety_notes
       or new.accessible_text is distinct from old.accessible_text
       or new.target_areas is distinct from old.target_areas
       or new.equipment is distinct from old.equipment
       or new.side_rule is distinct from old.side_rule then
      raise exception 'finalized exercise instruction content is immutable' using errcode='55000';
    end if;

    if new.published_at is distinct from old.published_at then
      raise exception 'exercise publication timestamp is immutable after finalization' using errcode='55000';
    end if;

    if new.status is distinct from old.status and not (
      (old.status='general' and new.status in ('reviewed','withdrawn','restricted'))
      or (old.status='professionally_authored' and new.status in ('reviewed','withdrawn','restricted'))
      or (old.status='reviewed' and new.status in ('withdrawn','restricted'))
      or (old.status='restricted' and new.status='withdrawn')
    ) then
      raise exception 'exercise publication status transition is not allowed' using errcode='55000';
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.protect_exercise_version_relation()
returns trigger
language plpgsql
set search_path=''
as $$
declare
  source_status public.exercise_content_status;
begin
  if tg_op in ('UPDATE','DELETE') then
    select status into source_status
    from public.exercise_versions
    where id=old.source_version_id;

    if source_status<>'draft' then
      raise exception 'finalized exercise version relationships are immutable' using errcode='55000';
    end if;
  end if;

  if tg_op in ('INSERT','UPDATE') then
    select status into source_status
    from public.exercise_versions
    where id=new.source_version_id;

    if source_status<>'draft' then
      raise exception 'relationships can only be edited while the source exercise version is draft' using errcode='55000';
    end if;
  end if;

  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.protect_exercise_version() from public, anon, authenticated;
revoke all on function private.protect_exercise_version_relation() from public, anon, authenticated;

create trigger exercise_versions_protect_update
before update on public.exercise_versions
for each row execute function private.protect_exercise_version();

create trigger exercise_versions_protect_delete
before delete on public.exercise_versions
for each row execute function private.protect_exercise_version();

create trigger exercise_version_relations_protect_insert
before insert on public.exercise_version_relations
for each row execute function private.protect_exercise_version_relation();

create trigger exercise_version_relations_protect_update
before update on public.exercise_version_relations
for each row execute function private.protect_exercise_version_relation();

create trigger exercise_version_relations_protect_delete
before delete on public.exercise_version_relations
for each row execute function private.protect_exercise_version_relation();

alter table public.exercises enable row level security;
alter table public.exercise_versions enable row level security;
alter table public.exercise_version_relations enable row level security;

revoke all on public.exercises from public, anon, authenticated;
revoke all on public.exercise_versions from public, anon, authenticated;
revoke all on public.exercise_version_relations from public, anon, authenticated;

grant select on public.exercises to anon, authenticated;
grant select on public.exercise_versions to anon, authenticated;
grant select on public.exercise_version_relations to anon, authenticated;

create policy exercises_select_visible
on public.exercises
for select
to anon, authenticated
using (
  exists (
    select 1 from public.exercise_versions v
    where v.exercise_id=exercises.id
      and v.status in ('general','reviewed')
  )
);

create policy exercise_versions_select_visible
on public.exercise_versions
for select
to anon, authenticated
using (status in ('general','reviewed'));

create policy exercise_version_relations_select_visible
on public.exercise_version_relations
for select
to anon, authenticated
using (
  exists (
    select 1 from public.exercise_versions s
    where s.id=source_version_id
      and s.status in ('general','reviewed')
  )
  and exists (
    select 1 from public.exercise_versions t
    where t.id=target_version_id
      and t.status in ('general','reviewed')
  )
);
