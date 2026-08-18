-- PH-02 identity, private profile, versioned assessment, and concurrency foundation.
-- No diagnosis/treatment data model, professional-user access, production project,
-- production region, or runtime AI is introduced here.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create type public.assessment_template_status as enum (
  'draft',
  'published',
  'retired'
);

create type public.assessment_session_status as enum (
  'in_progress',
  'completed',
  'abandoned'
);

create table public.profiles (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,
  display_name text,
  row_version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_display_name_length
    check (
      display_name is null
      or char_length(btrim(display_name)) between 1 and 80
    ),

  constraint profiles_row_version_positive
    check (row_version > 0)
);

comment on table public.profiles is
  'Private per-user profile envelope. Wellness fields are introduced only by their owning PH-02 slice.';

create table public.assessment_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  created_at timestamptz not null default now(),

  constraint assessment_templates_key_format
    check (template_key ~ '^[a-z][a-z0-9_-]{2,63}$')
);

comment on table public.assessment_templates is
  'Stable assessment identity. Sessions reference an immutable version.';

create table public.assessment_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null
    references public.assessment_templates(id)
    on delete restrict,
  version_number integer not null,
  title text not null,
  status public.assessment_template_status not null default 'draft',
  definition jsonb not null,
  created_at timestamptz not null default now(),
  published_at timestamptz,

  constraint assessment_template_versions_version_positive
    check (version_number > 0),

  constraint assessment_template_versions_title_length
    check (char_length(btrim(title)) between 1 and 120),

  constraint assessment_template_versions_definition_object
    check (jsonb_typeof(definition) = 'object'),

  constraint assessment_template_versions_definition_size
    check (octet_length(definition::text) <= 262144),

  constraint assessment_template_versions_publish_state
    check (
      (status = 'published' and published_at is not null)
      or
      (status <> 'published' and published_at is null)
    ),

  constraint assessment_template_versions_identity_unique
    unique (template_id, version_number)
);

comment on table public.assessment_template_versions is
  'Versioned assessment definitions. Published versions are immutable.';

create table public.assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
  template_version_id uuid not null
    references public.assessment_template_versions(id)
    on delete restrict,
  status public.assessment_session_status not null default 'in_progress',
  responses jsonb not null default '{}'::jsonb,
  row_version bigint not null default 1,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,

  constraint assessment_sessions_responses_object
    check (jsonb_typeof(responses) = 'object'),

  constraint assessment_sessions_responses_size
    check (octet_length(responses::text) <= 65536),

  constraint assessment_sessions_row_version_positive
    check (row_version > 0),

  constraint assessment_sessions_completion_state
    check (
      (status = 'completed' and completed_at is not null)
      or
      (status <> 'completed' and completed_at is null)
    )
);

comment on table public.assessment_sessions is
  'Private resumable assessment state. Completed sessions are immutable history.';

create index assessment_template_versions_template_id_idx
  on public.assessment_template_versions(template_id);

create index assessment_sessions_user_id_idx
  on public.assessment_sessions(user_id);

create index assessment_sessions_template_version_id_idx
  on public.assessment_sessions(template_version_id);

create or replace function private.bump_row_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.row_version := old.row_version + 1;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.bump_row_version() from public;
revoke all on function private.bump_row_version() from anon;
revoke all on function private.bump_row_version() from authenticated;

create or replace function private.protect_published_assessment_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'published' then
    raise exception 'published assessment versions are immutable'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_published_assessment_version() from public;
revoke all on function private.protect_published_assessment_version() from anon;
revoke all on function private.protect_published_assessment_version() from authenticated;

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

  return new;
end;
$$;

revoke all on function private.protect_assessment_session_history() from public;
revoke all on function private.protect_assessment_session_history() from anon;
revoke all on function private.protect_assessment_session_history() from authenticated;

create trigger profiles_bump_row_version
before update on public.profiles
for each row
execute function private.bump_row_version();

create trigger assessment_template_versions_protect_published_update
before update on public.assessment_template_versions
for each row
execute function private.protect_published_assessment_version();

create trigger assessment_template_versions_protect_published_delete
before delete on public.assessment_template_versions
for each row
execute function private.protect_published_assessment_version();

create trigger assessment_sessions_protect_history
before update on public.assessment_sessions
for each row
execute function private.protect_assessment_session_history();

create trigger assessment_sessions_bump_row_version
before update on public.assessment_sessions
for each row
execute function private.bump_row_version();

alter table public.profiles enable row level security;
alter table public.assessment_templates enable row level security;
alter table public.assessment_template_versions enable row level security;
alter table public.assessment_sessions enable row level security;

revoke all on public.profiles from public;
revoke all on public.assessment_templates from public;
revoke all on public.assessment_template_versions from public;
revoke all on public.assessment_sessions from public;

revoke all on public.profiles from anon;
revoke all on public.assessment_templates from anon;
revoke all on public.assessment_template_versions from anon;
revoke all on public.assessment_sessions from anon;

grant select, insert, update
  on public.profiles
  to authenticated;

grant select
  on public.assessment_templates
  to authenticated;

grant select
  on public.assessment_template_versions
  to authenticated;

grant select, insert, update
  on public.assessment_sessions
  to authenticated;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and row_version = 1
);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy assessment_templates_select_authenticated
on public.assessment_templates
for select
to authenticated
using (true);

create policy assessment_template_versions_select_published
on public.assessment_template_versions
for select
to authenticated
using (status = 'published');

create policy assessment_sessions_select_own
on public.assessment_sessions
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);

create policy assessment_sessions_insert_own_published
on public.assessment_sessions
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and row_version = 1
  and exists (
    select 1
    from public.assessment_template_versions v
    where v.id = template_version_id
      and v.status = 'published'
  )
);

create policy assessment_sessions_update_own
on public.assessment_sessions
for update
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
);
