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
    S.paintScene();
    paintObservation();
    paintToday();
  };

  /* One honest line about what Spark has actually noticed.
     Computed from the profile — never a stock encouragement. */
  function paintObservation() {
    var el = S.$('#noticed');
    var sessions = S.P.sessions;
    var fav = S.favourite();
    var waiting = S.trickyWords();
    var paced = sessions.filter(function (s) { return s.wpm; });

    var labels = {
      picture: 'Pictures', sound: 'Hearing words out loud', parts: 'Breaking words into parts'
    };

    var msg;
    if (!sessions.length) {
      msg = '<b>Let\'s start.</b> Read something aloud and I\'ll begin learning what helps you most.';
    } else if (fav && waiting.length) {
      msg = '<b>' + labels[fav] + ' help you most</b>, so I\'ll offer that first. ' +
            'You have ' + waiting.length + ' word' + (waiting.length > 1 ? 's' : '') +
            ' waiting in Homework.';
    } else if (fav) {
      msg = '<b>' + labels[fav] + ' help you most</b> — I\'ll offer that first from now on.';
    } else if (waiting.length) {
      msg = 'You paused on ' + waiting.length + ' word' + (waiting.length > 1 ? 's' : '') +
            ' last time. They\'re ready to practise in Homework.';
    } else if (paced.length) {
      msg = 'Your last reading was <b>' + paced[paced.length - 1].wpm +
            ' words a minute</b>. Keep going.';
    } else {
      msg = '<b>Nice start.</b> Next time, read aloud with the microphone ' +
            'and I\'ll track your speed too.';
    }
    el.innerHTML = msg;
  }

  function paintToday() {
    var d = S.today();
    var readToday     = S.P.sessions.filter(function (s) { return s.date === d; }).length;
    var wroteToday    = S.P.writings.filter(function (w) { return w.date === d; }).length;
    var practisedToday = Object.keys(S.P.practised)
      .filter(function (w) { return S.P.practised[w] === d; }).length;
    var waiting = S.trickyWords().length;

    function row(done, label, sub) {
      return '<div class="today-row" data-done="' + (done ? '1' : '') + '">' +
        '<span class="today-tick">' + (done ? '✓' : '·') + '</span>' +
        '<span class="today-text"><b>' + label + '</b><span>' + sub + '</span></span>' +
      '</div>';
    }

    S.$('#todayList').innerHTML =
      row(readToday > 0, 'Read something',
          readToday ? readToday + ' done today' : 'Not yet today') +
      row(wroteToday > 0, 'Write a sentence',
          wroteToday ? wroteToday + ' written today' : 'Not yet today') +
      row(practisedToday > 0, 'Practise a tricky word',
          practisedToday ? practisedToday + ' practised today'
                         : (waiting ? waiting + ' waiting for you' : 'Nothing waiting yet'));
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

  /* ── first run ──────────────────────────────────────── */
  /* ── setting up ─────────────────────────────────────────
     Two questions, and both are used. The name goes into what Spark
     says. The age sets which reading levels are offered first and is
     recorded alongside the letter check, because a mix-up that is
     ordinary at eight is worth a closer look at thirteen.

     Nothing is sent anywhere — there is no account and no server.
     "Account" here means a profile in this browser. */
  function firstRun() {
    S.sheet(
      '<div style="text-align:center;margin-bottom:8px">' +
        '<span class="i" data-icon="spark" data-icon-size="38"></span></div>' +
      '<h2 style="text-align:center">Hello, I\'m Spark</h2>' +
      '<p class="sub" style="text-align:center">I read with you and learn what ' +
      'helps you most. Three quick things first.</p>' +

      '<label class="set-label" for="nameIn">What should I call you?</label>' +
      '<input class="inp" id="nameIn" placeholder="your first name" maxlength="20" ' +
        'autocomplete="given-name" style="margin-bottom:16px">' +

      '<label class="set-label">How old are you?</label>' +
      '<div class="age-grid" id="ageGrid">' +
        [8, 9, 10, 11, 12, 13, 14, 15].map(function (n) {
          return '<button class="age-btn" data-age="' + n + '">' + n + '</button>';
        }).join('') +
      '</div>' +

      /* The font question, settled the only way it can honestly be
         settled: by the child reading the same line in both and
         saying which is easier. The research does not back one
         answer here (see README), so Spark does not pretend it does
         — it asks, and it remembers. */
      '<label class="set-label" style="margin-top:18px">Which is easier to read?</label>' +
      '<div class="font-try">' +
        '<button class="font-card" data-font="dyslexic">' +
          '<span class="font-demo fd-dys">The quick brown fox jumped over the lazy dog.</span>' +
          '<span class="font-name">This one</span>' +
        '</button>' +
        '<button class="font-card" data-font="plain">' +
          '<span class="font-demo fd-plain">The quick brown fox jumped over the lazy dog.</span>' +
          '<span class="font-name">This one</span>' +
        '</button>' +
      '</div>' +
      '<p class="sub" style="margin:7px 0 0">Either is fine. Pick the one your eyes like. ' +
      'You can swap any time in Settings.</p>' +

      '<button class="btn btn-primary btn-lg btn-block" id="nameGo" style="margin-top:18px">' +
        'Let\'s start</button>' +
      '<p class="sub" style="text-align:center;margin:13px 0 0">' +
      'Everything stays on this device. Nothing is sent anywhere.</p>',

      function () {
        var age = null;
        var font = null;

        S.$$('[data-age]').forEach(function (b) {
          b.addEventListener('click', function () {
            age = Number(b.dataset.age);
            S.$$('[data-age]').forEach(function (x) { x.dataset.on = x === b ? '1' : ''; });
          });
        });

        /* Picking a sample switches the whole sheet to that font at
           once, so the choice is made on the real thing rather than
           on two small swatches. */
        S.$$('[data-font]').forEach(function (b) {
          b.addEventListener('click', function () {
            font = b.dataset.font;
            S.$$('[data-font]').forEach(function (x) { x.dataset.on = x === b ? '1' : ''; });
            document.documentElement.setAttribute('data-font', font);
          });
        });

        function done() {
          S.P.name = S.$('#nameIn').value.trim().slice(0, 20);
          S.P.age = age;
          if (font) S.P.settings.font = font;
          S.P.started = S.today();
          /* a younger reader starts with the shorter passages */
          if (age && age <= 9) S.P.settings.size = 'large';
          S.save();
          S.applySettings();
          S.closeSheet();
          S.paintHome();
          if (S.paintLibrary) { S.paintLibrary(); S.paintScreening(); }
        }

        S.$('#nameGo').addEventListener('click', done);
        S.$('#nameIn').addEventListener('keydown', function (e) {
          if (e.key === 'Enter') done();
        });
        setTimeout(function () { S.$('#nameIn').focus(); }, 120);
      }
    );
  }

  /* ── boot ───────────────────────────────────────────── */
  function boot() {
    S.applySettings();

    S.wireShell();
    S.wireReader();
    S.wireWrite();
    S.wireHomework();
    S.wireChat();
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
    if (['home', 'read', 'write', 'homework', 'progress'].indexOf(hash) > -1) S.go(hash);

    if (!S.P.name && !S.P.sessions.length) setTimeout(firstRun, 400);

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
