/* ============================================================
   profile.js — who is reading: avatar, first-run welcome,
   the profile page, and medals.

   Everything stays in this browser. "Profile" means the child's
   details and history on this device; there is no account.
   ============================================================ */

(function (S) {
  'use strict';

  var AVATARS = S.AVATARS;

  S.myAvatar = function (size) { return S.avatarSVG(S.P.avatar || 'owl', size); };

  /* Sparky — the guide who welcomes the child. A star with a face. */
  S.mascot = function (size, mood) {
    var px = size || 96;
    return '<svg class="mascot' + (mood ? ' ' + mood : '') + '" viewBox="0 0 100 100" width="' + px + '" height="' + px + '" aria-hidden="true">' +
      '<path d="M50 6 L61 36 L94 38 L68 58 L77 91 L50 72 L23 91 L32 58 L6 38 L39 36 Z" fill="#FFC93C" stroke="#E09200" stroke-width="3" stroke-linejoin="round"/>' +
      '<ellipse cx="40" cy="50" rx="4.5" ry="6" fill="#2B2118"/><ellipse cx="60" cy="50" rx="4.5" ry="6" fill="#2B2118"/>' +
      '<circle cx="41.5" cy="48" r="1.6" fill="#fff"/><circle cx="61.5" cy="48" r="1.6" fill="#fff"/>' +
      '<circle cx="33" cy="60" r="4" fill="#FF8FA3" opacity=".6"/><circle cx="67" cy="60" r="4" fill="#FF8FA3" opacity=".6"/>' +
      '<path d="M42 62 Q50 70 58 62" stroke="#2B2118" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '</svg>';
  };

  S.paintAvatars = function () {
    var top = S.$('#topAvatar'); if (top) top.innerHTML = S.myAvatar(34);
    var home = S.$('#homeAvatar'); if (home) home.innerHTML = S.myAvatar(72);
  };

  /* ══ first-run welcome ══════════════════════════════════
     Five short steps with Sparky, each one question. Every line
     Sparky says can be heard. Light theme from the very start. */
  S.firstRun = function () {
    S.P.settings.theme = 'light';
    S.applySettings();
    var data = { name: '', age: null, avatar: null, font: null };
    var step = 0;

    var STEPS = [
      { say: 'Hi! I\'m Sparky. I love reading with new friends. What\'s your name?',
        body: function () {
          return '<input class="inp onb-name" id="nameIn" placeholder="Type your name" maxlength="20" autocomplete="given-name">' +
                 '<p class="onb-privacy" style="margin-top:8px">Check it carefully. Your name stays the same.</p>';
        },
        ready: function () { return data.name.trim().length > 0; },
        save: function () { data.name = data.name.trim().slice(0, 20); } },
      { say: function () { return 'Nice to meet you, ' + data.name + '! How old are you?'; },
        body: function () {
          return '<div class="age-grid">' + [7, 8, 9, 10, 11, 12, 13, 14].map(function (n) {
            return '<button class="age-btn" data-age="' + n + '"' + (data.age === n ? ' data-on="1"' : '') + '>' + n + '</button>';
          }).join('') + '</div>';
        },
        ready: function () { return !!data.age; } },
      { say: 'Now make a picture of you! Pick your skin, hair and clothes. Or choose an animal.',
        body: function () { return '<div id="apHost"></div>'; },
        ready: function () { return !!data.avatar; } },
      { say: 'Which of these is easier for your eyes to read?',
        body: function () {
          return '<div class="font-try">' +
            '<button class="font-card" data-font="dyslexic"' + (data.font === 'dyslexic' ? ' data-on="1"' : '') + '>' +
              '<span class="font-demo fd-dys">The big dog dug a bed.</span><span class="font-name">This one</span></button>' +
            '<button class="font-card" data-font="plain"' + (data.font === 'plain' ? ' data-on="1"' : '') + '>' +
              '<span class="font-demo fd-plain">The big dog dug a bed.</span><span class="font-name">This one</span></button>' +
          '</div>';
        },
        ready: function () { return !!data.font; } },
      { say: function () { return 'You\'re all set, ' + data.name + '! Let\'s start with a story.'; },
        body: function () {
          return '<div class="onb-done">' + S.avatarSVG(data.avatar, 96) +
            '<p>Read stories, write sentences and collect sparks. Spark will spot which letters are tricky for you.</p></div>';
        },
        ready: function () { return true; } }
    ];

    function line() { var s = STEPS[step].say; return typeof s === 'function' ? s() : s; }

    /* A whole page of its own, not a pop-up over the home page: there is
       nothing behind it to click, and it cannot be closed. The only ways
       out are to finish, or to go back to the login page. */
    var page = document.getElementById('signup');
    if (!page) { page = document.createElement('div'); page.id = 'signup'; page.className = 'signup'; document.body.appendChild(page); }

    function paint() {
      var st = STEPS[step];
      page.innerHTML =
        '<div class="signup-top">' +
          '<span class="signup-brand">' + S.mascot(30) + ' Spark</span>' +
          '<a href="login.html?switch=1">&larr; Back to login</a>' +
        '</div>' +
        '<div class="signup-card onb">' +
          '<h1>' + (step === STEPS.length - 1 ? 'All done!' : 'Student sign-up') + '</h1>' +
          '<div class="onb-dots">' + STEPS.map(function (x, i) {
            return '<i data-on="' + (i <= step ? '1' : '') + '"></i>';
          }).join('') + '</div>' +
          '<div class="onb-head">' +
            '<span class="onb-mascot">' + S.mascot(84, step === STEPS.length - 1 ? 'happy' : 'bob') + '</span>' +
            '<div class="onb-bubble"><p>' + S.esc(line()) + '</p>' +
              '<button class="icon-sq onb-hear" id="onbHear" aria-label="Hear Sparky">' + S.Pictures.icon('speaker', 18) + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="onb-body">' + st.body() + '</div>' +
          '<div class="onb-foot">' +
            (step > 0 && step < STEPS.length - 1 ? '<button class="btn" id="onbBack">&larr; Back</button>' : '<span></span>') +
            '<button class="btn btn-primary btn-lg" id="onbNext"' + (st.ready() ? '' : ' disabled') + '>' +
              (step === STEPS.length - 1 ? "Let's go! " : 'Next ') + '→</button>' +
          '</div>' +
          (step === 0 ? '<p class="onb-privacy">Your teacher or parent can see how you are getting on.</p>' : '') +
        '</div>';
      wire();
      page.scrollTop = 0;
      if (step === STEPS.length - 1) S.confetti();
    }

    function refresh() { S.$('#onbNext').disabled = !STEPS[step].ready(); }

    function wire() {
      S.$('#onbHear').addEventListener('click', function () { S.say(line()); });
      var name = S.$('#nameIn');
      if (name) {
        name.value = data.name;
        name.addEventListener('input', function () { data.name = name.value; refresh(); });
        name.addEventListener('keydown', function (e) { if (e.key === 'Enter' && STEPS[0].ready()) next(); });
        setTimeout(function () { name.focus(); }, 120);
      }
      S.$$('[data-age]').forEach(function (b) {
        b.addEventListener('click', function () {
          data.age = +b.dataset.age;
          S.$$('[data-age]').forEach(function (x) { x.dataset.on = x === b ? '1' : ''; });
          refresh();
        });
      });
      var ap = S.$('#apHost');
      if (ap) S.avatarPicker(ap, data.avatar, function (code) { data.avatar = code; refresh(); });
      S.$$('button[data-font]').forEach(function (b) {
        b.addEventListener('click', function () {
          data.font = b.dataset.font;
          S.$$('button[data-font]').forEach(function (x) { x.dataset.on = x === b ? '1' : ''; });
          document.documentElement.setAttribute('data-font', data.font);
          refresh();
        });
      });
      var back = S.$('#onbBack');
      if (back) back.addEventListener('click', function () { step--; paint(); });
      S.$('#onbNext').addEventListener('click', next);
    }

    function next() {
      var st = STEPS[step];
      if (!st.ready()) return;
      if (st.save) st.save();
      if (step === STEPS.length - 1) return finish();
      step++;
      paint();
      S.say(line());
    }

    function finish() {
      S.P.name = data.name;
      S.P.age = data.age;
      S.P.avatar = data.avatar;
      S.P.settings.font = data.font;
      S.P.settings.theme = 'light';
      if (data.age && data.age <= 9) S.P.settings.size = 'large';
      S.P.started = S.today();
      S.save();
      /* the name and age just chosen ARE this student's profile: it is
         recorded for the teacher, and locked until "Start over" */
      S.DB.registerChild();
      S.applySettings();
      if (page.parentNode) page.parentNode.removeChild(page);
      S.paintAvatars();
      S.paintHome();
      S.paintWorlds();
      /* then show them where everything is */
      setTimeout(S.startTour, 500);
    }

    paint();
  };

  /* A little burst of colour for a finished welcome or a new medal. */
  S.confetti = function () {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var box = document.createElement('div');
    box.className = 'confetti';
    var colours = ['#FFC93C', '#5B4BD6', '#E0558B', '#23835C', '#4A90C2', '#F08A3C'];
    for (var i = 0; i < 40; i++) {
      var p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colours[i % colours.length];
      p.style.animationDelay = (Math.random() * 0.5) + 's';
      p.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 2600);
  };

  /* Medals are now the worlds' badges (worlds.js); this stays so
     older callers do nothing harmful. */
  S.checkMedals = function () {};

  /* ══ the profile page ═══════════════════════════════════
     Who I am, my badges, and what I've done — no scores. */
  S.paintProfile = function () {
    var P = S.P;
    var badges = S.WORLDS.filter(function (w) { return P.worlds && P.worlds[w.id] && P.worlds[w.id].badge; });
    var chapters = S.WORLDS.reduce(function (n, w) { return n + S.levelsDone(w.id); }, 0);
    var explored = S.worldsExplored();

    S.$('#profileMain').innerHTML =
      '<div class="prof-hero">' +
        '<span class="prof-avatar">' + S.myAvatar(104) + '</span>' +
        '<div class="prof-id">' +
          '<h1>' + S.esc(P.name || 'Reader') + '</h1>' +
          '<p>' + (P.age ? P.age + ' years old · ' : '') + 'exploring with Spark since ' +
            S.esc(S.niceDate(P.started) || 'today') + '</p>' +
          '<button class="btn btn-sm" id="profEdit">' + S.Pictures.icon('pencil', 16) + ' Change my details</button>' +
        '</div>' +
      '</div>' +

      '<div class="prof-stats">' +
        statTile('violet', 'spark', explored + ' / 6', 'worlds explored') +
        statTile('moss', 'book', chapters, 'chapters done') +
        statTile('rose', 'trophy', badges.length, 'badges') +
        statTile('amber', 'spark', P.streak, 'day streak') +
      '</div>' +

      '<section class="card prof-section">' +
        '<h2>My badges</h2>' +
        '<div class="badge-row">' + S.WORLDS.map(function (w) {
          return S.badgeTile(w, badges.indexOf(w) > -1);
        }).join('') + '</div>' +
      '</section>' +

      '<section class="card prof-section">' +
        '<h2>My adventures</h2>' +
        history() +
      '</section>';

    S.$('#profEdit').addEventListener('click', editDetails);
  };

  function statTile(colour, icon, n, label) {
    return '<div class="stat-tile tone-' + colour + '"><span class="st-ico">' + S.Pictures.icon(icon, 22) + '</span>' +
      '<b>' + n + '</b><span>' + label + '</span></div>';
  }

  /* What was done, newest first — the chapter and the part, never
     how well. */
  function history() {
    var rows = S.DB.rows('sessions').filter(function (s) { return s.completed; }).slice().reverse();
    if (!rows.length) {
      return '<div class="empty"><p>Nothing yet. Choose a world and start your first chapter!</p></div>';
    }
    return '<div class="hist">' + rows.slice(0, 40).map(function (s) {
      var w = S.world(s.world);
      var read = s.mode === 'read';
      var title = w ? w.title + ' · Chapter ' + s.level : (read ? 'Reading' : 'Writing practice');
      return '<div class="hist-row tone-' + (read ? 'violet' : 'rose') + '">' +
        '<span class="hist-ico">' + S.Pictures.icon(read ? 'book' : 'pencil', 18) + '</span>' +
        '<div class="hist-main"><b>' + S.esc(title) + '</b><span>' + (read ? 'Read it aloud' : 'Wrote it') + '</span></div>' +
        '<span class="hist-date">' + S.esc(S.niceDate(String(s.started_at).slice(0, 10))) + '</span>' +
      '</div>';
    }).join('') + '</div>';
  }

  function editDetails() {
    var pick = S.P.avatar || 'owl';
    S.sheet(
      '<h2>My details</h2>' +
      '<div class="locked-detail"><span>Name</span><b>' + S.esc(S.P.name || '') + '</b></div>' +
      '<div class="locked-detail"><span>Age</span><b>' + (S.P.age || '—') + '</b></div>' +
      '<p class="sub" style="margin:8px 0 14px">' + S.Pictures.icon('lock', 14) +
        ' Your name and age can\'t be changed. To start again as someone else, use <b>Start over</b> in the menu.</p>' +
      '<label class="set-label">My picture</label>' +
      '<div id="edPick"></div>' +
      '<div class="toolbar" style="margin:18px 0 0">' +
        '<button class="btn btn-primary" id="edSave" style="flex:1">Save</button>' +
        '<button class="btn" data-close>Cancel</button>' +
      '</div>',
      function () {
        S.avatarPicker(S.$('#edPick'), pick, function (code) { pick = code; });
        S.$('#edSave').addEventListener('click', function () {
          S.P.avatar = pick;
          S.save();
          S.closeSheet();
          S.paintAvatars();
          S.paintProfile();
        });
      }
    );
  }

})(window.Spark);
