/* ============================================================
   teacher.js — the teacher and parent dashboard.

   Two levels:
     All students   everyone who has used Spark, from any device,
                    with who needs attention and which letters are
                    hardest for the class.
     One student    every measure drawn as a chart, plus plain-
                    language insights worked out from the data.

   Where the data comes from:
     · the study database (Supabase), through password-checked
       functions — the teacher sees every student, whichever device
       they used;
     · or, with no database configured, whatever is saved in this
       browser (so it can be tried out on one computer).

   Self-contained on purpose: nothing here is shared with the
   child's app except the list of worlds.
   ============================================================ */

(function () {
  'use strict';

  var S = window.Spark;
  var $ = function (s) { return document.querySelector(s); };
  var CFG = window.SPARK_CONFIG || {};
  var CLOUD = CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY
    ? { url: CFG.SUPABASE_URL.replace(/\/$/, ''), key: CFG.SUPABASE_ANON_KEY } : null;
  var LOCAL_PASSWORD = 'hci123';          /* only the gate for one-computer mode */

  var COLOURS = { bd: '#3FBF9B', pq: '#8C7DF0', mw: '#F0B44C', nu: '#E2678C', cs: '#5B9BEA', gj: '#9BD36B' };
  var PAIRS = S.WORLDS.map(function (w) {
    return { k: w.pair, id: w.id, label: w.letters.join(' / '), world: w.title, colour: COLOURS[w.pair] };
  });
  var BY = {}; PAIRS.forEach(function (p) { BY[p.k] = p; });
  var RUNGS = ['prompt', 'cue', 'choice', 'supply'];
  var RUNG_COLOUR = { prompt: '#5B9BEA', cue: '#3FBF9B', choice: '#F0B44C', supply: '#E2678C' };
  var KIND_LABEL = {
    'letter-confusion': 'Swapped letters', 'word-reversal': 'Word backwards', transposition: 'Letters in the wrong order',
    substitution: 'Different letters or word', omission: 'Letters left out', insertion: 'Extra letters',
    grammar: 'Grammar', other: 'Spelt differently'
  };
  var PAUSE_LABEL = {
    decoding: 'Sounding a word out', 'word-specific': 'A word that keeps catching them',
    'complex-word': 'A long or tricky word', struggle: 'Stuck in the middle of a phrase', 'long-gap': 'A long gap (found on re-listening)'
  };
  var CUE_LABEL = {
    picture: 'Picture (seeing what the word is)', audio: 'Hearing it (Spark says the word)',
    speak: 'Saying it (the child says it)', split: 'Splitting the word into chunks',
    visual: 'Visual clue (writing help)', choice: 'Choice (pick the right one)'
  };

  /* ── small helpers ──────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function mean(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function wavg(rows) {
    var n = sum(rows.map(function (r) { return r.n || 1; }));
    return n ? sum(rows.map(function (r) { return r.ms_to_respond * (r.n || 1); })) / n : null;
  }
  function f1(v) { return v == null ? '—' : (Math.round(v * 10) / 10).toString(); }
  function byStart(a, b) { return String(a.started_at || a.created_at) < String(b.started_at || b.created_at) ? -1 : 1; }
  /* the calendar day in the teacher's own time zone, to match the student's streak */
  function day(iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function shortDate(iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    return d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  }
  /* "Last active": the time if it was today (24-hour HH:MM), "Yesterday HH:MM"
     for yesterday, and the date and time for anything older. */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function hhmm(d) { return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function ago(iso) {
    if (!iso) return 'never';
    var d = new Date(iso); if (isNaN(d)) return 'never';
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var yest = new Date(today); yest.setDate(yest.getDate() - 1);
    if (d >= today) return hhmm(d);
    if (d >= yest) return 'Yesterday ' + hhmm(d);
    var thisYear = d.getFullYear() === new Date().getFullYear();
    return shortDate(iso) + (thisYear ? '' : ' ' + d.getFullYear()) + ' ' + hhmm(d);
  }
  function normKind(c) {
    return CUE_LABEL[c] ? c : (c === 'sound' ? 'audio' : 'audio');
  }

  /* ══ where the data comes from ═══════════════════════════ */
  function summarise(t) {
    var ids = {};
    ['children', 'sessions', 'confusion_events'].forEach(function (tab) {
      (t[tab] || []).forEach(function (r) { if (r.child_id) ids[r.child_id] = 1; });
    });
    return Object.keys(ids).map(function (id) {
      var c = (t.children || []).filter(function (x) { return x.child_id === id; })[0] || {};
      var ss = (t.sessions || []).filter(function (s) { return s.child_id === id; });
      var done = ss.filter(function (s) { return s.completed; });
      var worlds = {};
      done.forEach(function (s) { if (BY[s.world] || PAIRS.some(function (p) { return p.id === s.world; })) worlds[s.world] = 1; });
      var errors = {};
      (t.confusion_events || []).filter(function (e) { return e.child_id === id; })
        .forEach(function (e) { errors[e.confusion_class] = (errors[e.confusion_class] || 0) + 1; });
      var ends = ss.map(function (s) { return s.ended_at; }).filter(Boolean).sort();
      return {
        child_id: id, name: c.child_name || (ss[0] && ss[0].child_name) || 'Unnamed', age: c.age || null,
        avatar: c.avatar || '', created_at: c.created_at || null, sessions: done.length,
        last_active: ends.length ? ends[ends.length - 1] : null, worlds: Object.keys(worlds).length, errors: errors
      };
    }).sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; });
  }

  function cloudSource() {
    function rpc(fn, args) {
      return fetch(CLOUD.url + '/rest/v1/rpc/' + fn, {
        method: 'POST',
        headers: /^eyJ/.test(CLOUD.key)
          ? { apikey: CLOUD.key, Authorization: 'Bearer ' + CLOUD.key, 'Content-Type': 'application/json' }
          : { apikey: CLOUD.key, 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      }).then(function (res) {
        /* a function that returns nothing (like removing a student) sends an
           empty body, which is not an error */
        if (res.ok) return res.text().then(function (t) { return t ? JSON.parse(t) : null; });
        return res.json().catch(function () { return {}; }).then(function (j) {
          throw new Error(/wrong password/i.test(String(j.message || '')) ? 'wrong password'
            : 'Could not reach the study database (' + res.status + ').');
        });
      }, function () { throw new Error('Could not reach the study database. Check the internet connection.'); });
    }
    return {
      cloud: true, label: 'Study database',
      children: function (pw) { return rpc('teacher_children', { p_password: pw }); },
      child: function (pw, id) { return rpc('teacher_child_data', { p_password: pw, p_child: id }); },
      all: function (pw) { return rpc('teacher_export', { p_password: pw }); },
      remove: function (pw, id) { return rpc('teacher_remove_child', { p_password: pw, p_child: id }); }
    };
  }

  function localSource() {
    function tables() { try { return (JSON.parse(localStorage.getItem('spark.db.v1')) || {}).tables || {}; } catch (e) { return {}; } }
    function gate(pw) { return pw === LOCAL_PASSWORD ? Promise.resolve() : Promise.reject(new Error('wrong password')); }
    return {
      cloud: false, label: 'This device only',
      children: function (pw) { return gate(pw).then(function () { return summarise(tables()); }); },
      child: function (pw, id) {
        return gate(pw).then(function () {
          var t = tables(), out = {};
          ['children', 'sessions', 'confusion_events', 'timing_events', 'pause_events', 'help_events', 'submissions']
            .forEach(function (k) { out[k] = (t[k] || []).filter(function (r) { return r.child_id === id; }); });
          return out;
        });
      },
      all: function (pw) { return gate(pw).then(tables); },
      remove: function () { return Promise.reject(new Error('Removing a student needs the study database (see _server/README.md).')); }
    };
  }

  var Source = CLOUD ? cloudSource() : localSource();
  var password = '';
  var kids = [];          /* students still active */
  var removedKids = [];   /* removed by a teacher; their history is kept */
  var cameFrom = 'overview';
  var current = null;     /* { kid, data, M } for the open student */

  /* ══ signing in ══════════════════════════════════════════
     The password is asked on login.html. This page just reuses it for
     the length of the visit, and sends you back there if it is missing
     or no longer right. */
  function toLogin() { location.replace('login.html?next=teacher'); }

  function load() {
    return Source.children(password).then(function (list) {
      kids = list.filter(function (k) { return !k.removed_at; });
      removedKids = list.filter(function (k) { return k.removed_at; });
      var n = $('#navRemovedN');
      n.hidden = !removedKids.length; n.textContent = removedKids.length;
      $('#tSource').textContent = Source.label;
    });
  }

  function start() {
    password = sessionStorage.getItem('spark.teacher.pw') || '';
    if (!password) { toLogin(); return; }
    load().then(function () {
      $('#tChecking').hidden = true;
      showOverview();
    }, function (err) {
      if (/wrong password/.test(err.message)) { sessionStorage.removeItem('spark.teacher.pw'); toLogin(); return; }
      $('#tChecking').textContent = err.message;
    });
  }

  $('#tLogout').addEventListener('click', function () {
    try { sessionStorage.clear(); } catch (e) {}
    location.href = 'login.html';
  });
  $('#navStudents').addEventListener('click', function () { current = null; showOverview(); });
  $('#navRemoved').addEventListener('click', function () { current = null; showRemoved(); });

  /* ══ charts, drawn here with no library ══════════════════ */
  /* An axis of four equal, round steps that covers the biggest value:
     0, 0.2, 0.4, 0.6, 0.8 rather than 0, 0.1, 0.3, 0.4, 0.5. */
  function niceMax(v) {
    if (!(v > 0)) return 1;
    var raw = v / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return 4 * (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }
  function tickFmt(v) { return String(Math.round(v * 100) / 100); }
  function none(msg) { return '<p class="t-none">' + esc(msg || 'Not enough data yet.') + '</p>'; }
  function legend(items) {
    return '<div class="legend">' + items.map(function (i) {
      return '<span><i style="background:' + i.colour + '"></i>' + esc(i.name) + '</span>';
    }).join('') + '</div>';
  }
  function axes(W, H, PL, PR, PT, PB, max, fmt) {
    var g = '';
    for (var t = 0; t <= 4; t++) {
      var v = max * t / 4, y = PT + (H - PT - PB) * (1 - t / 4);
      g += '<line x1="' + PL + '" x2="' + (W - PR) + '" y1="' + y + '" y2="' + y + '" class="grid"/>' +
           '<text x="' + (PL - 7) + '" y="' + (y + 4) + '" class="ytick" text-anchor="end">' + fmt(v) + '</text>';
    }
    return g;
  }
  function xlabels(labels, X, H, PB) {
    var step = Math.ceil(labels.length / 8), out = '';
    labels.forEach(function (l, i) {
      if (i % step === 0 || i === labels.length - 1) {
        out += '<text x="' + X(i) + '" y="' + (H - PB + 16) + '" class="xtick" text-anchor="middle">' + esc(l) + '</text>';
      }
    });
    return out;
  }

  /** Lines over time. series: [{name, colour, vals:[number|null per label]}] */
  function lineChart(o) {
    var W = o.w || 560, H = o.h || 220, PL = 46, PR = 14, PT = 12, PB = 30;
    var all = [];
    o.series.forEach(function (s) { s.vals.forEach(function (v) { if (v != null) all.push(v); }); });
    if (!all.length) return none(o.empty);
    var max = o.max || niceMax(Math.max.apply(null, all) * 1.02), n = o.labels.length, fmt = o.fmt || tickFmt;
    function X(i) { return PL + (n <= 1 ? (W - PL - PR) / 2 : (W - PL - PR) * i / (n - 1)); }
    function Y(v) { return PT + (H - PT - PB) * (1 - v / max); }
    var svg = axes(W, H, PL, PR, PT, PB, max, fmt) + xlabels(o.labels, X, H, PB);
    o.series.forEach(function (s) {
      var d = '', dots = '';
      s.vals.forEach(function (v, i) {
        if (v == null) return;
        d += (d ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1);
        dots += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="3.6" fill="' + s.colour + '">' +
                '<title>' + esc(s.name + ' · ' + o.labels[i] + ': ' + fmt(v) + (o.unit || '')) + '</title></circle>';
      });
      svg += '<path d="' + d + '" fill="none" stroke="' + s.colour + '" stroke-width="2.4" stroke-linejoin="round"/>' + dots;
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img">' + svg + '</svg>' +
      (o.series.length > 1 ? legend(o.series) : '');
  }

  /** Bars side by side. groups: [label]; series: [{name, colour, vals}] */
  function groupedBars(o) {
    var W = o.w || 560, H = o.h || 220, PL = 46, PR = 14, PT = 12, PB = 34;
    var all = []; o.series.forEach(function (s) { s.vals.forEach(function (v) { if (v != null) all.push(v); }); });
    if (!all.length) return none(o.empty);
    var max = niceMax(Math.max.apply(null, all) * 1.02), fmt = o.fmt || tickFmt;
    var gw = (W - PL - PR) / o.groups.length, bw = Math.min(34, (gw - 14) / o.series.length);
    var svg = axes(W, H, PL, PR, PT, PB, max, fmt);
    o.groups.forEach(function (g, gi) {
      var x0 = PL + gw * gi + (gw - bw * o.series.length) / 2;
      o.series.forEach(function (s, si) {
        var v = s.vals[gi]; if (v == null) return;
        var h = (H - PT - PB) * v / max;
        svg += '<rect x="' + (x0 + bw * si).toFixed(1) + '" y="' + (H - PB - h).toFixed(1) + '" width="' + (bw - 3) + '" height="' + h.toFixed(1) +
               '" rx="3" fill="' + (s.colours ? s.colours[gi] : s.colour) + '"><title>' + esc(s.name + ' · ' + g + ': ' + fmt(v) + (o.unit || '')) + '</title></rect>';
      });
      svg += '<text x="' + (PL + gw * gi + gw / 2) + '" y="' + (H - PB + 16) + '" class="xtick" text-anchor="middle">' + esc(g) + '</text>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img">' + svg + '</svg>' +
      (o.series.length > 1 ? legend(o.series) : '');
  }

  /** Stacked columns. cols: [label]; parts: [{name, colour, vals}] */
  function stackedBars(o) {
    var W = o.w || 560, H = o.h || 220, PL = 46, PR = 14, PT = 12, PB = 30;
    var totals = o.cols.map(function (c, i) { return sum(o.parts.map(function (p) { return p.vals[i] || 0; })); });
    if (!sum(totals)) return none(o.empty);
    var max = niceMax(Math.max.apply(null, totals) * 1.02);
    var gw = (W - PL - PR) / o.cols.length, bw = Math.min(36, gw - 6);
    var svg = axes(W, H, PL, PR, PT, PB, max, function (v) { return Math.round(v); });
    o.cols.forEach(function (c, i) {
      var y = H - PB, x = PL + gw * i + (gw - bw) / 2;
      o.parts.forEach(function (p) {
        var v = p.vals[i] || 0; if (!v) return;
        var h = (H - PT - PB) * v / max; y -= h;
        svg += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) +
               '" fill="' + p.colour + '"><title>' + esc(p.name + ' · ' + c + ': ' + v) + '</title></rect>';
      });
    });
    svg += xlabels(o.cols, function (i) { return PL + gw * i + gw / 2; }, H, PB);
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img">' + svg + '</svg>' + legend(o.parts);
  }

  /** A row of horizontal bars as plain HTML. */
  function hbars(rows) {
    if (!rows.length) return none();
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; })) || 1;
    return '<div class="hbars">' + rows.map(function (r) {
      return '<div class="hbar"><span class="hb-label">' + esc(r.label) + '</span>' +
        '<span class="hb-track"><i style="width:' + Math.max(2, r.value / max * 100) + '%;background:' + (r.colour || '#3FBF9B') + '"></i></span>' +
        '<span class="hb-val">' + esc(r.text != null ? r.text : r.value) + '</span></div>';
    }).join('') + '</div>';
  }

  /* ══ the numbers for one student ═════════════════════════ */
  function buildModel(d) {
    var sessions = (d.sessions || []).slice().sort(byStart);
    var M = {
      d: d, sessions: sessions,
      done: sessions.filter(function (s) { return s.completed; }),
      ce: d.confusion_events || [], te: d.timing_events || [], pe: d.pause_events || [],
      he: d.help_events || [], sub: d.submissions || [], pairs: {}
    };
    M.labels = sessions.map(function (s, i) { return shortDate(s.started_at) || ('S' + (i + 1)); });
    /* One point per CHAPTER: its reading and its writing together. Reading
       sessions and writing sessions alternate, and they behave differently,
       so plotting them one by one makes a zigzag that means nothing. */
    M.units = [];
    var umap = {};
    sessions.forEach(function (s) {
      if (!BY[s.world]) return;
      var key = s.world + '|' + s.level;
      if (!umap[key]) { umap[key] = { sessions: [], ids: {}, at: s.started_at }; M.units.push(umap[key]); }
      umap[key].sessions.push(s); umap[key].ids[s.session_id] = 1;
    });
    M.unitLabels = M.units.map(function (u) { return shortDate(u.at); });
    M.baseline = wavg(M.te.filter(function (r) { return r.confusion_class === 'none' || r.is_target === false; }));

    PAIRS.forEach(function (p) {
      var k = p.k;
      var ev = M.ce.filter(function (e) { return e.confusion_class === k; });
      var tm = M.te.filter(function (r) { return r.confusion_class === k && r.is_target !== false; });
      var hp = M.he.filter(function (h) { return h.confusion_class === k; });
      var rate = M.units.map(function (u) {
        var ex = sum(u.sessions.map(function (s) { return (s.exposures && s.exposures[k]) || 0; }));
        if (!(ex > 0)) return null;
        var n = ev.filter(function (e) { return u.ids[e.session_id]; }).length;
        return { y: 100 * n / ex, n: n, ex: ex };
      });
      var pts = rate.filter(Boolean);
      var exposed = sum(pts.map(function (r) { return r.ex; }));
      var errsExposed = sum(pts.map(function (r) { return r.n; }));
      var trend = 'not enough data', first = null, second = null;
      if (pts.length >= 3) {          /* a world has three chapters */
        var half = Math.floor(pts.length / 2);
        first = mean(pts.slice(0, half).map(function (r) { return r.y; }));
        second = mean(pts.slice(pts.length - half).map(function (r) { return r.y; }));
        trend = second < first * 0.75 ? 'improving' : second > first * 1.25 && second > 0.4 ? 'rising' : 'steady';
      }
      var rungs = {}; RUNGS.forEach(function (r) { rungs[r] = hp.filter(function (h) { return h.rung === r; }).length; });
      M.pairs[k] = {
        pair: p, events: ev, total: ev.length,
        read: ev.filter(function (e) { return e.mode === 'read'; }).length,
        write: ev.filter(function (e) { return e.mode === 'write'; }).length,
        selfc: ev.filter(function (e) { return e.self_corrected; }).length,
        rate: rate, overall: exposed ? 100 * errsExposed / exposed : null, exposed: exposed, points: pts.length,
        trend: trend, first: first, second: second,
        avgTarget: wavg(tm), timed: sum(tm.map(function (r) { return r.n || 1; })), rungs: rungs
      };
    });
    return M;
  }

  /* ══ insights: findings worked out from the data ═════════ */
  function insights(M) {
    var out = [], P = M.pairs;
    var list = PAIRS.map(function (p) { return P[p.k]; });
    var totalEv = sum(list.map(function (x) { return x.total; }));
    var nSess = M.done.length;

    if (!totalEv && nSess) {
      out.push({ tone: 'good', title: 'No letter mix-ups recorded yet',
        text: 'Across ' + nSess + ' sessions Spark has not recorded any swapped letters. Keep exploring the other worlds so every pair is tested.',
        ev: nSess + ' sessions' });
    }

    var top = list.filter(function (x) { return x.total >= 3; }).sort(function (a, b) { return b.total - a.total; })[0];
    if (top) {
      out.push({ tone: 'watch', title: top.pair.label + ' is the most confused pair',
        text: top.total + ' mix-ups' + (top.overall != null ? ', about ' + f1(top.overall) + ' for every 100 words that contain those letters' : '') + '.',
        ev: top.total + ' events · ' + top.points + ' chapters' });
    }

    list.forEach(function (x) {
      if (x.trend === 'improving') {
        out.push({ tone: 'good', title: x.pair.label + ' is improving',
          text: 'Mix-ups fell from ' + f1(x.first) + ' to ' + f1(x.second) + ' per 100 words (' + Math.round((1 - x.second / x.first) * 100) + '% fewer) comparing the first and latest chapters.',
          ev: x.points + ' chapters' });
      } else if (x.trend === 'rising') {
        out.push({ tone: 'watch', title: x.pair.label + ' mix-ups are rising',
          text: 'They went from ' + f1(x.first) + ' to ' + f1(x.second) + ' per 100 words. Short, frequent practice in "' + x.pair.world + '" may help.',
          ev: x.points + ' chapters' });
      }
    });

    /* catching their own slips, and whether that is growing */
    var withEv = M.sessions.filter(function (s) { return M.ce.some(function (e) { return e.session_id === s.session_id; }); });
    var allSelf = M.ce.length ? Math.round(100 * M.ce.filter(function (e) { return e.self_corrected; }).length / M.ce.length) : null;
    if (allSelf != null && M.ce.length >= 5) {
      var h = Math.floor(withEv.length / 2), txt = 'They fixed ' + allSelf + '% of their own mix-ups within 2 seconds.', tone = 'info';
      if (withEv.length >= 4) {
        var rate = function (ss) {
          var ev = M.ce.filter(function (e) { return ss.some(function (s) { return s.session_id === e.session_id; }); });
          return ev.length ? 100 * ev.filter(function (e) { return e.self_corrected; }).length / ev.length : null;
        };
        var a = rate(withEv.slice(0, h)), b = rate(withEv.slice(withEv.length - h));
        if (a != null && b != null && b > a + 10) { txt += ' That is up from ' + Math.round(a) + '% earlier: they are noticing slips more.'; tone = 'good'; }
        else if (a != null && b != null && b < a - 10) { txt += ' That is down from ' + Math.round(a) + '% earlier.'; tone = 'watch'; }
      }
      out.push({ tone: tone, title: 'Self-correction', text: txt, ev: M.ce.length + ' mix-ups' });
    }

    /* reading aloud versus writing */
    list.forEach(function (x) {
      if (x.total < 4) return;
      if (x.write >= 3 && x.write >= 2 * x.read) {
        out.push({ tone: 'watch', title: x.pair.label + ': more mix-ups in writing',
          text: x.write + ' in writing against ' + x.read + ' when reading aloud. They may recognise these letters but not yet remember how to write them.',
          ev: x.total + ' events' });
      } else if (x.read >= 3 && x.read >= 2 * x.write) {
        out.push({ tone: 'watch', title: x.pair.label + ': more mix-ups when reading aloud',
          text: x.read + ' when reading against ' + x.write + ' in writing. This points to recognising the letters as they are read.',
          ev: x.total + ' events' });
      }
    });

    /* hesitation on words with the letters */
    if (M.baseline && M.baseline >= 200) {
      list.filter(function (x) { return x.avgTarget && x.timed >= 5; })
        .sort(function (a, b) { return b.avgTarget / M.baseline - a.avgTarget / M.baseline; }).slice(0, 1)
        .forEach(function (x) {
          var r = x.avgTarget / M.baseline;
          if (r >= 1.4) {
            out.push({ tone: 'watch', title: 'Slower on ' + x.pair.label + ' words',
              text: 'About ' + f1(x.avgTarget / 1000) + ' s per word with these letters, against ' + f1(M.baseline / 1000) + ' s for other words (' + f1(r) + ' times longer). Words with these letters can also be longer, so treat this as a guide.',
              ev: x.timed + ' timed words' });
          }
        });
    }

    /* which help works */
    var kinds = {};
    M.he.filter(function (h) { return !(h.rung === 'supply' && h.cue_type !== 'audio'); }).forEach(function (h) {
      var k = normKind(h.cue_type); kinds[k] = kinds[k] || { shown: 0, ok: 0, no: 0 };
      kinds[k].shown++; if (h.resolved) kinds[k].ok++; if (h.dismissed) kinds[k].no++;
    });
    var ranked = Object.keys(kinds).filter(function (k) { return kinds[k].shown >= 5; })
      .sort(function (a, b) { return kinds[b].ok / kinds[b].shown - kinds[a].ok / kinds[a].shown; });
    if (ranked.length >= 2) {
      var bk = ranked[0], wk = ranked[ranked.length - 1];
      out.push({ tone: 'info', title: bk === 'visual' ? 'Visual cues work best' : bk === 'audio' ? 'Hearing it works best' : 'Choosing between two words works best',
        text: CUE_LABEL[bk].split(' (')[0] + ' cues got them moving again ' + Math.round(100 * kinds[bk].ok / kinds[bk].shown) +
              '% of the time, against ' + Math.round(100 * kinds[wk].ok / kinds[wk].shown) + '% for ' + CUE_LABEL[wk].split(' (')[0].toLowerCase() + ' cues.',
        ev: sum(Object.keys(kinds).map(function (k) { return kinds[k].shown; })) + ' cue cards' });
    }
    var allHelp = M.he.length, supplied = M.he.filter(function (h) { return h.rung === 'supply'; }).length;
    if (allHelp >= 8 && supplied / allHelp >= 0.2) {
      out.push({ tone: 'watch', title: 'Often needs the answer given',
        text: 'For ' + Math.round(100 * supplied / allHelp) + '% of cue cards the child needed the answer shown. Sitting with them for the "which one is right?" step may help.',
        ev: allHelp + ' cue cards' });
    }
    var shown = M.he.length, dis = M.he.filter(function (h) { return h.dismissed; }).length;
    if (shown >= 8 && dis / shown >= 0.4) {
      out.push({ tone: 'watch', title: 'Cues are often dismissed',
        text: 'They tapped "Not now" on ' + Math.round(100 * dis / shown) + '% of cue cards. The help may be arriving at the wrong moment, or the child may feel watched.',
        ev: shown + ' cue cards' });
    }

    /* why they paused */
    var pt = {}; M.pe.filter(function (p) { return p.struggle !== false; }).forEach(function (p) { pt[p.pause_type] = (pt[p.pause_type] || 0) + 1; });
    var pk = Object.keys(pt).sort(function (a, b) { return pt[b] - pt[a]; })[0], pn = sum(Object.keys(pt).map(function (k) { return pt[k]; }));
    if (pk && pn >= 4) {
      out.push({ tone: 'info', title: 'Most pauses: ' + (PAUSE_LABEL[pk] || pk).toLowerCase(),
        text: Math.round(100 * pt[pk] / pn) + '% of difficulty pauses were this kind.', ev: pn + ' pauses' });
    }

    /* what goes wrong in their writing */
    var wk2 = {}; M.ce.filter(function (e) { return e.mode === 'write'; }).forEach(function (e) { wk2[e.error_kind] = (wk2[e.error_kind] || 0) + 1; });
    var wt = sum(Object.keys(wk2).map(function (k) { return wk2[k]; })), wtop = Object.keys(wk2).sort(function (a, b) { return wk2[b] - wk2[a]; })[0];
    if (wtop && wt >= 5) {
      out.push({ tone: 'info', title: 'In their writing: ' + (KIND_LABEL[wtop] || wtop).toLowerCase(),
        text: 'This was the most common kind of slip (' + Math.round(100 * wk2[wtop] / wt) + '% of ' + wt + ' writing mistakes).', ev: wt + ' writing mistakes' });
    }

    /* showing up */
    var days = {}; M.done.forEach(function (s) { days[day(s.started_at)] = 1; });
    var last7 = Object.keys(days).filter(function (d) { return Date.now() - Date.parse(d) < 7 * 864e5; }).length;
    if (nSess) {
      out.push({ tone: last7 >= 3 ? 'good' : 'info', title: 'Practice habit',
        text: 'Active on ' + last7 + ' of the last 7 days, ' + nSess + ' completed sessions in total.', ev: Object.keys(days).length + ' active days' });
    }
    return out;
  }

  function recommend(M, kid) {
    var list = PAIRS.map(function (p) { return M.pairs[p.k]; });
    var explored = PAIRS.filter(function (p) { return M.done.some(function (s) { return s.world === p.id; }); });
    if (!M.done.length) return 'No sessions yet. Ask ' + (kid.name || 'the student') + ' to start any world, about 10 minutes a day.';
    if (explored.length < 6) {
      var left = PAIRS.filter(function (p) { return explored.indexOf(p) < 0; }).map(function (p) { return p.world; });
      var lead = list.filter(function (x) { return x.total > 0; }).sort(function (a, b) { return b.total - a.total; })[0];
      return 'Finish exploring the remaining worlds (' + left.join(', ') + ') so every letter pair is tested.' +
        (lead ? ' So far ' + lead.pair.label + ' shows the most mix-ups.' : '');
    }
    var need = list.filter(function (x) { return x.total > 0; })
      .sort(function (a, b) { return ((b.overall || 0) - (a.overall || 0)) || (b.total - a.total); });
    var f = need[0];
    if (!f) return 'No confusions found in any world. Keep up short daily reading.';
    var s = 'Go back to "' + f.pair.world + '" and focus on ' + f.pair.label + ' this week, about 10 minutes a day.';
    if (f.trend === 'rising') s += ' These mix-ups are rising, so keep sessions short and frequent.';
    else if (f.trend === 'improving') s += ' It is already improving, so keep going.';
    if (f.write > f.read * 2 && f.write >= 3) s += ' Most slips are in writing: try the write-it step with them.';
    return s;
  }

  /* ══ all students ════════════════════════════════════════ */
  function topPair(errors) {
    var k = Object.keys(errors || {}).filter(function (c) { return BY[c]; }).sort(function (a, b) { return errors[b] - errors[a]; })[0];
    return k ? { pair: BY[k], n: errors[k] } : null;
  }
  function totalErrors(k) { return sum(Object.keys(k.errors || {}).map(function (c) { return k.errors[c]; })); }
  /* the picture the student chose at the start, not their initial */
  function avatarChip(k, size) {
    var svg = S.avatarSVG ? S.avatarSVG(k.avatar || 'owl', size || 28) : '';
    return '<span class="t-av">' + svg + '</span>';
  }
  function initials(name) { return (String(name).trim()[0] || '?').toUpperCase(); }
  function hue(name) { var h = 0; String(name).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) % 360; }); return h; }

  function setNav(which) {
    $('#navStudents').classList.toggle('on', which === 'overview');
    $('#navRemoved').classList.toggle('on', which === 'removed');
  }

  function showRemoved() {
    cameFrom = 'removed';
    setNav('removed');
    $('#tStudent').hidden = true; $('#tOverview').hidden = true; $('#tRemoved').hidden = false;
    window.scrollTo(0, 0);
    $('#tRemovedRows').innerHTML = removedKids.length ? removedKids.map(function (k) {
      return '<tr data-kid="' + esc(k.child_id) + '"><td>' + avatarChip(k) + esc(k.name) + '</td>' +
        '<td>' + (k.age || '—') + '</td><td>' + esc(ago(k.removed_at)) + '</td><td>' + esc(ago(k.last_active)) + '</td>' +
        '<td>' + totalErrors(k) + '</td><td>' + (k.sessions || 0) + '</td></tr>';
    }).join('') : '<tr><td colspan="6" class="t-none">Nobody has been removed.</td></tr>';
    Array.prototype.forEach.call(document.querySelectorAll('#tRemovedRows tr[data-kid]'), function (tr) {
      tr.onclick = function () { openStudent(tr.dataset.kid); };
    });
  }

  function showOverview() {
    cameFrom = 'overview';
    setNav('overview');
    $('#tStudent').hidden = true;
    $('#tRemoved').hidden = true;
    $('#tOverview').hidden = false;
    window.scrollTo(0, 0);

    var b = $('#tBanner');
    b.hidden = Source.cloud;
    if (!Source.cloud) {
      b.innerHTML = '<b>Not connected to the study database.</b> This shows only the students who used Spark in this browser. ' +
        'To see students from every device, set up Supabase (see _server/README.md) and fill in SUPABASE_URL and SUPABASE_ANON_KEY in js/config.js.';
    }
    $('#tOverviewSub').textContent = kids.length + ' student' + (kids.length === 1 ? '' : 's') + ' · ' + Source.label;

    var week = kids.filter(function (k) { return k.last_active && Date.now() - Date.parse(k.last_active) < 7 * 864e5; }).length;
    $('#tClassTiles').innerHTML =
      tile('students', kids.length) + tile('active this week', week) +
      tile('sessions completed', sum(kids.map(function (k) { return +k.sessions || 0; }))) +
      tile('mix-ups recorded', sum(kids.map(totalErrors))) +
      tile('worlds explored (average)', kids.length ? f1(mean(kids.map(function (k) { return +k.worlds || 0; }))) + ' / 6' : '—');

    var classTotals = PAIRS.map(function (p) { return sum(kids.map(function (k) { return (k.errors || {})[p.k] || 0; })); });
    $('#tClassChart').innerHTML = sum(classTotals)
      ? groupedBars({ groups: PAIRS.map(function (p) { return p.label; }),
                      series: [{ name: 'Mix-ups', colours: PAIRS.map(function (p) { return p.colour; }), colour: '#3FBF9B', vals: classTotals }], fmt: function (v) { return Math.round(v); }, h: 200 })
      : none('No mix-ups recorded yet.');

    var worst = kids.filter(function (k) { return totalErrors(k) > 0; }).sort(function (a, b) { return totalErrors(b) - totalErrors(a); }).slice(0, 4);
    var quiet = kids.filter(function (k) { return k.sessions > 0 && k.last_active && Date.now() - Date.parse(k.last_active) > 7 * 864e5; }).slice(0, 4);
    $('#tAttention').innerHTML = (worst.length || quiet.length)
      ? (worst.length ? '<p class="t-mini">Most mix-ups</p>' + worst.map(function (k) {
          var t = topPair(k.errors);
          return '<button class="t-chip" data-kid="' + esc(k.child_id) + '">' + avatarChip(k, 36) + '<span class="t-chip-txt"><b>' + esc(k.name) + '</b><span>' + totalErrors(k) + ' mix-ups' + (t ? ' · mostly ' + t.pair.label : '') + '</span></span></button>';
        }).join('') : '') +
        (quiet.length ? '<p class="t-mini">Not active for over a week</p>' + quiet.map(function (k) {
          return '<button class="t-chip" data-kid="' + esc(k.child_id) + '">' + avatarChip(k, 36) + '<span class="t-chip-txt"><b>' + esc(k.name) + '</b><span>last active ' + esc(ago(k.last_active)) + '</span></span></button>';
        }).join('') : '')
      : none('Nobody needs attention yet.');
    Array.prototype.forEach.call(document.querySelectorAll('#tAttention [data-kid]'), function (b2) {
      b2.onclick = function () { openStudent(b2.dataset.kid); };
    });

    paintStudents('');
  }

  function paintStudents(q) {
    q = q.toLowerCase();
    var rows = kids.filter(function (k) { return !q || String(k.name).toLowerCase().indexOf(q) > -1; });
    $('#tStudents').innerHTML = rows.length ? rows.map(function (k) {
      var t = topPair(k.errors);
      return '<tr data-kid="' + esc(k.child_id) + '"><td>' + avatarChip(k) + esc(k.name) + '</td>' +
        '<td>' + (k.age || '—') + '</td><td>' + esc(ago(k.last_active)) + '</td>' +
        '<td>' + (k.worlds || 0) + ' / 6</td>' +
        '<td>' + (t ? '<span class="pair-dot" style="background:' + t.pair.colour + '"></span>' + t.pair.label : '<span class="t-none">—</span>') + '</td>' +
        '<td>' + totalErrors(k) + '</td><td>' + (k.sessions || 0) + '</td></tr>';
    }).join('') : '<tr><td colspan="7" class="t-none">No students yet.</td></tr>';
    Array.prototype.forEach.call(document.querySelectorAll('#tStudents tr[data-kid]'), function (tr) {
      tr.onclick = function () { openStudent(tr.dataset.kid); };
    });
  }
  $('#tSearch').addEventListener('input', function () { paintStudents(this.value); });

  function tile(label, value, note) {
    return '<div class="t-tile"><b>' + value + '</b><span>' + label + '</span>' + (note ? '<small>' + note + '</small>' : '') + '</div>';
  }

  /* ══ one student ═════════════════════════════════════════ */

  function openStudent(id) {
    var kid = kids.concat(removedKids).filter(function (k) { return k.child_id === id; })[0];
    if (!kid) return;
    $('#tOverview').hidden = true;
    $('#tRemoved').hidden = true;
    $('#tStudent').hidden = false;
    $('#tName').textContent = kid.name;
    $('#tMeta').textContent = 'Loading…';
    window.scrollTo(0, 0);
    Source.child(password, id).then(function (data) {
      current = { kid: kid, data: data, M: buildModel(data) };
      renderStudent();
    }, function (err) { $('#tMeta').textContent = err.message; });
  }
  $('#tBack').addEventListener('click', function () { current = null; if (cameFrom === 'removed') showRemoved(); else showOverview(); });

  /* Remove: nothing is deleted. The student moves to "Removed students"
     with their whole history, and their own device is signed out the
     next time it checks in. */
  $('#tRemove').addEventListener('click', function () {
    if (!current) return;
    var kid = current.kid;
    if (!window.confirm('Remove ' + kid.name + '?\n\nTheir device will be signed out and they will have to make a new account. ' +
        'Their history stays here, on the Removed students page.')) return;
    var btn = $('#tRemove'); btn.disabled = true; btn.textContent = 'Removing...';
    Source.remove(password, kid.child_id).then(function () {
      current = null;
      return load();
    }).then(function () { showRemoved(); }, function (err) {
      window.alert(/404|PGRST|function/i.test(err.message)
        ? 'The database needs updating first. Run the latest _server/supabase-schema.sql in Supabase (see _server/README.md).'
        : err.message);
    }).then(function () { btn.disabled = false; btn.textContent = 'Remove student'; });
  });

  function renderStudent() {
    var kid = current.kid, M = current.M, P = M.pairs;
    var list = PAIRS.map(function (p) { return P[p.k]; });

    $('#tAvatar').innerHTML = S.avatarSVG ? S.avatarSVG(kid.avatar || 'owl', 56) : '';
    $('#tAvatar').style.background = 'none';
    $('#tRemove').hidden = !!kid.removed_at;
    var note = $('#tRemovedNote');
    note.hidden = !kid.removed_at;
    note.textContent = kid.removed_at ? 'Removed on ' + ago(kid.removed_at) + '. This is their saved history; if they came back they have a new account.' : '';
    $('#tName').textContent = kid.name;
    $('#tMeta').textContent = (kid.age ? 'Age ' + kid.age + ' · ' : '') + 'last active ' + ago(kid.last_active) +
      (kid.created_at ? ' · joined ' + shortDate(kid.created_at) : '');

    /* engagement */
    var days = {}; M.done.forEach(function (s) { days[day(s.started_at)] = 1; });
    var streak = 0, dd = new Date();
    if (!days[day(dd)]) dd.setDate(dd.getDate() - 1);
    while (days[day(dd)]) { streak++; dd.setDate(dd.getDate() - 1); }
    var explored = PAIRS.filter(function (p) { return M.done.some(function (s) { return s.world === p.id; }); }).length;
    var chapters = 0, badges = [];
    PAIRS.forEach(function (p) {
      var n = [1, 2, 3].filter(function (l) {
        return ['read', 'write'].every(function (m) { return M.done.some(function (s) { return s.world === p.id && s.level === l && s.mode === m; }); });
      }).length;
      chapters += n; if (n === 3) badges.push(p.world);
    });
    var wk = Date.now() - 7 * 864e5;
    var wordsWeek = sum(M.sub.filter(function (r) { return r.mode === 'read' && Date.parse(r.created_at) >= wk; }).map(function (r) { return r.word_count || 0; }));
    var minutes = Math.round(sum(M.done.map(function (s) { return s.duration_ms || 0; })) / 60000);
    $('#tEngage').innerHTML =
      tile('day streak', streak) + tile('worlds explored', explored + ' / 6', explored < 6 ? 'goal: all six' : 'all explored') +
      tile('chapters done', chapters + ' / 18') + tile('badges', badges.length, badges.length ? esc(badges.join(', ')) : '') +
      tile('words read this week', wordsWeek) + tile('sentences written', M.sub.filter(function (r) { return r.mode === 'write'; }).length) +
      tile('minutes of practice', minutes);

    $('#tAction').innerHTML = '<b>Recommended</b> ' + esc(recommend(M, kid));

    var ins = insights(M);
    $('#tInsightsSub').textContent = 'Worked out from ' + M.done.length + ' sessions, ' + M.ce.length + ' mix-ups, ' + M.te.length + ' timings, ' +
      M.he.length + ' cue cards and ' + M.pe.length + ' pauses.';
    $('#tInsights').innerHTML = ins.length ? ins.map(function (i) {
      return '<div class="insight ' + i.tone + '"><span class="ins-dot"></span><div><b>' + esc(i.title) + '</b><p>' + esc(i.text) + '</p>' +
        '<small>Based on: ' + esc(i.ev) + '</small></div></div>';
    }).join('') : none('Insights appear once the student has completed a few sessions.');

    /* the table */
    var maxTot = Math.max.apply(null, list.map(function (x) { return x.total; }).concat([1]));
    var TREND = { improving: '<span class="tr tr-up">improving ↓</span>', rising: '<span class="tr tr-down">rising ↑</span>',
                  steady: '<span class="tr tr-flat">steady →</span>', 'not enough data': '<span class="tr tr-none">not enough data</span>' };
    $('#tPairs').innerHTML = list.map(function (x) {
      var self = x.total ? Math.round(100 * x.selfc / x.total) : null, tot = sum(RUNGS.map(function (r) { return x.rungs[r]; }));
      return '<tr data-pair="' + x.pair.k + '"><td class="t-pair"><span class="pair-dot" style="background:' + x.pair.colour + '"></span>' + x.pair.label + '</td>' +
        '<td>' + esc(x.pair.world) + '</td>' +
        '<td><span class="heat-chip" style="--a:' + (x.total ? 0.15 + 0.85 * x.total / maxTot : 0) + '">' + x.total + '</span></td>' +
        '<td>' + (x.overall == null ? '<span class="t-none">—</span>' : f1(x.overall)) + '</td>' +
        '<td>' + (self == null ? '<span class="t-none">—</span>' : '<span class="t-bar"><i style="width:' + self + '%;background:#3FBF9B"></i></span><span class="t-val">' + self + '%</span>') + '</td>' +
        '<td>' + TREND[x.trend] + '</td>' +
        '<td>' + (tot ? '<span class="t-stack">' + RUNGS.map(function (r) { return x.rungs[r] ? '<i style="flex:' + x.rungs[r] + ';background:' + RUNG_COLOUR[r] + '" title="' + r + ' ' + x.rungs[r] + '"></i>' : ''; }).join('') + '</span>' : '<span class="t-none">—</span>') + '</td></tr>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('#tPairs tr'), function (tr) {
      tr.onclick = function () { showEvents(P[tr.dataset.pair]); };
    });

    charts(M, list);
    $('#tEventsCard').hidden = true;
  }

  function charts(M, list) {
    /* 1 · the learning curve */
    $('#cRate').innerHTML = lineChart({
      labels: M.unitLabels, unit: ' per 100 words', w: 1120, h: 260, empty: 'Appears after a few chapters have been completed.',
      series: list.filter(function (x) { return x.points; }).map(function (x) {
        return { name: x.pair.label, colour: x.pair.colour, vals: x.rate.map(function (r) { return r ? r.y : null; }) };
      })
    });

    /* 2 · catching their own slips, per session */
    var self = M.sessions.map(function (s) {
      var ev = M.ce.filter(function (e) { return e.session_id === s.session_id; });
      return ev.length ? 100 * ev.filter(function (e) { return e.self_corrected; }).length / ev.length : null;
    });
    $('#cSelf').innerHTML = lineChart({ labels: M.labels, max: 100, unit: '%', fmt: function (v) { return Math.round(v) + '%'; },
      series: [{ name: 'Fixed within 2 s', colour: '#3FBF9B', vals: self }], empty: 'Appears once there are mix-ups to fix.' });

    /* 3 · hesitation: target words against everything else */
    var withTime = list.filter(function (x) { return x.avgTarget; });
    $('#cHes').innerHTML = withTime.length
      ? groupedBars({ groups: withTime.map(function (x) { return x.pair.label; }), unit: ' s',
          series: [{ name: 'Words with these letters', colour: '#E2678C', vals: withTime.map(function (x) { return x.avgTarget / 1000; }) },
                   { name: 'All other words', colour: '#5B9BEA', vals: withTime.map(function () { return M.baseline != null ? M.baseline / 1000 : null; }) }] })
      : none('Appears after the first reading or writing session.');

    /* 4 · help dependency */
    var hs = M.sessions.map(function (s) { return M.he.filter(function (h) { return h.session_id === s.session_id; }); });
    $('#cHelp').innerHTML = stackedBars({ cols: M.labels, empty: 'No cue cards were needed yet. That is good news.',
      parts: RUNGS.map(function (r) { return { name: r[0].toUpperCase() + r.slice(1), colour: RUNG_COLOUR[r], vals: hs.map(function (a) { return a.filter(function (h) { return h.rung === r; }).length; }) }; }) });

    /* 5 · which cues work */
    var kinds = {};
    M.he.filter(function (h) { return !(h.rung === 'supply' && h.cue_type !== 'audio'); }).forEach(function (h) {
      var k = normKind(h.cue_type); kinds[k] = kinds[k] || { shown: 0, ok: 0, no: 0 };
      kinds[k].shown++; if (h.resolved) kinds[k].ok++; if (h.dismissed) kinds[k].no++;
    });
    var kk = Object.keys(kinds);
    $('#cCue').innerHTML = kk.length ? '<div class="hbars">' + kk.map(function (k) {
      var v = kinds[k], ok = Math.round(100 * v.ok / v.shown), no = Math.round(100 * v.no / v.shown);
      return '<div class="cue-row"><b>' + esc(CUE_LABEL[k]) + '</b><small>' + v.shown + ' shown</small>' +
        '<div class="hbar"><span class="hb-label">Helped</span><span class="hb-track"><i style="width:' + ok + '%;background:#3FBF9B"></i></span><span class="hb-val">' + ok + '%</span></div>' +
        '<div class="hbar"><span class="hb-label">Not now</span><span class="hb-track"><i style="width:' + no + '%;background:#E2678C"></i></span><span class="hb-val">' + no + '%</span></div></div>';
    }).join('') + '</div>' : none('Appears once cue cards have been shown.');

    /* 6 · reading against writing */
    var wm = list.filter(function (x) { return x.total; });
    $('#cMode').innerHTML = wm.length
      ? groupedBars({ groups: wm.map(function (x) { return x.pair.label; }), fmt: function (v) { return Math.round(v); },
          series: [{ name: 'Reading aloud', colour: '#8C7DF0', vals: wm.map(function (x) { return x.read; }) },
                   { name: 'Writing', colour: '#E2678C', vals: wm.map(function (x) { return x.write; }) }] })
      : none('No mix-ups yet.');

    /* 7 · what kinds of mistake */
    var kinds2 = {};
    M.ce.forEach(function (e) {
      var k = e.error_kind || 'other'; kinds2[k] = kinds2[k] || { read: 0, write: 0 };
      kinds2[k][e.mode === 'write' ? 'write' : 'read']++;
    });
    var kl = Object.keys(kinds2).sort(function (a, b) { return (kinds2[b].read + kinds2[b].write) - (kinds2[a].read + kinds2[a].write); });
    var kmax = Math.max.apply(null, kl.map(function (k) { return kinds2[k].read + kinds2[k].write; }).concat([1]));
    $('#cKinds').innerHTML = kl.length ? '<div class="legend"><span><i style="background:#8C7DF0"></i>Reading aloud</span><span><i style="background:#E2678C"></i>Writing</span></div><div class="hbars">' +
      kl.map(function (k) {
        var v = kinds2[k], t = v.read + v.write;
        return '<div class="hbar"><span class="hb-label">' + esc(KIND_LABEL[k] || k) + '</span><span class="hb-track">' +
          '<i style="width:' + v.read / kmax * 100 + '%;background:#8C7DF0;display:inline-block"></i><i style="width:' + v.write / kmax * 100 + '%;background:#E2678C;display:inline-block"></i></span>' +
          '<span class="hb-val">' + t + '</span></div>';
      }).join('') + '</div>' : none('No mistakes recorded yet.');

    /* 8 · pauses */
    var pt = {}; M.pe.filter(function (p) { return p.struggle !== false; }).forEach(function (p) { pt[p.pause_type] = (pt[p.pause_type] || 0) + 1; });
    var reads = M.sessions.filter(function (s) { return s.mode === 'read' && s.completed && (s.natural_pauses != null || s.difficulty_pauses != null); });
    $('#cPause').innerHTML =
      (Object.keys(pt).length ? hbars(Object.keys(pt).sort(function (a, b) { return pt[b] - pt[a]; }).map(function (k) {
        return { label: PAUSE_LABEL[k] || k, value: pt[k], colour: '#F0B44C' };
      })) : none('No difficulty pauses recorded yet.')) +
      (reads.length ? '<p class="t-mini" style="margin-top:14px">Pauses per reading</p>' + stackedBars({
        cols: reads.map(function (s) { return shortDate(s.started_at); }), h: 150, w: 500,
        parts: [{ name: 'Ordinary', colour: '#5B9BEA', vals: reads.map(function (s) { return s.natural_pauses || 0; }) },
                { name: 'Difficult', colour: '#E2678C', vals: reads.map(function (s) { return s.difficulty_pauses || 0; }) }] }) : '');

    /* 9 · fluency */
    var wpm = M.sessions.map(function (s) {
      if (s.mode !== 'read' || !s.completed) return null;
      return s.wpm || (s.words && s.duration_ms ? Math.round(s.words / (s.duration_ms / 60000)) : null);
    });
    $('#cWpm').innerHTML = lineChart({ labels: M.labels, unit: ' wpm', fmt: function (v) { return Math.round(v); },
      series: [{ name: 'Words per minute', colour: '#5B9BEA', vals: wpm }], empty: 'Appears after the first reading aloud.' });

    /* 10 · practice each week */
    var weeks = {};
    M.done.forEach(function (s) {
      var d = new Date(s.started_at); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      var k = d.toISOString().slice(0, 10); weeks[k] = weeks[k] || { read: 0, write: 0 };
      weeks[k][s.mode === 'write' ? 'write' : 'read']++;
    });
    var wkeys = Object.keys(weeks).sort().slice(-8);
    $('#cWeek').innerHTML = stackedBars({ cols: wkeys.map(shortDate), empty: 'No sessions yet.',
      parts: [{ name: 'Reading', colour: '#8C7DF0', vals: wkeys.map(function (k) { return weeks[k].read; }) },
              { name: 'Writing', colour: '#E2678C', vals: wkeys.map(function (k) { return weeks[k].write; }) }] });

    /* 11 · chapter by chapter */
    var cells = [], cmax = 0.01;
    var rows = PAIRS.map(function (p) {
      var r = [1, 2, 3].map(function (n) {
        var ss = M.sessions.filter(function (s) { return s.world === p.id && s.level === n && s.completed; });
        var ex = sum(ss.map(function (s) { return (s.exposures && s.exposures[p.k]) || 0; }));
        var er = M.ce.filter(function (e) { return e.confusion_class === p.k && ss.some(function (s) { return s.session_id === e.session_id; }); }).length;
        var v = ex > 0 ? 100 * er / ex : null; if (v != null) cmax = Math.max(cmax, v); return v;
      });
      cells.push(r); return p;
    });
    $('#cChap').innerHTML = cells.some(function (r) { return r.some(function (v) { return v != null; }); })
      ? '<table class="t-pairs t-chap"><thead><tr><th>World</th><th>Chapter 1</th><th>Chapter 2</th><th>Chapter 3</th></tr></thead><tbody>' +
        rows.map(function (p, i) {
          return '<tr><td><span class="pair-dot" style="background:' + p.colour + '"></span>' + esc(p.world) + ' <small class="t-none">' + p.label + '</small></td>' +
            cells[i].map(function (v) {
              return v == null ? '<td class="t-none">—</td>' : '<td><span class="heat-chip" style="--a:' + (v ? 0.15 + 0.85 * v / cmax : 0) + '">' + f1(v) + '</span></td>';
            }).join('') + '</tr>';
        }).join('') + '</tbody></table>' : none('Appears as chapters are completed.');

    /* 12 · hardest words */
    var words = {};
    M.ce.forEach(function (e) { var w = words[e.word] = words[e.word] || { e: 0, p: 0, last: '' }; w.e++; w.last = e.actual_word || w.last; });
    M.pe.forEach(function (p) { if (!p.word) return; var w = words[p.word] = words[p.word] || { e: 0, p: 0, last: '' }; w.p++; });
    var wl = Object.keys(words).filter(Boolean).sort(function (a, b) { return (words[b].e * 2 + words[b].p) - (words[a].e * 2 + words[a].p); }).slice(0, 10);
    $('#cWords').innerHTML = wl.length ? '<table class="t-pairs"><thead><tr><th>Word</th><th>Mix-ups</th><th>Pauses</th><th>Last said or written</th></tr></thead><tbody>' +
      wl.map(function (w) { return '<tr><td><b>' + esc(w) + '</b></td><td>' + words[w].e + '</td><td>' + words[w].p + '</td><td>' + esc(words[w].last || '—') + '</td></tr>'; }).join('') + '</tbody></table>'
      : none('No hard words yet.');

    /* 13 · spelling in their writing */
    var sp = {};
    M.ce.filter(function (e) { return e.mode === 'write' && e.actual_word && e.word; }).forEach(function (e) {
      var k = e.word + '|' + e.actual_word; sp[k] = sp[k] || { w: e.word, a: e.actual_word, kind: e.error_kind, n: 0 }; sp[k].n++;
    });
    var sl = Object.keys(sp).sort(function (a, b) { return sp[b].n - sp[a].n; }).slice(0, 10);
    $('#cSpell').innerHTML = sl.length ? '<table class="t-pairs"><thead><tr><th>Expected</th><th>Wrote</th><th>Kind</th><th>Times</th></tr></thead><tbody>' +
      sl.map(function (k) { var r = sp[k]; return '<tr><td><b>' + esc(r.w) + '</b></td><td>' + esc(r.a) + '</td><td>' + esc(KIND_LABEL[r.kind] || r.kind || '') + '</td><td>' + r.n + '</td></tr>'; }).join('') + '</tbody></table>'
      : none('No spelling slips in writing yet.');
  }

  function showEvents(x) {
    $('#tEventsCard').hidden = false;
    $('#tEventsTitle').textContent = 'Every ' + x.pair.label + ' event (' + x.events.length + ')';
    var ev = x.events.slice().sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
    $('#tEvents').innerHTML = ev.length
      ? '<table class="t-pairs"><thead><tr><th>When</th><th>Word</th><th>Child said or wrote</th><th>Letters</th><th>Kind</th><th>Mode</th><th>Pause</th><th>Fixed it themselves</th><th>Found by</th></tr></thead><tbody>' +
        ev.map(function (e) {
          return '<tr><td>' + esc(String(e.created_at).replace('T', ' ').slice(0, 16)) + '</td><td>' + esc(e.word) + '</td><td>' + esc(e.actual_word || '') + '</td>' +
            '<td>' + esc((e.expected_char || '?') + ' → ' + (e.actual_char || '?')) + '</td><td>' + esc(KIND_LABEL[e.error_kind] || e.error_kind || '') + '</td>' +
            '<td>' + esc(e.mode || '') + '</td><td>' + (e.pause_ms != null ? e.pause_ms + ' ms' : '—') + '</td>' +
            '<td>' + (e.self_corrected ? 'yes' : 'no') + '</td><td>' + esc(e.detected_by || '') + '</td></tr>';
        }).join('') + '</tbody></table>'
      : none('No events for this pair.');
    $('#tEventsCard').scrollIntoView({ behavior: 'smooth' });
  }

  /* ══ export for the study ════════════════════════════════ */
  function download(name, text, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type }));  /* text or bytes */
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }
  function toCsv(list) {
    var cols = [];
    list.forEach(function (r) { Object.keys(r).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
    var cell = function (v) {
      if (v != null && typeof v === 'object') v = JSON.stringify(v);
      v = v == null ? '' : String(v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    return [cols.join(',')].concat(list.map(function (r) { return cols.map(function (c) { return cell(r[c]); }).join(','); })).join('\n');
  }
  function safe(name) { return String(name).replace(/[^a-z0-9]+/gi, '-').toLowerCase(); }

  $('#tExpSummary').onclick = function () {
    download('spark-class-summary.csv', toCsv(kids.map(function (k) {
      var row = { name: k.name, age: k.age, last_active: k.last_active, sessions: k.sessions, worlds_explored: k.worlds, total_mixups: totalErrors(k) };
      PAIRS.forEach(function (p) { row['mixups_' + p.k] = (k.errors || {})[p.k] || 0; });
      return row;
    })), 'text/csv');
  };
  $('#tExpAllJson').onclick = function () { Source.all(password).then(function (t) { download('spark-all-data.json', JSON.stringify(t, null, 2), 'application/json'); }); };
  /* one Excel file with a tab for each kind of data (a CSV cannot hold tabs) */
  var TAB_NAME = { children: 'Students', sessions: 'Sessions', confusion_events: 'Letter mix-ups', timing_events: 'Word timings',
                   pause_events: 'Pauses', help_events: 'Help used', submissions: 'Readings and sentences' };
  function workbook(tables, order, filename) {
    var sheets = order.map(function (k) { return { name: TAB_NAME[k], rows: tables[k] || [] }; });
    download(filename, window.SparkXlsx.makeXlsx(sheets), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
  var ORDER = ['sessions', 'confusion_events', 'timing_events', 'pause_events', 'help_events', 'submissions'];

  $('#tExpAllCsv').onclick = function () {
    var table = $('#tExpAllTable').value;
    Source.all(password).then(function (t) {
      if (table === 'all') workbook(t, ['children'].concat(ORDER), 'spark-all-students-all-data.xlsx');
      else download('spark-' + table + '-all-students.csv', toCsv(t[table] || []), 'text/csv');
    });
  };
  $('#tExpJson').onclick = function () { if (current) download('spark-' + safe(current.kid.name) + '.json', JSON.stringify(current.data, null, 2), 'application/json'); };
  $('#tExpCsv').onclick = function () {
    if (!current) return;
    var table = $('#tExpTable').value;
    if (table === 'all') { workbook(current.data, ORDER, 'spark-' + safe(current.kid.name) + '-all-data.xlsx'); return; }
    download('spark-' + safe(current.kid.name) + '-' + table + '.csv', toCsv(current.data[table] || []), 'text/csv');
  };
  start();
})();
