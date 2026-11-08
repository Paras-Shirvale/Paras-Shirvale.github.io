/* ============================================================
   homework.js — practice Spark writes for itself.

   Nothing here is a fixed worksheet. Everything is generated from
   what the analysis engine actually recorded:

     · words the child genuinely struggled on   -> build-the-word
     · letter pairs they keep swapping          -> spot-the-letter
                                                -> hear-which-word
     · words they read backwards                -> which way round

   That is why Homework starts empty. It cannot exist before the
   reading does, and it changes every time the child reads.

   The second tab is the teacher's: a file or pasted text, which
   opens in the same reader with the same help and generates its
   own questions.
   ============================================================ */

(function (S) {
  'use strict';

  /* Real minimal pairs — words that differ only by the confused
     letters. Where English does not provide them (p/q, n/u), the
     letter-spotting drill carries the load instead. */
  var MINIMAL_PAIRS = {
    bd: [['bad', 'dad'], ['big', 'dig'], ['bog', 'dog'], ['bay', 'day'],
         ['bear', 'dear'], ['bone', 'done'], ['rib', 'rid'], ['robe', 'rode']],
    mw: [['mad', 'wad'], ['mall', 'wall'], ['mine', 'wine'], ['mash', 'wash'],
         ['mail', 'wail'], ['man', 'wan']],
    ao: [['cat', 'cot'], ['hat', 'hot'], ['map', 'mop'], ['pat', 'pot'],
         ['cap', 'cop'], ['tap', 'top'], ['last', 'lost'], ['sack', 'sock']],
    ft: [['fin', 'tin'], ['fan', 'tan'], ['fall', 'tall'], ['fail', 'tail'],
         ['four', 'tour'], ['fear', 'tear']],
    dg: [['dot', 'got'], ['dear', 'gear'], ['dust', 'gust'], ['drab', 'grab'],
         ['dun', 'gun']],
    vw: [['vest', 'west'], ['vine', 'wine'], ['vet', 'wet'], ['veil', 'wail']],
    sz: [['sip', 'zip'], ['sue', 'zoo'], ['seal', 'zeal']],
    ea: [['bed', 'bad'], ['pen', 'pan'], ['bet', 'bat'], ['men', 'man'],
         ['send', 'sand'], ['bend', 'band']],
    ie: [['bit', 'bet'], ['pin', 'pen'], ['sit', 'set'], ['pit', 'pet'],
         ['lit', 'let']],
    bp: [['bat', 'pat'], ['bin', 'pin'], ['big', 'pig'], ['back', 'pack'],
         ['bear', 'pear']]
  };

  S.paintHomework = function () {
    paintSparkHomework();
    paintTeacher();
  };

  /* ── the generated set ──────────────────────────────── */
  function paintSparkHomework() {
    var host = S.$('#hwSpark');
    var words = S.Analysis.wordTroubles().slice(0, 5);
    var letters = S.Analysis.letterTroubles().slice(0, 3);
    var reversals = (S.P.errorKinds && S.P.errorKinds['word-reversal']) || 0;

    if (!words.length && !letters.length) {
      host.innerHTML =
        '<div class="card"><div class="empty">' +
          '<div class="e-ico"><span class="i" data-icon="spark" data-icon-size="32"></span></div>' +
          '<p><b>Nothing to practise yet.</b><br>' +
          'Read aloud with the microphone. Spark works out which pauses are real ' +
          'difficulty and which are just normal phrasing, then builds practice from ' +
          'the real ones.</p>' +
          '<button class="btn btn-primary" data-go="read" style="margin-top:15px">' +
            'Go and read something</button>' +
        '</div></div>';
      return;
    }

    var intro = [];
    if (words.length) intro.push(words.length + ' word' + (words.length > 1 ? 's' : '') + ' that slowed you down');
    if (letters.length) intro.push(letters.length + ' letter pair' + (letters.length > 1 ? 's' : '') + ' getting mixed up');

    host.innerHTML =
      '<div class="hw-intro">' +
        '<p class="sub" style="margin:0">Spark built this from your last readings — ' +
        intro.join(' and ') + '. It changes every time you read.</p>' +
      '</div>' +
      letters.map(letterDrill).join('') +
      words.map(wordDrill).join('') +
      (reversals >= 2 ? reversalNote(reversals) : '');

    wireDrills();
  }

  /* ── drill 1: the letters themselves ────────────────── */
  function letterDrill(trouble) {
    var two = trouble.key.split('');
    var target = two[Math.random() < 0.5 ? 0 : 1];
    var other = two[0] === target ? two[1] : two[0];

    /* A row of both letters, shuffled. Built as a fixed split rather
       than a coin flip per cell, so the child never gets a row that
       is almost all one letter and the exercise stays worth doing. */
    var row = [];
    for (var i = 0; i < 6; i++) row.push(target);
    for (i = 0; i < 6; i++) row.push(other);
    row = S.shuffle(row);

    var pairs = MINIMAL_PAIRS[trouble.key];
    var pair = pairs ? pairs[Math.floor(Math.random() * pairs.length)] : null;

    return '<div class="drill" data-kind="letters" data-key="' + S.esc(trouble.key) + '" ' +
             'data-target="' + S.esc(target) + '">' +
      '<div class="drill-head">' +
        '<div>' +
          '<h3>Tell <span class="drill-word">' + two[0] + '</span> from ' +
            '<span class="drill-word">' + two[1] + '</span></h3>' +
          '<p class="sub" style="margin:3px 0 0">You swapped these ' + trouble.count +
            ' time' + (trouble.count > 1 ? 's' : '') +
            (trouble.examples.length ? ' — in ' + S.esc(trouble.examples.slice(0, 3).join(', ')) : '') +
            '.</p>' +
        '</div>' +
      '</div>' +

      '<p class="drill-task">Tap every <b class="drill-word">' + target + '</b> you can find.' +
        '<button class="icon-sq" style="margin-left:8px" data-say="Tap every ' + target +
          ' you can find." aria-label="Hear this">' +
          '<span class="i" data-icon="speaker" data-icon-size="16"></span></button></p>' +
      '<div class="letter-row">' +
        row.map(function (ch, i) {
          return '<button class="letter-cell" data-letter="' + ch + '" data-i="' + i + '">' + ch + '</button>';
        }).join('') +
      '</div>' +

      (pair ? '<div class="pair-task">' +
        '<p class="drill-task">Now listen. Which word did I say?</p>' +
        '<div class="toolbar" style="margin-bottom:10px">' +
          '<button class="btn btn-sm" data-act="saypair"><span class="i" data-icon="speaker" data-icon-size="18"></span> Say it again</button>' +
        '</div>' +
        '<div class="pair-opts">' +
          S.shuffle(pair.slice()).map(function (w) {
            return '<button class="pair-opt" data-word="' + S.esc(w) + '">' + S.esc(w) + '</button>';
          }).join('') +
        '</div>' +
      '</div>' : '') +

      '<div class="toolbar" style="margin:14px 0 0">' +
        '<button class="btn btn-primary btn-sm" data-act="checkletters">Check</button>' +
        '<button class="btn btn-sm" data-act="resetletters"><span class="i" data-icon="refresh" data-icon-size="18"></span> Start again</button>' +
      '</div>' +
      '<div data-msg></div>' +
    '</div>';
  }

  /* ── drill 2: rebuild the word ──────────────────────── */
  /* ── the word drill: see it, say it, write it ───────────
     Rearranging syllables alone proves very little. A child can
     push tiles into the right order by shape without ever reading
     the word. So each word runs through three stages, in the order
     phonics teaching actually uses:

       1 BUILD  — break the word into its sound chunks and rebuild
                  it. This is about segmenting.
       2 READ   — say it aloud into the microphone. Spark checks
                  what it heard against the word. This is the part
                  that proves they can decode it.
       3 SPELL  — the word is hidden, they hear it and type it.
                  Spark shows exactly which letters went wrong.

     A word only counts as practised once all three are done. */

  var STAGES = [
    { id: 'build', label: 'Build it',  hint: 'Put the parts in the right order.' },
    { id: 'read',  label: 'Read it',   hint: 'Now say the word out loud.' },
    { id: 'spell', label: 'Write it',  hint: 'Listen, then type what you hear.' }
  ];

  function wordDrill(w) {
    var parts = S.shuffle(S.syllables(w.word));
    var why = w.misread && !w.stalled ? 'You read it wrongly ' + w.misread + 'x'
            : w.misread ? 'You paused on it ' + w.stalled + 'x and misread it ' + w.misread + 'x'
            : 'You paused on it ' + w.stalled + 'x';

    return '<div class="drill" data-kind="word" data-word="' + S.esc(w.word) + '" data-stage="build">' +
      '<div class="drill-head">' +
        '<div>' +
          '<h3><span class="drill-word">' + S.esc(w.word) + '</span></h3>' +
          '<p class="sub" style="margin:3px 0 0">' + why +
            (w.reason ? ' — ' + S.esc(w.reason) : '') + '.</p>' +
        '</div>' +
        '<div class="drill-pic" data-drillpic></div>' +
      '</div>' +

      '<div class="stage-bar">' +
        STAGES.map(function (st, i) {
          return '<span class="stage" data-stage-dot="' + st.id + '">' +
                   '<i>' + (i + 1) + '</i>' + st.label +
                 '</span>';
        }).join('') +
      '</div>' +

      /* 1 — build */
      '<div class="stage-body" data-body="build">' +
        '<p class="drill-task">' + STAGES[0].hint + '</p>' +
        '<div class="slots" data-slots></div>' +
        '<div class="tiles">' +
          parts.map(function (p) {
            return '<button class="tile" data-tile="' + S.esc(p) + '">' + S.esc(p) + '</button>';
          }).join('') +
        '</div>' +
        '<div class="toolbar" style="margin-bottom:0">' +
          '<button class="btn btn-primary btn-sm" data-act="check">Check</button>' +
          '<button class="btn btn-sm" data-act="reset">' +
            '<span class="i" data-icon="refresh" data-icon-size="18"></span> Start again</button>' +
          '<button class="btn btn-sm" data-act="hear">' +
            '<span class="i" data-icon="speaker" data-icon-size="18"></span> Hear it</button>' +
        '</div>' +
      '</div>' +

      /* 2 — read aloud */
      '<div class="stage-body" data-body="read" hidden>' +
        '<p class="drill-task">' + STAGES[1].hint + '</p>' +
        '<div class="say-word" data-sayword>' + S.esc(w.word) + '</div>' +
        '<div class="toolbar" style="margin-bottom:0">' +
          '<button class="btn btn-primary btn-sm" data-act="listen">' +
            '<span class="i" data-icon="mic" data-icon-size="18"></span> Say it</button>' +
          '<button class="btn btn-sm" data-act="hear">' +
            '<span class="i" data-icon="speaker" data-icon-size="18"></span> Hear it first</button>' +
          '<button class="btn btn-sm" data-act="skip-read">I said it</button>' +
        '</div>' +
      '</div>' +

      /* 3 — spell */
      '<div class="stage-body" data-body="spell" hidden>' +
        '<p class="drill-task">' + STAGES[2].hint + '</p>' +
        '<div class="spell-row">' +
          '<button class="btn btn-sm" data-act="hear">' +
            '<span class="i" data-icon="speaker" data-icon-size="18"></span> Hear it</button>' +
          '<button class="btn btn-sm" data-act="hear-parts">' +
            '<span class="i" data-icon="parts" data-icon-size="18"></span> Bit by bit</button>' +
        '</div>' +
        '<div class="spell-row">' +
          '<input class="inp spell-in" data-spell placeholder="type the word" ' +
            'autocomplete="off" autocorrect="off" spellcheck="false">' +
          '<button class="btn btn-primary btn-sm" data-act="check-spell">Check</button>' +
        '</div>' +
      '</div>' +

      '<div data-msg></div>' +
    '</div>';
  }

  function reversalNote(n) {
    return '<div class="drill"><div class="drill-head"><div>' +
      '<h3>Words that flip</h3>' +
      '<p class="sub" style="margin:3px 0 0">You have read ' + n +
      ' words backwards. When a short word looks odd, read it left to right ' +
      'with your finger under it — <b>w-a-s</b>, not <b>s-a-w</b>.</p>' +
      '</div></div></div>';
  }

  /* ── behaviour ──────────────────────────────────────── */
  function wireDrills() {
    S.$$('.drill').forEach(function (drill) {
      var msg = drill.querySelector('[data-msg]');
      var kind = drill.dataset.kind;

      if (kind === 'word') wireWordDrill(drill, msg);
      if (kind === 'letters') wireLetterDrill(drill, msg);
    });
  }

  function wireWordDrill(drill, msg) {
    var word = drill.dataset.word;
    var slots = drill.querySelector('[data-slots]');
    var listening = null;

    /* a picture of the word, alongside it the whole way through */
    S.Pictures.render(drill.querySelector('[data-drillpic]'), word, { credit: false });

    paintStage();

    function paintStage() {
      var stage = drill.dataset.stage;
      S.$$('[data-body]', drill).forEach(function (el) {
        el.hidden = el.dataset.body !== stage;
      });
      S.$$('[data-stage-dot]', drill).forEach(function (dot) {
        var id = dot.dataset.stageDot;
        var order = ['build', 'read', 'spell'];
        var at = order.indexOf(stage), mine = order.indexOf(id);
        dot.dataset.state = mine < at ? 'done' : mine === at ? 'now' : '';
      });
      if (stage === 'spell') {
        var box = drill.querySelector('[data-spell]');
        if (box) { box.value = ''; setTimeout(function () { box.focus(); }, 80); }
      }
    }

    function advance(to) {
      drill.dataset.stage = to;
      msg.innerHTML = '';
      paintStage();
    }

    function stopListening() {
      if (listening) { listening.stop(); listening = null; }
      var b = drill.querySelector('[data-act="listen"]');
      if (b) b.classList.remove('btn-rec', 'pulse');
    }

    /* ── 1: build ─────────────────────────────────────── */
    S.$$('.tile', drill).forEach(function (tile) {
      tile.addEventListener('click', function () {
        tile.dataset.used = '1';
        var piece = document.createElement('span');
        piece.className = 'slot';
        piece.textContent = tile.dataset.tile;
        slots.appendChild(piece);
        S.say(tile.dataset.tile, { rate: 0.65 });
      });
    });

    drill.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var act = b.dataset.act;

      if (act === 'hear') { S.say(word); S.useCue('sound'); return; }
      if (act === 'hear-parts') { S.sayInParts(word); S.useCue('parts'); return; }

      if (act === 'reset') {
        slots.innerHTML = '';
        S.$$('.tile', drill).forEach(function (t) { t.dataset.used = ''; });
        msg.innerHTML = '';
        return;
      }

      if (act === 'check') {
        var built = S.$$('.slot', drill)
          .map(function (x) { return x.textContent; }).join('').toLowerCase();
        if (!built) {
          say('Tap the parts above to build the word.');
        } else if (built === word.toLowerCase()) {
          say('That\'s it. Now read it out loud.', true);
          S.say(word);
          S.award(1, 'Built the word');
          setTimeout(function () { advance('read'); }, 1100);
        } else {
          say('Not quite — listen again and try another order.');
          S.sayInParts(word);
        }
        return;
      }

      /* ── 2: read it aloud ───────────────────────────── */
      if (act === 'listen') {
        if (listening) { stopListening(); return; }
        var problem = S.micProblem();
        if (problem) { say(problem); return; }

        b.classList.add('btn-rec', 'pulse');
        say('Listening — say the word.');

        listening = S.listenOnce(
          null,
          function (heard) {
            stopListening();
            if (!heard) { say('I didn\'t catch that. Try once more.'); return; }

            /* take the closest word they said, not the whole phrase */
            var best = heard.split(/\s+/).map(S.norm).filter(Boolean)
              .some(function (said) { return S.soundsLike(said, S.norm(word)); });

            if (best) {
              say('That\'s how it sounds. Now write it.', true);
              S.award(2, 'Read it aloud');
              setTimeout(function () { advance('spell'); }, 1100);
            } else {
              say('I heard "' + S.esc(heard.trim()) + '". The word is "' + word +
                  '" — listen and try again.');
              S.sayInParts(word);
            }
          },
          function (problemText) { stopListening(); say(problemText); }
        );
        if (!listening) b.classList.remove('btn-rec', 'pulse');
        return;
      }

      /* no microphone, or they read it off-app */
      if (act === 'skip-read') { advance('spell'); return; }

      /* ── 3: spell it ────────────────────────────────── */
      if (act === 'check-spell') {
        var box = drill.querySelector('[data-spell]');
        var typed = (box.value || '').trim();
        if (!typed) { say('Listen to the word, then type it.'); return; }

        if (typed.toLowerCase() === word.toLowerCase()) {
          say('Every letter right. That word is yours now.', true);
          S.say(word);
          markPractised(word);
        } else {
          /* show exactly which letters went wrong, rather than
             just saying no — the point is to see the difference */
          say('<div class="spell-diff">' +
                '<span class="sd-yours">' + diff(typed, word) + '</span>' +
                '<span class="sd-arrow">the word is</span>' +
                '<span class="sd-right">' + diff(word, typed) + '</span>' +
              '</div>' +
              '<p style="margin:8px 0 0">Listen to the parts and try again.</p>');
          S.sayInParts(word);
          box.value = '';
          box.focus();
        }
        return;
      }
    });

    drill.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.matches('[data-spell]')) {
        var btn = drill.querySelector('[data-act="check-spell"]');
        if (btn) btn.click();
      }
    });

    function say(html, good) {
      msg.innerHTML = '<div class="q-after' + (good ? ' good' : '') + '">' + html + '</div>';
    }
  }

  /** Mark the letters of a that differ from b. */
  function diff(a, b) {
    a = String(a || ''); b = String(b || '');
    var out = '';
    for (var i = 0; i < a.length; i++) {
      out += (a[i] !== b[i]) ? '<em>' + S.esc(a[i]) + '</em>' : S.esc(a[i]);
    }
    return out;
  }

  function wireLetterDrill(drill, msg) {
    var key = drill.dataset.key;
    var target = drill.dataset.target;
    var pairAnswer = null;

    S.$$('.letter-cell', drill).forEach(function (cell) {
      cell.addEventListener('click', function () {
        cell.dataset.picked = cell.dataset.picked === '1' ? '' : '1';
      });
    });

    var pairOpts = S.$$('.pair-opt', drill);
    if (pairOpts.length) {
      pairAnswer = pairOpts[Math.floor(Math.random() * pairOpts.length)].dataset.word;
      setTimeout(function () { /* wait for the panel to be visible */ }, 0);
      pairOpts.forEach(function (opt) {
        opt.addEventListener('click', function () {
          if (drill.querySelector('.pair-opt[data-s]')) return;
          var right = opt.dataset.word === pairAnswer;
          opt.dataset.s = right ? 'right' : 'wrong';
          if (!right) {
            pairOpts.forEach(function (o) { if (o.dataset.word === pairAnswer) o.dataset.s = 'right'; });
          }
          msg.innerHTML = '<div class="q-after' + (right ? ' good' : '') + '">' +
            (right ? '✓ Yes — I said "' + pairAnswer + '".'
                   : 'I said "' + pairAnswer + '". Listen for the first sound.') + '</div>';
          if (right) S.award(2, 'Heard the difference');
        });
      });
    }

    drill.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;

      if (b.dataset.act === 'saypair' && pairAnswer) S.say(pairAnswer, { rate: 0.75 });

      if (b.dataset.act === 'resetletters') {
        S.$$('.letter-cell', drill).forEach(function (c) { c.dataset.picked = ''; c.dataset.s = ''; });
        msg.innerHTML = '';
      }

      if (b.dataset.act === 'checkletters') {
        var wrong = 0, missed = 0;
        S.$$('.letter-cell', drill).forEach(function (c) {
          var isTarget = c.dataset.letter === target;
          var picked = c.dataset.picked === '1';
          if (picked && !isTarget) { c.dataset.s = 'wrong'; wrong++; }
          else if (!picked && isTarget) { c.dataset.s = 'missed'; missed++; }
          else if (picked && isTarget) { c.dataset.s = 'right'; }
        });

        if (!wrong && !missed) {
          msg.innerHTML = '<div class="q-after good">✓ Every one. You can tell them apart.</div>';
          var rec = S.P.letters[key];
          if (rec) rec.count = Math.max(0, rec.count - 1);   /* earned back */
          S.award(3, 'Letters sorted');
          S.save();
          setTimeout(paintSparkHomework, 1700);
        } else {
          msg.innerHTML = '<div class="q-after">' +
            (wrong ? wrong + ' picked that weren\'t "' + target + '". ' : '') +
            (missed ? missed + ' missed. ' : '') +
            'Look at which way the round part faces.</div>';
        }
      }
    });
  }

  function markPractised(word) {
    S.P.practised[word] = S.today();
    S.award(2, 'Word practised');
    S.save();
    setTimeout(paintSparkHomework, 1700);
  }

  /* ── what the teacher sent ──────────────────────────── */
  function paintTeacher() {
    var host = S.$('#teacherList');
    if (!S.P.teacher.length) {
      host.innerHTML = '<div class="empty"><p>Nothing from your teacher yet. ' +
        'Add a file above and it becomes something you can read with all of Spark\'s help.</p></div>';
      return;
    }

    host.innerHTML = S.P.teacher.map(function (f, i) {
      return '<div class="file-row">' +
        '<span style="font-size:21px"><span class="i" data-icon="list" data-icon-size="18"></span></span>' +
        '<div class="file-meta">' +
          '<b>' + S.esc(f.name) + '</b>' +
          '<p class="sub">' + S.wordCount(f.text) + ' words · added ' + f.date + '</p>' +
        '</div>' +
        '<button class="btn btn-sm btn-primary" data-open="' + i + '">Read it</button>' +
        '<button class="icon-sq" data-del="' + i + '" aria-label="Remove">✕</button>' +
      '</div>';
    }).join('');

    S.$$('[data-open]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var f = S.P.teacher[+b.dataset.open];
        if (!f) return;
        S.go('read');
        S.openPassage({ id: 'teacher:' + f.name, level: null, pic: '',
                        title: f.name, text: f.text });
      });
    });

    S.$$('[data-del]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        S.P.teacher.splice(+b.dataset.del, 1);
        S.save();
        paintTeacher();
      });
    });
  }

  function addTeacherText(name, text) {
    var clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (S.wordCount(clean) < 8) { S.toast('That looks too short to read'); return; }
    S.P.teacher.unshift({ name: name || 'Teacher\'s text',
                          text: clean.slice(0, 8000), date: S.today() });
    S.save();
    paintTeacher();
    S.toast('Added — tap "Read it"');
  }

  function readFile(file) {
    if (!file) return;
    var r = new FileReader();
    r.onload  = function () { addTeacherText(file.name.replace(/\.[^.]+$/, ''), r.result); };
    r.onerror = function () { S.toast('Couldn\'t read that file. Try a .txt file, or paste the text.'); };
    r.readAsText(file);
  }

  /* ── wiring ─────────────────────────────────────────── */
  S.wireHomework = function () {
    S.$$('.hw-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        S.$$('.hw-tab').forEach(function (t) {
          t.setAttribute('aria-selected', String(t === tab));
        });
        S.$('#hwSpark').hidden   = tab.dataset.hw !== 'spark';
        S.$('#hwTeacher').hidden = tab.dataset.hw !== 'teacher';
      });
    });

    S.$('#btnPick').addEventListener('click', function () { S.$('#fileIn').click(); });
    S.$('#fileIn').addEventListener('change', function (e) {
      readFile(e.target.files && e.target.files[0]);
      e.target.value = '';
    });

    var dz = S.$('#dropZone');
    ['dragenter', 'dragover'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('over'); });
    });
    dz.addEventListener('drop', function (e) {
      readFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
    });

    S.$('#btnPaste').addEventListener('click', function () {
      S.sheet(
        '<h2>Paste the text</h2>' +
        '<p class="sub">Copy it from the worksheet, email or website and paste it here.</p>' +
        '<input class="inp" id="pName" placeholder="What is it called?" style="margin-bottom:10px">' +
        '<textarea class="inp" id="pText" placeholder="Paste the passage here…"></textarea>' +
        '<div class="toolbar" style="margin:16px 0 0">' +
          '<button class="btn btn-primary" id="pSave">Add it</button>' +
          '<button class="btn" data-close>Cancel</button>' +
        '</div>',
        function () {
          S.$('#pSave').addEventListener('click', function () {
            addTeacherText(S.$('#pName').value.trim() || 'Teacher\'s text', S.$('#pText').value);
            S.closeSheet();
          });
          setTimeout(function () { S.$('#pText').focus(); }, 100);
        }
      );
    });
  };

})(window.Spark);
