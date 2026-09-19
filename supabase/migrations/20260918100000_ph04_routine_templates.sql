create table public.routine_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_routine_version_id uuid not null references public.routine_versions(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  created_at timestamptz not null default now()
);

create index routine_templates_user_created_idx on public.routine_templates (user_id, created_at desc);
create index routine_templates_source_version_idx on public.routine_templates (source_routine_version_id);

create trigger routine_templates_protect_update
before update on public.routine_templates
for each row execute function private.protect_routine_snapshot_update();

alter table public.routine_templates enable row level security;
revoke all on public.routine_templates from public, anon, authenticated;
grant select on public.routine_templates to authenticated;

create policy routine_templates_select_owner
on public.routine_templates for select to authenticated
using (user_id = auth.uid());

create or replace function public.create_routine_template_from_routine(p_routine_id uuid,p_title text)
returns uuid
language plpgsql
security definer
set search_path = public, auth, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_source_version_id uuid;
  v_template_id uuid;
  v_item_count integer;
begin
  if v_user_id is null then raise exception 'authenticated user required' using errcode='42501'; end if;
  if p_title is null or char_length(btrim(p_title)) < 1 or char_length(btrim(p_title)) > 80 then
    raise exception 'template title must contain 1 to 80 characters' using errcode='23514';
  end if;

  select rv.id into v_source_version_id
  from public.routine_versions rv
  join public.routines r on r.id=rv.routine_id
  where r.id=p_routine_id and r.user_id=v_user_id
  order by rv.version_number desc limit 1;

  if v_source_version_id is null then raise exception 'routine unavailable' using errcode='42501'; end if;

  select count(*)::integer into v_item_count
  from public.routine_items ri
  join public.routine_sections rs on rs.id=ri.routine_section_id
  where rs.routine_version_id=v_source_version_id;

  if v_item_count < 1 or v_item_count > 12 then
    raise exception 'routine template source must contain between 1 and 12 exercises' using errcode='23514';
  end if;

  if exists (
    select 1
    from public.routine_items ri
    join public.routine_sections rs on rs.id=ri.routine_section_id
    left join public.exercise_versions ev on ev.id=ri.exercise_version_id
    where rs.routine_version_id=v_source_version_id
      and (ev.id is null or ev.status not in ('general','reviewed'))
  ) then
    raise exception 'routine template source must contain only currently approved visible exercise versions' using errcode='23514';
  end if;

  insert into public.routine_templates(user_id,source_routine_version_id,title)
  values(v_user_id,v_source_version_id,btrim(p_title)) returning id into v_template_id;
  return v_template_id;
end;
$$;

revoke all on function public.create_routine_template_from_routine(uuid,text) from public, anon, authenticated;
grant execute on function public.create_routine_template_from_routine(uuid,text) to authenticated;

create or replace function public.create_routine_from_template(p_template_id uuid,p_title text)
returns uuid
language plpgsql
security definer
set search_path = public, auth, private, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_source_version_id uuid;
  v_ids uuid[];
begin
  if v_user_id is null then raise exception 'authenticated user required' using errcode='42501'; end if;
  if p_title is null or char_length(btrim(p_title)) < 1 or char_length(btrim(p_title)) > 80 then
    raise exception 'routine title must contain 1 to 80 characters' using errcode='23514';
  end if;

  select source_routine_version_id into v_source_version_id
  from public.routine_templates
  where id=p_template_id and user_id=v_user_id;

  if v_source_version_id is null then raise exception 'template unavailable' using errcode='42501'; end if;

  select array_agg(ri.exercise_version_id order by rs.position,ri.position) into v_ids
  from public.routine_sections rs
  join public.routine_items ri on ri.routine_section_id=rs.id
  where rs.routine_version_id=v_source_version_id;

  if v_ids is null or cardinality(v_ids) < 1 or cardinality(v_ids) > 12 then
    raise exception 'routine template source is unavailable' using errcode='23514';
  end if;

  return public.create_manual_routine(btrim(p_title),v_ids);
end;
$$;

revoke all on function public.create_routine_from_template(uuid,text) from public, anon, authenticated;
grant execute on function public.create_routine_from_template(uuid,text) to authenticated;

comment on table public.routine_templates is
  'Private reusable template identities pointing to immutable routine-version snapshots. No subscription or entitlement count gate is applied.';
