/* ============================================================
   app.js — the home page (choose your world) and boot.
   Loaded last, once every other module has registered itself.
   ============================================================ */

(function (S) {
  'use strict';

  /* ── home: hello, and the worlds ────────────────────── */
  S.paintHome = function () {
    S.$('#hiName').textContent = S.P.name ? 'Hello, ' + S.P.name + '!' : 'Hello!';
    S.$('#streakCount').textContent = S.P.streak || 0;
    S.paintAvatars();
    S.paintWorlds();
  };

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
    watchForIcons();

    S.paintHome();
    S.paintWrite();
    S.markFavouredTool();

    /* open whichever section the address bar asks for */
    var hash = (location.hash || '').replace('#', '');
    if (['home', 'write', 'progress', 'profile'].indexOf(hash) > -1) S.go(hash);

    if (!S.P.name && !S.P.sessions.length) setTimeout(S.firstRun, 400);
    else if (!S.P.avatar) { S.P.avatar = 'owl'; S.save(); S.paintAvatars(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window.Spark);
