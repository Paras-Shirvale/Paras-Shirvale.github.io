/* ============================================================
   app.js — the home page (choose your world) and boot.
   Loaded last, once every other module has registered itself.
   ============================================================ */

(function (S) {
  'use strict';

  /* ── home: hello, what to do next, and where everything is ── */
  S.paintHome = function () {
    var P = S.P;
    S.$('#hiName').textContent = P.name ? 'Hello, ' + P.name + '!' : 'Hello!';
    S.$('#streakCount').textContent = P.streak || 0;
    S.paintAvatars();
    S.$('#homeSparky').innerHTML = S.mascot(46, 'bob');

    var explored = S.worldsExplored();
    var playedToday = P.lastDay === S.today();
    S.$('#homeTip').textContent =
      !explored ? 'Pick any world to start your first adventure!'
      : explored < 6 ? 'You\'ve explored ' + explored + ' of 6 worlds. Where next?'
      : P.streak > 1 ? (playedToday ? 'A ' + P.streak + '-day streak — brilliant!' : 'Keep your ' + P.streak + '-day streak going today!')
      : 'Welcome back! Ready for a story?';

    /* the one thing to do next */
    var id = S.recommendedWorld();
    var w = id && S.world(id);
    if (w) {
      var n = S.nextLevel(id);
      var ls = ((P.worlds || {})[id] || { levels: {} }).levels[n] || {};
      S.$('#homeNext').innerHTML =
        '<button class="next-card tone-' + w.tone + '" id="homeGo">' +
          '<span class="next-art">' + S.worldArt(w) + '</span>' +
          '<span class="next-text"><small>' + (S.worldStarted(id) ? 'Carry on' : 'Next adventure') + '</small>' +
            '<b>' + S.esc(w.title) + '</b><span>Chapter ' + n + ': ' + S.esc(w.chapters[n - 1].title) +
            (ls.read && !ls.write ? ' · write it' : '') + '</span></span>' +
          '<span class="next-go btn btn-primary">' + (S.worldStarted(id) ? 'Continue' : 'Start') + ' →</span>' +
        '</button>';
      S.$('#homeGo').addEventListener('click', function () { S.playChapter(id, n); });
    } else {
      S.$('#homeNext').innerHTML = '<div class="next-card done"><span class="next-text"><b>You finished every world!</b>' +
        '<span>Play any chapter again from Let\'s read.</span></span></div>';
    }

    S.$('#homeExplore').innerHTML = S.WORLDS.map(function (x) {
      var on = S.worldStarted(x.id);
      return '<button class="explore-stop' + (on ? ' on' : '') + '" data-explore="' + x.id + '" title="' + S.esc(x.title) + '">' +
        '<span class="path-art">' + S.worldArt(x) + '</span>' +
        (on ? '<i>' + S.Pictures.icon('check', 13) + '</i>' : '') +
        '<small>' + S.esc(x.title) + '</small></button>';
    }).join('');
    S.$$('[data-explore]').forEach(function (b) {
      b.addEventListener('click', function () { S.openWorld(b.dataset.explore); });
    });

    paintToday();
  };

  function paintToday() {
    var d = S.today();
    var subs = S.DB.rows('submissions').filter(function (r) { return String(r.created_at).slice(0, 10) === d; });
    var read = subs.filter(function (r) { return r.mode === 'read'; }).length;
    var wrote = subs.filter(function (r) { return r.mode === 'write'; }).length;
    function row(on, label, sub) {
      return '<div class="today-row" data-done="' + (on ? '1' : '') + '">' +
        '<span class="today-tick">' + (on ? '✓' : '·') + '</span>' +
        '<span class="today-text"><b>' + label + '</b><span>' + sub + '</span></span></div>';
    }
    S.$('#todayList').innerHTML =
      row(read > 0, 'Read a chapter', read ? 'Done today!' : 'In Let\'s read') +
      row(wrote > 0, 'Write something', wrote ? 'Done today!' : 'In a chapter, or Let\'s write') +
      row(S.P.lastDay === d, 'Keep your streak', S.P.lastDay === d ? 'Streak safe for today' : 'Do one thing today');
  }

  function paintDoorPictures() {
    S.$$('[data-pic]').forEach(function (el) { el.innerHTML = S.Pictures.drawn(el.dataset.pic, 38); });
  }

  /* The reward picture is gone (no scores for the child), but older
     code may still ask to repaint it. */
  S.paintScene = function () {};

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
    S.wireWorlds();
    paintDoorPictures();
    watchForIcons();

    S.paintHome();
    S.paintWrite();
    S.markFavouredTool();

    /* open whichever section the address bar asks for */
    var hash = (location.hash || '').replace('#', '');
    if (['home', 'worlds', 'write', 'progress', 'profile'].indexOf(hash) > -1) S.go(hash);

    if (!S.P.name) setTimeout(S.firstRun, 400);
    else {
      if (!S.P.avatar) { S.P.avatar = 'owl'; S.save(); S.paintAvatars(); }
      S.DB.registerChild();     /* a profile made before registration existed */
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window.Spark);
