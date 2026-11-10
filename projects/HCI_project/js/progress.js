/* ============================================================
   progress.js — what Spark has measured, shown kindly.

   Built for two readers at once:
     · the child — sparks, medals, and a cheerful line about what
       they did, so the page feels like a reward;
     · the adult — "Letters to watch": which letter pairs get mixed
       up, how often, on which words, and whether it happens when
       reading aloud, when writing, or both. That is where to help.

   Every number is computed from recorded work. Nothing is made up.
   ============================================================ */

(function (S) {
  'use strict';

  var CUE_LABELS = { picture: 'Pictures', sound: 'Hearing it', parts: 'Word parts' };
  var CUE_ICON = { picture: 'picture', sound: 'speaker', parts: 'parts' };

  S.wireProgress = function () {
    S.$('#btnReviewBack').addEventListener('click', S.closeReview);
    S.$('#v-progress').addEventListener('click', function (e) {
      if (e.target.closest('#btnReview')) S.openReview();
      var w = e.target.closest('[data-practise]');
      if (w) S.sayInParts(w.dataset.practise);
    });
  };

  S.paintProgress = function () {
    var P = S.P;
    var withPace = P.sessions.filter(function (s) { return s.wpm; });
    var best = withPace.length ? Math.max.apply(null, withPace.map(function (s) { return s.wpm; })) : 0;
    var earned = S.MEDALS.filter(function (m) { return (P.medals || {})[m.id]; });
    var nextMedal = S.MEDALS.filter(function (m) { return !(P.medals || {})[m.id]; })[0];

    S.$('#progMain').innerHTML =
      '<div class="prog-hero">' +
        '<div class="prog-hi">' +
          '<span class="prog-avatar">' + S.myAvatar(76) + '</span>' +
          '<div><h1>' + (P.name ? 'Great work, ' + S.esc(P.name) + '!' : 'Your progress') + '</h1>' +
          '<p class="lede" style="margin:0">' + cheer() + '</p></div>' +
        '</div>' +
        '<div class="spark-card">' +
          '<span class="spark-card-ico">' + S.Pictures.icon('spark', 40) + '</span>' +
          '<div><b>' + P.sparks + '</b><span>sparks collected</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="prog-kpis">' +
        kpi('violet', 'book', P.sessions.length, 'stories read') +
        kpi('rose', 'pencil', P.writings.length, 'things written') +
        kpi('moss', 'clock', best || '—', 'best words / min') +
        kpi('amber', 'spark', P.streak, 'day streak') +
      '</div>' +

      '<section class="card medal-card">' +
        '<div class="card-head"><h2>' + S.Pictures.icon('trophy', 20) + ' Medals</h2>' +
          '<span class="pill">' + earned.length + ' of ' + S.MEDALS.length + '</span></div>' +
        '<div class="medal-row">' + S.MEDALS.map(function (m) {
          var got = (P.medals || {})[m.id];
          return '<div class="medal-item' + (got ? ' on' : '') + '" title="' + S.esc(m.goal) + '">' +
            S.medalBadge(m, !!got) + '<b>' + S.esc(m.title) + '</b></div>';
        }).join('') + '</div>' +
        (nextMedal ? '<p class="next-medal">Next: <b>' + S.esc(nextMedal.title) + '</b> — ' + S.esc(nextMedal.goal) + '</p>' : '') +
      '</section>' +

      '<section class="card letters-card">' +
        '<div class="card-head"><h2>' + S.Pictures.icon('parts', 20) + ' Letters to watch</h2></div>' +
        '<p class="sub">Which letters get mixed up — reading aloud and writing.</p>' +
        lettersToWatch() +
      '</section>' +

      '<div class="prog-grid">' +
        '<section class="card tone-card-violet">' +
          '<h2>Reading speed</h2>' +
          '<div class="chart-box" id="chartBox"></div>' +
        '</section>' +
        '<section class="card tone-card-amber">' +
          '<h2>Why you stopped</h2>' +
          '<p class="sub">Spark only counts pauses where a word was hard.</p>' +
          '<div id="pauseSplit"></div>' +
          '<button class="btn btn-sm" id="btnReview" style="margin-top:12px">See every one →</button>' +
        '</section>' +
        '<section class="card tone-card-moss">' +
          '<h2>What helps you</h2>' +
          '<div id="cueBars"></div>' +
        '</section>' +
        '<section class="card tone-card-rose">' +
          '<h2>Words to practise</h2>' +
          '<div id="trickyList"></div>' +
        '</section>' +
      '</div>';

    paintChart(withPace);
    paintPauseSplit();
    paintCues();
    paintTricky();
  };

  function kpi(tone, icon, n, label) {
    return '<div class="stat-tile tone-' + tone + '"><span class="st-ico">' + S.Pictures.icon(icon, 22) + '</span>' +
      '<b>' + n + '</b><span>' + label + '</span></div>';
  }

  /* One honest, encouraging line from what was actually done. */
  function cheer() {
    var P = S.P, d = S.today();
    var today = P.sessions.filter(function (s) { return s.date === d; }).length +
                P.writings.filter(function (w) { return w.date === d; }).length;
    var withPace = P.sessions.filter(function (s) { return s.wpm; });
    if (withPace.length >= 2) {
      var first = withPace[0].wpm, last = withPace[withPace.length - 1].wpm;
      if (last > first) return 'You read ' + (last - first) + ' words a minute faster than your first story!';
    }
    if (today) return 'You did ' + today + ' thing' + (today > 1 ? 's' : '') + ' today. Keep it up!';
    if (P.streak >= 2) return P.streak + ' days in a row — brilliant!';
    if (!P.sessions.length) return 'Read your first story to start filling this page.';
    return 'Every story you read helps Spark help you.';
  }

  /* ── letters to watch: the heart of the page ─────────── */
  function lettersToWatch() {
    var letters = S.P.letters || {};
    var rows = Object.keys(letters).filter(function (k) { return letters[k].count > 0; })
      .map(function (k) {
        var r = letters[k];
        var read = r.read != null ? r.read : (r.count - (r.write || 0));
        return { key: k, count: r.count, read: Math.max(0, read), write: r.write || 0, ex: r.examples || [] };
      })
      .sort(function (a, b) { return b.count - a.count; });

    if (!rows.length) {
      var tried = S.FAMILIES.filter(function (f) {
        return f.stories.some(function (st) { return S.P.doneSteps[st.id] && S.P.doneSteps[st.id].read; }) ||
               (S.P.dictationDone || {})[f.id];
      }).length;
      return '<div class="empty"><p>' + (tried
        ? 'No mix-ups found in ' + tried + ' letter famil' + (tried > 1 ? 'ies' : 'y') + '. Great!'
        : 'Read or write in a letter family and Spark will show any mix-ups here.') + '</p></div>';
    }

    var max = rows[0].count;
    return '<div class="watch-key"><span><i class="k-read"></i>reading</span><span><i class="k-write"></i>writing</span></div>' +
      rows.slice(0, 6).map(function (r, i) {
        var fam = S.familyOfPair(r.key);
        return '<div class="watch-row' + (i === 0 ? ' top' : '') + '">' +
          '<span class="lt-pair">' + S.esc(S.Analysis.pairLabel(r.key)) + '</span>' +
          '<div class="watch-main">' +
            '<div class="watch-bar" style="width:' + Math.max(12, r.count / max * 100) + '%">' +
              (r.read ? '<i class="k-read" style="flex:' + r.read + '"></i>' : '') +
              (r.write ? '<i class="k-write" style="flex:' + r.write + '"></i>' : '') +
            '</div>' +
            '<span class="watch-words">' + r.count + '× · ' + r.ex.slice(0, 4).map(S.esc).join(', ') + '</span>' +
          '</div>' +
          (i === 0 ? '<span class="pill pill-warn">Focus</span>' : '') +
          (fam ? '<button class="btn btn-sm" data-go="read">Practise</button>' : '') +
        '</div>';
      }).join('');
  }

  /* ── natural pauses vs real difficulty ──────────────── */
  function paintPauseSplit() {
    var host = S.$('#pauseSplit');
    var p = S.P.pauses || { natural: 0, struggle: 0, byType: {} };
    var total = p.natural + p.struggle;
    if (!total) {
      host.innerHTML = '<p class="muted" style="font-size:14px">Read aloud with the microphone to see this.</p>';
      return;
    }
    var pct = Math.round(p.struggle / total * 100);
    host.innerHTML =
      '<div class="split-bar">' +
        '<span class="split-nat" style="width:' + (100 - pct) + '%"></span>' +
        '<span class="split-str" style="width:' + pct + '%"></span>' +
      '</div>' +
      '<div class="split-key">' +
        '<span><i class="dot-nat"></i>' + p.natural + ' normal</span>' +
        '<span><i class="dot-str"></i>' + p.struggle + ' hard word</span>' +
      '</div>';
  }

  /* ── the review: every difficulty, in full ════════════ */
  var reviewFilter = 'all';

  S.openReview = function () {
    S.$('#progMain').hidden = true;
    S.$('#reviewPanel').hidden = false;
    paintReview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  S.closeReview = function () {
    S.$('#reviewPanel').hidden = true;
    S.$('#progMain').hidden = false;
  };

  var TYPE_LABEL = {
    decoding: 'Started sounding it out', 'word-specific': 'A word that keeps catching you',
    'complex-word': 'A long or tricky word', struggle: 'Stuck mid-phrase',
    'letter-confusion': 'Letters swapped', 'word-reversal': 'Word read backwards',
    transposition: 'Letters in the wrong order', substitution: 'A different word',
    omission: 'Left a sound out', insertion: 'Added a sound'
  };

  function paintReview() {
    var events = (S.P.events || []).slice().reverse();
    var host = S.$('#reviewList');
    if (!events.length) {
      S.$('#reviewFilters').innerHTML = '';
      host.innerHTML = '<div class="empty"><p>Nothing recorded yet.</p></div>';
      return;
    }
    var counts = { all: events.length, pause: 0, misread: 0, spelling: 0 };
    events.forEach(function (e) { counts[e.kind] = (counts[e.kind] || 0) + 1; });

    S.$('#reviewFilters').innerHTML =
      [['all', 'Everything'], ['pause', 'Pauses'], ['misread', 'Reading'], ['spelling', 'Writing']]
        .filter(function (f) { return counts[f[0]]; })
        .map(function (f) {
          return '<button class="rev-filter" data-filter="' + f[0] + '"' +
            (reviewFilter === f[0] ? ' data-on="1"' : '') + '>' + f[1] + ' <b>' + counts[f[0]] + '</b></button>';
        }).join('');
    S.$$('#reviewFilters .rev-filter').forEach(function (b) {
      b.addEventListener('click', function () { reviewFilter = b.dataset.filter; paintReview(); });
    });

    var shown = events.filter(function (e) { return reviewFilter === 'all' || e.kind === reviewFilter; });
    var days = [];
    shown.forEach(function (e) {
      var last = days[days.length - 1];
      if (!last || last.date !== e.date) days.push({ date: e.date, items: [e] });
      else last.items.push(e);
    });
    host.innerHTML = days.map(function (day) {
      return '<p class="eyebrow" style="margin:18px 0 9px">' + S.esc(S.niceDate(day.date)) + '</p>' +
        day.items.map(reviewRow).join('');
    }).join('');

    S.$$('#reviewList [data-hear]').forEach(function (b) {
      b.addEventListener('click', function () { S.sayInParts(b.dataset.hear); });
    });
  }

  function reviewRow(e) {
    var isSlip = e.kind === 'misread' || e.kind === 'spelling';
    var detail = isSlip
      ? '<div class="rev-said"><span class="rev-wrong">' + markDiff(e.said, e.word) + '</span>' +
          '<span class="rev-arrow">' + (e.kind === 'spelling' ? 'wrote, should be' : 'said, should be') + '</span>' +
          '<span class="rev-right">' + markDiff(e.word, e.said) + '</span></div>' +
        (e.pairs && e.pairs.length ? '<p class="rev-pairs">Letters: ' + e.pairs.map(function (k) {
          return '<b>' + S.esc(S.Analysis.pairLabel(k)) + '</b>'; }).join(', ') + '</p>' : '')
      : '<div class="rev-stat-row">' +
          (e.seconds ? '<span class="rev-stat">stopped for <b>' + e.seconds + 's</b></span>' : '') +
          (e.partial ? '<span class="rev-stat">got as far as <b>' + S.esc(e.partial) + '…</b></span>' : '') +
        '</div>';
    return '<div class="rev-item" data-kind="' + e.kind + '">' +
      '<div class="rev-head"><span class="rev-word">' + S.esc(e.word) + '</span>' +
        '<span class="rev-type">' + S.esc(e.kind === 'spelling' ? 'Writing' : (TYPE_LABEL[e.type] || e.type)) + '</span>' +
        '<button class="icon-xs" data-hear="' + S.esc(e.word) + '" aria-label="Hear the word">' +
          '<span class="i" data-icon="speaker" data-icon-size="16"></span></button></div>' +
      detail +
      (e.sentence ? '<p class="rev-sentence">' + highlight(e.sentence, e.word) + '</p>' : '') +
      (e.passage ? '<p class="rev-why muted">' + S.esc(e.passage) + '</p>' : '') +
    '</div>';
  }

  function markDiff(a, b) {
    a = String(a || ''); b = String(b || '');
    var out = '';
    for (var i = 0; i < a.length; i++) out += a[i] !== b[i] ? '<em>' + S.esc(a[i]) + '</em>' : S.esc(a[i]);
    return out;
  }

  function highlight(sentence, word) {
    var safe = S.esc(sentence);
    var re = new RegExp('\\b(' + String(word).replace(/[^a-z']/gi, '') + ')\\b', 'i');
    return safe.replace(re, '<mark>$1</mark>');
  }

  /* ── reading speed over time ────────────────────────── */
  function paintChart(withPace) {
    var box = S.$('#chartBox');
    if (withPace.length < 2) {
      box.innerHTML = '<p class="muted" style="font-size:14px">Read two stories aloud to see your speed grow.</p>';
      return;
    }
    box.innerHTML = '<canvas id="wpmChart" aria-label="Your reading speed over time"></canvas>';
    drawLine(S.$('#wpmChart'), withPace.slice(-12).map(function (s) { return s.wpm; }));
  }

  function drawLine(canvas, points) {
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.clientWidth || 320, H = 170;
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = H + 'px';
    var c = canvas.getContext('2d');
    c.scale(dpr, dpr);
    var cs = getComputedStyle(document.documentElement);
    var ink = cs.getPropertyValue('--ink-2').trim(), line = cs.getPropertyValue('--line').trim();
    var accent = cs.getPropertyValue('--violet').trim();
    var L = 36, Rp = 12, T = 12, B = 26, w = W - L - Rp, h = H - T - B;
    var lo = Math.max(0, Math.min.apply(null, points) - 10), hi = Math.max.apply(null, points) + 10, span = (hi - lo) || 1;
    c.font = '11px system-ui, sans-serif';
    for (var i = 0; i <= 3; i++) {
      var y = T + h - (h * i / 3);
      c.strokeStyle = line; c.lineWidth = 1;
      c.beginPath(); c.moveTo(L, y); c.lineTo(L + w, y); c.stroke();
      c.fillStyle = ink; c.textAlign = 'right'; c.textBaseline = 'middle';
      c.fillText(String(Math.round(lo + span * i / 3)), L - 7, y);
    }
    var X = function (i) { return L + (points.length === 1 ? w / 2 : w * i / (points.length - 1)); };
    var Y = function (v) { return T + h - h * (v - lo) / span; };
    c.beginPath();
    points.forEach(function (v, i) { i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v)); });
    c.strokeStyle = accent; c.lineWidth = 3; c.lineJoin = 'round'; c.stroke();
    points.forEach(function (v, i) {
      c.beginPath(); c.arc(X(i), Y(v), i === points.length - 1 ? 5.5 : 3.5, 0, Math.PI * 2);
      c.fillStyle = accent; c.fill();
    });
    c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillText('first', X(0), T + h + 8);
    c.fillText('latest', X(points.length - 1), T + h + 8);
  }

  /* ── which help works ───────────────────────────────── */
  function paintCues() {
    var host = S.$('#cueBars');
    var total = 0;
    for (var k in S.P.cue) total += S.P.cue[k].shown;
    if (!total) {
      host.innerHTML = '<p class="muted" style="font-size:14px">Use a picture, sound or parts clue and Spark learns which suits you.</p>';
      return;
    }
    var fav = S.favourite();
    var max = Math.max(1, Math.max.apply(null, Object.keys(S.P.cue).map(function (key) { return S.P.cue[key].worked; })));
    host.innerHTML = Object.keys(S.P.cue).map(function (key) {
      var v = S.P.cue[key];
      return '<div class="cue-row' + (fav === key ? ' fav' : '') + '">' +
        '<span class="cue-ico">' + S.Pictures.icon(CUE_ICON[key], 18) + '</span>' +
        '<span class="cue-label">' + CUE_LABELS[key] + '</span>' +
        '<span class="bar-track"><span class="bar-fill" style="width:' + Math.round(v.worked / max * 100) + '%"></span></span>' +
        (fav === key ? '<span class="pill">Best</span>' : '') +
      '</div>';
    }).join('');
  }

  /* ── tricky words ───────────────────────────────────── */
  function paintTricky() {
    var host = S.$('#trickyList');
    var words = S.Analysis.wordTroubles().slice(0, 14);
    if (!words.length) {
      host.innerHTML = '<p class="muted" style="font-size:14px">Words you pause on or mix up will appear here.</p>';
      return;
    }
    host.innerHTML = '<div class="done-chips">' + words.map(function (w) {
      return '<button class="mix-chip" data-practise="' + S.esc(w.word) + '">' +
        S.Pictures.icon('speaker', 14) + ' ' + S.esc(w.word) + '</button>';
    }).join('') + '</div><p class="sub" style="margin:8px 0 0">Tap one to hear its parts.</p>';
  }

})(window.Spark);
