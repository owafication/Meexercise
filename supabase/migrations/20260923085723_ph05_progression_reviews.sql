-- PH-05 progression prerequisite: review-only conservative plan proposals.
-- Recording or dismissing a proposal NEVER modifies the active schedule.
-- No session completion inference, diagnosis, automatic dose change or AI.

create table public.plan_progression_reviews (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  source_plan_version_id uuid not null
    references public.plan_versions(id) on delete cascade,
  source_schedule_version_id uuid not null
    references public.plan_schedule_versions(id) on delete cascade,
  feedback_kind text not null check (
    feedback_kind in (
      'excessive_difficulty',
      'discomfort',
      'user_requested_reduction'
    )
  ),
  proposed_action text not null check (
    proposed_action in ('pause', 'reduce_frequency')
  ),
  old_weekly_sessions smallint not null check (old_weekly_sessions between 1 and 7),
  new_weekly_sessions smallint not null check (new_weekly_sessions between 0 and 6),
  remove_weekday smallint check (remove_weekday between 1 and 7),
  created_at timestamptz not null default now(),
  check (
    (
      proposed_action = 'pause'
      and new_weekly_sessions = 0
      and remove_weekday is null
    ) or (
      proposed_action = 'reduce_frequency'
      and old_weekly_sessions >= 2
      and new_weekly_sessions = old_weekly_sessions - 1
      and remove_weekday is not null
    )
  )
);

create index plan_progression_reviews_plan_created_idx
on public.plan_progression_reviews(plan_id, created_at desc);

create table public.plan_progression_review_events (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null
    references public.plan_progression_reviews(id) on delete cascade,
  version_number integer not null check (version_number between 1 and 1000),
  action text not null check (action in ('proposed', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (review_id, version_number),
  check (
    (version_number = 1 and action = 'proposed')
    or (version_number > 1 and action = 'dismissed')
  )
);

create index plan_progression_review_events_latest_idx
on public.plan_progression_review_events(review_id, version_number desc);

create trigger plan_progression_reviews_protect_update
before update on public.plan_progression_reviews
for each row execute function private.protect_plan_schedule_snapshot_update();

create trigger plan_progression_review_events_protect_update
before update on public.plan_progression_review_events
for each row execute function private.protect_plan_schedule_snapshot_update();

alter table public.plan_progression_reviews enable row level security;
alter table public.plan_progression_review_events enable row level security;

revoke all on public.plan_progression_reviews from public, anon, authenticated;
revoke all on public.plan_progression_review_events from public, anon, authenticated;

grant select on public.plan_progression_reviews to authenticated;
grant select on public.plan_progression_review_events to authenticated;

create policy plan_progression_reviews_select_owner
on public.plan_progression_reviews
for select to authenticated
using (
  exists (
    select 1
    from public.plans p
    where p.id = plan_progression_reviews.plan_id
      and p.user_id = (select auth.uid())
  )
);

create policy plan_progression_review_events_select_owner
on public.plan_progression_review_events
for select to authenticated
using (
  exists (
    select 1
    from public.plan_progression_reviews ppr
    join public.plans p on p.id = ppr.plan_id
    where ppr.id = plan_progression_review_events.review_id
      and p.user_id = (select auth.uid())
  )
);

-- Existing schedule mutations use SECURITY DEFINER because ordinary roles
-- cannot write immutable snapshot tables. This new boundary follows that
-- established pattern with explicit auth/owner checks and no caller-supplied owner.
create function public.create_conservative_plan_progression_review(
  p_plan_id uuid,
  p_expected_plan_version_number integer,
  p_expected_schedule_version_number integer,
  p_feedback_kind text,
  p_remove_weekday smallint
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, private, pg_catalog, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_owner uuid;
  v_plan_version_id uuid;
  v_current_plan_version_number integer;
  v_schedule_id uuid;
  v_schedule_version_id uuid;
  v_schedule_plan_version_id uuid;
  v_current_schedule_version_number integer;
  v_schedule_paused boolean;
  v_old_weekly_sessions integer;
  v_action text;
  v_new_weekly_sessions integer;
  v_review_id uuid;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_expected_plan_version_number is null
     or p_expected_plan_version_number < 1
     or p_expected_schedule_version_number is null
     or p_expected_schedule_version_number < 1 then
    raise exception 'expected progression source version is invalid'
      using errcode = '23514';
  end if;

  if p_feedback_kind is null or p_feedback_kind not in (
    'excessive_difficulty', 'discomfort', 'user_requested_reduction'
  ) then
    raise exception 'unsupported self-reported progression feedback'
      using errcode = '23514';
  end if;

  select p.user_id into v_plan_owner
  from public.plans p
  where p.id = p_plan_id
  for update;

  if v_plan_owner is null or v_plan_owner <> v_user_id then
    raise exception 'plan unavailable' using errcode = '42501';
  end if;

  select pv.id, pv.version_number
  into v_plan_version_id, v_current_plan_version_number
  from public.plan_versions pv
  where pv.plan_id = p_plan_id
  order by pv.version_number desc
  limit 1;

  if v_plan_version_id is null then
    raise exception 'plan unavailable' using errcode = '42501';
  end if;

  if v_current_plan_version_number <> p_expected_plan_version_number then
    raise exception 'plan changed; reload before reviewing progression'
      using errcode = '40001';
  end if;

  select ps.id into v_schedule_id
  from public.plan_schedules ps
  where ps.plan_id = p_plan_id
  for update;

  if v_schedule_id is null then
    raise exception 'active schedule required for this progression review'
      using errcode = '23514';
  end if;

  select psv.id, psv.plan_version_id, psv.version_number, psv.is_paused
  into v_schedule_version_id, v_schedule_plan_version_id,
       v_current_schedule_version_number, v_schedule_paused
  from public.plan_schedule_versions psv
  where psv.schedule_id = v_schedule_id
  order by psv.version_number desc
  limit 1;

  if v_schedule_version_id is null
     or v_current_schedule_version_number <> p_expected_schedule_version_number
     or v_schedule_plan_version_id <> v_plan_version_id then
    raise exception 'plan or schedule changed; reload before reviewing progression'
      using errcode = '40001';
  end if;

  if v_schedule_paused then
    raise exception 'schedule is already paused' using errcode = '23514';
  end if;

  select count(*) into v_old_weekly_sessions
  from public.plan_schedule_rules psr
  where psr.schedule_version_id = v_schedule_version_id;

  if v_old_weekly_sessions < 1 or v_old_weekly_sessions > 7 then
    raise exception 'schedule rule count is invalid' using errcode = '23514';
  end if;

  if p_feedback_kind = 'discomfort' or v_old_weekly_sessions = 1 then
    if p_remove_weekday is not null then
      raise exception 'a weekday cannot be removed for this pause proposal'
        using errcode = '23514';
    end if;
    v_action := 'pause';
    v_new_weekly_sessions := 0;
  else
    if p_remove_weekday is null or not exists (
      select 1 from public.plan_schedule_rules psr
      where psr.schedule_version_id = v_schedule_version_id
        and psr.weekday = p_remove_weekday
    ) then
      raise exception 'choose one scheduled weekday to remove'
        using errcode = '23514';
    end if;
    v_action := 'reduce_frequency';
    v_new_weekly_sessions := v_old_weekly_sessions - 1;
  end if;

  -- The stable plan-row lock serializes competing requests. Repeating the
  -- exact same pending review is idempotent; dismissed feedback can be
  -- recorded again later without inventing a new schedule snapshot.
  select pr.id into v_review_id
  from public.plan_progression_reviews pr
  join lateral (
    select ev.action
    from public.plan_progression_review_events ev
    where ev.review_id = pr.id
    order by ev.version_number desc
    limit 1
  ) latest on true
  where pr.plan_id = p_plan_id
    and pr.source_schedule_version_id = v_schedule_version_id
    and pr.feedback_kind = p_feedback_kind
    and pr.remove_weekday is not distinct from p_remove_weekday
    and latest.action = 'proposed'
  order by pr.created_at desc, pr.id desc
  limit 1;

  if v_review_id is not null then
    return v_review_id;
  end if;

  insert into public.plan_progression_reviews (
    plan_id, source_plan_version_id, source_schedule_version_id,
    feedback_kind, proposed_action, old_weekly_sessions,
    new_weekly_sessions, remove_weekday
  ) values (
    p_plan_id, v_plan_version_id, v_schedule_version_id,
    p_feedback_kind, v_action, v_old_weekly_sessions,
    v_new_weekly_sessions, p_remove_weekday
  ) returning id into v_review_id;

  insert into public.plan_progression_review_events (
    review_id, version_number, action
  ) values (v_review_id, 1, 'proposed');

  return v_review_id;
end;
$$;

revoke all on function public.create_conservative_plan_progression_review(
  uuid, integer, integer, text, smallint
) from public, anon, authenticated;

grant execute on function public.create_conservative_plan_progression_review(
  uuid, integer, integer, text, smallint
) to authenticated;

create function public.dismiss_conservative_plan_progression_review(
  p_review_id uuid,
  p_expected_event_version_number integer
)
returns integer
language plpgsql
security definer
set search_path = public, auth, private, pg_catalog, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
  v_owner uuid;
  v_current_event_version_number integer;
  v_current_action text;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_expected_event_version_number is null
     or p_expected_event_version_number <> 1 then
    raise exception 'expected review event version is invalid'
      using errcode = '23514';
  end if;

  select pr.plan_id into v_plan_id
  from public.plan_progression_reviews pr
  where pr.id = p_review_id;

  select p.user_id into v_owner
  from public.plans p
  where p.id = v_plan_id
  for update;

  if v_owner is null or v_owner <> v_user_id then
    raise exception 'review unavailable' using errcode = '42501';
  end if;

  perform 1 from public.plan_progression_reviews pr
  where pr.id = p_review_id
    and pr.plan_id = v_plan_id
  for update;

  select ev.version_number, ev.action
  into v_current_event_version_number, v_current_action
  from public.plan_progression_review_events ev
  where ev.review_id = p_review_id
  order by ev.version_number desc
  limit 1;

  if v_current_event_version_number <> p_expected_event_version_number
     or v_current_action <> 'proposed' then
    raise exception 'progression review changed; reload before dismissing'
      using errcode = '40001';
  end if;

  insert into public.plan_progression_review_events (
    review_id, version_number, action
  ) values (p_review_id, 2, 'dismissed');

  return 2;
end;
$$;

revoke all on function public.dismiss_conservative_plan_progression_review(
  uuid, integer
) from public, anon, authenticated;

grant execute on function public.dismiss_conservative_plan_progression_review(
  uuid, integer
) to authenticated;

comment on table public.plan_progression_reviews is
  'Owner-private exact-schedule conservative review-only proposals; no automatic schedule mutation.';

comment on table public.plan_progression_review_events is
  'Immutable progression proposal review events; this initial slice supports propose and dismiss only.';
