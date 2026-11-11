/* ============================================================
   describe.js — "Describe a picture".

   Three clear steps, so the child always knows what to do next:

     1 FILL THE GAPS   A short description of the picture with gaps.
                       Describing words wait in a word bank; drag one
                       into a gap, or tap a word then tap a gap. Every
                       word is read aloud when touched. Stuck? Sparky
                       suggests a word that fits the next gap.
     2 LISTEN          The finished description is read back, each
                       word lit as it is said. Does it sound right?
     3 WRITE IT        Now the child writes it themselves, one
                       sentence at a time — LOOK at it, COVER it,
                       WRITE it, CHECK it: the classic way children
                       with dyslexia learn to spell. Feedback is a
                       soft highlight and a peek, never a red mark.

   Everything measurable goes to the database: hints, peeks, the
   letter mix-ups in what they wrote, and each finished sentence.
   ============================================================ */

(function (S) {
  'use strict';

  /* A gap is {first|second|third}: the words that suit it, best first. */
  var PICTURES = [
    { scene: 0, title: 'The sleepy cat', lines: [
        'Once there was a {orange|furry|sleepy} cat who lived in a {cozy|warm|little} house.',
        'It had {soft|fluffy|orange} fur and {sleepy|green|bright} eyes.',
        'It was napping on a {blue|soft|comfy} sofa.'],
      extra: ['happy', 'quiet'] },
    { scene: 3, title: 'The busy bee', lines: [
        'One {sunny|bright|warm} day, a {busy|tiny|buzzy} bee flew into the garden.',
        'It had {yellow|black|fuzzy} stripes and {shiny|tiny|clear} wings.',
        'It landed on a {pink|pretty|big} flower.'],
      extra: ['happy', 'green'] },
    { scene: 1, title: 'The brave boat', lines: [
        'On a {stormy|dark|windy} night, a {small|brave|little} boat sailed on the sea.',
        'The {wild|big|rough} waves rocked it from side to side.',
        'A {tall|bright|white} lighthouse showed the way home.'],
      extra: ['cold', 'strong'] },
    { scene: 2, title: 'Launch day', lines: [
        'On a {starry|clear|dark} night, a {huge|shiny|white} rocket stood ready.',
        'It had {red|pointy|strong} fins and a {round|blue|small} window.',
        'It blasted off into the {dark|quiet|starry} sky.'],
      extra: ['loud', 'fast'] },
    { scene: 4, title: 'The big match', lines: [
        'On a {sunny|bright|warm} afternoon, a {fast|round|spinning} ball flew across the grass.',
        'It zoomed into the {big|white|wide} goal.',
        'The {happy|loud|excited} crowd gave a big cheer.'],
      extra: ['green', 'tired'] },
    { scene: 5, title: 'The little bird', lines: [
        'On a {cold|frosty|quiet} morning, a {little|blue|tiny} bird hopped across the snow.',
        'It had {soft|fluffy|blue} feathers and a {tiny|orange|sharp} beak.',
        'The {white|deep|soft} snow sparkled all around.'],
      extra: ['happy', 'gentle'] }
  ];
  S.DESCRIBE = PICTURES;

  var COLOURS = ['c-teal', 'c-amber', 'c-green', 'c-orange', 'c-yellow', 'c-blue', 'c-coral', 'c-peach'];
  var X = null;   /* the picture in progress */

  function done() { return (S.P.describeDone = S.P.describeDone || {}); }

  /** Parse a line into text pieces and gaps. */
  function parse(line) {
    var out = [], re = /\{([^}]+)\}/g, last = 0, m;
    while ((m = re.exec(line))) {
      if (m.index > last) out.push({ text: line.slice(last, m.index) });
      out.push({ gap: true, fits: m[1].split('|') });
      last = re.lastIndex;
    }
    if (last < line.length) out.push({ text: line.slice(last) });
    return out;
  }

  S.openDescribe = function (index) {
    if (index == null) {
      index = PICTURES.findIndex(function (p, i) { return !done()[i]; });
      if (index < 0) index = 0;
    }
    var p = PICTURES[index];
    var lines = p.lines.map(parse);
    var gaps = [];
    lines.forEach(function (l, li) { l.forEach(function (piece) { if (piece.gap) { piece.id = gaps.length; piece.li = li; gaps.push(piece); } }); });

    /* the bank: one word that fits each gap, plus a few more */
    var bank = [];
    gaps.forEach(function (g) { g.fits.forEach(function (w) { if (bank.indexOf(w) < 0) bank.push(w); }); });
    bank = S.shuffle(bank.concat(p.extra.filter(function (w) { return bank.indexOf(w) < 0; })));

    X = { index: index, p: p, lines: lines, gaps: gaps, bank: bank, fill: {}, selected: null,
          step: 1, writeLine: 0, peeks: 0, checks: 0, help: [] };
    if (S.$('#v-write').hidden) S.go('write');
    S.DB.startSession({ world: 'practice', mode: 'write' });
    S.openWriteActivity('describe');
    paint();
  };

  S.closeDescribe = function () {
    if (!X) return;
    X.help.forEach(function (h) { if (h.open) h.close(); });
    if (S.DB.session()) S.DB.endSession({ completed: false });
    X = null;
  };

  /* "a" before a gap becomes "an" when the chosen word starts with a
     vowel sound — any word can go in any gap, so the article follows. */
  function textBefore(l, i) {
    var piece = l[i], next = l[i + 1];
    if (!next || !next.gap) return piece.text;
    var w = X.fill[next.id];
    if (!w) return piece.text;
    var an = /^[aeiou]/i.test(w);
    return piece.text.replace(/\b([Aa])n? $/, function (m, a) { return a + (an ? 'n ' : ' '); });
  }

  function sentence(li) {
    var l = X.lines[li];
    return l.map(function (piece, i) { return piece.gap ? (X.fill[piece.id] || '…') : textBefore(l, i); }).join('');
  }
  function fullText() { return X.lines.map(function (l, i) { return sentence(i); }).join(' '); }
  function allFilled() { return X.gaps.every(function (g) { return X.fill[g.id]; }); }

  /* ── the page ───────────────────────────────────────── */
  function paint() {
    var n = PICTURES.length;
    var host = S.$('#writeDescribe');
    host.innerHTML =
      '<button class="btn btn-sm" data-write-back>&larr; Let\'s write</button>' +
      '<div class="desc-top">' +
        '<span class="desc-star">' + S.Pictures.icon('spark', 20) + '</span>' +
        '<div class="desc-bar"><i style="width:' + Math.round((Object.keys(done()).length) / n * 100) + '%"></i></div>' +
        '<span class="desc-count">' + (X.index + 1) + ' / ' + n + '</span>' +
      '</div>' +
      '<div class="desc-steps">' + ['Fill the gaps', 'Listen', 'Write it yourself'].map(function (t, i) {
        return '<span class="dstep" data-state="' + (i + 1 < X.step ? 'done' : i + 1 === X.step ? 'now' : '') + '"><i>' + (i + 1) + '</i>' + t + '</span>';
      }).join('') + '</div>' +
      '<div class="desc-grid">' +
        '<div class="desc-main">' +
          '<div class="desc-pic">' + S.Pictures.scene(S.PROMPTS[X.p.scene].scene) +
            '<button class="desc-hear-pic" id="dsHearAll" aria-label="Hear it">' + S.Pictures.icon('speaker', 18) + '</button></div>' +
          '<div id="dsBody"></div>' +
        '</div>' +
        '<aside class="desc-side">' +
          '<div class="helper">' +
            '<div class="helper-bubble"><p id="dsHelperText">' + helperText() + '</p>' +
              (X.step === 1 ? '<button class="btn btn-sm btn-primary" id="dsHint">Give me a hint</button>' : '') +
            '</div>' +
            '<span class="helper-bot">' + S.mascot(84, 'bob') + '</span>' +
          '</div>' +
        '</aside>' +
      '</div>';

    host.querySelector('#dsHearAll').addEventListener('click', function () {
      S.say(X.step === 1 ? fullText().replace(/…/g, 'blank') : fullText());
    });
    var hint = host.querySelector('#dsHint');
    if (hint) hint.addEventListener('click', giveHint);

    if (X.step === 1) paintFill();
    else if (X.step === 2) paintListen();
    else paintWrite();
  }

  function helperText() {
    if (X.step === 1) return 'Need help? I can suggest a word!';
    if (X.step === 2) return 'Listen. Does it sound like the picture?';
    return 'Look at it, cover it, then write it. You can peek!';
  }

  /* ── step 1: fill the gaps ───────────────────────────── */
  function paintFill() {
    var used = {};
    Object.keys(X.fill).forEach(function (k) { used[X.fill[k]] = (used[X.fill[k]] || 0) + 1; });

    S.$('#dsBody').innerHTML =
      '<section class="desc-box bank-box"><span class="desc-label">Word bank — drag or tap a describing word</span>' +
        '<div class="chips">' + X.bank.map(function (w, i) {
          var isUsed = used[w];
          return '<button class="chip-word ' + COLOURS[i % COLOURS.length] + (isUsed ? ' used' : '') +
            (X.selected === w ? ' picked' : '') + '" draggable="' + (!isUsed) + '" data-word="' + S.esc(w) + '"' +
            (isUsed ? ' disabled' : '') + '>' + S.esc(w) + '</button>';
        }).join('') + '</div>' +
      '</section>' +
      '<section class="desc-box"><span class="desc-label">Create your description</span>' +
        '<p class="desc-text">' + X.lines.map(function (l) {
          return l.map(function (piece, pi) {
            if (!piece.gap) return S.esc(textBefore(l, pi));
            var w = X.fill[piece.id];
            return '<button class="gap' + (w ? ' filled' : '') + '" data-gap="' + piece.id + '">' + (w ? S.esc(w) : '') + '</button>';
          }).join('');
        }).join(' ') + '</p>' +
        '<div class="desc-actions">' +
          '<button class="btn" id="dsSpeak">' + S.Pictures.icon('speaker', 18) + ' Speak text</button>' +
          '<button class="btn btn-primary" id="dsSubmit"' + (allFilled() ? '' : ' disabled') + '>Done ✓</button>' +
          '<button class="btn" id="dsReset">Start over</button>' +
        '</div>' +
      '</section>';

    S.$$('#dsBody .chip-word').forEach(function (c) {
      c.addEventListener('click', function () {
        X.selected = X.selected === c.dataset.word ? null : c.dataset.word;
        S.say(c.dataset.word);
        S.$$('#dsBody .chip-word').forEach(function (o) { o.classList.toggle('picked', o.dataset.word === X.selected); });
        /* with a word picked, the first empty gap glows as the place to put it */
        S.$$('#dsBody .gap').forEach(function (g) { g.classList.toggle('ready', !!X.selected && !X.fill[g.dataset.gap]); });
      });
      c.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', c.dataset.word); S.say(c.dataset.word); });
    });
    S.$$('#dsBody .gap').forEach(function (g) {
      g.addEventListener('click', function () {
        var id = +g.dataset.gap;
        if (X.fill[id]) { delete X.fill[id]; paintFill(); return; }       /* tap a filled gap to send the word back */
        if (X.selected) place(id, X.selected);
      });
      g.addEventListener('dragover', function (e) { e.preventDefault(); g.classList.add('over'); });
      g.addEventListener('dragleave', function () { g.classList.remove('over'); });
      g.addEventListener('drop', function (e) { e.preventDefault(); place(+g.dataset.gap, e.dataTransfer.getData('text/plain')); });
    });
    S.$('#dsSpeak').addEventListener('click', function () { S.say(fullText().replace(/…/g, 'blank')); });
    S.$('#dsReset').addEventListener('click', function () { X.fill = {}; X.selected = null; paintFill(); });
    S.$('#dsSubmit').addEventListener('click', function () {
      X.help.forEach(function (h) { if (h.open) h.resolve(); });
      X.help = [];
      X.step = 2; paint();
      setTimeout(listen, 300);
    });
  }

  function place(id, word) {
    if (!word) return;
    X.fill[id] = word;
    X.selected = null;
    /* read the whole sentence back, with the new word in it */
    S.say(sentence(X.gaps[id].li).replace(/…/g, 'blank'));
    paintFill();
  }

  function giveHint() {
    var gap = X.gaps.filter(function (g) { return !X.fill[g.id]; })[0];
    if (!gap) { S.$('#dsHelperText').textContent = 'Every gap is filled! Press Done.'; return; }
    var used = Object.keys(X.fill).map(function (k) { return X.fill[k]; });
    var word = gap.fits.filter(function (w) { return used.indexOf(w) < 0; })[0] || gap.fits[0];
    X.help.push(S.DB.help({ rung: 'cue', cue_type: 'visual', word: word, confusion_class: 'none' }));
    S.$('#dsHelperText').textContent = 'Try "' + word + '" in the glowing gap!';
    S.say('Try ' + word + '.');
    S.$$('#dsBody .gap').forEach(function (g) { g.classList.toggle('ready', +g.dataset.gap === gap.id); });
    S.$$('#dsBody .chip-word').forEach(function (c) { c.classList.toggle('hint', c.dataset.word === word); });
  }

  /* ── step 2: listen ──────────────────────────────────── */
  function paintListen() {
    var words = fullText().split(/\s+/);
    S.$('#dsBody').innerHTML =
      '<section class="desc-box"><span class="desc-label">Your description</span>' +
        '<p class="desc-text listen">' + words.map(function (w, i) {
          return '<span class="lw" data-lw="' + i + '">' + S.esc(w) + '</span>';
        }).join(' ') + '</p>' +
        '<div class="desc-actions">' +
          '<button class="btn" id="dsListen">' + S.Pictures.icon('speaker', 18) + ' Hear it again</button>' +
          '<button class="btn btn-primary" id="dsYes">Sounds right — let me write it →</button>' +
          '<button class="btn" id="dsChange">Change words</button>' +
        '</div>' +
      '</section>';
    S.$('#dsListen').addEventListener('click', listen);
    S.$('#dsYes').addEventListener('click', function () { X.step = 3; X.writeLine = 0; paint(); });
    S.$('#dsChange').addEventListener('click', function () { X.step = 1; paint(); });
  }

  function listen() {
    var text = fullText();
    S.readAlong(text, {
      onWord: function (i) {
        S.$$('.lw.saying').forEach(function (e) { e.classList.remove('saying'); });
        var el = S.$('.lw[data-lw="' + i + '"]'); if (el) el.classList.add('saying');
      },
      onEnd: function () { S.$$('.lw.saying').forEach(function (e) { e.classList.remove('saying'); }); }
    });
  }

  /* ── step 3: look, cover, write, check ───────────────── */
  function paintWrite() {
    var li = X.writeLine, target = sentence(li);
    X.checks = 0;
    S.$('#dsBody').innerHTML =
      '<section class="desc-box"><span class="desc-label">Sentence ' + (li + 1) + ' of ' + X.lines.length + '</span>' +
        '<div class="lcwc">' + ['Look', 'Cover', 'Write', 'Check'].map(function (t, i) {
          return '<span data-lc="' + i + '">' + t + '</span>';
        }).join('') + '</div>' +
        '<p class="desc-text copy" id="dsCopy">' + S.esc(target) + '</p>' +
        '<div class="desc-actions" id="dsLookBar">' +
          '<button class="btn" id="dsHearLine">' + S.Pictures.icon('speaker', 18) + ' Hear it</button>' +
          '<button class="btn btn-primary" id="dsCover">I\'ve looked — cover it</button>' +
        '</div>' +
        '<div id="dsWriteArea" hidden>' +
          '<textarea class="inp dict-in" id="dsIn" rows="2" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>' +
          '<div class="desc-actions">' +
            '<button class="btn btn-primary" id="dsCheck">Check ✓</button>' +
            '<button class="btn" id="dsPeek">' + S.Pictures.icon('picture', 16) + ' Peek</button>' +
            '<button class="btn" id="dsHearLine2">' + S.Pictures.icon('speaker', 16) + ' Hear it</button>' +
          '</div>' +
          '<div id="dsResult"></div>' +
        '</div>' +
      '</section>';
    lc(0);
    S.say(target);
    S.$('#dsHearLine').addEventListener('click', function () { S.say(target); });
    S.$('#dsHearLine2').addEventListener('click', function () { S.say(target); });
    S.$('#dsCover').addEventListener('click', function () {
      S.$('#dsCopy').classList.add('covered');
      S.$('#dsLookBar').hidden = true;
      S.$('#dsWriteArea').hidden = false;
      lc(2);
      setTimeout(function () { S.$('#dsIn').focus(); }, 60);
    });
    S.$('#dsPeek').addEventListener('click', function () {
      X.peeks++;
      var h = S.DB.help({ rung: 'prompt', cue_type: 'visual', word: target, confusion_class: 'none' });
      X.help.push(h);
      var copy = S.$('#dsCopy');
      copy.classList.remove('covered');
      setTimeout(function () { if (copy) copy.classList.add('covered'); }, 3000);
    });
    S.$('#dsCheck').addEventListener('click', function () { check(target); });
    S.$('#dsIn').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); check(target); } });
  }

  function lc(n) { S.$$('[data-lc]').forEach(function (e) { e.dataset.on = +e.dataset.lc <= n ? '1' : ''; }); }

  function words(s) { return String(s || '').trim().split(/\s+/).filter(Boolean).map(S.norm).filter(Boolean); }

  function check(target) {
    var typed = S.$('#dsIn').value.trim();
    if (!typed) { S.say('Write the sentence first.'); return; }
    lc(3);
    X.checks++;
    var want = words(target), got = words(typed);
    /* words compared in order, allowing for one missed or extra word */
    var off = [], gi = 0;
    want.forEach(function (w, wi) {
      if (got[gi] === w) { gi++; return; }
      if (got[gi + 1] === w) { gi += 2; return; }               /* an extra word */
      if (got[gi] && want[wi + 1] === got[gi]) { off.push({ want: w, got: null }); return; }   /* a missed word */
      off.push({ want: w, got: got[gi] || null }); gi++;
    });

    if (X.checks === 1) {
      off.forEach(function (o) {
        if (!o.got) return;
        var a = S.Analysis.analyseMisread(o.got, o.want);
        if (a) {
          S.DB.confusion(a, { mode: 'write', detected_by: 'copy' });
          S.Analysis.recordMisread(a, { source: 'writing', sentence: target, passage: 'Describe: ' + X.p.title });
        }
      });
    }

    if (!off.length || X.checks >= 3) {
      if (off.length) S.DB.help({ rung: 'supply', cue_type: 'visual', word: target, confusion_class: 'none' }).close();
      X.help.forEach(function (h) { if (h.open) h.resolve(); });
      X.help = [];
      S.DB.submission({ mode: 'write', word_count: got.length, sentence_text: typed,
                        accuracy_pct: want.length ? (want.length - off.length) / want.length * 100 : null });
      S.$('#dsResult').innerHTML = '<div class="dict-result good"><p class="dict-note">' +
        (off.length ? 'Here it is: <b class="dict-answer">' + S.esc(target) + '</b>' : 'Lovely writing!') + '</p></div>';
      S.say(off.length ? target : 'Lovely writing!');
      setTimeout(nextLine, off.length ? 2600 : 1100);
      return;
    }

    var lookAgain = off.map(function (o) { return o.got || o.want; });
    S.$('#dsResult').innerHTML = '<div class="dict-result"><p class="dict-words">' + words(typed).map(function (w) {
        return '<span class="dw ' + (lookAgain.indexOf(w) > -1 ? 'look' : 'ok') + '">' + S.esc(w) + '</span>';
      }).join(' ') + '</p><p class="dict-note">Nearly! Peek at the sentence and look at the highlighted word' +
      (off.length > 1 ? 's' : '') + '.</p></div>';
    S.say('Nearly! Have a peek.');
  }

  function nextLine() {
    if (!X) return;
    if (X.writeLine < X.lines.length - 1) { X.writeLine++; paint(); return; }
    finish();
  }

  function finish() {
    var text = fullText();
    done()[X.index] = S.today();
    S.P.writings.unshift({ date: S.today(), prompt: X.p.title, kind: 'describe', text: text });
    S.P.writings = S.P.writings.slice(0, 60);
    S.bumpStreak();
    S.save();
    S.DB.endSession({ words: text.split(/\s+/).length, exposures: S.exposureOf(text) });
    S.award(5, 'Picture described');
    var idx = X.index;
    X = null;
    var next = PICTURES.findIndex(function (p, i) { return !done()[i]; });
    S.$('#writeDescribe').innerHTML =
      '<section class="card done-card">' +
        '<span class="done-mascot">' + S.mascot(90, 'happy') + '</span>' +
        '<h1>You described the picture!</h1>' +
        '<p class="desc-text final">' + S.esc(text) + '</p>' +
        '<div class="toolbar" style="justify-content:center;margin:14px 0 0">' +
          '<button class="btn" id="dsHearFinal">' + S.Pictures.icon('speaker', 16) + ' Hear it</button>' +
          (next > -1 ? '<button class="btn btn-primary" id="dsNext">Next picture →</button>' : '') +
          '<button class="btn" data-write-back>Let\'s write</button>' +
        '</div>' +
      '</section>';
    S.say('You described the picture! Well done.');
    S.$('#dsHearFinal').addEventListener('click', function () { S.say(text); });
    var nx = S.$('#dsNext');
    if (nx) nx.addEventListener('click', function () { S.openDescribe(next); });
    return idx;
  }

})(window.Spark);
