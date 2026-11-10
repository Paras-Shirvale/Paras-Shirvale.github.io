-- ============================================================
-- Spark — study database (Supabase / PostgreSQL)
--
-- Run this once in Supabase: SQL Editor → New query → paste → Run.
--
-- Security model
--   · The website uses the public "anon" key. It may only INSERT
--     rows. It can never read, change or delete anything.
--   · Teachers / parents / researchers sign in (Supabase Auth,
--     email + password) on teacher.html. Signed-in users may READ.
--     Create those accounts in Authentication → Users → Add user,
--     and switch OFF "Allow new users to sign up".
--   · confusion_profile is written only by the trigger below,
--     after each session ends.
-- ============================================================

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
  words        int,                -- words read (read sessions)
  wpm          int,                -- words per minute (read sessions)
  created_at   timestamptz default now()
);

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
  error_kind      text,            -- letter-confusion | word-reversal | substitution | ...
  pause_ms        int,
  self_corrected  boolean default false,   -- fixed by the child within 2 seconds
  detected_by     text,            -- live | model (Whisper) | spelling
  mode            text,
  created_at      timestamptz default now()
);

create table if not exists timing_events (
  id              uuid primary key,
  session_id      uuid,
  child_id        uuid not null,
  child_name      text,
  confusion_class text,
  word            text,
  ms_to_respond   int,
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
  trend             text,          -- improving | static | regressing | not enough data
  last_updated      timestamptz,
  primary key (child_id, confusion_class)
);

create index if not exists ce_child on confusion_events (child_id, confusion_class);
create index if not exists te_child on timing_events (child_id, confusion_class);
create index if not exists he_child on help_events (child_id, confusion_class);
create index if not exists se_child on sessions (child_id, started_at);

-- ── who may touch what (table rights; row security below) ───
-- Supabase usually grants these already; stating them keeps the
-- rules explicit: the app inserts, signed-in staff read, nobody
-- updates or deletes through the API.
grant usage on schema public to anon, authenticated;
revoke all on sessions, confusion_events, timing_events, help_events, submissions, confusion_profile from anon, authenticated;
grant insert on sessions, confusion_events, timing_events, help_events, submissions to anon, authenticated;
grant select on sessions, confusion_events, timing_events, help_events, submissions, confusion_profile to authenticated;

-- ── row level security ──────────────────────────────────────
alter table sessions          enable row level security;
alter table confusion_events  enable row level security;
alter table timing_events     enable row level security;
alter table help_events       enable row level security;
alter table submissions       enable row level security;
alter table confusion_profile enable row level security;

do $$
declare t text;
begin
  foreach t in array array['sessions','confusion_events','timing_events','help_events','submissions'] loop
    execute format('drop policy if exists "app inserts" on %I', t);
    execute format('create policy "app inserts" on %I for insert to anon, authenticated with check (true)', t);
    execute format('drop policy if exists "staff read" on %I', t);
    execute format('create policy "staff read" on %I for select to authenticated using (true)', t);
  end loop;
end $$;

drop policy if exists "staff read" on confusion_profile;
create policy "staff read" on confusion_profile for select to authenticated using (true);

-- ── the profile, rebuilt after each session ends ────────────
-- trend: errors per session over the last 3 sessions in which
-- the pair came up, against the 3 before them.
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
    select confusion_class, round(avg(ms_to_respond))::int avg_ms
    from timing_events where child_id = p_child group by confusion_class
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
