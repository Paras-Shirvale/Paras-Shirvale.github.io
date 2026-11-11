/* ============================================================
   db.js — every event, as a database row, for every student.

   HOW MANY STUDENTS WORK
   Each student has ONE profile on their device: the name and age
   they give at the very start. Registering creates a random
   child_id and a row in `children`. Every row logged afterwards
   carries that child_id and name, and is sent to the shared study
   database (Supabase), so a teacher can open ANY student's data
   from ANY computer. Students never see each other, and never see
   any of this.

   "Start over" deletes this student's rows — on the device and in
   the shared database (reset_child) — and nobody else's.

   Tables (see _server/supabase-schema.sql):
     children          who: name, age, avatar
     sessions          a world/chapter/mode attempt; also records
                       EXPOSURE (how many words with each letter
                       pair were met) and pause counts
     confusion_events  every letter mix-up, whether the child
                       caught it within 2 seconds, how it was found
     timing_events     time on words with a target pair, and an
                       ORDINARY-word baseline per session
     pause_events      every real difficulty pause and its type
     help_events       every cue card: rung, kind, helped, dismissed
     submissions       each finished reading or sentence

   Rows are kept on the device and queued for Supabase when
   config.js has SUPABASE_URL and SUPABASE_ANON_KEY. The queue
   survives going offline. The public key may only INSERT.
   ============================================================ */

(function (S) {
  'use strict';

  var KEY = 'spark.db.v1';
  var RESET_KEY = 'spark.reset.pending';
  var MAX_ROWS = 6000;
  var TABLES = ['children', 'sessions', 'confusion_events', 'timing_events', 'pause_events',
                'help_events', 'submissions', 'confusion_profile'];
  var SYNCED = ['children', 'sessions', 'confusion_events', 'timing_events', 'pause_events',
                'help_events', 'submissions'];

  var store = { tables: {}, queue: [] };
  if (!S.teacherMode) { try { store = JSON.parse(localStorage.getItem(KEY)) || store; } catch (e) {} }
  TABLES.forEach(function (t) { store.tables[t] = store.tables[t] || []; });
  store.queue = store.queue || [];

  function persist() {
    if (S.teacherMode) return;           /* a teacher looking round records nothing */
    try { localStorage.setItem(KEY, JSON.stringify(store)); }
    catch (e) {
      /* storage full: drop the oldest half of every table */
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

  /* ── who this student is ────────────────────────────────
     Called once, when the welcome finishes. After this the name
     and age are locked until "Start over". */
  DB.registerChild = function () {
    if (S.teacherMode || S.P.registered || !S.P.name) return;
    S.P.registered = true;
    S.save();
    DB.log('children', { age: S.P.age || null, avatar: S.P.avatar || '' });
  };

  /* ── sessions ───────────────────────────────────────────
     A session is one go at one mode of one chapter: reading
     chapter 2 of "Bud the Dog" is one session, writing it is
     another. The row is written when it ends. */
  var open = null;

  DB.startSession = function (info) {
    if (open) DB.endSession({ completed: false });
    open = {
      session_id: uuid(),
      world: info.world || 'practice',
      level: info.level || null,
      mode: info.mode,
      started_at: new Date().toISOString(),
      t0: Date.now(),
      ord: { sum: 0, n: 0 }          /* ordinary-word timings, averaged at the end */
    };
    return open.session_id;
  };

  DB.session = function () { return open ? open.session_id : null; };
  DB.sessionInfo = function () { return open; };

  DB.endSession = function (extra) {
    if (!open) return null;
    closeAllHelp();
    var s = open; open = null;

    /* the baseline: how fast this child is on words WITHOUT the
       target letters, so hesitation on target words means something */
    if (s.ord.n) {
      DB.log('timing_events', {
        session_id: s.session_id, mode: s.mode, confusion_class: 'none', word: null,
        ms_to_respond: Math.round(s.ord.sum / s.ord.n), n: s.ord.n, is_target: false
      });
    }
    var row = DB.log('sessions', Object.assign({
      session_id: s.session_id, world: s.world, level: s.level, mode: s.mode,
      started_at: s.started_at, ended_at: new Date().toISOString(),
      duration_ms: Date.now() - s.t0, completed: true
    }, extra || {}));
    DB.computeProfile();
    return row;
  };

  window.addEventListener('pagehide', function () {
    if (open) DB.endSession({ completed: false });
  });

  /* ── the event helpers the app calls ─────────────────── */
  function base(extra) {
    var s = open || {};
    return Object.assign({ session_id: s.session_id || null, mode: s.mode || null }, extra);
  }

  /** A letter mix-up (or any spelling slip). analysis is from S.Analysis.analyseMisread. */
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

  /**
   * How long a word took. Words containing the world's letters are
   * logged one by one (they are the evidence); every other word only
   * feeds the session's ordinary-word average.
   */
  DB.timing = function (word, ms, opts) {
    opts = opts || {};
    if (!(ms > 0) || ms > 60000) return;
    var cls = S.classOfWord(word, opts.prefer, !!opts.prefer);
    if (!cls) {
      if (open) { open.ord.sum += ms; open.ord.n++; }
      return;
    }
    DB.log('timing_events', base({ confusion_class: cls, word: S.norm(word), ms_to_respond: Math.round(ms), n: 1, is_target: true }));
  };

  /** A real difficulty pause: where, how long, and why Spark judged it so. */
  DB.pause = function (info) {
    DB.log('pause_events', base({
      confusion_class: S.classOfWord(info.word, info.prefer, !!info.prefer) || 'none',
      word: S.norm(info.word), duration_ms: Math.round(info.duration_ms),
      pause_type: info.pause_type, struggle: info.struggle !== false,
      detected_by: info.detected_by || 'live'
    }));
  };

  /**
   * A cue card was shown. The row is written once, when the card's
   * story is over — it helped, it was dismissed with "Not now", or
   * the session ended with it unused — so the database only needs inserts.
   */
  var openHelp = [];
  DB.help = function (info) {
    var row = base({
      confusion_class: info.confusion_class || S.classOfWord(info.word, info.prefer, !!info.prefer) || 'none',
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

  /* ── the confusion profile (local copy) ─────────────── */
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

  /* ── the shared database (Supabase) ─────────────────── */
  var syncTimer = null, syncing = false, wiped = false;

  function cfg() {
    var c = window.SPARK_CONFIG || {};
    return c.SUPABASE_URL && c.SUPABASE_ANON_KEY ? { url: c.SUPABASE_URL.replace(/\/$/, ''), key: c.SUPABASE_ANON_KEY } : null;
  }
  DB.online = function () { return !!cfg(); };

  /* The classic "anon" key is a signed token (starts eyJ) and goes in the
     Authorization header too. Supabase's newer "publishable" key
     (sb_publishable_…) is not a token and goes in apikey only. */
  function authHeaders(key) {
    var h = { apikey: key, 'Content-Type': 'application/json' };
    if (/^eyJ/.test(key)) h.Authorization = 'Bearer ' + key;
    return h;
  }

  function scheduleSync() {
    if (!cfg() || S.teacherMode) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(DB.sync, 2500);
  }

  /* Supabase refuses a batch whose rows do not all have exactly the same
     fields (a reading session records a speed, a writing session does not).
     So every row in a batch gets the same set, with null where it had none. */
  function uniform(rows) {
    var keys = {};
    rows.forEach(function (r) { Object.keys(r).forEach(function (k) { keys[k] = 1; }); });
    return rows.map(function (r) {
      var o = {};
      Object.keys(keys).forEach(function (k) { o[k] = r[k] === undefined ? null : r[k]; });
      return o;
    });
  }

  function post(c, table, rows) {
    return fetch(c.url + '/rest/v1/' + table, {
      method: 'POST',
      headers: Object.assign(authHeaders(c.key), { Prefer: 'return=minimal' }),
      body: JSON.stringify(uniform(rows))
    });
  }

  DB.sync = async function () {
    var c = cfg();
    if (!c || S.teacherMode || syncing || wiped || !store.queue.length || navigator.onLine === false) return;
    syncing = true;
    var batch = store.queue.slice(0, 200);
    var byTable = {};
    batch.forEach(function (q) { (byTable[q.t] = byTable[q.t] || []).push(q.r); });
    var done = [];
    for (var table in byTable) {
      var seen = {}, rows = byTable[table].filter(function (r) { if (seen[r.id]) return false; seen[r.id] = 1; return true; });
      try {
        /* A plain insert. (Asking Postgres to "ignore duplicates" needs read
           permission on the table, which the public key deliberately lacks.) */
        var res = await post(c, table, rows);
        if (res.ok) {
          done = done.concat(rows.map(function (r) { return r.id; }));
        } else if (res.status === 409) {
          /* some of these rows already arrived on an earlier try (a dropped
             connection after the server had saved them). Send one at a time:
             "already there" counts as delivered. */
          for (var i = 0; i < rows.length; i++) {
            var one = await post(c, table, [rows[i]]);
            if (one.ok || one.status === 409) done.push(rows[i].id);
          }
        }
      } catch (e) { /* offline — try again later */ }
    }
    if (!wiped) {
      store.queue = store.queue.filter(function (q) { return done.indexOf(q.r.id) < 0; });
      persist();
    }
    syncing = false;
    if (store.queue.length && done.length) scheduleSync();
  };

  window.addEventListener('online', function () { DB.sync(); DB.flushResets(); });

  /* ── "Start over": this student's data, and only theirs ─
     The device copy goes at once. The shared copy is deleted by
     the server's reset_child(), which only ever touches the one
     child_id it is given. If the device is offline the request is
     kept and retried the next time the page opens. */
  DB.wipeLocal = function () {
    wiped = true;
    open = null; openHelp = [];
    store = { tables: {}, queue: [] };
    TABLES.forEach(function (t) { store.tables[t] = []; });
    try { localStorage.removeItem(KEY); } catch (e) {}
  };

  function pendingResets() { try { return JSON.parse(localStorage.getItem(RESET_KEY)) || []; } catch (e) { return []; } }
  function savePending(list) { try { localStorage.setItem(RESET_KEY, JSON.stringify(list)); } catch (e) {} }

  async function callReset(id) {
    var c = cfg();
    if (!c) return true;
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 6000) : null;
    try {
      var res = await fetch(c.url + '/rest/v1/rpc/reset_child', {
        method: 'POST',
        headers: authHeaders(c.key),
        body: JSON.stringify({ p_child: id }),
        signal: ctrl ? ctrl.signal : undefined
      });
      return res.ok;
    } catch (e) { return false; }
    finally { if (timer) clearTimeout(timer); }
  }

  DB.resetRemote = async function (id) {
    if (!id || !cfg()) return true;
    if (await callReset(id)) return true;
    var list = pendingResets();
    if (list.indexOf(id) < 0) list.push(id);
    savePending(list);
    return false;
  };

  DB.flushResets = async function () {
    var list = pendingResets();
    if (!list.length || !cfg() || navigator.onLine === false) return;
    var left = [];
    for (var i = 0; i < list.length; i++) { if (!(await callReset(list[i]))) left.push(list[i]); }
    savePending(left);
  };

  /* ── "your teacher closed this account" ─────────────────
     A teacher can remove a student. Their history stays with the
     teacher; this device asks the server (child_status) and, when the
     answer is yes, clears itself so the next person signs in as a brand
     new student. Checked on opening, when the tab comes back, and every
     minute. A network failure is never taken as "removed". */
  var removedHandled = false;
  DB.checkRemoved = async function () {
    var c = cfg(), id = S.P.childId;
    if (S.teacherMode || !c || !id || removedHandled || navigator.onLine === false) return false;
    try {
      var res = await fetch(c.url + '/rest/v1/rpc/child_status', {
        method: 'POST', headers: authHeaders(c.key), body: JSON.stringify({ p_child: id })
      });
      if (!res.ok) return false;
      var out = await res.json();
      if (!out || out.removed !== true) return false;
    } catch (e) { return false; }
    removedHandled = true;
    DB.wipeLocal();            /* no resetRemote: the teacher keeps the history */
    S.reset();
    try { sessionStorage.removeItem('spark.role'); } catch (e) {}
    if (S.onRemoved) S.onRemoved(); else location.replace('login.html?removed=1');
    return true;
  };
  /* ── "last active" is the last time the device was used ──
     Not the last lesson finished: any tap, key press or the page coming
     back is a sign of life. Said to the server at most once a minute. */
  var lastTouch = 0;
  DB.touch = function (force) {
    var c = cfg();
    if (S.teacherMode || !c || !S.P.childId || !S.P.registered || navigator.onLine === false) return;
    if (!force && Date.now() - lastTouch < 60000) return;
    lastTouch = Date.now();
    fetch(c.url + '/rest/v1/rpc/touch_child', { method: 'POST', headers: authHeaders(c.key),
      body: JSON.stringify({ p_child: S.P.childId }) }).catch(function () {});
  };
  ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { DB.touch(); }, { passive: true }); });

  /* ── a changed picture reaches the teacher's list ─────── */
  DB.syncAvatar = function () {
    var c = cfg();
    if (S.teacherMode || !c || !S.P.childId || !S.P.registered || navigator.onLine === false) return;
    if (!S.P.avatar || S.P.avatarSent === S.P.avatar) return;
    var sent = S.P.avatar;
    fetch(c.url + '/rest/v1/rpc/set_child_avatar', { method: 'POST', headers: authHeaders(c.key),
      body: JSON.stringify({ p_child: S.P.childId, p_avatar: sent }) })
      .then(function (r) { if (r.ok) { S.P.avatarSent = sent; S.save(); } }, function () {});
  };

  document.addEventListener('visibilitychange', function () { if (!document.hidden) { DB.checkRemoved(); DB.touch(true); DB.syncAvatar(); } });
  setInterval(DB.checkRemoved, 60000);

  setInterval(DB.syncAvatar, 30000);
  window.addEventListener('online', function () { DB.syncAvatar(); });
  setTimeout(function () { DB.sync(); DB.flushResets(); DB.checkRemoved(); DB.touch(true); }, 4000);
  setTimeout(DB.syncAvatar, 8000);   /* after the first rows have reached the server */

})(window.Spark);
