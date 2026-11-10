/* ============================================================
   app.js — the home page, the reward picture, and boot.
   Loaded last, once every other module has registered itself.
   ============================================================ */

(function (S) {
  'use strict';

  /* ── the reward picture ─────────────────────────────────
     Five parts, one per 25 sparks. A new profile starts with an
     empty outline — the picture is a record of real work, so it
     cannot begin half finished. */
  var PARTS = ['sky', 'sea', 'lighthouse', 'lamp', 'stars'];
  var SPARKS_PER_PART = 25;

  S.paintScene = function () {
    var earned = S.clamp(Math.floor(S.P.sparks / SPARKS_PER_PART), 0, PARTS.length);
    var has = function (i) { return i < earned; };

    var cs = getComputedStyle(document.documentElement);
    var paper = cs.getPropertyValue('--surface').trim();
    var pencil = cs.getPropertyValue('--line').trim();

    /* filled when earned, dotted outline when not */
    function fill(i, colour) {
      return has(i)
        ? 'fill="' + colour + '"'
        : 'fill="none" stroke="' + pencil + '" stroke-width="1.2" stroke-dasharray="3 3"';
    }

    S.$('#sceneWrap').innerHTML =
      '<svg viewBox="0 0 320 170" role="img" aria-label="A lighthouse picture that colours in as you earn sparks">' +
        '<rect x="0" y="0" width="320" height="170" fill="' + paper + '"/>' +
        '<rect x="1" y="1" width="318" height="116" ' + fill(0, '#1E3059') + '/>' +
        (has(4)
          ? '<g fill="#FFE9A8"><circle cx="40" cy="30" r="2"/><circle cx="92" cy="18" r="1.6"/>' +
            '<circle cx="250" cy="26" r="2.2"/><circle cx="290" cy="46" r="1.5"/>' +
            '<circle cx="160" cy="22" r="1.4"/></g>'
          : '<g fill="none" stroke="' + pencil + '"><circle cx="40" cy="30" r="2.4"/>' +
            '<circle cx="250" cy="26" r="2.6"/><circle cx="160" cy="22" r="2"/></g>') +
        (has(3) ? '<path d="M196 76 L320 30 L320 120 Z" fill="#FFE9A8" opacity=".3"/>' : '') +
        '<rect x="1" y="118" width="318" height="51" ' + fill(1, '#2B6E8C') + '/>' +
        (has(1) ? '<path d="M0 126 q40 -7 80 0 t80 0 t80 0 t80 0 v8 H0z" fill="#3C87A6" opacity=".6"/>' : '') +
        '<path d="M170 124 L178 62 L206 62 L214 124 Z" ' + fill(2, '#F4EFE4') + '/>' +
        (has(2) ? '<path d="M174 100 L210 100 L212 112 L172 112 Z" fill="#D6246E" opacity=".85"/>' : '') +
        '<rect x="176" y="50" width="32" height="14" rx="3" ' + fill(3, '#5B4BD6') + '/>' +
        (has(3) ? '<circle cx="192" cy="57" r="5" fill="#FFD75E"/>' : '') +
      '</svg>';

    var within = earned >= PARTS.length ? SPARKS_PER_PART : (S.P.sparks % SPARKS_PER_PART);
    S.$('#sceneMeter').style.width = (within / SPARKS_PER_PART * 100) + '%';

    S.$('#scenePieces').innerHTML = PARTS.map(function (name, i) {
      return '<span class="piece' + (has(i) ? ' on' : '') + '">' +
        (has(i) ? '✓ ' : '') + name + '</span>';
    }).join('');
  };

  /* ── home ───────────────────────────────────────────── */
  S.paintHome = function () {
    S.$('#hiName').textContent = S.P.name ? 'Hello, ' + S.P.name : 'Hello';
    S.$('#sparkCount').textContent = S.P.sparks;
    S.paintAvatars();
    S.paintScene();
    paintObservation();
    paintToday();
  };

  /* One honest line about what Spark has actually noticed.
     Computed from the profile — never a stock encouragement. */
  function paintObservation() {
    var el = S.$('#noticed');
    var sessions = S.P.sessions;
    var top = S.Analysis.letterTroubles(1)[0];
    var fav = S.favourite();
    var labels = { picture: 'Pictures', sound: 'Hearing words out loud', parts: 'Breaking words into parts' };
    var familiesLeft = S.FAMILIES.filter(function (f) {
      return !f.stories.some(function (st) { return S.P.doneSteps[st.id] && S.P.doneSteps[st.id].read; });
    });

    var msg;
    if (!sessions.length && !S.P.writings.length) {
      msg = '<b>Let\'s start!</b> Read a story aloud and Spark will start spotting which letters are tricky.';
    } else if (top) {
      var f = S.familyOfPair(top.key);
      msg = '<b>' + S.esc(top.label) + '</b> is the one to watch — it came up ' + top.count +
            ' time' + (top.count > 1 ? 's' : '') + '.' +
            (f ? ' Try the <b>' + S.esc(f.title) + '</b> stories and writing.' : '');
    } else if (fav) {
      msg = '<b>' + labels[fav] + ' help you most</b> — Spark will offer that first.';
    } else if (familiesLeft.length) {
      msg = 'No letter mix-ups so far. <b>' + familiesLeft.length + ' letter famil' +
            (familiesLeft.length > 1 ? 'ies' : 'y') + '</b> still to try.';
    } else {
      msg = '<b>You\'ve tried every letter family!</b> Keep going to collect more medals.';
    }
    el.innerHTML = msg;
  }

  function paintToday() {
    var d = S.today();
    var readToday     = S.P.sessions.filter(function (s) { return s.date === d; }).length;
    var wroteToday    = S.P.writings.filter(function (w) { return w.date === d; }).length;
    var dictToday = Object.keys(S.P.dictationDone || {})
      .filter(function (k) { return S.P.dictationDone[k].date === d; }).length;

    function row(done, label, sub) {
      return '<div class="today-row" data-done="' + (done ? '1' : '') + '">' +
        '<span class="today-tick">' + (done ? '✓' : '·') + '</span>' +
        '<span class="today-text"><b>' + label + '</b><span>' + sub + '</span></span>' +
      '</div>';
    }

    S.$('#todayList').innerHTML =
      row(readToday > 0, 'Read a story',
          readToday ? readToday + ' done today' : 'Not yet today') +
      row(wroteToday > 0, 'Write a sentence',
          wroteToday ? wroteToday + ' written today' : 'Not yet today') +
      row(dictToday > 0, 'Listen and write',
          dictToday ? dictToday + ' done today' : 'Not yet today');
  }

  /** Any element marked data-pic gets its drawn illustration. */
  function paintDoorPictures() {
    S.$$('[data-pic]').forEach(function (el) {
      el.innerHTML = S.Pictures.drawn(el.dataset.pic, 38);
    });
  }

  /* Most of the interface is rebuilt as HTML strings, so icon
     placeholders appear after the fact. Watching the document means
     nothing has to remember to repaint them. */
  function watchForIcons() {
    S.Pictures.paintIcons();
    if (!window.MutationObserver) return;
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        S.Pictures.paintIcons();
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ── boot ───────────────────────────────────────────── */
  function boot() {
    S.applySettings();

    S.wireShell();
    S.wireReader();
    S.wireWrite();
    S.wireSettings();
    S.wireProgress();
    paintDoorPictures();
    watchForIcons();

    S.paintLibrary();
    S.paintHome();
    S.paintWrite();
    S.markFavouredTool();
    S.$('#sparkCount').textContent = S.P.sparks;

    /* open whichever section the address bar asks for */
    var hash = (location.hash || '').replace('#', '');
    if (['home', 'read', 'write', 'progress', 'profile'].indexOf(hash) > -1) S.go(hash);

    if (!S.P.name && !S.P.sessions.length) setTimeout(S.firstRun, 400);
    else if (!S.P.avatar) { S.P.avatar = 'owl'; S.save(); S.paintAvatars(); }
    S.checkMedals();

    /* the chart is drawn to pixel size, so it needs redrawing on resize */
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (!S.$('#v-progress').hidden) S.paintProgress();
      }, 180);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window.Spark);
