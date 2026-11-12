/* ============================================================
   store.js — the child's profile.
   Everything the app claims about the child is measured and kept
   here. Nothing is seeded with fake progress: a new profile starts
   at zero sparks, zero sessions, no known words.
   Saved in localStorage, so it never leaves the device.
   ============================================================ */

window.Spark = window.Spark || {};

(function (S) {
  'use strict';

  var KEY = 'spark.profile.v1';

  /* ── small shared helpers ───────────────────────────── */
  S.$     = function (sel, root) { return (root || document).querySelector(sel); };
  S.$$    = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  S.clamp = function (n, lo, hi) { return Math.min(hi, Math.max(lo, n)); };
  /* The child's own calendar day (not UTC): a streak must roll over at their
     midnight, not at 05:30 in India. */
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  S.today = function () { return ymd(new Date()); };
  S.ymd = ymd;

  /** A stored YYYY-MM-DD as a child would say it. */
  S.niceDate = function (iso) {
    if (!iso) return '';
    var then = new Date(iso + 'T00:00:00');
    if (isNaN(then)) return '';
    var days = Math.round((new Date(S.today() + 'T00:00:00') - then) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return days + ' days ago';
    return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };
  S.norm  = function (w) { return String(w == null ? '' : w).toLowerCase().replace(/[^a-z']/g, ''); };
  S.esc   = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ── a blank profile ────────────────────────────────── */
  function blank() {
    return {
      name: '',
      age: null,
      avatar: '',       /* fox | owl | bear | bunny | cat | panda */
      medals: {},       /* medal id -> date earned */
      dictationDone: {},/* family id -> { date, right, total, mixed } */
      started: S.today(),

      /* results of the letter check, by passage id */
      screening: {},
      sparks: 0,
      streak: 0,
      lastDay: '',

      /* Which kind of help actually gets this child moving again.
         "shown" counts the times Spark offered it, "worked" the times
         the child carried on reading straight afterwards. */
      cue: {
        picture: { shown: 0, worked: 0 },
        sound:   { shown: 0, worked: 0 },
        parts:   { shown: 0, worked: 0 },
        say:     { shown: 0, worked: 0 }
      },

      /* word -> { seen, stalled, helped, misread, kinds } */
      words: {},

      /* Pauses, split by what they turned out to mean. Keeping the
         natural ones counted but separate is the whole point. */
      pauses: { natural: 0, struggle: 0, byType: {} },

      /* letter pair key -> { count, examples[] }  e.g. "bd" */
      letters: {},

      /* every misread word, for the record */
      misreads: [],

      /* Every struggle moment in full: which word, in which sentence,
         how long, what they actually said. The review page reads this
         so it can show what happened, not just how often. */
      events: [],

      /* how often each kind of error happened */
      errorKinds: {},

      /* which rung of the writing help ladder got them unstuck */
      writeHelp: { prompt: 0, cue: 0, choice: 0, answer: 0 },

      /* seconds Spark waits before offering help. Rises when the child
         recovers alone, falls when they needed the strongest help. */
      patience: 4.5,

      sessions: [],     /* { date, id, title, words, wpm, stalls, tricky[], ms } */
      writings: [],     /* { date, prompt, text, kind } */
      teacher: [],      /* { name, text, date, type, answers{} } */
      themeV2: 1,
      doneSteps: {},    /* passageId -> { read, understand, order } */
      practised: {},    /* word -> date practised */

      settings: {
        size: 'normal',   /* normal | large | huge */
        extraSpacing: false,  /* the evidence-backed wide-spacing mode */
        rate: 0.9,        /* speech rate */
        theme: 'light',   /* light | dark | auto (follow the device) */
        font: 'dyslexic', /* dyslexic (OpenDyslexic) | plain */
        voice: 'woman',   /* woman | man */
        voiceCheck: true, /* warn when a different voice is reading */
        /* 'illustration' = generated pictures (nicest, needs network)
           'pictogram'    = ARASAAC symbols only
           'off'          = only the drawn set that ships with the app */
        pictures: 'illustration'
      },

      ai: { provider: 'auto', key: '', model: '' }
    };
  }

  /* ── load / save ────────────────────────────────────── */
  function load() {
    var p = blank();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        for (var k in saved) if (Object.prototype.hasOwnProperty.call(saved, k)) p[k] = saved[k];
        /* fill in anything a newer version added */
        var d = blank();
        p.settings = Object.assign(d.settings, p.settings || {});
        p.cue      = Object.assign(d.cue, p.cue || {});
        p.ai       = Object.assign(d.ai, p.ai || {});
        /* Light became the default. Profiles that never chose a theme
           were sitting on 'auto', so move them over once; anyone who
           picks Auto again afterwards keeps it. */
        if (!p.themeV2) {
          if (p.settings.theme === 'auto') p.settings.theme = 'light';
          p.themeV2 = 1;
        }
      }
    } catch (e) { /* private window, blocked storage — carry on with a blank one */ }
    return p;
  }

  /* A teacher or parent looking round the website. They see the same
     pages a student does, but with a throw-away profile that is never
     saved and never recorded, so nothing they click becomes a student's
     data (and a student's saved profile on the same computer is left
     exactly as it was). */
  var role = '';
  try { role = sessionStorage.getItem('spark.role') || ''; } catch (e) {}
  S.teacherMode = role === 'teacher';
  S.blankProfile = blank;

  if (S.teacherMode) {
    S.P = blank();
    S.P.name = 'Teacher';
    S.P.avatar = 'owl';
    S.P.age = 10;
    S.P.registered = true;
  } else {
    S.P = load();
  }

  S.save = function () {
    if (S.teacherMode || S.practiceMode) return;     /* "Try it out" never touches the real profile */
    try { localStorage.setItem(KEY, JSON.stringify(S.P)); }
    catch (e) { /* storage full or blocked; the session still works */ }
  };

  S.reset = function () {
    if (S.teacherMode) return;
    S.P = blank();
    try { localStorage.removeItem(KEY); } catch (e) {}
  };

  /* ── sparks and streak ──────────────────────────────── */
  S.award = function (n, why) {
    S.P.sparks += n;
    S.save();
    var el = S.$('#sparkCount');
    if (el) el.textContent = S.P.sparks;
    /* no numbers for the child — just a kind word */
    S.toast('<span class="i" data-icon="spark" data-icon-size="18"></span> ' + why + '!');
    if (S.paintScene) S.paintScene();
    if (S.checkMedals) S.checkMedals();
  };

  S.bumpStreak = function () {
    var d = S.today();
    if (S.P.lastDay === d) return;
    var yd = new Date(); yd.setDate(yd.getDate() - 1);
    var yesterday = ymd(yd);
    S.P.streak = (S.P.lastDay === yesterday) ? S.P.streak + 1 : 1;
    S.P.lastDay = d;
    S.save();
    var el = S.$('#streakCount');
    if (el) el.textContent = S.P.streak;
  };

  /* ── derived views of the profile ───────────────────── */

  /* Help kinds ranked by how reliably they work for this child.
     Smoothed so one lucky hit does not win outright. */
  S.cueRank = function () {
    return Object.keys(S.P.cue)
      .map(function (k) {
        var v = S.P.cue[k];
        return { kind: k, rate: (v.worked + 1) / (v.shown + 2), shown: v.shown };
      })
      .sort(function (a, b) { return (b.rate - a.rate) || (b.shown - a.shown); })
      .map(function (x) { return x.kind; });
  };

  /* The favourite, but only once there is enough evidence to claim one. */
  S.favourite = function () {
    var total = 0;
    for (var k in S.P.cue) total += S.P.cue[k].shown;
    return total < 4 ? null : S.cueRank()[0];
  };

  /* Words paused on more than once and not yet practised. */
  S.trickyWords = function () {
    return Object.keys(S.P.words)
      .filter(function (w) { return S.P.words[w].stalled >= 2 && !S.P.practised[w]; })
      .sort(function (a, b) { return S.P.words[b].stalled - S.P.words[a].stalled; })
      .map(function (w) { return Object.assign({ word: w }, S.P.words[w]); });
  };

  /* Every word paused on twice or more, practised or not. */
  S.allTricky = function () {
    return Object.keys(S.P.words)
      .filter(function (w) { return S.P.words[w].stalled >= 2; })
      .sort(function (a, b) { return S.P.words[b].stalled - S.P.words[a].stalled; })
      .map(function (w) { return Object.assign({ word: w }, S.P.words[w]); });
  };

  S.noteWord = function (word, field) {
    var w = S.norm(word);
    if (!w) return null;
    var rec = S.P.words[w] || (S.P.words[w] = { seen: 0, stalled: 0, helped: 0 });
    if (field) rec[field] = (rec[field] || 0) + 1;
    return rec;
  };

})(window.Spark);
