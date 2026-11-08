/* ============================================================
   progress.js — what Spark has actually measured.

   Every number on this page is computed from recorded sessions.
   Where there is no data yet, the panel says what will appear and
   how to make it appear, instead of showing an invented figure.
   ============================================================ */

(function (S) {
  'use strict';

  var CUE_LABELS = { picture: 'Pictures', sound: 'Hearing it', parts: 'Word parts' };
  var CUE_COLOURS = { picture: 'var(--violet)', sound: 'var(--amber)', parts: 'var(--moss)' };

  S.wireProgress = function () {
    S.$('#btnReview').addEventListener('click', S.openReview);
    S.$('#btnReviewBack').addEventListener('click', S.closeReview);
  };

  S.paintProgress = function () {
    /* Deliberately does NOT close the review — this also runs on
       window resize, and a reader halfway through the detail list
       should not be thrown back to the summary by resizing. */
    var withPace = S.P.sessions.filter(function (s) { return s.wpm; });

    S.$('#kSparks').textContent   = S.P.sparks;
    S.$('#kSessions').textContent = S.P.sessions.length;
    S.$('#kWpm').textContent      = withPace.length
      ? Math.max.apply(null, withPace.map(function (s) { return s.wpm; }))
      : '—';
    S.$('#kStreak').textContent   = S.P.streak;

    paintChart(withPace);
    paintCues();
    paintPauseSplit();
    paintLetters();
    paintTricky();
    paintSessions();
  };

  /* ── natural pauses vs real difficulty ──────────────── */
  function paintPauseSplit() {
    var host = S.$('#pauseSplit');
    if (!host) return;

    var p = S.P.pauses || { natural: 0, struggle: 0, byType: {} };
    var total = p.natural + p.struggle;

    if (!total) {
      host.innerHTML = '<div class="empty"><div class="e-ico"><span class="i" data-icon="stop" data-icon-size="30"></span></div>' +
        '<p>Read aloud with the microphone and Spark will start sorting your ' +
        'pauses into ordinary phrasing and real difficulty.</p></div>';
      return;
    }

    var pct = Math.round(p.struggle / total * 100);

    var LABELS = {
      'sentence-break': 'after a full stop',
      'clause-break':   'at a comma',
      'planning':       'starting a sentence',
      'breath':         'normal rhythm',
      'decoding':       'sounding a word out',
      'word-specific':  'a word that keeps catching you',
      'complex-word':   'a long or tricky word',
      'struggle':       'stuck mid-phrase',
      'uncertain':      'not clear'
    };

    var byType = Object.keys(p.byType)
      .map(function (k) { return { key: k, n: p.byType[k] }; })
      .sort(function (a, b) { return b.n - a.n; })
      .slice(0, 5);

    host.innerHTML =
      '<div class="split-bar">' +
        '<span class="split-nat" style="width:' + (100 - pct) + '%"></span>' +
        '<span class="split-str" style="width:' + pct + '%"></span>' +
      '</div>' +
      '<div class="split-key">' +
        '<span><i class="dot-nat"></i>' + p.natural + ' normal phrasing</span>' +
        '<span><i class="dot-str"></i>' + p.struggle + ' real difficulty</span>' +
      '</div>' +
      '<p class="note" style="margin-top:12px">' +
        (pct < 25
          ? 'Most of your pauses are just how reading sounds. Only ' + pct +
            '% were a word giving you trouble.'
          : 'About ' + pct + '% of your pauses were a word giving you trouble. ' +
            'Those are the ones Spark builds practice from.') +
      '</p>' +
      '<div class="split-list">' +
        byType.map(function (t) {
          return '<div class="split-row">' +
            '<span>' + (LABELS[t.key] || t.key) + '</span>' +
            '<b>' + t.n + '</b></div>';
        }).join('') +
      '</div>';
  }

  /* ══ the review: every difficulty, in full ════════════
     The summary answers "how often". This answers "which word,
     in which sentence, and what did they actually say" — which is
     what a parent or teacher needs to do anything about it. */

  var reviewFilter = 'all';

  S.openReview = function () {
    S.$('#progGrid').hidden = true;
    S.$('.kpis').hidden = true;
    S.$('#reviewPanel').hidden = false;
    paintReview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  S.closeReview = function () {
    S.$('#reviewPanel').hidden = true;
    S.$('#progGrid').hidden = false;
    S.$('.kpis').hidden = false;
  };

  var TYPE_LABEL = {
    decoding:          'Started sounding it out',
    'word-specific':   'A word that keeps catching you',
    'complex-word':    'A long or tricky word',
    struggle:          'Stuck mid-phrase',
    'letter-confusion':'Letters swapped',
    'word-reversal':   'Word read backwards',
    transposition:     'Letters in the wrong order',
    substitution:      'Said a different word',
    omission:          'Left a sound out',
    insertion:         'Added a sound'
  };

  function paintReview() {
    var events = (S.P.events || []).slice().reverse();
    var host = S.$('#reviewList');

    if (!events.length) {
      S.$('#reviewFilters').innerHTML = '';
      host.innerHTML = '<div class="empty"><div class="e-ico"><span class="i" data-icon="list" data-icon-size="30"></span></div>' +
        '<p>Nothing recorded yet. Read aloud with the microphone and every ' +
        'difficulty Spark spots will be listed here in full.</p></div>';
      return;
    }

    /* filter chips, built from what is actually in the list */
    var counts = { all: events.length, pause: 0, misread: 0 };
    events.forEach(function (e) { counts[e.kind] = (counts[e.kind] || 0) + 1; });

    S.$('#reviewFilters').innerHTML =
      [['all', 'Everything'], ['pause', 'Pauses'], ['misread', 'Misread words']]
        .filter(function (f) { return counts[f[0]]; })
        .map(function (f) {
          return '<button class="rev-filter" data-filter="' + f[0] + '"' +
            (reviewFilter === f[0] ? ' data-on="1"' : '') + '>' +
            f[1] + ' <b>' + counts[f[0]] + '</b></button>';
        }).join('');

    S.$$('#reviewFilters .rev-filter').forEach(function (b) {
      b.addEventListener('click', function () {
        reviewFilter = b.dataset.filter;
        paintReview();
      });
    });

    var shown = events.filter(function (e) {
      return reviewFilter === 'all' || e.kind === reviewFilter;
    });

    /* group by day, newest first */
    var days = [];
    shown.forEach(function (e) {
      var last = days[days.length - 1];
      if (!last || last.date !== e.date) days.push({ date: e.date, items: [e] });
      else last.items.push(e);
    });

    host.innerHTML = days.map(function (day) {
      return '<p class="eyebrow" style="margin:18px 0 9px">' + friendlyDate(day.date) + '</p>' +
        day.items.map(reviewRow).join('');
    }).join('');

    S.$$('#reviewList [data-hear]').forEach(function (b) {
      b.addEventListener('click', function () { S.sayInParts(b.dataset.hear); });
    });
    S.$$('#reviewList [data-hear-said]').forEach(function (b) {
      b.addEventListener('click', function () { S.say(b.dataset.hearSaid); });
    });
  }

  function reviewRow(e) {
    var isMisread = e.kind === 'misread';

    var detail = '';
    if (isMisread) {
      /* show the two words side by side, with the swapped letters marked */
      detail =
        '<div class="rev-said">' +
          '<span class="rev-wrong">' + markDiff(e.said, e.word) + '</span>' +
          '<span class="rev-arrow">should be</span>' +
          '<span class="rev-right">' + markDiff(e.word, e.said) + '</span>' +
        '</div>' +
        (e.pairs && e.pairs.length
          ? '<p class="rev-pairs">Letters confused: ' +
            e.pairs.map(function (k) {
              return '<b>' + S.esc(S.Analysis.pairLabel(k)) + '</b>';
            }).join(', ') + '</p>'
          : '');
    } else {
      detail =
        '<div class="rev-stat-row">' +
          (e.seconds ? '<span class="rev-stat">stopped for <b>' + e.seconds + 's</b></span>' : '') +
          (e.partial ? '<span class="rev-stat">got as far as <b>' + S.esc(e.partial) + '…</b></span>' : '') +
        '</div>';
    }

    return '<div class="rev-item" data-kind="' + e.kind + '">' +
      '<div class="rev-head">' +
        '<span class="rev-word">' + S.esc(e.word) + '</span>' +
        '<span class="rev-type">' + S.esc(TYPE_LABEL[e.type] || e.type) + '</span>' +
        '<button class="icon-xs" data-hear="' + S.esc(e.word) + '" ' +
          'aria-label="Hear the word"><span class="i" data-icon="speaker" data-icon-size="18"></span></button>' +
        (isMisread ? '<button class="icon-xs" data-hear-said="' + S.esc(e.said) + '" ' +
          'aria-label="Hear what you said"><span class="i" data-icon="ear" data-icon-size="18"></span></button>' : '') +
      '</div>' +
      detail +
      (e.sentence ? '<p class="rev-sentence">' + highlight(e.sentence, e.word) + '</p>' : '') +
      '<p class="rev-why">' + S.esc(e.reason || '') +
        (e.passage ? ' · <span class="muted">' + S.esc(e.passage) + '</span>' : '') +
      '</p>' +
    '</div>';
  }

  /** Mark the letters of `a` that differ from `b`. */
  function markDiff(a, b) {
    a = String(a || ''); b = String(b || '');
    var out = '';
    for (var i = 0; i < a.length; i++) {
      var differs = a[i] !== b[i];
      out += differs ? '<em>' + S.esc(a[i]) + '</em>' : S.esc(a[i]);
    }
    return out;
  }

  /** Show the sentence with the problem word picked out. */
  function highlight(sentence, word) {
    var safe = S.esc(sentence);
    var re = new RegExp('\\b(' + String(word).replace(/[^a-z']/gi, '') + ')\\b', 'i');
    return safe.replace(re, '<mark>$1</mark>');
  }

  function friendlyDate(iso) {
    var today = S.today();
    if (iso === today) return 'Today';
    var yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    if (iso === yesterday) return 'Yesterday';
    try {
      return new Date(iso + 'T00:00:00').toLocaleDateString(undefined,
        { weekday: 'long', day: 'numeric', month: 'long' });
    } catch (e) { return iso; }
  }

  /* ── letter confusions ──────────────────────────────── */
  function paintLetters() {
    var host = S.$('#letterList');
    if (!host) return;

    var troubles = S.Analysis.letterTroubles(1);
    if (!troubles.length) {
      host.innerHTML = '<div class="empty"><div class="e-ico"><span class="i" data-icon="parts" data-icon-size="30"></span></div>' +
        '<p>None spotted yet. If you swap letters like b and d while reading aloud, ' +
        'they will appear here and turn into practice.</p></div>';
      return;
    }

    host.innerHTML = troubles.slice(0, 6).map(function (t) {
      return '<div class="letter-trouble">' +
        '<span class="lt-pair">' + S.esc(t.label) + '</span>' +
        '<div class="lt-meta">' +
          '<b>' + t.count + ' time' + (t.count > 1 ? 's' : '') + '</b>' +
          (t.examples.length
            ? '<span>in ' + S.esc(t.examples.slice(0, 3).join(', ')) + '</span>'
            : '') +
        '</div>' +
      '</div>';
    }).join('') +
    '<p class="sub" style="margin:12px 0 0">Practise these in ' +
    '<b>Homework → From Spark</b>.</p>';
  }

  /* ── reading speed over time ────────────────────────── */
  function paintChart(withPace) {
    var box = S.$('#chartBox');
    if (withPace.length < 2) {
      box.innerHTML = '<div class="empty"><div class="e-ico"><span class="i" data-icon="trophy" data-icon-size="30"></span></div>' +
        '<p>Read aloud twice with the microphone and your speed appears here.</p></div>';
      return;
    }
    box.innerHTML = '<canvas id="wpmChart" aria-label="Your reading speed over time"></canvas>';
    drawLine(S.$('#wpmChart'), withPace.slice(-12).map(function (s) { return s.wpm; }));
  }

  function drawLine(canvas, points) {
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.clientWidth || 320, H = 190;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.height = H + 'px';

    var c = canvas.getContext('2d');
    c.scale(dpr, dpr);
    c.clearRect(0, 0, W, H);

    /* read the live theme so the chart is legible in both */
    var cs    = getComputedStyle(document.documentElement);
    var ink   = cs.getPropertyValue('--ink-2').trim();
    var line  = cs.getPropertyValue('--line').trim();
    var accent= cs.getPropertyValue('--violet').trim();

    var L = 38, Rp = 12, T = 12, B = 28;
    var w = W - L - Rp, h = H - T - B;

    var lo = Math.max(0, Math.min.apply(null, points) - 10);
    var hi = Math.max.apply(null, points) + 10;
    var span = (hi - lo) || 1;

    c.font = '11px Nunito, system-ui, sans-serif';
    c.lineWidth = 1;

    /* gridlines, each labelled with a value the chart really reaches */
    for (var i = 0; i <= 3; i++) {
      var y = T + h - (h * i / 3);
      var v = Math.round(lo + span * i / 3);
      c.strokeStyle = line;
      c.beginPath(); c.moveTo(L, y); c.lineTo(L + w, y); c.stroke();
      c.fillStyle = ink; c.textAlign = 'right'; c.textBaseline = 'middle';
      c.fillText(String(v), L - 7, y);
    }

    var X = function (i) { return L + (points.length === 1 ? w / 2 : w * i / (points.length - 1)); };
    var Y = function (v) { return T + h - h * (v - lo) / span; };

    c.beginPath();
    points.forEach(function (v, i) { i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v)); });
    c.strokeStyle = accent; c.lineWidth = 2.5; c.lineJoin = 'round'; c.stroke();

    points.forEach(function (v, i) {
      c.beginPath();
      c.arc(X(i), Y(v), i === points.length - 1 ? 5 : 3.2, 0, Math.PI * 2);
      c.fillStyle = accent; c.fill();
    });

    c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillText('first', X(0), T + h + 8);
    c.fillText('latest', X(points.length - 1), T + h + 8);
  }

  /* ── which help works ───────────────────────────────── */
  function paintCues() {
    var bars = S.$('#cueBars'), note = S.$('#cueNote');
    var total = 0;
    for (var k in S.P.cue) total += S.P.cue[k].shown;

    if (!total) {
      bars.innerHTML = '<div class="empty"><div class="e-ico"><span class="i" data-icon="idea" data-icon-size="30"></span></div>' +
        '<p>When you use help while reading, Spark learns which kind suits you ' +
        'and starts offering that one first.</p></div>';
      note.textContent = '';
      return;
    }

    var max = Math.max(1, Math.max.apply(null,
      Object.keys(S.P.cue).map(function (key) { return S.P.cue[key].worked; })));

    bars.innerHTML = Object.keys(S.P.cue).map(function (key) {
      var v = S.P.cue[key];
      return '<div class="bar-row">' +
        '<span class="bar-label">' + CUE_LABELS[key] + '</span>' +
        '<span class="bar-track"><span class="bar-fill" style="width:' +
          Math.round(v.worked / max * 100) + '%;background:' + CUE_COLOURS[key] + '"></span></span>' +
        '<span class="bar-val">' + v.worked + '/' + v.shown + '</span>' +
      '</div>';
    }).join('');

    var fav = S.favourite();
    note.innerHTML = fav
      ? '<b>Spark offers ' + CUE_LABELS[fav].toLowerCase() + ' first</b> — that\'s what gets ' +
        'you moving again most often.'
      : 'Spark is still watching. After a few more, it will start offering your best kind of help first.';
  }

  /* ── tricky words ───────────────────────────────────── */
  function paintTricky() {
    var host = S.$('#trickyList');
    var words = S.allTricky().slice(0, 20);

    if (!words.length) {
      host.innerHTML = '<div class="empty"><p>No tricky words yet. ' +
        'They show up here once you\'ve read aloud a few times.</p></div>';
      return;
    }

    host.innerHTML =
      words.map(function (w) {
        return '<button class="wordchip" data-word="' + S.esc(w.word) + '">' +
          S.esc(w.word) + ' <b>' + w.stalled + '×</b></button>';
      }).join('') +
      '<p class="sub" style="margin:10px 0 0">Practise these in ' +
      '<b>Homework → From Spark</b>.</p>';

    S.$$('[data-word]', host).forEach(function (b) {
      b.addEventListener('click', function () { S.sayInParts(b.dataset.word); });
    });
  }

  /* ── session history ────────────────────────────────── */
  function paintSessions() {
    var host = S.$('#sessionList');
    if (!S.P.sessions.length) {
      host.innerHTML = '<div class="empty"><p>Your readings will be listed here.</p></div>';
      return;
    }
    host.innerHTML = S.P.sessions.slice(-6).reverse().map(function (s) {
      return '<div class="session-row">' +
        '<div class="session-main">' +
          '<b>' + S.esc(s.title) + '</b>' +
          '<span>' + s.date + ' · ' + s.words + ' words' +
            (s.stalls ? ' · paused ' + s.stalls + '×' : '') + '</span>' +
        '</div>' +
        '<span class="sparks-chip">' + (s.wpm ? s.wpm + ' wpm' : '—') + '</span>' +
      '</div>';
    }).join('');
  }

})(window.Spark);
