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

   The worksheets tab is homework help: a PDF, photo or text file
   opens here, inside Homework, with every word tappable, every
   line hearable, and an answer box under each question.
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
          '<div class="toolbar" style="justify-content:center;margin:15px 0 0">' +
            '<button class="btn btn-primary" data-go="read">Read something</button>' +
            '<button class="btn" data-hwtab="teacher">Add a worksheet instead</button>' +
          '</div>' +
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

  /* ══ worksheets ════════════════════════════════════════
     Homework help, not more reading practice. A worksheet is
     uploaded — a PDF, a photo of the page, or a text file — and
     opens right here with the same help the reader has:

       · every word can be tapped for its picture, its sound and
         its parts, and hovered for a quick look
       · every line has its own speaker; the whole sheet can be
         read aloud with each word lit as it is said
       · anything that looks like a question gets an answer box
         underneath, which can be typed into or spoken into, and
         the answer can be heard back

     PDFs have their text pulled out in the browser. Photos and
     scanned PDFs are read with OCR. Both libraries are loaded
     only when such a file is added, so nothing extra is fetched
     for anyone who never uses them. Nothing is uploaded anywhere:
     the file is read on this device.                          */

  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  var PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  var TESSERACT = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js';

  /* The original file, for "Show the page". Kept for this visit
     only — a PDF is far too big for the browser's saved profile. */
  var originals = {};

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
      var el = document.createElement('script');
      el.src = src;
      el.onload = resolve;
      el.onerror = function () { reject(new Error('Could not load ' + src)); };
      document.head.appendChild(el);
    });
  }

  function loading(msg) {
    var el = S.$('#hwLoading');
    if (!el) return;
    if (!msg) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    el.innerHTML = '<div class="hw-loading"><span class="pic-wait"></span><span>' + S.esc(msg) + '</span></div>';
  }

  /* ── getting text out of a file ──────────────────────── */
  async function pdfText(buffer) {
    await loadScript(PDFJS);
    var lib = window.pdfjsLib;
    lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    var pdf = await lib.getDocument({ data: buffer.slice(0) }).promise;
    var pages = [];
    for (var n = 1; n <= Math.min(pdf.numPages, 20); n++) {
      loading('Reading page ' + n + ' of ' + pdf.numPages + '…');
      var page = await pdf.getPage(n);
      var content = await page.getTextContent();
      /* rebuild lines from where each piece of text sits */
      var lines = [], lastY = null, line = '';
      content.items.forEach(function (it) {
        var y = Math.round(it.transform[5]);
        if (lastY !== null && Math.abs(y - lastY) > 3 && line.trim()) {
          lines.push(line); line = '';
        }
        line += it.str;
        if (it.hasEOL) { lines.push(line); line = ''; }
        lastY = y;
      });
      if (line.trim()) lines.push(line);
      pages.push(lines.join('\n'));
    }
    return { pdf: pdf, text: pages.join('\n\n') };
  }

  async function ocr(images) {
    await loadScript(TESSERACT);
    var out = [];
    for (var i = 0; i < images.length; i++) {
      var res = await window.Tesseract.recognize(images[i], 'eng', {
        logger: function (m) {
          if (m.status === 'recognizing text') {
            loading('Reading the words' + (images.length > 1 ? ' on page ' + (i + 1) : '') +
                    '… ' + Math.round((m.progress || 0) * 100) + '%');
          } else if (m.status) {
            loading('Getting ready to read the picture…');
          }
        }
      });
      out.push(res.data.text);
    }
    return out.join('\n\n');
  }

  async function pdfPageImages(pdf, max) {
    var imgs = [];
    for (var n = 1; n <= Math.min(pdf.numPages, max); n++) {
      var page = await pdf.getPage(n);
      var vp = page.getViewport({ scale: 2 });
      var canvas = document.createElement('canvas');
      canvas.width = vp.width; canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      imgs.push(canvas);
    }
    return imgs;
  }

  /** Tidy extracted text into lines, joining lines a PDF broke mid-sentence. */
  function tidyLines(text) {
    var raw = String(text || '').replace(/\r/g, '').split('\n')
      .map(function (l) { return l.replace(/[ \t ]+/g, ' ').trim(); });
    var out = [];
    raw.forEach(function (l) {
      if (!l) { if (out.length && out[out.length - 1] !== '') out.push(''); return; }
      var prev = out[out.length - 1];
      if (prev && !/[.?!:;]$/.test(prev) && /^[a-z]/.test(l) && !isQuestionLine(l)) {
        out[out.length - 1] = prev + ' ' + l;
      } else {
        out.push(l);
      }
    });
    return out.join('\n').replace(/\n{2,}/g, '\n\n').trim();
  }

  async function readFile(file) {
    if (!file) return;
    var name = file.name.replace(/\.[^.]+$/, '') || 'Worksheet';
    var isPdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name);
    var isImage = /^image\//.test(file.type);

    try {
      if (isPdf) {
        loading('Opening the PDF…');
        var buffer = await file.arrayBuffer();
        var got = await pdfText(buffer);
        var text = got.text;
        /* a scanned worksheet has pictures of words, not text */
        if (S.wordCount(text) < 8) {
          loading('This PDF is a scan — reading the words from the picture…');
          text = await ocr(await pdfPageImages(got.pdf, 4));
        }
        var id = addTeacherText(name, text, 'pdf');
        if (id) originals[id] = { kind: 'pdf', pdf: got.pdf };
      } else if (isImage) {
        loading('Getting ready to read the picture…');
        var url = URL.createObjectURL(file);
        var words = await ocr([url]);
        var id2 = addTeacherText(name, words, 'image');
        if (id2) originals[id2] = { kind: 'image', url: url };
      } else {
        var plain = await file.text();
        addTeacherText(name, plain, 'text');
      }
    } catch (e) {
      S.toast(navigator.onLine === false
        ? 'Reading PDFs and photos needs the internet the first time.'
        : 'Couldn\'t read that file. Try another, or paste the text.');
    }
    loading('');
  }

  function addTeacherText(name, text, type) {
    var clean = tidyLines(text);
    if (S.wordCount(clean) < 4) { S.toast('I couldn\'t find words in that file'); return null; }
    var id = 'ws' + Date.now().toString(36);
    S.P.teacher.unshift({ id: id, name: name || 'Worksheet', text: clean.slice(0, 20000),
                          date: S.today(), type: type || 'text', answers: {} });
    S.save();
    paintTeacher();
    S.toast('Added — opening it now');
    setTimeout(function () { openWorksheet(0); }, 350);
    return id;
  }

  /* ── the list ────────────────────────────────────────── */
  var TYPE_ICON = { pdf: 'book', image: 'picture', text: 'list' };

  function paintTeacher() {
    var host = S.$('#teacherList');
    if (!S.P.teacher.length) {
      host.innerHTML = '<div class="empty"><p>No worksheets yet. Add one above — ' +
        'Spark will read it with you and help you answer it.</p></div>';
      return;
    }

    host.innerHTML = S.P.teacher.map(function (f, i) {
      var answered = Object.keys(f.answers || {}).filter(function (k) {
        return String(f.answers[k] || '').trim();
      }).length;
      var qs = blocksOf(f.text).filter(function (b) { return b.question; }).length;
      return '<div class="file-row">' +
        '<span class="file-ico">' + S.Pictures.icon(TYPE_ICON[f.type] || 'list', 20) + '</span>' +
        '<div class="file-meta">' +
          '<b>' + S.esc(f.name) + '</b>' +
          '<p class="sub">' + S.wordCount(f.text) + ' words' +
            (qs ? ' · ' + answered + ' of ' + qs + ' answered' : '') +
            ' · ' + S.esc(S.niceDate(f.date)) + '</p>' +
        '</div>' +
        '<button class="btn btn-sm btn-primary" data-open="' + i + '">Open</button>' +
        '<button class="icon-sq" data-del="' + i + '" aria-label="Remove">✕</button>' +
      '</div>';
    }).join('');

    S.$$('[data-open]', host).forEach(function (b) {
      b.addEventListener('click', function () { openWorksheet(+b.dataset.open); });
    });
    S.$$('[data-del]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var f = S.P.teacher[+b.dataset.del];
        if (f && f.id) delete originals[f.id];
        S.P.teacher.splice(+b.dataset.del, 1);
        S.save();
        paintTeacher();
      });
    });
  }

  /* ── reading the sheet into blocks ───────────────────── */
  var INSTRUCTION = /^(write|fill|complete|answer|explain|describe|list|name|choose|circle|underline|match|draw|tick|give|tell|sort|spell|copy|read and)\b/i;

  function isQuestionLine(l) {
    return /\?\s*$/.test(l) ||
           /_{3,}|\.{5,}/.test(l) ||
           /^\(?(q\s*)?\d{1,2}[.):]\s+\S/i.test(l) ||
           /^\(?[a-h][.)]\s+\S/i.test(l) && INSTRUCTION.test(l.replace(/^\(?[a-h][.)]\s+/i, '')) ||
           INSTRUCTION.test(l) && l.split(/\s+/).length >= 3;
  }

  function blocksOf(text) {
    var lines = String(text || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    /* an old single-paragraph entry: split it into sentences */
    if (lines.length === 1 && S.wordCount(lines[0]) > 30) lines = S.toSentences(lines[0]);
    return lines.map(function (l) {
      var heading = l.length < 60 && (/:$/.test(l) || (l === l.toUpperCase() && /[A-Z]/.test(l)));
      return { text: l, question: !heading && isQuestionLine(l), heading: heading };
    });
  }

  /* ── one worksheet, with help ────────────────────────── */
  var W = null;   /* the sheet open now */
  S.currentWorksheet = function () {
    return W && !S.$('#v-homework').hidden ? { name: W.file.name, text: W.file.text } : null;
  };

  function openWorksheet(i) {
    var f = S.P.teacher[i];
    if (!f) return;
    f.answers = f.answers || {};
    stopSheetReading();
    W = { file: f, blocks: blocksOf(f.text), tokens: [], reading: null };

    var orig = f.id && originals[f.id];
    var qCount = W.blocks.filter(function (b) { return b.question; }).length;

    var host = S.$('#hwWork');
    host.innerHTML =
      '<button class="btn btn-sm" id="wsBack">&larr; My worksheets</button>' +
      '<div class="ws-head">' +
        '<h1>' + S.esc(f.name) + '</h1>' +
        '<p class="sub">' + S.wordCount(f.text) + ' words' +
          (qCount ? ' · ' + qCount + ' thing' + (qCount > 1 ? 's' : '') + ' to answer' : '') + '</p>' +
      '</div>' +

      '<div class="ws-bar">' +
        '<button class="btn btn-primary" id="wsReadAll">' + S.Pictures.icon('speaker', 18) + ' Read it all to me</button>' +
        (orig ? '<button class="btn" id="wsOrig">' + S.Pictures.icon('picture', 18) + ' Show the page</button>' : '') +
        '<button class="btn" id="wsAsk">' + S.Pictures.icon('spark', 18) + ' Ask Spark</button>' +
      '</div>' +

      '<div class="ws-tips">' +
        '<span>' + S.Pictures.icon('book', 16) + ' Tap a word for help</span>' +
        '<span>' + S.Pictures.icon('speaker', 16) + ' Hear one line</span>' +
        (qCount ? '<span>' + S.Pictures.icon('pencil', 16) + ' Type or ' +
                  S.Pictures.icon('mic', 16) + ' say your answer</span>' : '') +
      '</div>' +

      '<div class="ws-orig" id="wsOrigBox" hidden></div>' +

      '<div class="ws-sheet" id="wsSheet">' +
        W.blocks.map(function (b, bi) {
          return '<div class="ws-block' + (b.question ? ' is-q' : '') + (b.heading ? ' is-h' : '') +
                 '" data-block="' + bi + '">' +
            '<div class="ws-line">' +
              '<button class="icon-sq ws-say" data-sayblock="' + bi + '" aria-label="Hear this line">' +
                S.Pictures.icon('speaker', 18) + '</button>' +
              '<p class="ws-text prose" data-text="' + bi + '"></p>' +
            '</div>' +
            (b.question
              ? '<div class="ws-answer">' +
                  '<label class="ws-ans-label" for="ans' + bi + '">Your answer</label>' +
                  '<div class="ws-ans-row">' +
                    '<textarea class="inp ws-ans" id="ans' + bi + '" data-ans="' + bi + '" rows="2" ' +
                      'spellcheck="false">' + S.esc(f.answers[bi] || '') + '</textarea>' +
                    '<div class="ws-ans-tools">' +
                      '<button class="mic" data-ansmic="' + bi + '" aria-label="Say your answer">' +
                        S.Pictures.icon('mic', 18) + '</button>' +
                      '<button class="icon-sq" data-hearans="' + bi + '" aria-label="Hear my answer">' +
                        S.Pictures.icon('speaker', 18) + '</button>' +
                    '</div>' +
                  '</div>' +
                '</div>'
              : '') +
          '</div>';
        }).join('') +
      '</div>';

    /* words as tappable .w spans, so the word card and hover tip work */
    W.blocks.forEach(function (b, bi) {
      var p = host.querySelector('[data-text="' + bi + '"]');
      b.tokens = [];
      b.text.split(/\s+/).forEach(function (raw) {
        if (!raw) return;
        var span = document.createElement('span');
        span.className = 'w';
        span.textContent = raw;
        var clean = S.norm(raw);
        if (clean && S.P.words[clean] && S.P.words[clean].stalled >= 2) span.classList.add('tricky');
        p.appendChild(span);
        p.appendChild(document.createTextNode(' '));
        var tok = { raw: raw, clean: clean, el: span, block: bi };
        b.tokens.push(tok);
        W.tokens.push(tok);
      });
    });
    S.Pictures.warm(W.tokens.map(function (t) { return t.clean; }));

    S.$('#hwHome').hidden = true;
    host.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    wireWorksheet(host);
  }

  function closeWorksheet() {
    stopSheetReading();
    W = null;
    S.$('#hwWork').hidden = true;
    S.$('#hwWork').innerHTML = '';
    S.$('#hwHome').hidden = false;
    paintTeacher();
  }
  S.closeWorksheet = closeWorksheet;

  function clearSaying() {
    S.$$('#wsSheet .w.saying').forEach(function (e) { e.classList.remove('saying'); });
    S.$$('#wsSheet .ws-block.reading').forEach(function (e) { e.classList.remove('reading'); });
  }

  function stopSheetReading() {
    if (W && W.reading) { W.reading.stop(); W.reading = null; }
    S.stopSaying();
    clearSaying();
    var b = S.$('#wsReadAll');
    if (b) { b.innerHTML = S.Pictures.icon('speaker', 18) + ' Read it all to me'; b.dataset.active = ''; }
  }

  /** Read a list of tokens aloud, lighting each word as it is said. */
  function readTokens(tokens, onDone) {
    stopSheetReading();
    if (!tokens.length) return;
    var text = tokens.map(function (t) { return t.raw; }).join(' ');
    W.reading = S.readAlong(text, {
      onWord: function (i) {
        clearSaying();
        var t = tokens[i];
        if (!t) return;
        t.el.classList.add('saying');
        var blk = t.el.closest('.ws-block');
        if (blk) blk.classList.add('reading');
        var r = t.el.getBoundingClientRect();
        if (r.top < 90 || r.bottom > window.innerHeight - 90) {
          t.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      },
      onEnd: function (sawWords) {
        /* no word timing in this browser: light whole lines instead */
        if (!sawWords && W && W.reading) {
          var blocks = [];
          tokens.forEach(function (t) { if (blocks.indexOf(t.block) < 0) blocks.push(t.block); });
          S.sayEach(blocks.map(function (bi) { return W.blocks[bi].text; }), function (k) {
            clearSaying();
            var el = S.$('#wsSheet [data-block="' + blocks[k] + '"]');
            if (el) el.classList.add('reading');
          });
          W.reading = { stop: S.stopSaying };
          return;
        }
        clearSaying();
        if (W) W.reading = null;
        if (onDone) onDone();
      }
    });
  }

  function wireWorksheet(host) {
    S.$('#wsBack').addEventListener('click', closeWorksheet);

    S.$('#wsReadAll').addEventListener('click', function () {
      var b = S.$('#wsReadAll');
      if (b.dataset.active === '1') { stopSheetReading(); return; }
      readTokens(W.tokens, stopSheetReading);
      b.dataset.active = '1';
      b.innerHTML = S.Pictures.icon('stop', 18) + ' Stop';
    });

    S.$('#wsAsk').addEventListener('click', function () {
      S.openChat('About "' + W.file.name + '"');
    });

    var origBtn = S.$('#wsOrig');
    if (origBtn) origBtn.addEventListener('click', toggleOriginal);

    host.addEventListener('click', function (e) {
      var line = e.target.closest('[data-sayblock]');
      if (line) { readTokens(W.blocks[+line.dataset.sayblock].tokens); return; }

      var hear = e.target.closest('[data-hearans]');
      if (hear) {
        var said = S.$('[data-ans="' + hear.dataset.hearans + '"]').value.trim();
        if (said) S.say(said); else S.say('You have not written an answer yet.');
        return;
      }

      var mic = e.target.closest('[data-ansmic]');
      if (mic) {
        S.dictateInto(S.$('[data-ans="' + mic.dataset.ansmic + '"]'), mic);
      }
    });

    /* answers are saved as they are written */
    var saveTimer = null;
    host.addEventListener('input', function (e) {
      var box = e.target.closest('[data-ans]');
      if (!box || !W) return;
      W.file.answers[box.dataset.ans] = box.value;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(S.save, 400);
    });

    /* finishing an answer earns a spark, once per question */
    host.addEventListener('change', function (e) {
      var box = e.target.closest('[data-ans]');
      if (!box || !W) return;
      W.file.answered = W.file.answered || {};
      if (box.value.trim().split(/\s+/).length >= 2 && !W.file.answered[box.dataset.ans]) {
        W.file.answered[box.dataset.ans] = 1;
        S.save();
        S.award(2, 'Answered a question');
      }
    });
  }

  /* The original page, beside the helped version, for anything
     the text alone cannot carry — a diagram, a table, a picture. */
  async function toggleOriginal() {
    var box = S.$('#wsOrigBox');
    var btn = S.$('#wsOrig');
    if (!box.hidden) {
      box.hidden = true;
      btn.innerHTML = S.Pictures.icon('picture', 18) + ' Show the page';
      return;
    }
    box.hidden = false;
    btn.innerHTML = S.Pictures.icon('close', 18) + ' Hide the page';
    if (box.dataset.filled === '1') return;

    var orig = originals[W.file.id];
    if (!orig) { box.innerHTML = '<p class="sub">The page is only kept until you close Spark.</p>'; return; }

    if (orig.kind === 'image') {
      box.innerHTML = '<img src="' + orig.url + '" alt="The worksheet page">';
    } else {
      box.innerHTML = '<div class="hw-loading"><span class="pic-wait"></span><span>Drawing the page…</span></div>';
      try {
        var pages = await pdfPageImages(orig.pdf, 10);
        box.innerHTML = '';
        pages.forEach(function (c) { box.appendChild(c); });
      } catch (e) {
        box.innerHTML = '<p class="sub">Couldn\'t draw that page.</p>';
      }
    }
    box.dataset.filled = '1';
  }

  /* ── wiring ─────────────────────────────────────────── */
  S.wireHomework = function () {
    S.$$('.hw-tab').forEach(function (tab) {
      tab.addEventListener('click', function () { showHwTab(tab.dataset.hw); });
    });
    S.$('#hwSpark').addEventListener('click', function (e) {
      var b = e.target.closest('[data-hwtab]');
      if (b) showHwTab(b.dataset.hwtab);
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
        '<h2>Paste the worksheet</h2>' +
        '<p class="sub">Copy it from the email or website and paste it here.</p>' +
        '<input class="inp" id="pName" placeholder="What is it called?" style="margin-bottom:10px">' +
        '<textarea class="inp" id="pText" placeholder="Paste the worksheet here…"></textarea>' +
        '<div class="toolbar" style="margin:16px 0 0">' +
          '<button class="btn btn-primary" id="pSave">Add it</button>' +
          '<button class="btn" data-close>Cancel</button>' +
        '</div>',
        function () {
          S.$('#pSave').addEventListener('click', function () {
            var t = S.$('#pText').value;
            var n = S.$('#pName').value.trim() || 'Worksheet';
            S.closeSheet();
            addTeacherText(n, t, 'text');
          });
          setTimeout(function () { S.$('#pText').focus(); }, 100);
        }
      );
    });
  };

  function showHwTab(which) {
    S.$$('.hw-tab').forEach(function (t) {
      t.setAttribute('aria-selected', String(t.dataset.hw === which));
    });
    S.$('#hwSpark').hidden   = which !== 'spark';
    S.$('#hwTeacher').hidden = which !== 'teacher';
  }
  S.showHwTab = showHwTab;

})(window.Spark);
