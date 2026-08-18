-- PH-02 assessment save/resume/safety completion slice.
-- Safety flags are conservative planning controls, not diagnosis or medical clearance.

create type public.assessment_safety_flag_code as enum (
  'movement_restrictions_present',
  'professional_review_recommended'
);

create type public.assessment_safety_outcome as enum (
  'restrict_generation',
  'block_generation'
);

create table public.assessment_safety_flags (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.assessment_sessions(id)
    on delete cascade,
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
  flag_code public.assessment_safety_flag_code not null,
  outcome public.assessment_safety_outcome not null,
  created_at timestamptz not null default now(),

  constraint assessment_safety_flags_session_code_unique
    unique (session_id, flag_code),

  constraint assessment_safety_flags_outcome_matches_code
    check (
      (
        flag_code = 'movement_restrictions_present'
        and outcome = 'restrict_generation'
      )
      or
      (
        flag_code = 'professional_review_recommended'
        and outcome = 'block_generation'
      )
    )
);

comment on table public.assessment_safety_flags is
  'Immutable conservative planning outcomes derived when an assessment completes. Flags do not diagnose, treat, or certify medical safety.';

create index assessment_safety_flags_user_id_idx
  on public.assessment_safety_flags(user_id);

create index assessment_safety_flags_session_id_idx
  on public.assessment_safety_flags(session_id);

create unique index assessment_sessions_one_in_progress_per_version_idx
  on public.assessment_sessions(user_id, template_version_id)
  where status = 'in_progress';

create or replace function private.require_assessment_session_start_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> 'in_progress'
    or new.completed_at is not null
    or new.row_version <> 1 then
    raise exception 'assessment sessions must start in progress'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke all on function private.require_assessment_session_start_state() from public;
revoke all on function private.require_assessment_session_start_state() from anon;
revoke all on function private.require_assessment_session_start_state() from authenticated;

create trigger assessment_sessions_require_start_state
before insert on public.assessment_sessions
for each row
execute function private.require_assessment_session_start_state();

create or replace function private.derive_assessment_safety_flags()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  has_limitations text;
  affected_areas text;
  avoided_movements text;
  independent_exercise text;
  professional_restriction text;
begin
  if old.status <> 'completed' and new.status = 'completed' then
    has_limitations :=
      coalesce(new.responses #>> '{limitations,hasLimitations}', '');
    affected_areas :=
      btrim(coalesce(new.responses #>> '{limitations,affectedAreas}', ''));
    avoided_movements :=
      btrim(coalesce(new.responses #>> '{limitations,avoidedMovements}', ''));
    independent_exercise :=
      coalesce(new.responses #>> '{readiness,independentExercise}', 'unsure');
    professional_restriction :=
      coalesce(new.responses #>> '{readiness,professionalRestriction}', 'unsure');

    if has_limitations = 'true'
      or affected_areas <> ''
      or avoided_movements <> '' then
      insert into public.assessment_safety_flags (
        session_id,
        user_id,
        flag_code,
        outcome
      )
      values (
        new.id,
        new.user_id,
        'movement_restrictions_present',
        'restrict_generation'
      )
      on conflict (session_id, flag_code) do nothing;
    end if;

    -- Missing/unknown readiness responses intentionally fail closed.
    if independent_exercise <> 'yes'
      or professional_restriction <> 'no' then
      insert into public.assessment_safety_flags (
        session_id,
        user_id,
        flag_code,
        outcome
      )
      values (
        new.id,
        new.user_id,
        'professional_review_recommended',
        'block_generation'
      )
      on conflict (session_id, flag_code) do nothing;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.derive_assessment_safety_flags() from public;
revoke all on function private.derive_assessment_safety_flags() from anon;
revoke all on function private.derive_assessment_safety_flags() from authenticated;

create trigger assessment_sessions_derive_safety_flags
after update on public.assessment_sessions
for each row
execute function private.derive_assessment_safety_flags();

create or replace function private.protect_assessment_safety_flag_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'assessment safety flags are immutable'
    using errcode = '55000';
end;
$$;

revoke all on function private.protect_assessment_safety_flag_update() from public;
revoke all on function private.protect_assessment_safety_flag_update() from anon;
revoke all on function private.protect_assessment_safety_flag_update() from authenticated;

create trigger assessment_safety_flags_protect_update
before update on public.assessment_safety_flags
for each row
execute function private.protect_assessment_safety_flag_update();

alter table public.assessment_safety_flags enable row level security;

revoke all on public.assessment_safety_flags from public;
revoke all on public.assessment_safety_flags from anon;
revoke all on public.assessment_safety_flags from authenticated;

grant select
  on public.assessment_safety_flags
  to authenticated;

create policy assessment_safety_flags_select_own
on public.assessment_safety_flags
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (
    select 1
    from public.assessment_sessions s
    where s.id = session_id
      and s.user_id = (select auth.uid())
  )
);