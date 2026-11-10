/* ============================================================
   teacher.js — the grown-ups' dashboard.

   Reads the raw rows (sessions, confusion_events, timing_events,
   help_events, submissions) either from the study database
   (Supabase, teacher login) or from this device (PIN), and turns
   them into the measures teachers and parents act on.

   Self-contained on purpose: it shares no code with the child's
   app, so nothing here can leak onto the child's screen.
   ============================================================ */

(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var CFG = window.SPARK_CONFIG || {};
  var CLOUD = CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY
    ? { url: CFG.SUPABASE_URL.replace(/\/$/, ''), key: CFG.SUPABASE_ANON_KEY } : null;
  var TABLES = ['sessions', 'confusion_events', 'timing_events', 'help_events', 'submissions', 'confusion_profile'];

  var PAIRS = [
    { k: 'bd', label: 'b / d', world: 'Deep Sea Signal' },
    { k: 'pq', label: 'p / q', world: 'Pyramid Puzzle' },
    { k: 'mw', label: 'm / w', world: 'Storm Chaser' },
    { k: 'nu', label: 'n / u', world: 'Night Market Run' },
    { k: 'cs', label: 'c / s', world: 'Glitch Lab' },
    { k: 'gj', label: 'g / j', world: 'Jungle Expedition' }
  ];
  var WORLD_OF = {}; PAIRS.forEach(function (p) { WORLD_OF[p.k] = p.world; });
  var RUNGS = ['prompt', 'cue', 'choice', 'supply'];

  var data = null;     /* { table: rows[] } */
  var child = null;    /* selected child_id */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ══ signing in ══════════════════════════════════════════ */
  async function sha(text) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('spark-pin:' + text));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function setupLogin() {
    if (CLOUD) $('#tCloudForm').hidden = false;
    var hasPin = !!localStorage.getItem('spark.teacher.pin');
    $('#tPinLabel').textContent = hasPin ? 'PIN' : 'Choose a PIN (4–8 digits)';
    $('#tPinBtn').textContent = hasPin ? 'Open' : 'Set PIN and open';
    if (!hasPin) $('#tPinHint').textContent = 'Data saved on this computer. First time here: choose a PIN only grown-ups know.';

    $('#tLocalForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var pin = $('#tPin').value.trim();
      if (!/^\d{4,8}$/.test(pin)) { $('#tLocalErr').textContent = 'Use 4 to 8 digits.'; return; }
      var h = await sha(pin);
      var saved = localStorage.getItem('spark.teacher.pin');
      if (!saved) localStorage.setItem('spark.teacher.pin', h);
      else if (saved !== h) { $('#tLocalErr').textContent = 'That PIN is not right.'; return; }
      sessionStorage.setItem('spark.teacher.mode', 'local');
      openLocal();
    });

    $('#tCloudForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      $('#tCloudErr').textContent = 'Signing in…';
      try {
        var res = await fetch(CLOUD.url + '/auth/v1/token?grant_type=password', {
          method: 'POST',
          headers: { apikey: CLOUD.key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: $('#tEmail').value.trim(), password: $('#tPass').value })
        });
        var j = await res.json();
        if (!res.ok || !j.access_token) throw new Error(j.error_description || j.msg || 'Sign-in failed');
        sessionStorage.setItem('spark.teacher.token', j.access_token);
        sessionStorage.setItem('spark.teacher.mode', 'cloud');
        $('#tCloudErr').textContent = '';
        await openCloud();
      } catch (err) {
        $('#tCloudErr').textContent = err.message || 'Sign-in failed.';
      }
    });

    $('#tLogout').addEventListener('click', function () {
      sessionStorage.removeItem('spark.teacher.token');
      sessionStorage.removeItem('spark.teacher.mode');
      location.reload();
    });

    /* still signed in from earlier in this tab */
    var mode = sessionStorage.getItem('spark.teacher.mode');
    if (mode === 'local') openLocal();
    else if (mode === 'cloud' && CLOUD && sessionStorage.getItem('spark.teacher.token')) openCloud().catch(function () {});
  }

  function openLocal() {
    var raw = {};
    try { raw = (JSON.parse(localStorage.getItem('spark.db.v1')) || {}).tables || {}; } catch (e) {}
    data = {};
    TABLES.forEach(function (t) { data[t] = raw[t] || []; });
    $('#tSource').textContent = 'This device';
    show();
  }

  async function openCloud() {
    var token = sessionStorage.getItem('spark.teacher.token');
    data = {};
    for (var i = 0; i < TABLES.length; i++) {
      var t = TABLES[i];
      var res = await fetch(CLOUD.url + '/rest/v1/' + t + '?select=*&limit=50000', {
        headers: { apikey: CLOUD.key, Authorization: 'Bearer ' + token }
      });
      if (res.status === 401) { sessionStorage.removeItem('spark.teacher.token'); throw new Error('Please sign in again.'); }
      data[t] = res.ok ? await res.json() : [];
    }
    $('#tSource').textContent = 'Study database';
    show();
  }

  function show() {
    $('#tLogin').hidden = true;
    $('#tDash').hidden = false;
    $('#tLogout').hidden = false;
    var kids = {};
    TABLES.forEach(function (t) {
      data[t].forEach(function (r) { if (r.child_id) kids[r.child_id] = r.child_name || kids[r.child_id] || 'Unnamed'; });
    });
    var ids = Object.keys(kids);
    $('#tChild').innerHTML = ids.length
      ? ids.map(function (id) { return '<option value="' + esc(id) + '">' + esc(kids[id] || 'Unnamed') + '</option>'; }).join('')
      : '<option value="">No data yet</option>';
    child = ids[0] || null;
    $('#tChild').onchange = function () { child = this.value; render(); };
    $('#tExportJson').onclick = exportJson;
    $('#tExportCsv').onclick = exportCsv;
    render();
  }

  /* ══ the measures ════════════════════════════════════════ */
  function rows(t) { return (data[t] || []).filter(function (r) { return !child || r.child_id === child; }); }
  function byTime(a, b) { return String(a.started_at || a.created_at) < String(b.started_at || b.created_at) ? -1 : 1; }
  function mean(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }

  function measures() {
    var sessions = rows('sessions').slice().sort(byTime);
    var ce = rows('confusion_events'), te = rows('timing_events'), he = rows('help_events');
    var sOrder = {}; sessions.forEach(function (s, i) { sOrder[s.session_id] = i; });

    var out = {};
    PAIRS.forEach(function (p) {
      var ev = ce.filter(function (e) { return e.confusion_class === p.k; });
      var tm = te.filter(function (e) { return e.confusion_class === p.k; });
      var hp = he.filter(function (e) { return e.confusion_class === p.k; });

      /* errors per session, over sessions the pair came up in */
      var touched = sessions.filter(function (s) {
        return ev.some(function (e) { return e.session_id === s.session_id; }) ||
               tm.some(function (e) { return e.session_id === s.session_id; });
      });
      var counts = touched.map(function (s) { return ev.filter(function (e) { return e.session_id === s.session_id; }).length; });
      var last3 = counts.slice(-3), prev3 = counts.slice(-6, -3), trend = 'not enough data';
      if (last3.length === 3 && prev3.length >= 1) {
        var a = mean(last3), b = mean(prev3);
        trend = a < b * 0.8 ? 'improving' : a > b * 1.2 + 0.01 ? 'regressing' : 'static';
      }

      /* average pause, per session, last 5 */
      var pausePer = touched.map(function (s) {
        return mean(tm.filter(function (e) { return e.session_id === s.session_id; }).map(function (e) { return e.ms_to_respond; }));
      }).filter(function (v) { return v != null; }).slice(-5);

      var rungs = {}; RUNGS.forEach(function (r) { rungs[r] = hp.filter(function (h) { return h.rung === r; }).length; });

      out[p.k] = {
        pair: p,
        recent: last3.reduce(function (x, y) { return x + y; }, 0),
        total: ev.length,
        selfc: ev.filter(function (e) { return e.self_corrected; }).length,
        avgPause: mean(tm.map(function (e) { return e.ms_to_respond; })),
        pausePer: pausePer,
        trend: trend,
        rungs: rungs,
        shown: hp.length,
        dismissed: hp.filter(function (h) { return h.dismissed; }).length,
        events: ev
      };
    });
    return { pairs: out, sessions: sessions };
  }

  /* ══ drawing ═════════════════════════════════════════════ */
  function sparkline(values, w, h, colour) {
    w = w || 160; h = h || 36;
    if (!values.length) return '<span class="t-none">—</span>';
    if (values.length === 1) values = [values[0], values[0]];
    var lo = Math.min.apply(null, values), hi = Math.max.apply(null, values), span = (hi - lo) || 1;
    var pts = values.map(function (v, i) {
      return [4 + (w - 8) * i / (values.length - 1), h - 4 - (h - 8) * (v - lo) / span];
    });
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">' +
      '<polyline fill="none" stroke="' + (colour || '#5B4BD6') + '" stroke-width="2.5" stroke-linejoin="round" points="' +
      pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>' +
      '<circle cx="' + pts[pts.length - 1][0] + '" cy="' + pts[pts.length - 1][1] + '" r="3.5" fill="' + (colour || '#5B4BD6') + '"/></svg>';
  }

  function bar(pct, colour) {
    return '<span class="t-bar"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%;background:' + colour + '"></i></span>';
  }

  var TREND = {
    improving: '<span class="tr tr-up">improving ↓</span>',
    static: '<span class="tr tr-flat">static →</span>',
    regressing: '<span class="tr tr-down">regressing ↑</span>',
    'not enough data': '<span class="tr tr-none">not enough data</span>'
  };

  function render() {
    var M = measures(), P = M.pairs;
    var list = PAIRS.map(function (p) { return P[p.k]; });
    var max = Math.max(1, Math.max.apply(null, list.map(function (x) { return x.total; })));

    /* heatmap */
    $('#tHeat').innerHTML = list.map(function (x) {
      var a = x.total / max;
      return '<button class="heat-cell" data-pair="' + x.pair.k + '" style="--a:' + (x.total ? 0.12 + a * 0.88 : 0) + '">' +
        '<b>' + x.pair.label + '</b><span>' + x.total + ' error' + (x.total === 1 ? '' : 's') + '</span>' +
        '<small>' + x.pair.world + '</small></button>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('.heat-cell'), function (b) {
      b.onclick = function () { showEvents(P[b.dataset.pair]); };
    });

    $('#tTrend').innerHTML = list.map(function (x) {
      return '<div class="t-row"><span class="t-pair">' + x.pair.label + '</span>' + TREND[x.trend] + '</div>';
    }).join('');

    $('#tSelf').innerHTML = list.map(function (x) {
      var pct = x.total ? Math.round(x.selfc / x.total * 100) : null;
      return '<div class="t-row"><span class="t-pair">' + x.pair.label + '</span>' +
        (pct == null ? '<span class="t-none">no errors</span>'
          : bar(pct, '#23835C') + '<span class="t-val">' + x.selfc + ' of ' + x.total + ' (' + pct + '%)</span>') + '</div>';
    }).join('');

    $('#tPause').innerHTML = list.map(function (x) {
      var ser = x.pausePer.map(Math.round);
      return '<div class="t-row"><span class="t-pair">' + x.pair.label + '</span>' +
        (x.avgPause == null ? '<span class="t-none">no data</span>'
          : '<span class="t-val">avg ' + Math.round(x.avgPause) + ' ms' +
            (ser.length > 1 ? ' · ' + ser[0] + 'ms → ' + ser[ser.length - 1] + 'ms' : '') + '</span>' +
            sparkline(ser, 110, 30, '#E09200')) + '</div>';
    }).join('');

    $('#tRungs').innerHTML = list.map(function (x) {
      var tot = RUNGS.reduce(function (n, r) { return n + x.rungs[r]; }, 0);
      return '<div class="t-row"><span class="t-pair">' + x.pair.label + '</span>' +
        (tot ? '<span class="t-stack">' + RUNGS.map(function (r) {
          return x.rungs[r] ? '<i class="r-' + r + '" style="flex:' + x.rungs[r] + '" title="' + r + ' ' + x.rungs[r] + '"></i>' : '';
        }).join('') + '</span><span class="t-val">' + RUNGS.map(function (r) {
          return r.charAt(0).toUpperCase() + r.slice(1) + ' ' + x.rungs[r] + '×';
        }).join(' ') + '</span>' : '<span class="t-none">no help needed yet</span>') + '</div>';
    }).join('');

    $('#tDismiss').innerHTML = list.map(function (x) {
      var pct = x.shown ? Math.round(x.dismissed / x.shown * 100) : null;
      return '<div class="t-row"><span class="t-pair">' + x.pair.label + '</span>' +
        (pct == null ? '<span class="t-none">no cues shown</span>'
          : bar(pct, '#CC3F6B') + '<span class="t-val">' + x.dismissed + ' of ' + x.shown + ' (' + pct + '%)</span>') + '</div>';
    }).join('');

    /* words per minute per reading session */
    var reads = M.sessions.filter(function (s) { return s.mode === 'read' && s.completed; });
    var wpm = reads.map(function (s) {
      if (s.wpm) return s.wpm;
      return s.words && s.duration_ms ? Math.round(s.words / (s.duration_ms / 60000)) : null;
    }).filter(function (v) { return v; });
    $('#tWpm').innerHTML = wpm.length
      ? '<div class="t-wpm">' + sparkline(wpm, 260, 60) + '</div><p class="t-val">Session 1: ' + wpm[0] +
        ' WPM → Session ' + wpm.length + ': ' + wpm[wpm.length - 1] + ' WPM</p>'
      : '<span class="t-none">No reading sessions yet.</span>';

    /* worlds */
    $('#tWorlds').innerHTML = PAIRS.map(function (p) {
      var done = M.sessions.filter(function (s) { return s.world === p.k && s.completed; });
      var lv = [1, 2, 3].map(function (n) {
        var r = done.some(function (s) { return s.level === n && s.mode === 'read'; });
        var w = done.some(function (s) { return s.level === n && s.mode === 'write'; });
        return '<i data-s="' + (r && w ? 'done' : r || w ? 'half' : '') + '"></i>';
      }).join('');
      return '<div class="t-row"><span class="t-world">' + p.world + '</span><span class="pips">' + lv + '</span></div>';
    }).join('');

    $('#tAction').innerHTML = '<b>Recommended</b> ' + esc(recommend(list, M));
    $('#tEventsCard').hidden = true;
  }

  /* One plain sentence: what to do next, which world, how long. */
  function recommend(list, M) {
    if (!M.sessions.length) return 'No sessions yet. Start with Deep Sea Signal, 10 minutes a day.';
    /* what is happening NOW matters most: errors in the last three
       sessions, then the all-time count */
    var need = list.filter(function (x) { return x.total > 0; })
      .sort(function (a, b) { return (b.recent - a.recent) || (b.total - a.total); });
    var focus = need[0];
    if (!focus) {
      var next = PAIRS.filter(function (p) {
        return !M.sessions.some(function (s) { return s.world === p.k && s.completed; });
      })[0];
      return next ? 'No confusions found so far. Move on to ' + next.world + ' this week.'
                  : 'No confusions found in any world. Keep up short daily reading.';
    }
    var s = 'Continue ' + focus.pair.world + '. Focus on ' + focus.pair.label + ' this week, about 10 minutes a day.';
    if (focus.trend === 'regressing') s += ' These mix-ups are rising — keep sessions short and frequent.';
    else if (focus.trend === 'improving') s += ' It is improving — keep going.';
    var supply = focus.rungs.supply, light = focus.rungs.prompt + focus.rungs.cue;
    if (supply > light && supply >= 2) s += ' The child often needs the answer supplied: sit with them for the Choice step.';
    else if (focus.total >= 4 && focus.selfc / focus.total >= 0.5) s += ' They often catch it themselves: awareness is there, now build speed.';
    return s;
  }

  function showEvents(x) {
    $('#tEventsCard').hidden = false;
    $('#tEventsTitle').textContent = 'Every ' + x.pair.label + ' event (' + x.events.length + ')';
    var ev = x.events.slice().sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
    $('#tEvents').innerHTML = ev.length
      ? '<table class="t-table"><thead><tr><th>When</th><th>Word</th><th>Child wrote / said</th><th>Expected → actual</th>' +
        '<th>Mode</th><th>Pause</th><th>Self-corrected</th><th>Found by</th></tr></thead><tbody>' +
        ev.map(function (e) {
          return '<tr><td>' + esc(String(e.created_at).replace('T', ' ').slice(0, 16)) + '</td>' +
            '<td>' + esc(e.word) + '</td><td>' + esc(e.actual_word || '') + '</td>' +
            '<td>' + esc((e.expected_char || '?') + ' → ' + (e.actual_char || '?')) + '</td>' +
            '<td>' + esc(e.mode || '') + '</td><td>' + (e.pause_ms != null ? e.pause_ms + ' ms' : '—') + '</td>' +
            '<td>' + (e.self_corrected ? 'yes' : 'no') + '</td><td>' + esc(e.detected_by || '') + '</td></tr>';
        }).join('') + '</tbody></table>'
      : '<p class="t-none">No events for this pair.</p>';
    $('#tEventsCard').scrollIntoView({ behavior: 'smooth' });
  }

  /* ══ export for the study ════════════════════════════════ */
  function download(name, text, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }
  function exportJson() {
    download('spark-study-data.json', JSON.stringify(data, null, 2), 'application/json');
  }
  function exportCsv() {
    var t = $('#tExportTable').value, list = data[t] || [];
    var cols = [];
    list.forEach(function (r) { Object.keys(r).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
    var cell = function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var csv = [cols.join(',')].concat(list.map(function (r) { return cols.map(function (c) { return cell(r[c]); }).join(','); })).join('\n');
    download('spark-' + t + '.csv', csv, 'text/csv');
  }

  setupLogin();
})();
