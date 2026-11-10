/* ============================================================
   db.js — every event, as a database row.

   The child never sees any of this. It is the raw record that
   powers the teacher/parent dashboard (teacher.html) and the
   study data. Six tables, as designed:

     sessions           a world/level/mode attempt, start → end
     confusion_events   every letter mix-up, and whether the child
                        caught it themselves within 2 seconds
     timing_events      how long each word containing a target
                        pair took to read or write
     help_events        every cue card shown: which rung, which
                        kind, did it help, was it dismissed
     submissions        each finished reading or sentence
     confusion_profile  per child per pair, re-computed after
                        every session (here, and on the server)

   Rows are stored in this browser AND queued for Supabase when
   config.js has SUPABASE_URL and SUPABASE_ANON_KEY. The queue
   survives going offline: rows sync whenever the page next can.
   The anon key only allows INSERTS (see supabase-schema.sql);
   reading the data back needs a teacher login.
   ============================================================ */

(function (S) {
  'use strict';

  var KEY = 'spark.db.v1';
  var MAX_ROWS = 4000;
  var TABLES = ['sessions', 'confusion_events', 'timing_events', 'help_events', 'submissions', 'confusion_profile'];
  var SYNCED = ['sessions', 'confusion_events', 'timing_events', 'help_events', 'submissions'];

  var store = { tables: {}, queue: [] };
  try { store = JSON.parse(localStorage.getItem(KEY)) || store; } catch (e) {}
  TABLES.forEach(function (t) { store.tables[t] = store.tables[t] || []; });
  store.queue = store.queue || [];

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); }
    catch (e) {
      /* storage full: drop the oldest half of the biggest tables */
      TABLES.forEach(function (t) { store.tables[t] = store.tables[t].slice(-Math.floor(MAX_ROWS / 2)); });
      try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e2) {}
    }
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }

  function childId() {
    if (!S.P.childId) { S.P.childId = uuid(); S.save(); }
    return S.P.childId;
  }

  var DB = S.DB = { uuid: uuid };

  /** Add a row to a table. Returns the row. */
  DB.log = function (table, row) {
    var full = Object.assign({
      id: uuid(),
      child_id: childId(),
      child_name: S.P.name || '',
      created_at: new Date().toISOString()
    }, row);
    var list = store.tables[table];
    list.push(full);
    if (list.length > MAX_ROWS) store.tables[table] = list.slice(-MAX_ROWS);
    if (SYNCED.indexOf(table) > -1) store.queue.push({ t: table, r: full });
    persist();
    scheduleSync();
    return full;
  };

  DB.rows = function (table) { return store.tables[table] || []; };
  DB.all = function () { return store.tables; };
  DB.pending = function () { return store.queue.length; };

  /* ── sessions ───────────────────────────────────────────
     A session is one go at one mode of one level: reading
     chapter 2 of Deep Sea Signal is one session, writing it is
     another. The row is written when it ends, with both times. */
  var open = null;

  DB.startSession = function (info) {
    if (open) DB.endSession({ completed: false });
    open = {
      session_id: uuid(),
      world: info.world || 'practice',
      level: info.level || null,
      mode: info.mode,
      started_at: new Date().toISOString(),
      t0: Date.now()
    };
    return open.session_id;
  };

  DB.session = function () { return open ? open.session_id : null; };
  DB.sessionInfo = function () { return open; };

  DB.endSession = function (extra) {
    if (!open) return null;
    closeAllHelp();
    var s = open; open = null;
    var row = DB.log('sessions', Object.assign({
      session_id: s.session_id, world: s.world, level: s.level, mode: s.mode,
      started_at: s.started_at, ended_at: new Date().toISOString(),
      duration_ms: Date.now() - s.t0, completed: true
    }, extra || {}));
    DB.computeProfile();
    return row;
  };

  /* a session left open when the page closes still counts */
  window.addEventListener('pagehide', function () {
    if (open) DB.endSession({ completed: false });
  });

  /* ── the event helpers the app calls ─────────────────── */
  function base(extra) {
    var s = open || {};
    return Object.assign({ session_id: s.session_id || null, mode: s.mode || null }, extra);
  }

  /** A letter mix-up. analysis comes from S.Analysis.analyseMisread. */
  DB.confusion = function (analysis, opts) {
    opts = opts || {};
    var pairs = (analysis && analysis.pairs && analysis.pairs.length) ? analysis.pairs : [null];
    pairs.forEach(function (p) {
      var cls = p ? S.classOfPair(p.key) : (S.classOfWord(analysis.expected, opts.prefer) || 'other');
      DB.log('confusion_events', base({
        confusion_class: cls,
        expected_char: p ? p.want : null,
        actual_char: p ? p.got : null,
        word: analysis.expected,
        actual_word: analysis.heard,
        error_kind: analysis.kind,
        pause_ms: opts.pause_ms != null ? Math.round(opts.pause_ms) : null,
        self_corrected: !!opts.self_corrected,
        detected_by: opts.detected_by || 'live',
        mode: opts.mode || (open && open.mode) || null
      }));
    });
  };

  DB.timing = function (word, ms, opts) {
    opts = opts || {};
    var cls = S.classOfWord(word, opts.prefer);
    if (!cls || !(ms > 0) || ms > 60000) return;
    DB.log('timing_events', base({ confusion_class: cls, word: S.norm(word), ms_to_respond: Math.round(ms) }));
  };

  /**
   * A cue card was shown. The row is written once, when the card's
   * story is over — it helped, it was dismissed with "Not now", or
   * the session ended with it unused — so the database only ever
   * needs inserts, never updates.
   */
  var openHelp = [];
  DB.help = function (info) {
    var row = base({
      confusion_class: info.confusion_class || S.classOfWord(info.word, info.prefer) || 'none',
      rung: info.rung, cue_type: info.cue_type, word: info.word ? S.norm(info.word) || info.word : null,
      shown_at: new Date().toISOString()
    });
    var closed = false;
    function close(resolved, dismissed) {
      if (closed) return;
      closed = true;
      openHelp = openHelp.filter(function (h) { return h !== handle; });
      DB.log('help_events', Object.assign(row, { resolved: resolved, dismissed: dismissed }));
    }
    var handle = {
      resolve: function () { close(true, false); },
      dismiss: function () { close(false, true); },
      close: function () { close(false, false); },
      get open() { return !closed; }
    };
    openHelp.push(handle);
    return handle;
  };
  function closeAllHelp() { openHelp.slice().forEach(function (h) { h.close(); }); }

  DB.submission = function (info) {
    return DB.log('submissions', base({
      word_count: info.word_count, sentence_text: info.sentence_text,
      accuracy_pct: info.accuracy_pct != null ? Math.round(info.accuracy_pct) : null,
      mode: info.mode || (open && open.mode)
    }));
  };

  /* ── the confusion profile ──────────────────────────────
     One row per letter pair, rebuilt from the raw events after
     every session. The same maths runs on the server (SQL) and
     in the dashboard, so all three agree. */
  DB.computeProfile = function (tables) {
    var t = tables || store.tables;
    var profile = S.confusionProfile(t, childId());
    if (!tables) {
      store.tables.confusion_profile = profile.map(function (p) {
        return Object.assign({ child_id: childId(), child_name: S.P.name || '' }, p);
      });
      persist();
    }
    return profile;
  };

  /**
   * Shared maths for the profile and the dashboard.
   * trend: last 3 sessions vs the 3 before, errors per session.
   */
  S.confusionProfile = function (t, child) {
    var mine = function (r) { return !child || r.child_id === child; };
    var sessions = (t.sessions || []).filter(mine)
      .sort(function (a, b) { return a.started_at < b.started_at ? -1 : 1; });
    var order = {};
    sessions.forEach(function (s, i) { order[s.session_id] = i; });
    var events = (t.confusion_events || []).filter(mine);
    var timings = (t.timing_events || []).filter(mine);

    return S.CLASSES.map(function (cls) {
      var ev = events.filter(function (e) { return e.confusion_class === cls; });
      var tm = timings.filter(function (e) { return e.confusion_class === cls; });
      var self = ev.filter(function (e) { return e.self_corrected; }).length;
      var avg = tm.length ? tm.reduce(function (n, e) { return n + e.ms_to_respond; }, 0) / tm.length : null;

      /* errors per session, for the sessions this class appeared in */
      var per = {};
      ev.forEach(function (e) { if (e.session_id in order) per[e.session_id] = (per[e.session_id] || 0) + 1; });
      var touched = sessions.filter(function (s) {
        return per[s.session_id] || tm.some(function (x) { return x.session_id === s.session_id; });
      });
      var counts = touched.map(function (s) { return per[s.session_id] || 0; });
      var last3 = counts.slice(-3), prev3 = counts.slice(-6, -3);
      var mean = function (a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; };
      var trend = 'not enough data';
      if (last3.length === 3 && prev3.length >= 1) {
        var a = mean(last3), b = mean(prev3);
        trend = a < b * 0.8 ? 'improving' : a > b * 1.2 + 0.01 ? 'regressing' : 'static';
      }
      return {
        confusion_class: cls,
        total_errors: ev.length,
        self_correct_rate: ev.length ? Math.round(self / ev.length * 100) / 100 : null,
        avg_pause_ms: avg != null ? Math.round(avg) : null,
        trend: trend,
        last_updated: new Date().toISOString()
      };
    });
  };

  /* ── syncing to Supabase ────────────────────────────── */
  var syncTimer = null, syncing = false;

  function cfg() {
    var c = window.SPARK_CONFIG || {};
    return c.SUPABASE_URL && c.SUPABASE_ANON_KEY ? { url: c.SUPABASE_URL.replace(/\/$/, ''), key: c.SUPABASE_ANON_KEY } : null;
  }
  DB.online = function () { return !!cfg(); };

  function scheduleSync() {
    if (!cfg()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(DB.sync, 2500);
  }

  DB.sync = async function () {
    var c = cfg();
    if (!c || syncing || !store.queue.length || navigator.onLine === false) return;
    syncing = true;
    var batch = store.queue.slice(0, 200);
    var byTable = {};
    batch.forEach(function (q) { (byTable[q.t] = byTable[q.t] || []).push(q.r); });
    var done = [];
    for (var table in byTable) {
      /* the latest version of each row, once */
      var seen = {}, rows = byTable[table].filter(function (r) { if (seen[r.id]) return false; seen[r.id] = 1; return true; });
      try {
        var res = await fetch(c.url + '/rest/v1/' + table + '?on_conflict=id', {
          method: 'POST',
          headers: {
            apikey: c.key, Authorization: 'Bearer ' + c.key, 'Content-Type': 'application/json',
            /* insert-only: a row already there is left alone */
            Prefer: 'return=minimal,resolution=ignore-duplicates'
          },
          body: JSON.stringify(rows)
        });
        if (res.ok) done = done.concat(rows.map(function (r) { return r.id; }));
      } catch (e) { /* offline — try again later */ }
    }
    store.queue = store.queue.filter(function (q) { return done.indexOf(q.r.id) < 0; });
    persist();
    syncing = false;
    if (store.queue.length && done.length) scheduleSync();
  };

  window.addEventListener('online', function () { DB.sync(); });
  setTimeout(function () { DB.sync(); }, 4000);

})(window.Spark);
