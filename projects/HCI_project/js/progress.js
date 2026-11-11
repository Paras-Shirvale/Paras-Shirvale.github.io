/* ============================================================
   progress.js — "Me": what the child sees about their progress.

   Six things, all about effort and journey:
     worlds unlocked · chapters completed · streak
     badges earned · words read this week · sentences written

   Never shown here, by design: which letters are the target,
   error counts, wrong marks, accuracy percentages, which help rung
   was needed, pause lengths or reading speed. All of that is in
   the database and on the grown-ups' dashboard (teacher.html).
   ============================================================ */

(function (S) {
  'use strict';

  S.wireProgress = function () {};
  S.closeReview = function () {};

  function wordsThisWeek() {
    var since = Date.now() - 7 * 864e5;
    return S.DB.rows('submissions').filter(function (r) {
      return r.mode === 'read' && Date.parse(r.created_at) >= since;
    }).reduce(function (n, r) { return n + (r.word_count || 0); }, 0);
  }

  function sentencesWritten() {
    return S.DB.rows('submissions').filter(function (r) { return r.mode === 'write'; }).length;
  }

  S.paintProgress = function () {
    var P = S.P;
    var unlocked = S.WORLDS.filter(function (w) { return S.worldStarted(w.id); });
    var badges = S.WORLDS.filter(function (w) { return P.worlds && P.worlds[w.id] && P.worlds[w.id].badge; });
    var sentences = sentencesWritten();
    var week = wordsThisWeek();

    S.$('#progMain').innerHTML =
      '<div class="me-head">' +
        '<span class="prog-avatar">' + S.myAvatar(76) + '</span>' +
        '<div><h1>' + (P.name ? S.esc(P.name) + '\'s journey' : 'My journey') + '</h1>' +
        '<p class="lede" style="margin:0">Every chapter takes you further.</p></div>' +
      '</div>' +

      '<div class="me-grid">' +
        /* worlds unlocked: the path */
        '<section class="me-card me-wide tone-violet">' +
          '<h2>Worlds explored</h2>' +
          '<div class="world-path">' + S.WORLDS.map(function (w, i) {
            var open = S.worldStarted(w.id);
            return (i ? '<span class="path-line' + (open ? ' on' : '') + '"></span>' : '') +
              '<button class="path-stop' + (open ? ' on' : '') + '" data-path="' + w.id + '" title="' + S.esc(w.title) + '">' +
                '<span class="path-art">' + S.worldArt(w) + '</span>' +
                '<small>' + S.esc(w.title) + (open ? ' ✓' : '') + '</small>' +
              '</button>';
          }).join('') + '</div>' +
          '<p class="me-note">' + unlocked.length + ' of ' + S.WORLDS.length + ' worlds explored</p>' +
        '</section>' +

        /* chapters completed */
        '<section class="me-card tone-moss">' +
          '<h2>Chapters completed</h2>' +
          '<div class="me-levels">' + (unlocked.length ? '' : '<p class="me-note">Start a world to see your chapters here.</p>') + unlocked.map(function (w) {
            var st = (P.worlds || {})[w.id] || { levels: {} };
            return '<div class="me-level"><span>' + S.esc(w.title) + '</span><span class="pips">' +
              [1, 2, 3].map(function (n) {
                var l = st.levels[n] || {};
                return '<i data-s="' + (l.read && l.write ? 'done' : (l.read || l.write) ? 'half' : '') + '"></i>';
              }).join('') + '</span></div>';
          }).join('') + '</div>' +
        '</section>' +

        /* streak */
        '<section class="me-card tone-amber me-streak">' +
          '<h2>Streak</h2>' +
          '<div class="streak-big"><span class="flame big" aria-hidden="true"></span><b>' + P.streak + '</b></div>' +
          '<p class="me-note">' + (P.streak === 1 ? 'day' : 'days') + ' in a row</p>' +
        '</section>' +

        /* badges */
        '<section class="me-card me-wide tone-rose">' +
          '<h2>Badges earned</h2>' +
          '<div class="badge-row">' + S.WORLDS.map(function (w) {
            var got = badges.indexOf(w) > -1;
            return '<div class="badge-item' + (got ? ' on' : '') + '">' + S.worldBadge(w, got) +
              '<b>' + (got ? S.esc(w.badge) : '???') + '</b></div>';
          }).join('') + '</div>' +
        '</section>' +

        /* words read */
        '<section class="me-card tone-violet">' +
          '<h2>Words read this week</h2>' +
          '<div class="me-number">' + week + '</div>' +
          '<p class="me-note">and counting!</p>' +
        '</section>' +

        /* sentences written */
        '<section class="me-card tone-moss">' +
          '<h2>Sentences written</h2>' +
          '<div class="me-number">' + sentences + '</div>' +
          '<div class="trophy-tiles">' + new Array(Math.min(sentences, 30) + 1).join('x').split('').map(function () {
            return '<i>' + S.Pictures.icon('trophy', 13) + '</i>';
          }).join('') + '</div>' +
        '</section>' +
      '</div>';

    S.$$('[data-path]').forEach(function (b) {
      b.addEventListener('click', function () { S.openWorld(b.dataset.path); });
    });
  };

})(window.Spark);
