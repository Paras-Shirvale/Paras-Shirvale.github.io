/* ============================================================
   practice.js - "Try it out": learn the website by using it, safely.

   A student can read, write, ask for help, change colours and look at
   Progress, and none of it is kept. While practising:

     - S.P is swapped for a throw-away copy (same name, age, picture and
       settings, but no progress), so the real profile is never touched;
     - S.practiceMode is on, so S.save() does nothing and the database
       layer records, syncs and reports nothing (see db.js S.noRecord);
     - a banner says so, and a short checklist suggests what to try.

   Finishing reloads the page, which brings back the real profile exactly
   as it was and takes the student to the real Home page.
   ============================================================ */

(function (S) {
  'use strict';

  var timer = null, done = {}, panel = null, bar = null;

  /* What to try. Each task is ticked when the page shows it was done. */
  var TASKS = [
    { id: 'read', text: 'Open a story in Let\'s read', go: function () { S.go('worlds'); },
      check: function () { return !S.$('#v-read').hidden; } },
    { id: 'help', text: 'Stuck on a word? Type one and press Picture, Hear it, Say it or Split it',
      check: function () { var o = S.$('#railOut'); return !!o && !o.hidden && !!o.querySelector('.rail-word'); } },
    { id: 'hover', text: 'Point at a word in the story to see its picture',
      check: function () { var t = S.$('#hovertip'); return !!t && t.style.display === 'flex'; } },
    { id: 'describe', text: 'Describe a picture: tap a word, then tap its gap', go: function () { S.go('write'); },
      check: function () { return S.$$('.gap.filled').length > 0; } },
    { id: 'story', text: 'Picture story: answer the questions and press Save it',
      check: function () { return S.$$('[data-verdict]').some(function (v) { return !v.hidden; }); } },
    { id: 'progress', text: 'Look at your Progress', go: function () { S.go('progress'); },
      check: function () { return !S.$('#v-progress').hidden; } },
    { id: 'theme', text: 'Try Light, Dark or Auto colours in the menu',
      check: function () { return !!done.__theme; } }
  ];

  function paintPanel() {
    var left = TASKS.filter(function (t) { return !done[t.id]; }).length;
    panel.innerHTML =
      '<b class="pr-title">Try it out</b>' +
      '<p class="pr-sub">' + (left ? 'Try each of these. Nothing here counts.' : 'You have tried everything. Well done!') + '</p>' +
      '<ul class="pr-list">' + TASKS.map(function (t) {
        return '<li class="' + (done[t.id] ? 'done' : '') + '"><span class="pr-tick">' + (done[t.id] ? '&#10003;' : '') + '</span>' +
          '<span class="pr-text">' + S.esc(t.text) + '</span>' +
          (!done[t.id] && t.go ? '<button class="btn btn-sm" data-pr-go="' + t.id + '">Take me there</button>' : '') + '</li>';
      }).join('') + '</ul>' +
      '<button class="btn btn-primary btn-block" id="prFinish">' + (left ? 'Finish and go to my real page' : 'Go to my real page') + '</button>';
  }

  function poll() {
    var changed = false;
    TASKS.forEach(function (t) {
      if (!done[t.id]) {
        try { if (t.check()) { done[t.id] = true; changed = true; } } catch (e) {}
      }
    });
    if (changed) paintPanel();
  }

  /* ── the sandbox ──────────────────────────────────────
     A throw-away profile, and nothing recorded. Used by "Try it out" and by
     the tour (which opens stories and writing pages to show how they work). */
  var realProfile = null, dbSnap = null;

  S.sandboxEnter = function () {
    if (S.practiceMode || S.teacherMode) return false;
    try { if (S.stopReading) S.stopReading(); S.stopSaying(); } catch (e) {}
    /* a throw-away profile: who they are, but none of their progress */
    var real = S.P, fresh = S.blankProfile();
    fresh.name = real.name; fresh.age = real.age; fresh.avatar = real.avatar;
    fresh.registered = true; fresh.tourDone = real.tourDone;
    fresh.settings = JSON.parse(JSON.stringify(real.settings));
    realProfile = real;
    dbSnap = S.DB.snapshot();
    S.practiceMode = true;
    S.P = fresh;
    return true;
  };

  /* Back to the real profile, exactly as it was. opts.reload === false puts
     everything back in place without reloading (used by the tour); otherwise
     the page is reloaded so nothing from the sandbox is left anywhere. */
  S.sandboxLeave = function (opts) {
    opts = opts || {};
    if (!realProfile) return;
    S.P = realProfile; realProfile = null;
    S.practiceMode = false;
    if (dbSnap) S.DB.restore(dbSnap);
    dbSnap = null;
    if (opts.tourDone) S.P.tourDone = S.today();
    S.save();
    if (opts.reload === false) {
      S.go('home');
      if (S.paintHome) S.paintHome();
      if (S.paintWorlds) S.paintWorlds();
      if (S.paintAvatars) S.paintAvatars();
      return;
    }
    location.href = location.pathname + '#home';
    location.reload();
  };

  S.startPractice = function () {
    if (S.practiceMode || S.teacherMode) return;
    if (!S.sandboxEnter()) return;
    done = {};

    document.body.classList.add('practice-mode');
    bar = document.createElement('div');
    bar.className = 'practice-bar';
    bar.innerHTML = 'Trying it out: nothing you do here counts. <button class="btn btn-sm" id="prBarFinish">Finish</button>';
    document.body.insertBefore(bar, document.body.firstChild);
    panel = document.createElement('aside');
    panel.className = 'practice-panel';
    panel.setAttribute('aria-label', 'Things to try');
    document.body.appendChild(panel);
    paintPanel();

    panel.addEventListener('click', function (e) {
      var go = e.target.closest('[data-pr-go]');
      if (go) { var t = TASKS.filter(function (x) { return x.id === go.dataset.prGo; })[0]; if (t && t.go) t.go(); return; }
      if (e.target.closest('#prFinish')) S.endPractice();
    });
    bar.querySelector('#prBarFinish').addEventListener('click', S.endPractice);
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-theme-quick]')) done.__theme = true; }, true);
    timer = setInterval(poll, 400);

    S.closeSheet && S.closeSheet();
    S.paintHome && S.paintHome();
    S.paintWorlds && S.paintWorlds();
    S.paintAvatars && S.paintAvatars();
    S.go('home');
  };

  /* Reloading is the cleanest way back: the real profile was never touched. */
  S.endPractice = function () {
    clearInterval(timer);
    location.href = location.pathname + '#home';
    location.reload();
  };

})(window.Spark);
