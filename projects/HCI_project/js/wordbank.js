/* ============================================================
   wordbank.js — sentence building with a word bank.

   A writing exercise for children who find spelling the hard
   part of writing. The ideas are theirs; the bank takes the
   spelling load off so they can get the sentence down.

     1  BUILD   A bank of key words and sentence starters, grouped
                by job (who, doing, what, where) and colour-coded
                the same way every time. The child taps words to
                add them, or types — they are the one writing.
     2  LISTEN  Every word is spoken the moment it lands, and the
                whole sentence is read back with each word lit up
                as it is said.
     3  CHECK   "Is that what you meant to say?" Hearing it is how
                a child who cannot easily re-read their own writing
                checks it. Yes saves it; no goes back to fix it.

   Each word in the bank also has its own speaker, so a word can
   be heard before it is used.

   The sets follow the letter check: the first three are full of
   the letters that get mixed up (b/d, p/q, m/w), so writing
   practises the same shapes reading does.
   ============================================================ */

(function (S) {
  'use strict';

  /* ── the banks ───────────────────────────────────────── */
  var GROUPS = [
    { key: 'who',      label: 'Who',      say: 'Who' },
    { key: 'doing',    label: 'Doing',    say: 'Doing words' },
    { key: 'what',     label: 'What',     say: 'What' },
    { key: 'where',    label: 'Where',    say: 'Where' },
    { key: 'describe', label: 'Describe', say: 'Describing words' },
    { key: 'glue',     label: 'Little words', say: 'Little words' }
  ];

  var BANKS = [
    {
      id: 'bank-bd', title: 'b and d', pic: 'dog', blurb: 'Ben, his dog and a bed.',
      starters: ['The big dog', 'Ben had a', 'My dad', 'One day'],
      who:      ['Ben', 'the dog', 'my dad', 'a bird', 'the baby'],
      doing:    ['dug', 'barked', 'bounced', 'dived', 'dashed', 'grabbed', 'had'],
      what:     ['a bed', 'a ball', 'a bone', 'some bread', 'a box'],
      where:    ['by the door', 'in the dirt', 'under the bed', 'down the road'],
      describe: ['big', 'brown', 'bad', 'bright', 'dirty'],
      glue:     ['the', 'a', 'and', 'was', 'is', 'his', '.', '!']
    },
    {
      id: 'bank-pq', title: 'p and q', pic: 'boat', blurb: 'A puppy at the pond.',
      starters: ['The puppy', 'Pip put', 'A quiet duck', 'Quickly,'],
      who:      ['Pip', 'the puppy', 'a duck', 'the queen', 'my pal'],
      doing:    ['paddled', 'picked up', 'quacked', 'played', 'peeped', 'pushed'],
      what:     ['a pebble', 'a pear', 'some pizza', 'a present', 'a paper plane'],
      where:    ['in the pond', 'at the park', 'past the pool', 'up the path'],
      describe: ['quick', 'quiet', 'pink', 'happy', 'puzzled'],
      glue:     ['the', 'a', 'and', 'was', 'with', 'her', '.', '?']
    },
    {
      id: 'bank-mw', title: 'm and w', pic: 'mountain', blurb: 'Wind on the mountain.',
      starters: ['The wind', 'Mum went', 'We walked', 'In the morning'],
      who:      ['Mum', 'we', 'the man', 'a worm', 'my mate'],
      doing:    ['walked', 'woke up', 'made', 'watched', 'waved', 'melted'],
      what:     ['a warm hat', 'some water', 'a map', 'the moon', 'a window'],
      where:    ['up the mountain', 'at the window', 'in the woods', 'down the wet road'],
      describe: ['warm', 'wet', 'windy', 'muddy', 'little'],
      glue:     ['the', 'a', 'and', 'went', 'was', 'into', '.', '!']
    },
    {
      id: 'bank-animals', title: 'Animals', pic: 'cat', blurb: 'Cats, fish, birds and bees.',
      starters: ['The cat', 'A little bird', 'My pet', 'I saw a'],
      who:      ['the cat', 'a fish', 'the bee', 'a bird', 'my dog'],
      doing:    ['jumped', 'swam', 'flew', 'ate', 'slept', 'chased'],
      what:     ['a mouse', 'some seeds', 'a flower', 'its tail', 'a stick'],
      where:    ['in the garden', 'in the sea', 'up a tree', 'on the sofa'],
      describe: ['fluffy', 'tiny', 'fast', 'sleepy', 'striped'],
      glue:     ['the', 'a', 'and', 'then', 'was', 'very', '.', '!']
    },
    {
      id: 'bank-weather', title: 'Weather', pic: 'rain', blurb: 'Sun, rain, snow and storms.',
      starters: ['Today it is', 'The sun', 'Last night', 'When it rains'],
      who:      ['the sun', 'the rain', 'the wind', 'the snow', 'we'],
      doing:    ['shone', 'poured', 'blew', 'fell', 'got wet', 'played'],
      what:     ['an umbrella', 'my coat', 'a snowman', 'a rainbow', 'puddles'],
      where:    ['outside', 'on the roof', 'over the hill', 'in the sky'],
      describe: ['sunny', 'cold', 'grey', 'stormy', 'bright'],
      glue:     ['it', 'is', 'was', 'the', 'and', 'so', '.', '!']
    },
    {
      id: 'bank-day', title: 'My day', pic: 'house', blurb: 'Home, school and friends.',
      starters: ['This morning I', 'At school we', 'After lunch', 'My friend'],
      who:      ['I', 'my friend', 'my teacher', 'my mum', 'we'],
      doing:    ['ate', 'read', 'played', 'went', 'laughed', 'made'],
      what:     ['breakfast', 'a book', 'football', 'a picture', 'my homework'],
      where:    ['at home', 'at school', 'in the park', 'in my room'],
      describe: ['fun', 'funny', 'tired', 'happy', 'busy'],
      glue:     ['the', 'a', 'and', 'then', 'with', 'because', '.', '!']
    }
  ];
  S.BANKS = BANKS;

  var bank = null;          /* the set open right now */
  var heard = false;        /* has the current sentence been listened to? */
  var lastValue = '';
  var reading = null;       /* read-along handle */
  var tapped = 0, typedWords = 0;

  function done() { return (S.P.bankDone = S.P.bankDone || {}); }

  /* ── the list of sets, on the Write page ─────────────── */
  S.paintBankList = function () {
    var host = S.$('#bankList');
    if (!host) return;
    var record = done();
    var n = 0;

    host.innerHTML = BANKS.map(function (b) {
      var count = record[b.id] || 0;
      if (count) n++;
      return '<button class="lib-card screen-card" data-bank="' + b.id + '">' +
        '<div class="lib-top">' +
          '<span class="lib-pic">' + S.Pictures.drawn(b.pic, 34) + '</span>' +
          '<span class="badge' + (count ? ' badge-done' : '') + '">' +
            (count ? count + ' made' : 'Words') + '</span>' +
        '</div>' +
        '<h3>' + S.esc(b.title) + '</h3>' +
        '<p>' + S.esc(b.blurb) + '</p>' +
      '</button>';
    }).join('');

    S.$$('[data-bank]', host).forEach(function (btn) {
      btn.addEventListener('click', function () { openBank(btn.dataset.bank); });
    });

    var score = S.$('#bankScore');
    if (score) {
      score.innerHTML = n ? '<b>' + n + ' of ' + BANKS.length + '</b><span>tried</span>' : '';
    }
  };

  /* ── opening a set ───────────────────────────────────── */
  function openBank(id) {
    bank = BANKS.filter(function (b) { return b.id === id; })[0];
    if (!bank) return;
    heard = false; lastValue = ''; tapped = 0; typedWords = 0;
    S.openWriteActivity('bank');
    paintBank();
  }

  S.closeBank = function (quiet) {
    stopRead();
    if (!quiet) S.stopSaying();
  };

  function chip(text, group) {
    var pic = S.Pictures.drawn(text.replace(/^(the|a|an|some|my|his|her|its)\s+/i, ''), 26);
    var punct = /^[.!?,]$/.test(text);
    return '<span class="bank-chip g-' + group + (punct ? ' punct' : '') + '">' +
      '<button class="bank-word" data-add="' + S.esc(text) + '">' +
        (pic ? '<span class="bank-pic">' + pic + '</span>' : '') +
        S.esc(text) +
      '</button>' +
      (punct ? '' :
        '<button class="bank-hear" data-say="' + S.esc(text) + '" aria-label="Hear ' + S.esc(text) + '">' +
          S.Pictures.icon('speaker', 15) + '</button>') +
    '</span>';
  }

  function paintBank() {
    var host = S.$('#writeBank');
    var echo = S.P.settings.typeEcho !== false;

    host.innerHTML =
      '<button class="btn btn-sm" data-write-back>&larr; All writing</button>' +
      '<div class="bank-head">' +
        '<span class="lib-pic">' + S.Pictures.drawn(bank.pic, 44) + '</span>' +
        '<div><h1 class="work-title">' + S.esc(bank.title) + '</h1>' +
        '<p class="sub" style="margin:0">Tap a word to add it.</p></div>' +
        '<button class="icon-sq" data-say="Tap a word to add it to your sentence. ' +
          'Tap the speaker to just hear it. Then listen to your sentence." aria-label="Hear how this works">' +
          S.Pictures.icon('speaker', 18) + '</button>' +
      '</div>' +

      '<div class="bank-steps" id="bankSteps">' +
        '<span class="bstep" data-bstep="build"><i>1</i>Build</span>' +
        '<span class="bstep" data-bstep="listen"><i>2</i>Listen</span>' +
        '<span class="bstep" data-bstep="check"><i>3</i>Check</span>' +
      '</div>' +

      '<div class="bank-grid">' +
        /* the bank */
        '<div class="bank-words">' +
          '<div class="bank-group g-start">' +
            '<p class="bank-label">Start with ' +
              '<button class="icon-xs" data-say="Sentence starters" aria-label="Hear">' +
              S.Pictures.icon('speaker', 15) + '</button></p>' +
            '<div class="bank-row">' +
              bank.starters.map(function (t) { return chip(t, 'start'); }).join('') +
            '</div>' +
          '</div>' +
          GROUPS.map(function (g) {
            return '<div class="bank-group g-' + g.key + '">' +
              '<p class="bank-label"><span class="bank-dot"></span>' + g.label +
                ' <button class="icon-xs" data-say="' + S.esc(g.say) + '" aria-label="Hear">' +
                S.Pictures.icon('speaker', 15) + '</button></p>' +
              '<div class="bank-row">' +
                bank[g.key].map(function (t) { return chip(t, g.key); }).join('') +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +

        /* the child's sentence */
        '<aside class="bank-side">' +
          '<section class="card">' +
            '<h2>My sentence</h2>' +
            '<label class="bank-in-label" for="bankIn">Type here, or tap words</label>' +
            '<textarea class="inp bank-in" id="bankIn" rows="3" autocomplete="off" ' +
              'autocorrect="off" spellcheck="false"></textarea>' +
            '<label class="bank-echo"><input type="checkbox" id="bankEcho"' +
              (echo ? ' checked' : '') + '> Say each word as I type</label>' +
            '<div class="bank-strip" id="bankStrip"></div>' +
            '<div id="bankHints"></div>' +
            '<div class="toolbar" style="margin:12px 0 0">' +
              '<button class="btn btn-primary" id="bankHear">' +
                S.Pictures.icon('speaker', 18) + ' Hear my sentence</button>' +
              '<button class="btn btn-sm" id="bankUndo">Undo word</button>' +
              '<button class="btn btn-sm" id="bankClear">Clear</button>' +
            '</div>' +
            '<div class="bank-check" id="bankCheck" hidden>' +
              '<p class="bank-check-q">Is that what you meant? ' +
                '<button class="icon-xs" data-say="Is that what you meant to say?" aria-label="Hear">' +
                S.Pictures.icon('speaker', 16) + '</button></p>' +
              '<div class="toolbar" style="margin:0">' +
                '<button class="btn btn-rose" id="bankYes">Yes — save it ✓</button>' +
                '<button class="btn" id="bankNo">No, fix it</button>' +
              '</div>' +
            '</div>' +
          '</section>' +
          '<section class="card">' +
            '<h2>Things you\'ve written</h2>' +
            '<div data-saved-list></div>' +
          '</section>' +
        '</aside>' +
      '</div>';

    S.paintSaved && S.paintSaved();
    wire();
    update();
  }

  /* ── reading the sentence out of the box ─────────────── */
  function input() { return S.$('#bankIn'); }
  function words(text) { return String(text || '').trim().split(/\s+/).filter(Boolean); }

  function update() {
    var text = input().value;
    var list = words(text);

    S.$('#bankStrip').innerHTML = list.length
      ? list.map(function (w, i) {
          return '<button class="strip-w ' + groupOf(w) + '" data-strip="' + i + '">' + S.esc(w) + '</button>';
        }).join('')
      : '<span class="strip-empty">Your words show up here. Tap one to hear it.</span>';

    paintHints(text, list);
    paintSteps();
  }

  /* colour each word in the strip by its job, when it came from the bank */
  var groupCache = null;
  function groupOf(word) {
    if (!groupCache || groupCache.id !== bank.id) {
      groupCache = { id: bank.id, map: {} };
      GROUPS.concat([{ key: 'start' }]).forEach(function (g) {
        var list = g.key === 'start' ? bank.starters : bank[g.key];
        list.forEach(function (phrase) {
          words(phrase).forEach(function (w) {
            var n = S.norm(w);
            if (n && !groupCache.map[n] && g.key !== 'glue' && g.key !== 'start') groupCache.map[n] = 'g-' + g.key;
          });
        });
      });
    }
    return groupCache.map[S.norm(word)] || '';
  }

  /* every single word the bank holds, for spotting near misses */
  function vocabulary() {
    var all = {};
    GROUPS.forEach(function (g) {
      bank[g.key].forEach(function (p) { words(p).forEach(function (w) { var n = S.norm(w); if (n) all[n] = w; }); });
    });
    bank.starters.forEach(function (p) { words(p).forEach(function (w) { var n = S.norm(w); if (n) all[n] = w; }); });
    return all;
  }

  /* Gentle, specific nudges — never an automatic fix. The child
     decides whether to take each one. */
  function paintHints(text, list) {
    var host = S.$('#bankHints');
    var vocab = vocabulary();
    var hints = [];
    var seen = {};

    list.forEach(function (w, i) {
      var n = S.norm(w);
      if (!n || n.length < 3 || vocab[n] || seen[n]) return;
      var best = null, bestD = 99;
      Object.keys(vocab).forEach(function (v) {
        if (Math.abs(v.length - n.length) > 2) return;
        /* on a tie, a b/d-style flip is the likelier slip */
        var d = S.distance(n, v) - (flipNote(n, v) ? 0.5 : 0);
        if (d < bestD) { bestD = d; best = v; }
      });
      if (best && bestD <= (n.length > 5 ? 2 : 1)) {
        seen[n] = 1;
        var flip = flipNote(n, best);
        hints.push(
          '<div class="bank-hint">' +
            '<span>Did you mean <b>' + S.Pictures.wordVisual(best, { small: true }) + '</b>?' +
            (flip ? ' <em>' + flip + '</em>' : '') + '</span>' +
            '<button class="icon-xs" data-say="' + S.esc(best) + '" aria-label="Hear it">' +
              S.Pictures.icon('speaker', 15) + '</button>' +
            '<button class="btn btn-sm" data-swap="' + i + '" data-to="' + S.esc(best) + '">Use it</button>' +
          '</div>');
      }
    });

    var t = text.trim();
    if (t && /^[a-z]/.test(t)) {
      hints.push('<div class="bank-hint"><span>Start with a capital letter.</span>' +
        '<button class="icon-xs" data-say="A sentence starts with a capital letter." aria-label="Hear">' +
        S.Pictures.icon('speaker', 15) + '</button>' +
        '<button class="btn btn-sm" data-fix="cap">Fix</button></div>');
    }
    if (t && list.length >= 3 && !/[.!?]$/.test(t)) {
      hints.push('<div class="bank-hint"><span>End with a full stop <b>.</b></span>' +
        '<button class="icon-xs" data-say="A sentence ends with a full stop." aria-label="Hear">' +
        S.Pictures.icon('speaker', 15) + '</button>' +
        '<button class="btn btn-sm" data-fix="stop">Add .</button></div>');
    }
    host.innerHTML = hints.join('');
  }

  /** If the slip is a b/d-style flip, say so — that's the useful bit. */
  function flipNote(a, b) {
    if (a.length !== b.length) return '';
    var PAIRS = { bd: 1, db: 1, pq: 1, qp: 1, bp: 1, pb: 1, mw: 1, wm: 1, nu: 1, un: 1 };
    for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i] && PAIRS[a[i] + b[i]]) return 'Check the ' + b[i] + ' and ' + a[i] + '.';
    }
    return '';
  }

  function paintSteps() {
    var hasText = !!input().value.trim();
    var stage = !hasText ? 'build' : heard ? 'check' : 'listen';
    var order = ['build', 'listen', 'check'];
    S.$$('[data-bstep]').forEach(function (el) {
      var mine = order.indexOf(el.dataset.bstep), at = order.indexOf(stage);
      el.dataset.state = mine < at ? 'done' : mine === at ? 'now' : '';
    });
  }

  /* ── adding words ────────────────────────────────────── */
  function addWord(text) {
    var box = input();
    var v = box.value;
    var punct = /^[.!?,]$/.test(text);
    var at = box.selectionStart != null ? box.selectionStart : v.length;
    var before = v.slice(0, at), after = v.slice(at);

    if (punct) before = before.replace(/\s+$/, '');
    else if (before && !/\s$/.test(before)) before += ' ';

    var insert = text + (punct ? ' ' : ' ');
    box.value = before + insert + after.replace(/^\s+/, '');
    var caret = (before + insert).length;
    box.setSelectionRange(caret, caret);
    lastValue = box.value;
    tapped++;
    changed();

    /* hear it straight away — the whole point of the exercise */
    if (punct && /[.!?]/.test(text)) S.say(box.value.trim());
    else if (!punct) S.say(text);
  }

  function changed() {
    if (heard) { heard = false; S.$('#bankCheck').hidden = true; }
    stopRead();
    update();
  }

  /* While typing: say each word as soon as it is finished, and the
     whole sentence once it ends. */
  function onType() {
    var box = input();
    var v = box.value;
    var grew = v.length > lastValue.length;
    var prev = lastValue;
    lastValue = v;
    changed();

    if (!grew || S.P.settings.typeEcho === false) return;
    var last = v.slice(-1);
    if (/[.!?]/.test(last) && !/[.!?]\s*$/.test(prev)) {
      S.say(v.trim());
      return;
    }
    if (/[\s,]/.test(last)) {
      var ws = words(v.replace(/[\s,]+$/, ''));
      var w = ws[ws.length - 1];
      if (w && !/[\s,]$/.test(prev)) { typedWords++; S.say(w.replace(/[^A-Za-z'-]/g, '')); }
    }
  }

  /* ── listening back ──────────────────────────────────── */
  function hearSentence() {
    var text = input().value.trim();
    if (!text) { S.toast('Add some words first'); S.say('Add some words first.'); return; }
    stopRead();

    var btn = S.$('#bankHear');
    btn.dataset.active = '1';
    reading = S.readAlong(text, {
      onWord: function (i) {
        S.$$('.strip-w.saying').forEach(function (e) { e.classList.remove('saying'); });
        var el = S.$('.strip-w[data-strip="' + i + '"]');
        if (el) el.classList.add('saying');
      },
      onEnd: function () {
        S.$$('.strip-w.saying').forEach(function (e) { e.classList.remove('saying'); });
        btn.dataset.active = '';
        reading = null;
        if (!input() || input().value.trim() !== text) return;
        heard = true;
        S.$('#bankCheck').hidden = false;
        paintSteps();
      }
    });
    if (!reading) {
      /* no speech in this browser — still let them move on */
      heard = true;
      S.$('#bankCheck').hidden = false;
      btn.dataset.active = '';
      paintSteps();
    }
  }

  function stopRead() {
    if (reading) { reading.stop(); reading = null; }
    S.$$('.strip-w.saying').forEach(function (e) { e.classList.remove('saying'); });
    var b = S.$('#bankHear');
    if (b) b.dataset.active = '';
  }

  function save() {
    var text = input().value.trim().replace(/\s+([.!?,])/g, '$1');
    if (!text) return;
    S.P.writings.unshift({ date: S.today(), prompt: bank.title, text: text, kind: 'bank',
                           tapped: tapped, typed: typedWords });
    S.P.writings = S.P.writings.slice(0, 40);
    done()[bank.id] = (done()[bank.id] || 0) + 1;
    S.save();
    S.award(5, 'Made a sentence');
    input().value = '';
    lastValue = ''; tapped = 0; typedWords = 0;
    heard = false;
    S.$('#bankCheck').hidden = true;
    update();
    S.paintSaved && S.paintSaved();
  }

  /* ── wiring for one painted set ──────────────────────── */
  function wire() {
    var host = S.$('#writeBank');
    var box = input();

    box.addEventListener('input', onType);

    /* the container outlives each painted set, so its one delegated
       listener is attached once and always finds the current box */
    if (host.dataset.wired !== '1') {
      host.dataset.wired = '1';
      host.addEventListener('click', onBankClick);
    }

    wireButtons(box);
  }

  function onBankClick(e) {
      var box = input();
      if (!box) return;
      var add = e.target.closest('[data-add]');
      if (add) { addWord(add.dataset.add); box.focus(); return; }

      var strip = e.target.closest('[data-strip]');
      if (strip) { S.say(strip.textContent.replace(/[^A-Za-z'-]/g, '') || strip.textContent); return; }

      var swap = e.target.closest('[data-swap]');
      if (swap) {
        var list = words(box.value);
        var i = +swap.dataset.swap;
        if (list[i] != null) {
          var tail = (list[i].match(/[^A-Za-z'-]+$/) || [''])[0];
          list[i] = swap.dataset.to + tail;
          box.value = list.join(' ') + ' ';
          lastValue = box.value;
          changed();
          S.say(swap.dataset.to);
        }
        return;
      }

      var fix = e.target.closest('[data-fix]');
      if (fix) {
        var v = box.value.replace(/^\s+/, '');
        if (fix.dataset.fix === 'cap') box.value = v.charAt(0).toUpperCase() + v.slice(1);
        if (fix.dataset.fix === 'stop') box.value = v.replace(/[\s,]+$/, '') + '.';
        lastValue = box.value;
        changed();
        return;
      }
  }

  function wireButtons(box) {
    S.$('#bankEcho').addEventListener('change', function (e) {
      S.P.settings.typeEcho = e.target.checked;
      S.save();
    });
    S.$('#bankHear').addEventListener('click', function () {
      if (reading) { stopRead(); S.stopSaying(); return; }
      hearSentence();
    });
    S.$('#bankUndo').addEventListener('click', function () {
      var list = words(box.value);
      list.pop();
      box.value = list.length ? list.join(' ') + ' ' : '';
      lastValue = box.value;
      changed();
      box.focus();
    });
    S.$('#bankClear').addEventListener('click', function () {
      box.value = ''; lastValue = '';
      changed();
      box.focus();
    });
    S.$('#bankYes').addEventListener('click', save);
    S.$('#bankNo').addEventListener('click', function () {
      heard = false;
      S.$('#bankCheck').hidden = true;
      paintSteps();
      S.say('Change a word, then listen again.');
      box.focus();
    });
  }

})(window.Spark);
