/* ============================================================
   profile.js — who is reading: avatar, first-run welcome,
   the profile page, and medals.

   Everything stays in this browser. "Profile" means the child's
   details and history on this device; there is no account.
   ============================================================ */

(function (S) {
  'use strict';

  /* ── avatars: friendly animal faces, drawn here ─────── */
  var AVATARS = {
    fox:   { name: 'Fox', bg: '#FFE3CC', svg:
      '<path d="M14 18 L22 6 L28 22 Z M50 18 L42 6 L36 22 Z" fill="#E8742A"/>' +
      '<path d="M17 17 L22 10 L25 20 Z M47 17 L42 10 L39 20 Z" fill="#3A2416"/>' +
      '<path d="M12 26 Q32 6 52 26 Q54 44 32 54 Q10 44 12 26Z" fill="#F08A3C"/>' +
      '<path d="M16 34 Q24 40 32 52 Q40 40 48 34 Q44 50 32 55 Q20 50 16 34Z" fill="#FFF6EC"/>' +
      '<circle cx="24" cy="31" r="3" fill="#2B2118"/><circle cx="40" cy="31" r="3" fill="#2B2118"/>' +
      '<circle cx="25" cy="30" r="1" fill="#fff"/><circle cx="41" cy="30" r="1" fill="#fff"/>' +
      '<ellipse cx="32" cy="42" rx="3.2" ry="2.4" fill="#2B2118"/>' },
    owl:   { name: 'Owl', bg: '#E6E1FF', svg:
      '<path d="M14 14 L22 20 L16 24Z M50 14 L42 20 L48 24Z" fill="#6E5BC7"/>' +
      '<ellipse cx="32" cy="36" rx="20" ry="20" fill="#8A78E0"/>' +
      '<ellipse cx="32" cy="44" rx="12" ry="10" fill="#D9D2FF"/>' +
      '<circle cx="24" cy="30" r="8" fill="#fff"/><circle cx="40" cy="30" r="8" fill="#fff"/>' +
      '<circle cx="24" cy="30" r="4" fill="#2B2118"/><circle cx="40" cy="30" r="4" fill="#2B2118"/>' +
      '<circle cx="25.5" cy="28.5" r="1.3" fill="#fff"/><circle cx="41.5" cy="28.5" r="1.3" fill="#fff"/>' +
      '<path d="M29 37 L35 37 L32 42Z" fill="#F5B731"/>' },
    bear:  { name: 'Bear', bg: '#F3E2CF', svg:
      '<circle cx="16" cy="16" r="8" fill="#9C6B43"/><circle cx="48" cy="16" r="8" fill="#9C6B43"/>' +
      '<circle cx="16" cy="16" r="4" fill="#E2B88F"/><circle cx="48" cy="16" r="4" fill="#E2B88F"/>' +
      '<circle cx="32" cy="34" r="21" fill="#B07A4A"/>' +
      '<ellipse cx="32" cy="42" rx="10" ry="8" fill="#E8C9A5"/>' +
      '<circle cx="24" cy="30" r="3" fill="#2B2118"/><circle cx="40" cy="30" r="3" fill="#2B2118"/>' +
      '<circle cx="25" cy="29" r="1" fill="#fff"/><circle cx="41" cy="29" r="1" fill="#fff"/>' +
      '<ellipse cx="32" cy="39" rx="3.5" ry="2.6" fill="#2B2118"/>' +
      '<path d="M28 45 Q32 48 36 45" stroke="#2B2118" stroke-width="1.6" fill="none" stroke-linecap="round"/>' },
    bunny: { name: 'Bunny', bg: '#FFE4EE', svg:
      '<ellipse cx="24" cy="14" rx="6" ry="14" fill="#F4F0F2"/><ellipse cx="40" cy="14" rx="6" ry="14" fill="#F4F0F2"/>' +
      '<ellipse cx="24" cy="15" rx="3" ry="10" fill="#F7A8C4"/><ellipse cx="40" cy="15" rx="3" ry="10" fill="#F7A8C4"/>' +
      '<circle cx="32" cy="38" r="19" fill="#FBF8F9"/>' +
      '<circle cx="25" cy="35" r="3" fill="#2B2118"/><circle cx="39" cy="35" r="3" fill="#2B2118"/>' +
      '<circle cx="26" cy="34" r="1" fill="#fff"/><circle cx="40" cy="34" r="1" fill="#fff"/>' +
      '<circle cx="20" cy="42" r="3" fill="#F7A8C4" opacity=".7"/><circle cx="44" cy="42" r="3" fill="#F7A8C4" opacity=".7"/>' +
      '<path d="M30 41 L34 41 L32 43.5Z" fill="#E0558B"/>' +
      '<path d="M29 46 Q32 48 35 46" stroke="#2B2118" stroke-width="1.5" fill="none" stroke-linecap="round"/>' },
    cat:   { name: 'Cat', bg: '#FFF0C9', svg:
      '<path d="M13 30 L14 8 L28 18Z M51 30 L50 8 L36 18Z" fill="#F5B731"/>' +
      '<path d="M17 24 L17 13 L25 18Z M47 24 L47 13 L39 18Z" fill="#F7A8C4"/>' +
      '<circle cx="32" cy="36" r="20" fill="#F7C44E"/>' +
      '<path d="M22 22 L24 28 M32 18 L32 25 M42 22 L40 28" stroke="#D99A1E" stroke-width="2.5" stroke-linecap="round"/>' +
      '<ellipse cx="25" cy="35" rx="3" ry="3.6" fill="#2B2118"/><ellipse cx="39" cy="35" rx="3" ry="3.6" fill="#2B2118"/>' +
      '<circle cx="26" cy="34" r="1" fill="#fff"/><circle cx="40" cy="34" r="1" fill="#fff"/>' +
      '<path d="M30 42 L34 42 L32 44.5Z" fill="#E0558B"/>' +
      '<path d="M14 42 L24 43 M14 46 L24 45 M50 42 L40 43 M50 46 L40 45" stroke="#8B6A2E" stroke-width="1.2"/>' },
    panda: { name: 'Panda', bg: '#DDF3E8', svg:
      '<circle cx="16" cy="17" r="8" fill="#2B2118"/><circle cx="48" cy="17" r="8" fill="#2B2118"/>' +
      '<circle cx="32" cy="35" r="21" fill="#FBFBF8"/>' +
      '<ellipse cx="24" cy="33" rx="6" ry="7.5" fill="#2B2118" transform="rotate(-20 24 33)"/>' +
      '<ellipse cx="40" cy="33" rx="6" ry="7.5" fill="#2B2118" transform="rotate(20 40 33)"/>' +
      '<circle cx="25" cy="32" r="2.2" fill="#fff"/><circle cx="39" cy="32" r="2.2" fill="#fff"/>' +
      '<ellipse cx="32" cy="42" rx="3.4" ry="2.4" fill="#2B2118"/>' +
      '<path d="M28 46 Q32 49 36 46" stroke="#2B2118" stroke-width="1.6" fill="none" stroke-linecap="round"/>' }
  };
  S.AVATARS = AVATARS;

  S.avatarSVG = function (key, size) {
    var a = AVATARS[key] || AVATARS.owl;
    var px = size || 48;
    return '<svg class="avatar" viewBox="0 0 64 64" width="' + px + '" height="' + px + '" role="img" aria-label="' +
           a.name + '"><circle cx="32" cy="32" r="32" fill="' + a.bg + '"/>' + a.svg + '</svg>';
  };
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
          return '<input class="inp onb-name" id="nameIn" placeholder="Type your name" maxlength="20" autocomplete="given-name">';
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
      { say: 'Pick a buddy to be your picture!',
        body: function () {
          return '<div class="avatar-grid">' + Object.keys(AVATARS).map(function (k) {
            return '<button class="avatar-pick" data-avatar="' + k + '"' + (data.avatar === k ? ' data-on="1"' : '') + '>' +
              S.avatarSVG(k, 64) + '<span>' + AVATARS[k].name + '</span></button>';
          }).join('') + '</div>';
        },
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

    function paint() {
      var st = STEPS[step];
      S.sheet(
        '<div class="onb">' +
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
              (step === STEPS.length - 1 ? 'Let\'s go! ' : 'Next ') + '→</button>' +
          '</div>' +
          (step === 0 ? '<p class="onb-privacy">Everything stays on this device.</p>' : '') +
        '</div>',
        wire
      );
      S.$('#sheet').classList.add('sheet-onb');
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
      S.$$('[data-avatar]').forEach(function (b) {
        b.addEventListener('click', function () {
          data.avatar = b.dataset.avatar;
          S.$$('[data-avatar]').forEach(function (x) { x.dataset.on = x === b ? '1' : ''; });
          refresh();
        });
      });
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
      S.applySettings();
      S.$('#sheet').classList.remove('sheet-onb');
      S.closeSheet();
      S.paintAvatars();
      S.paintHome();
      if (S.paintLibrary) S.paintLibrary();
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

  /* ══ medals ═════════════════════════════════════════════ */
  function stats() {
    var P = S.P;
    var famRead = S.FAMILIES.filter(function (f) {
      return f.stories.some(function (st) { return P.doneSteps[st.id] && P.doneSteps[st.id].read; });
    }).length;
    var dictSets = Object.keys(P.dictationDone || {}).length;
    return {
      reads: P.sessions.length, writes: P.writings.length, famRead: famRead,
      dict: dictSets, streak: P.streak, sparks: P.sparks, voice: !!P.voicePrint
    };
  }

  var MEDALS = [
    { id: 'read-1',    title: 'First story',      tier: 'bronze', icon: 'book',    goal: 'Read a story',              test: function (s) { return s.reads >= 1; } },
    { id: 'write-1',   title: 'First words',      tier: 'bronze', icon: 'pencil',  goal: 'Write a sentence',          test: function (s) { return s.writes >= 1; } },
    { id: 'voice',     title: 'Voice taught',     tier: 'bronze', icon: 'mic',     goal: 'Teach Spark your voice',    test: function (s) { return s.voice; } },
    { id: 'ears',      title: 'Sharp ears',       tier: 'bronze', icon: 'speaker', goal: 'Finish a Listen and write', test: function (s) { return s.dict >= 1; } },
    { id: 'streak-3',  title: '3-day streak',     tier: 'silver', icon: 'spark',   goal: 'Practise 3 days running',   test: function (s) { return s.streak >= 3; } },
    { id: 'read-5',    title: 'Bookworm',         tier: 'silver', icon: 'book',    goal: 'Read 5 stories',            test: function (s) { return s.reads >= 5; } },
    { id: 'write-10',  title: 'Word builder',     tier: 'silver', icon: 'pencil',  goal: 'Write 10 sentences',        test: function (s) { return s.writes >= 10; } },
    { id: 'fam-3',     title: 'Letter explorer',  tier: 'silver', icon: 'parts',   goal: 'Read 3 letter families',    test: function (s) { return s.famRead >= 3; } },
    { id: 'sparks-50', title: 'Spark collector',  tier: 'silver', icon: 'spark',   goal: 'Collect 50 sparks',         test: function (s) { return s.sparks >= 50; } },
    { id: 'fam-6',     title: 'Letter detective', tier: 'gold',   icon: 'trophy',  goal: 'Read all 6 letter families', test: function (s) { return s.famRead >= 6; } },
    { id: 'streak-7',  title: 'Week of reading',  tier: 'gold',   icon: 'trophy',  goal: 'Practise 7 days running',   test: function (s) { return s.streak >= 7; } },
    { id: 'sparks-150',title: 'Spark champion',   tier: 'gold',   icon: 'trophy',  goal: 'Collect 150 sparks',        test: function (s) { return s.sparks >= 150; } }
  ];
  S.MEDALS = MEDALS;

  S.medalBadge = function (m, earned, size) {
    return '<span class="medal medal-' + m.tier + (earned ? ' on' : '') + '"' +
      (size ? ' style="--m:' + size + 'px"' : '') + '>' +
      '<span class="medal-ribbon"></span>' +
      '<span class="medal-disc">' + S.Pictures.icon(earned ? m.icon : 'lock', 20) + '</span>' +
    '</span>';
  };

  /** Award any medal now earned, with a celebration. */
  S.checkMedals = function () {
    S.P.medals = S.P.medals || {};
    var s = stats(), fresh = [];
    MEDALS.forEach(function (m) {
      if (!S.P.medals[m.id] && m.test(s)) { S.P.medals[m.id] = S.today(); fresh.push(m); }
    });
    if (!fresh.length) return;
    S.save();
    var m = fresh[0];
    setTimeout(function () { celebrate(m); }, 900);
  };

  function celebrate(m) {
    var el = document.createElement('div');
    el.className = 'medal-pop';
    el.innerHTML = S.medalBadge(m, true, 64) +
      '<div><b>New medal!</b><span>' + S.esc(m.title) + '</span></div>';
    document.body.appendChild(el);
    S.confetti();
    setTimeout(function () { el.classList.add('out'); }, 3200);
    setTimeout(function () { el.remove(); }, 3700);
  }

  /* ══ the profile page ═══════════════════════════════════ */
  S.paintProfile = function () {
    var P = S.P;
    var earned = MEDALS.filter(function (m) { return (P.medals || {})[m.id]; });

    S.$('#profileMain').innerHTML =
      '<div class="prof-hero">' +
        '<span class="prof-avatar">' + S.myAvatar(104) + '</span>' +
        '<div class="prof-id">' +
          '<h1>' + S.esc(P.name || 'Reader') + '</h1>' +
          '<p>' + (P.age ? P.age + ' years old · ' : '') + 'reading with Spark since ' +
            S.esc(S.niceDate(P.started) || 'today') + '</p>' +
          '<button class="btn btn-sm" id="profEdit">' + S.Pictures.icon('pencil', 16) + ' Change my details</button>' +
        '</div>' +
      '</div>' +

      '<div class="prof-stats">' +
        statTile('amber', 'spark', P.sparks, 'sparks') +
        statTile('violet', 'book', P.sessions.length, 'stories read') +
        statTile('rose', 'pencil', P.writings.length, 'things written') +
        statTile('moss', 'trophy', earned.length, 'medals') +
      '</div>' +

      '<section class="card prof-section">' +
        '<h2>My medals</h2>' +
        '<div class="medal-shelf">' + MEDALS.map(function (m) {
          var got = (P.medals || {})[m.id];
          return '<div class="medal-item' + (got ? ' on' : '') + '">' + S.medalBadge(m, !!got) +
            '<b>' + S.esc(m.title) + '</b><span>' + (got ? S.esc(S.niceDate(got)) : S.esc(m.goal)) + '</span></div>';
        }).join('') + '</div>' +
      '</section>' +

      '<section class="card prof-section">' +
        '<h2>My history</h2>' +
        history() +
      '</section>';

    S.$('#profEdit').addEventListener('click', editDetails);
  };

  function statTile(colour, icon, n, label) {
    return '<div class="stat-tile tone-' + colour + '"><span class="st-ico">' + S.Pictures.icon(icon, 22) + '</span>' +
      '<b>' + n + '</b><span>' + label + '</span></div>';
  }

  function history() {
    var items = [];
    S.P.sessions.forEach(function (s, i) {
      items.push({ date: s.date, order: i, kind: 'read', title: s.title,
        detail: [s.wpm ? s.wpm + ' words/min' : '',
                 s.seconds ? Math.round(s.seconds) + ' s' : '',
                 s.misreads ? s.misreads + ' mix-up' + (s.misreads > 1 ? 's' : '') : 'no mix-ups']
                .filter(Boolean).join(' · ') });
    });
    S.P.writings.slice().reverse().forEach(function (w, i) {
      items.push({ date: w.date, order: i, kind: 'write', title: w.text,
        detail: w.kind === 'dictation' ? 'Listen and write · ' + (w.score || '') :
                w.kind === 'bank' ? 'Word bank · ' + (w.prompt || '') : 'Picture story' });
    });
    if (!items.length) {
      return '<div class="empty"><p>Nothing yet. Read a story or write a sentence and it will show up here.</p></div>';
    }
    items.sort(function (a, b) { return (a.date < b.date ? 1 : a.date > b.date ? -1 : b.order - a.order); });
    return '<div class="hist">' + items.slice(0, 40).map(function (it) {
      return '<div class="hist-row tone-' + (it.kind === 'read' ? 'violet' : 'rose') + '">' +
        '<span class="hist-ico">' + S.Pictures.icon(it.kind === 'read' ? 'book' : 'pencil', 18) + '</span>' +
        '<div class="hist-main"><b>' + S.esc(it.title) + '</b><span>' + S.esc(it.detail) + '</span></div>' +
        '<span class="hist-date">' + S.esc(S.niceDate(it.date)) + '</span>' +
      '</div>';
    }).join('') + '</div>';
  }

  function editDetails() {
    var pick = S.P.avatar || 'owl';
    S.sheet(
      '<h2>My details</h2>' +
      '<label class="set-label" for="edName">Name</label>' +
      '<input class="inp" id="edName" maxlength="20" value="' + S.esc(S.P.name || '') + '" style="margin-bottom:14px">' +
      '<label class="set-label">Age</label>' +
      '<div class="age-grid" style="margin-bottom:14px">' + [7, 8, 9, 10, 11, 12, 13, 14].map(function (n) {
        return '<button class="age-btn" data-age="' + n + '"' + (S.P.age === n ? ' data-on="1"' : '') + '>' + n + '</button>';
      }).join('') + '</div>' +
      '<label class="set-label">My picture</label>' +
      '<div class="avatar-grid">' + Object.keys(AVATARS).map(function (k) {
        return '<button class="avatar-pick" data-avatar="' + k + '"' + (pick === k ? ' data-on="1"' : '') + '>' +
          S.avatarSVG(k, 56) + '<span>' + AVATARS[k].name + '</span></button>';
      }).join('') + '</div>' +
      '<div class="toolbar" style="margin:18px 0 0">' +
        '<button class="btn btn-primary" id="edSave" style="flex:1">Save</button>' +
        '<button class="btn" data-close>Cancel</button>' +
      '</div>',
      function () {
        var age = S.P.age;
        S.$$('[data-age]').forEach(function (b) {
          b.addEventListener('click', function () {
            age = +b.dataset.age;
            S.$$('[data-age]').forEach(function (x) { x.dataset.on = x === b ? '1' : ''; });
          });
        });
        S.$$('[data-avatar]').forEach(function (b) {
          b.addEventListener('click', function () {
            pick = b.dataset.avatar;
            S.$$('[data-avatar]').forEach(function (x) { x.dataset.on = x === b ? '1' : ''; });
          });
        });
        S.$('#edSave').addEventListener('click', function () {
          S.P.name = S.$('#edName').value.trim().slice(0, 20) || S.P.name;
          S.P.age = age;
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
