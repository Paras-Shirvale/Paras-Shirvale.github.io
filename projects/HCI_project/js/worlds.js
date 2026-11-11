/* ============================================================
   worlds.js — choosing a world, its chapters, and unlocking.

   A chapter has two parts: read it aloud, then write three of its
   sentences. When both are done the chapter's pip fills in. Three
   chapters finish the world and earn its badge.

   Every world is open, and the child picks any. The one goal is to
   EXPLORE EVERY WORLD — at least one chapter in each — because
   each world tests a different letter pair, and only all six
   together show which letters this child confuses. "Next
   adventure" points at a world not tried yet; once all six are
   explored, it points at the one the child most needs. The child
   is never told why: they see an adventure, not a letter pair.
   ============================================================ */

(function (S) {
  'use strict';

  function state(id) {
    S.P.worlds = S.P.worlds || {};
    return S.P.worlds[id] || (S.P.worlds[id] = { levels: {} });
  }

  function levelState(id, n) {
    var st = state(id);
    return st.levels[n] || (st.levels[n] = {});
  }

  S.levelsDone = function (id) {
    var st = state(id);
    return [1, 2, 3].filter(function (n) { return st.levels[n] && st.levels[n].read && st.levels[n].write; }).length;
  };

  function started(id) {
    var st = state(id);
    return Object.keys(st.levels).some(function (n) { return st.levels[n].read || st.levels[n].write; });
  }

  S.worldStarted = started;

  /** The first chapter of a world that is not finished yet. */
  S.nextLevel = function (id) {
    var st = state(id);
    for (var n = 1; n <= 3; n++) { var l = st.levels[n]; if (!(l && l.read && l.write)) return n; }
    return 1;
  };
  S.worldsExplored = function () { return S.WORLDS.filter(function (w) { return started(w.id); }).length; };

  /** Where to go next: an unexplored world first, then the one most needed. */
  S.recommendedWorld = function () {
    var fresh = S.WORLDS.filter(function (w) { return !started(w.id); })[0];
    if (fresh) return fresh.id;
    var profile = S.DB ? S.DB.computeProfile() : [];
    var need = profile.filter(function (p) { return p.total_errors > 0 && p.trend !== 'improving'; })
      .sort(function (a, b) { return b.total_errors - a.total_errors; });
    for (var i = 0; i < need.length; i++) {
      var w = S.world(need[i].confusion_class);
      if (w && S.levelsDone(w.id) < 3) return w.id;
    }
    var next = S.WORLDS.filter(function (w) { return S.isUnlocked(w) && S.levelsDone(w.id) < 3; })[0];
    return next ? next.id : null;
  };

  var recCache = null;
  /* every world is always open */
  S.isUnlocked = function () { return true; };

  /** What the world's button says. */
  function action(w) {
    var done = S.levelsDone(w.id);
    if (done >= 3) return 'Play again';
    var next = done + 1, ls = state(w.id).levels[next] || {};
    if (ls.read && !ls.write) return 'Continue';
    if (done === 0) return started(w.id) ? 'Continue' : 'Begin';
    if (done === 2) return 'Final chapter';
    return 'Start ch. ' + next;
  }

  function pips(w) {
    var st = state(w.id);
    return '<span class="pips">' + [1, 2, 3].map(function (n) {
      var l = st.levels[n] || {};
      var s = l.read && l.write ? 'done' : (l.read || l.write) ? 'half' : '';
      return '<i data-s="' + s + '"></i>';
    }).join('') + '</span>';
  }

  /* ── the world grid (home) ──────────────────────────── */
  S.paintWorlds = function () {
    var host = S.$('#worldGrid');
    if (!host) return;
    recCache = null;
    recCache = S.recommendedWorld();

    var explored = S.worldsExplored();
    var goal = S.$('#exploreGoal');
    if (goal) {
      goal.innerHTML = '<div class="goal-text"><b>' + (explored >= 6 ? 'You\'ve explored every world!' : 'Explore every world') +
        '</b><span>' + explored + ' of 6 visited</span></div>' +
        '<div class="goal-dots">' + S.WORLDS.map(function (w) {
          return '<i class="tone-' + w.tone + (started(w.id) ? ' on' : '') + '" title="' + S.esc(w.title) + '">' +
            (started(w.id) ? S.Pictures.icon('check', 14) : '') + '</i>';
        }).join('') + '</div>';
    }

    host.innerHTML = S.WORLDS.map(function (w) {
      var open = true;
      var done = S.levelsDone(w.id);
      return '<article class="world-card tone-' + w.tone + (open ? '' : ' locked') + '" data-world="' + w.id + '">' +
        '<div class="world-banner">' + S.worldArt(w, !open) +
          '<span class="world-genre">' + S.esc(w.genre) + '</span>' +
          (recCache === w.id && done < 3 ? '<span class="world-next">Next adventure</span>'
            : !started(w.id) ? '<span class="world-new">New</span>' : '') +
          (done >= 3 ? '<span class="world-badge-mini" title="' + S.esc(w.badge) + '">' + S.Pictures.icon('trophy', 16) + '</span>' : '') +
          (!open ? '<span class="world-lock">' + S.Pictures.icon('lock', 26) + '</span>' : '') +
        '</div>' +
        '<div class="world-body">' +
          '<h3>' + S.esc(w.title) + '</h3>' +
          '<p>' + (open ? S.esc(w.blurb) : 'Finish a chapter of ' + S.esc(S.WORLDS[w.index - 1].title) + ' to unlock.') + '</p>' +
        '</div>' +
        '<div class="world-foot">' + pips(w) +
          (open ? '<button class="btn world-go" data-open-world="' + w.id + '">' + action(w) + '</button>'
                : '<span class="world-locked-label">Locked</span>') +
        '</div>' +
      '</article>';
    }).join('');
  };

  /* ── one world: its chapters ────────────────────────── */
  S.openWorld = function (id) {
    var w = S.world(id);
    if (!w || !S.isUnlocked(w)) return;
    S.currentWorld = id;
    S.go('world');
  };

  S.paintWorld = function () {
    var w = S.world(S.currentWorld);
    if (!w) { S.go('worlds'); return; }
    var st = state(w.id);
    var done = S.levelsDone(w.id);

    S.$('#worldMain').innerHTML =
      '<button class="btn btn-sm" data-go="worlds">&larr; All worlds</button>' +
      '<div class="world-hero tone-' + w.tone + '">' + S.worldArt(w) +
        '<div class="world-hero-text"><span class="world-genre">' + S.esc(w.genre) + '</span>' +
        '<h1>' + S.esc(w.title) + '</h1><p>' + S.esc(w.blurb) + '</p></div>' +
      '</div>' +
      (st.badge ? '<div class="badge-banner">' + badgeHTML(w, true) +
        '<div><b>' + S.esc(w.badge) + '</b><span>You finished this world!</span></div></div>' : '') +
      '<div class="chapters">' + w.chapters.map(function (c, i) {
        var n = i + 1, l = st.levels[n] || {};
        var openCh = n === 1 || (st.levels[n - 1] && st.levels[n - 1].read && st.levels[n - 1].write);
        var complete = l.read && l.write;
        return '<div class="chapter' + (openCh ? '' : ' locked') + (complete ? ' done' : '') + '">' +
          '<span class="ch-num">' + (complete ? S.Pictures.icon('check', 20) : n) + '</span>' +
          '<div class="ch-main"><small>Chapter ' + n + '</small><b>' + S.esc(c.title) + '</b>' +
            '<div class="ch-steps">' +
              '<span data-on="' + (l.read ? '1' : '') + '">' + S.Pictures.icon('book', 14) + ' Read</span>' +
              '<span data-on="' + (l.write ? '1' : '') + '">' + S.Pictures.icon('pencil', 14) + ' Write</span>' +
            '</div></div>' +
          (openCh ? '<button class="btn ' + (complete ? '' : 'btn-primary') + '" data-play="' + n + '">' +
                    (complete ? 'Play again' : l.read ? 'Write it' : 'Play') + '</button>'
                  : '<span class="world-locked-label">' + S.Pictures.icon('lock', 16) + '</span>') +
        '</div>';
      }).join('') + '</div>' +
      '<p class="world-progress-note">' + done + ' of 3 chapters complete</p>';

    S.$$('[data-play]').forEach(function (b) {
      b.addEventListener('click', function () { S.playChapter(w.id, +b.dataset.play); });
    });
  };

  function badgeHTML(w, on) {
    return '<span class="wbadge tone-' + w.tone + (on ? ' on' : '') + '">' +
      '<span class="wbadge-disc">' + S.Pictures.icon(on ? 'trophy' : 'lock', 22) + '</span></span>';
  }
  S.worldBadge = badgeHTML;

  /* ── playing a chapter: read, then write ────────────── */
  S.playChapter = function (id, n) {
    var w = S.world(id), c = w && w.chapters[n - 1];
    if (!c) return;
    var l = levelState(id, n);
    S.currentWorld = id;
    if (l.read && !l.write) { startWrite(w, n); return; }
    S.go('read');
    S.openPassage({ id: c.id, title: c.title, text: c.text, world: id, level: n, family: id,
                    pairs: w.pairs, screening: true, about: w.title + ' · Chapter ' + n });
  };

  function startWrite(w, n) {
    S.go('write');
    S.openDictation(w.id, { level: n });
  }

  /** Called by the reader and the writing exercise when a part ends. */
  S.chapterPartDone = function (id, n, part) {
    var l = levelState(id, n);
    var already = l[part];
    l[part] = l[part] || S.today();
    S.bumpStreak();
    var st = state(id);
    var earned = false;
    if (S.levelsDone(id) >= 3 && !st.badge) { st.badge = S.today(); earned = true; }
    S.save();
    if (earned) setTimeout(function () { celebrateBadge(S.world(id)); }, 600);
    return { first: !already, badge: earned };
  };

  S.nextChapterStep = function (id, n) {
    var w = S.world(id);
    var l = levelState(id, n);
    if (l.read && !l.write) { startWrite(w, n); return; }
    S.openWorld(id);
  };

  function celebrateBadge(w) {
    var el = document.createElement('div');
    el.className = 'medal-pop';
    el.innerHTML = badgeHTML(w, true) + '<div><b>New badge!</b><span>' + S.esc(w.badge) + '</span></div>';
    document.body.appendChild(el);
    S.confetti();
    S.say('You earned a new badge: ' + w.badge + '!');
    setTimeout(function () { el.classList.add('out'); }, 3400);
    setTimeout(function () { el.remove(); }, 3900);
  }

  /* ── wiring ─────────────────────────────────────────── */
  S.wireWorlds = function () {
    S.$('#worldGrid').addEventListener('click', function (e) {
      var b = e.target.closest('[data-open-world]');
      var card = e.target.closest('.world-card');
      if (b) { S.openWorld(b.dataset.openWorld); return; }
      if (card && !card.classList.contains('locked')) S.openWorld(card.dataset.world);
    });
  };

})(window.Spark);
