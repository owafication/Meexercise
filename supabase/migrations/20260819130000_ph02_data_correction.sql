-- PH-02 correction contract for immutable completed readiness assessments.
-- A correction is a new session linked to the completed record it corrects.
-- The completed source is never rewritten.

alter table public.assessment_sessions
  add column corrects_session_id uuid
  references public.assessment_sessions(id)
  on delete cascade;

comment on column public.assessment_sessions.corrects_session_id is
  'Optional immediate predecessor corrected by this assessment. Completed source records remain immutable history.';

create index assessment_sessions_corrects_session_id_idx
  on public.assessment_sessions(corrects_session_id)
  where corrects_session_id is not null;

create or replace function private.validate_assessment_correction_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  source_user_id uuid;
  source_template_version_id uuid;
  source_status public.assessment_session_status;
  source_responses jsonb;
begin
  if new.corrects_session_id is null then
    return new;
  end if;

  select
    s.user_id,
    s.template_version_id,
    s.status,
    s.responses
  into
    source_user_id,
    source_template_version_id,
    source_status,
    source_responses
  from public.assessment_sessions s
  where s.id = new.corrects_session_id;

  if not found
    or source_user_id is distinct from new.user_id
    or source_status <> 'completed'
    or source_template_version_id is distinct from new.template_version_id then
    raise exception 'assessment correction source is not available'
      using errcode = '55000';
  end if;

  if new.responses is distinct from source_responses then
    raise exception 'assessment correction must start from the source responses'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_assessment_correction_insert() from public;
revoke all on function private.validate_assessment_correction_insert() from anon;
revoke all on function private.validate_assessment_correction_insert() from authenticated;

create trigger assessment_sessions_validate_correction_insert
before insert on public.assessment_sessions
for each row
execute function private.validate_assessment_correction_insert();

create or replace function private.protect_assessment_session_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'completed' then
    raise exception 'completed assessment sessions are immutable'
      using errcode = '55000';
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'assessment session owner is immutable'
      using errcode = '55000';
  end if;

  if new.template_version_id is distinct from old.template_version_id then
    raise exception 'assessment template version is immutable for an existing session'
      using errcode = '55000';
  end if;

  if new.corrects_session_id is distinct from old.corrects_session_id then
    raise exception 'assessment correction source is immutable'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_assessment_session_history() from public;
revoke all on function private.protect_assessment_session_history() from anon;
revoke all on function private.protect_assessment_session_history() from authenticated;
