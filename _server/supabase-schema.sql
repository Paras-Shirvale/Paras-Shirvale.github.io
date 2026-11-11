-- ============================================================
-- Spark — study database (Supabase / PostgreSQL)
--
-- Run this once in Supabase: SQL Editor → New query → paste → Run.
-- It is safe to run again later (it only adds what is missing).
--
-- WHO CAN DO WHAT
--   Students (the website's public "anon" key)
--     · INSERT their own rows. Nothing else: they cannot read,
--       change or delete any table.
--     · reset_child(child_id): delete ONE student's rows (the
--       "Start over" button). It touches only that child_id.
--   Teachers / parents (teacher.html, password below)
--     · teacher_children / teacher_child_data / teacher_export:
--       read functions that check the teacher password. No Supabase
--       login is needed. The password lives in app_settings, which
--       the public key cannot read; to change it run:
--          update app_settings set value = 'newpassword'
--           where key = 'teacher_password';
--
-- Many students: every row carries child_id, and `children` holds
-- the name and age each student gave when they started.
-- ============================================================

create table if not exists children (
  id         uuid primary key,
  child_id   uuid not null unique,
  child_name text,
  age        int,
  avatar     text,
  created_at timestamptz default now()
);
-- a teacher can remove a student: the row stays (history is kept for the
-- teacher) and the student's own device is told to start a fresh account
alter table children add column if not exists removed_at timestamptz;

create table if not exists sessions (
  id           uuid primary key,
  session_id   uuid not null unique,
  child_id     uuid not null,
  child_name   text,
  world        text,               -- bd | pq | mw | nu | cs | gj | practice
  level        int,                -- chapter 1-3
  mode         text,               -- read | write
  started_at   timestamptz,
  ended_at     timestamptz,
  duration_ms  int,
  completed    boolean,
  words        int,
  wpm          int,
  exposures    jsonb,              -- words met that contain each pair: {"bd":12,"pq":3,...}
  natural_pauses    int,           -- ordinary reading pauses
  difficulty_pauses int,           -- pauses that were real difficulty
  repeats      int,                -- words the child said again (self-corrections)
  created_at   timestamptz default now()
);
alter table sessions add column if not exists exposures jsonb;
alter table sessions add column if not exists natural_pauses int;
alter table sessions add column if not exists difficulty_pauses int;
alter table sessions add column if not exists repeats int;

create table if not exists confusion_events (
  id              uuid primary key,
  session_id      uuid,
  child_id        uuid not null,
  child_name      text,
  confusion_class text,            -- bd | pq | mw | nu | cs | gj | other
  expected_char   text,
  actual_char     text,
  word            text,
  actual_word     text,
  error_kind      text,            -- letter-confusion | word-reversal | transposition | substitution | omission | insertion | grammar
  pause_ms        int,
  self_corrected  boolean default false,   -- fixed by the child within 2 seconds
  detected_by     text,            -- live | model (Whisper) | spelling | copy
  mode            text,
  created_at      timestamptz default now()
);

create table if not exists timing_events (
  id              uuid primary key,
  session_id      uuid,
  child_id        uuid not null,
  child_name      text,
  confusion_class text,            -- a pair, or 'none' for the ordinary-word baseline
  word            text,
  ms_to_respond   int,
  n               int default 1,   -- words behind this row (>1 for a baseline average)
  is_target       boolean default true,
  mode            text,
  created_at      timestamptz default now()
);
alter table timing_events add column if not exists n int default 1;
alter table timing_events add column if not exists is_target boolean default true;

create table if not exists pause_events (
  id              uuid primary key,
  session_id      uuid,
  child_id        uuid not null,
  child_name      text,
  confusion_class text,
  word            text,
  duration_ms     int,
  pause_type      text,            -- decoding | word-specific | complex-word | struggle | long-gap
  struggle        boolean,
  detected_by     text,
  mode            text,
  created_at      timestamptz default now()
);

create table if not exists help_events (
  id              uuid primary key,
  session_id      uuid,
  child_id        uuid not null,
  child_name      text,
  confusion_class text,
  rung            text,            -- prompt | cue | choice | supply
  cue_type        text,            -- visual | audio | picture | sound | parts | choice
  word            text,
  resolved        boolean,         -- the child carried on straight after
  dismissed       boolean,         -- the child tapped "Not now"
  mode            text,
  shown_at        timestamptz,
  created_at      timestamptz default now()
);

create table if not exists submissions (
  id            uuid primary key,
  session_id    uuid,
  child_id      uuid not null,
  child_name    text,
  mode          text,
  word_count    int,
  sentence_text text,
  accuracy_pct  int,               -- stored for research; never shown to the child
  created_at    timestamptz default now()
);

create table if not exists confusion_profile (
  child_id          uuid not null,
  child_name        text,
  confusion_class   text not null,
  total_errors      int,
  self_correct_rate numeric,
  avg_pause_ms      int,
  trend             text,
  last_updated      timestamptz,
  primary key (child_id, confusion_class)
);

create table if not exists app_settings (
  key   text primary key,
  value text
);
insert into app_settings (key, value) values ('teacher_password', 'hci123')
  on conflict (key) do nothing;

create index if not exists ce_child on confusion_events (child_id, confusion_class);
create index if not exists te_child on timing_events (child_id, confusion_class);
create index if not exists he_child on help_events (child_id, confusion_class);
create index if not exists pe_child on pause_events (child_id);
create index if not exists se_child on sessions (child_id, started_at);
create index if not exists su_child on submissions (child_id);

-- ── table rights, then row-level security ───────────────────
grant usage on schema public to anon, authenticated;
revoke all on children, sessions, confusion_events, timing_events, pause_events, help_events,
              submissions, confusion_profile, app_settings from anon, authenticated;
grant insert on children, sessions, confusion_events, timing_events, pause_events, help_events,
                submissions to anon, authenticated;
grant select on children, sessions, confusion_events, timing_events, pause_events, help_events,
                submissions, confusion_profile to authenticated;

alter table children          enable row level security;
alter table sessions          enable row level security;
alter table confusion_events  enable row level security;
alter table timing_events     enable row level security;
alter table pause_events      enable row level security;
alter table help_events       enable row level security;
alter table submissions       enable row level security;
alter table confusion_profile enable row level security;
alter table app_settings      enable row level security;   -- no policy: nobody but the server functions

do $$
declare t text;
begin
  foreach t in array array['children','sessions','confusion_events','timing_events','pause_events','help_events','submissions'] loop
    execute format('drop policy if exists "app inserts" on %I', t);
    execute format('create policy "app inserts" on %I for insert to anon, authenticated with check (true)', t);
    execute format('drop policy if exists "staff read" on %I', t);
    execute format('create policy "staff read" on %I for select to authenticated using (true)', t);
  end loop;
end $$;

drop policy if exists "staff read" on confusion_profile;
create policy "staff read" on confusion_profile for select to authenticated using (true);

-- ── the teacher's read functions ────────────────────────────
create or replace function teacher_ok(p_password text) returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from app_settings where key = 'teacher_password' and value = p_password);
$$;

-- One row per student, with the numbers the class overview needs.
create or replace function teacher_children(p_password text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not teacher_ok(p_password) then
    raise exception 'wrong password' using errcode = '28000';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(t) order by lower(coalesce(t.name, ''))) from (
      select ids.child_id,
             coalesce(c.child_name, (select s.child_name from sessions s where s.child_id = ids.child_id and s.child_name <> '' limit 1)) as name,
             c.age, c.avatar, c.created_at, c.removed_at,
             (select count(*) from sessions s where s.child_id = ids.child_id and s.completed) as sessions,
             (select max(s.ended_at) from sessions s where s.child_id = ids.child_id) as last_active,
             (select count(distinct s.world) from sessions s
               where s.child_id = ids.child_id and s.completed and s.world in ('bd','pq','mw','nu','cs','gj')) as worlds,
             (select coalesce(jsonb_object_agg(x.confusion_class, x.n), '{}'::jsonb)
                from (select confusion_class, count(*) as n from confusion_events e
                       where e.child_id = ids.child_id group by confusion_class) x) as errors
      from (select child_id from children
            union select child_id from sessions
            union select child_id from confusion_events) ids
      left join children c on c.child_id = ids.child_id
    ) t
  ), '[]'::jsonb);
end $$;

-- Every row for one student.
create or replace function teacher_child_data(p_password text, p_child uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not teacher_ok(p_password) then
    raise exception 'wrong password' using errcode = '28000';
  end if;
  return jsonb_build_object(
    'children',         (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from children x where x.child_id = p_child),
    'sessions',         (select coalesce(jsonb_agg(to_jsonb(x) order by x.started_at), '[]'::jsonb) from sessions x where x.child_id = p_child),
    'confusion_events', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) from confusion_events x where x.child_id = p_child),
    'timing_events',    (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) from timing_events x where x.child_id = p_child),
    'pause_events',     (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) from pause_events x where x.child_id = p_child),
    'help_events',      (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) from help_events x where x.child_id = p_child),
    'submissions',      (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) from submissions x where x.child_id = p_child)
  );
end $$;

-- Everything, for every student (the study export).
create or replace function teacher_export(p_password text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not teacher_ok(p_password) then
    raise exception 'wrong password' using errcode = '28000';
  end if;
  return jsonb_build_object(
    'children',         (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from children x),
    'sessions',         (select coalesce(jsonb_agg(to_jsonb(x) order by x.started_at), '[]'::jsonb) from sessions x),
    'confusion_events', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) from confusion_events x),
    'timing_events',    (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) from timing_events x),
    'pause_events',     (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) from pause_events x),
    'help_events',      (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) from help_events x),
    'submissions',      (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) from submissions x)
  );
end $$;

-- "Start over": deletes ONE student's rows, and only theirs.
create or replace function reset_child(p_child uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_child is null then return; end if;
  delete from help_events       where child_id = p_child;
  delete from pause_events      where child_id = p_child;
  delete from timing_events     where child_id = p_child;
  delete from confusion_events  where child_id = p_child;
  delete from submissions       where child_id = p_child;
  delete from sessions          where child_id = p_child;
  delete from confusion_profile where child_id = p_child;
  delete from children          where child_id = p_child;
end $$;

-- Teacher removes a student. NOTHING is deleted: the student moves to the
-- teacher's "Removed students" page with all their history, and the
-- student's own device (which asks child_status) clears itself and sends
-- them to sign in again as a brand-new student.
create or replace function teacher_remove_child(p_password text, p_child uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not teacher_ok(p_password) then
    raise exception 'wrong password' using errcode = '28000';
  end if;
  insert into children (id, child_id, child_name, created_at)
    select gen_random_uuid(), p_child,
           coalesce((select s.child_name from sessions s where s.child_id = p_child and s.child_name <> '' limit 1), 'Unnamed'),
           now()
    where not exists (select 1 from children c where c.child_id = p_child);
  update children set removed_at = coalesce(removed_at, now()) where child_id = p_child;
end $$;

-- The student's device asks only this: "am I still a student here?"
-- It reveals nothing but a yes/no for an id only that device knows.
create or replace function child_status(p_child uuid) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('removed',
    exists (select 1 from children c where c.child_id = p_child and c.removed_at is not null));
$$;

revoke execute on function teacher_ok(text), teacher_children(text), teacher_child_data(text, uuid),
                           teacher_export(text), reset_child(uuid), teacher_remove_child(text, uuid),
                           child_status(uuid) from public, anon, authenticated;
grant execute on function teacher_children(text), teacher_child_data(text, uuid),
                          teacher_export(text), reset_child(uuid), teacher_remove_child(text, uuid),
                          child_status(uuid) to anon, authenticated;

-- ── the per-pair profile, rebuilt after each session ends ───
create or replace function refresh_confusion_profile(p_child uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into confusion_profile as cp
    (child_id, child_name, confusion_class, total_errors, self_correct_rate, avg_pause_ms, trend, last_updated)
  select
    p_child,
    (select child_name from sessions where child_id = p_child order by started_at desc limit 1),
    c.cls,
    coalesce(e.total, 0),
    case when coalesce(e.total, 0) = 0 then null else round(e.selfc::numeric / e.total, 2) end,
    t.avg_ms,
    coalesce(tr.trend, 'not enough data'),
    now()
  from unnest(array['bd','pq','mw','nu','cs','gj']) as c(cls)
  left join (
    select confusion_class, count(*) total, count(*) filter (where self_corrected) selfc
    from confusion_events where child_id = p_child group by confusion_class
  ) e on e.confusion_class = c.cls
  left join (
    select confusion_class, round(sum(ms_to_respond * coalesce(n, 1))::numeric / nullif(sum(coalesce(n, 1)), 0))::int avg_ms
    from timing_events where child_id = p_child and coalesce(is_target, true) group by confusion_class
  ) t on t.confusion_class = c.cls
  left join lateral (
    with per as (
      select s.session_id, s.started_at,
             (select count(*) from confusion_events ce
               where ce.session_id = s.session_id and ce.confusion_class = c.cls) errs
      from sessions s
      where s.child_id = p_child
        and (exists (select 1 from confusion_events ce where ce.session_id = s.session_id and ce.confusion_class = c.cls)
          or exists (select 1 from timing_events te where te.session_id = s.session_id and te.confusion_class = c.cls))
      order by s.started_at desc
      limit 6
    ), ranked as (select errs, row_number() over (order by started_at desc) rn from per)
    select case
      when (select count(*) from ranked where rn <= 3) < 3 or (select count(*) from ranked where rn > 3) < 1
        then 'not enough data'
      when (select avg(errs) from ranked where rn <= 3) < (select avg(errs) from ranked where rn > 3) * 0.8
        then 'improving'
      when (select avg(errs) from ranked where rn <= 3) > (select avg(errs) from ranked where rn > 3) * 1.2 + 0.01
        then 'regressing'
      else 'static' end as trend
  ) tr on true
  on conflict (child_id, confusion_class) do update set
    child_name = excluded.child_name, total_errors = excluded.total_errors,
    self_correct_rate = excluded.self_correct_rate, avg_pause_ms = excluded.avg_pause_ms,
    trend = excluded.trend, last_updated = excluded.last_updated;
end $$;

create or replace function on_session_ended() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform refresh_confusion_profile(new.child_id);
  return new;
end $$;

drop trigger if exists session_ended on sessions;
create trigger session_ended after insert on sessions
  for each row execute function on_session_ended();
