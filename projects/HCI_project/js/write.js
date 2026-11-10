/* ============================================================
   write.js — writing, with help that is earned rather than given.

   Two deliberate choices here.

   NO PLACEHOLDERS. A greyed-out model answer sitting in the box is
   the answer. A child who finds writing hard will copy it, and
   nobody learns anything. The boxes start empty and the child has
   a go first.

   A LADDER, NOT A HANDOUT. "Stuck?" gives a little more each time
   it is pressed:

     1  the question asked a different way
     2  a cue — a picture or a spoken hint, whichever suits them
     3  a choice of two or three
     4  the answer, at last

   Which rung they got moving on is recorded, exactly as the reading
   cues are. A child who always needs rung 4 is telling you something
   a score never would.

   Checking spelling shows WHAT changed and WHY, word by word, so
   the correction teaches instead of just replacing.
   ============================================================ */

(function (S) {
  'use strict';

  var promptIndex = 0;
  var tidied = null;
  var rung = { who: 0, what: 0, where: 0 };   /* how far up the ladder each field is */

  function current() { return S.PROMPTS[promptIndex % S.PROMPTS.length]; }
  var FIELD_ID = { who: 'fWho', what: 'fWhat', where: 'fWhere' };

  /* ── which activity is open ──────────────────────────
     Write opens on a list of activities, the way Read opens on
     its library. null = the list, 'picture' or 'bank'. */
  var mode = null;

  S.paintWrite = function () {
    S.$('#writeLibrary').hidden = mode !== null;
    S.$('#writePicture').hidden = mode !== 'picture';
    S.$('#writeBank').hidden    = mode !== 'bank';

    if (mode === null) paintWriteLibrary();
    if (mode === 'picture') {
      var p = current();
      S.Pictures.render(S.$('#writePic'), p.pic);
      S.$('#writeQ').textContent = p.q;
      build();
    }
    paintSaved();
  };

  S.openWriteActivity = function (which) {
    mode = which;
    if (which !== 'bank' && S.closeBank) S.closeBank(true);
    S.paintWrite();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  S.closeWriteActivity = function () {
    S.stopSaying();
    if (S.closeBank) S.closeBank(true);
    mode = null;
    S.paintWrite();
  };

  function paintWriteLibrary() {
    var done = S.P.writings.filter(function (w) { return w.kind !== 'bank'; }).length;
    S.$('#writePictureCard').innerHTML =
      '<button class="lib-card" data-write-open="picture">' +
        '<div class="lib-top">' +
          '<span class="lib-pic">' + S.Pictures.drawn('lighthouse', 40) + '</span>' +
          '<span class="badge' + (done ? ' badge-done' : '') + '">' +
            (done ? done + ' written' : 'Picture') + '</span>' +
        '</div>' +
        '<h3>Say what you see</h3>' +
        '<p>Look at a picture. Build a sentence in 3 pieces.</p>' +
        '<span class="lib-foot">Who? · Doing? · Where?</span>' +
      '</button>';
    if (S.paintBankList) S.paintBankList();
  }

  function resetLadders() {
    rung = { who: 0, what: 0, where: 0 };
    S.$$('.field-help').forEach(function (h) { h.hidden = true; h.innerHTML = ''; });
    S.$$('.stuck').forEach(function (b) { b.textContent = 'Stuck?'; b.disabled = false; });
  }

  /* ── the help ladder ────────────────────────────────── */

  function climb(field) {
    var ladder = current().ladder && current().ladder[field];
    if (!ladder) return;

    rung[field] = Math.min(4, rung[field] + 1);
    var step = rung[field];
    var host = S.$('[data-help="' + field + '"]');
    host.hidden = false;

    /* Every rung can be SEEN and HEARD. The child chooses which —
       the words are on screen, and a speaker button reads them. */
    if (step === 1) {
      host.innerHTML = rungBox('1 of 4', 'Think',
        '<span class="rung-line">' + S.esc(ladder.prompt) + hearBtn(ladder.prompt) + '</span>');

    } else if (step === 2) {
      /* Two kinds of clue, side by side. Whichever has worked best
         for this child goes first, but both are always there. */
      var fav = S.favourite();
      var kinds = fav === 'sound' ? ['sound', 'picture'] : ['picture', 'sound'];
      host.innerHTML = rungBox('2 of 4', 'Pick a clue',
        '<div class="clue-pick">' +
          kinds.map(function (k) {
            return '<button class="clue-btn" data-clue="' + k + '">' +
              S.Pictures.icon(k === 'picture' ? 'picture' : 'speaker', 22) +
              '<span>' + (k === 'picture' ? 'See it' : 'Hear it') + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<div class="clue-out" data-clueout></div>');

    } else if (step === 3) {
      host.innerHTML = rungBox('3 of 4', 'Pick one',
        '<div class="choice-row">' +
          S.shuffle(ladder.choices.slice()).map(function (c) {
            return '<span class="choice-wrap">' +
              '<button class="choice" data-choice="' + S.esc(c) + '">' + S.esc(c) + '</button>' +
              hearBtn(c) +
            '</span>';
          }).join('') +
        '</div>');

    } else {
      host.innerHTML = rungBox('4 of 4', 'Here it is',
        '<b class="model-answer">' + S.esc(ladder.answer) + '</b>' + hearBtn(ladder.answer) +
        ' <button class="btn btn-sm" data-use="' + S.esc(ladder.answer) + '">Use this</button>');
      S.$('.stuck[data-stuck="' + field + '"]').disabled = true;
    }

    var btn = S.$('.stuck[data-stuck="' + field + '"]');
    if (btn && step < 4) btn.textContent = 'Still stuck?';
  }

  function hearBtn(text) {
    return '<button class="icon-xs" data-say="' + S.esc(text) + '" aria-label="Hear it">' +
      '<span class="i" data-icon="speaker" data-icon-size="18"></span></button>';
  }

  /** Show the clue the child picked: a picture, or the clue spoken. */
  function showClue(field, kind) {
    var ladder = current().ladder[field];
    var host = S.$('[data-help="' + field + '"] [data-clueout]');
    if (!host) return;
    S.$$('[data-help="' + field + '"] [data-clue]').forEach(function (b) {
      b.dataset.on = b.dataset.clue === kind ? '1' : '';
    });
    if (kind === 'picture') {
      host.innerHTML = '<span class="cue-pic"></span>' +
        '<span class="rung-line">' + S.esc(ladder.cue.audio) + hearBtn(ladder.cue.audio) + '</span>';
      S.Pictures.render(host.querySelector('.cue-pic'), ladder.cue.visual);
      S.useCue('picture');
    } else {
      host.innerHTML = '<span class="rung-line">' + S.esc(ladder.cue.audio) +
        ' <button class="btn btn-sm" data-replay><span class="i" data-icon="speaker" data-icon-size="18"></span> Again</button></span>';
      S.say(ladder.cue.audio);
      S.useCue('sound');
    }
  }

  function rungBox(count, title, body) {
    return '<div class="rung">' +
      '<span class="rung-n">' + count + '</span>' +
      '<div class="rung-body"><b>' + title + '</b><div>' + body + '</div></div>' +
    '</div>';
  }

  /** Record which rung finally got them writing. */
  function creditLadder(field) {
    var step = rung[field];
    if (!step) { bump('prompt', 0); return; }   /* managed alone */
    bump(['prompt', 'cue', 'choice', 'answer'][step - 1], 1);
  }
  function bump(key, n) {
    if (!n) { S.P.writeHelp.unaided = (S.P.writeHelp.unaided || 0) + 1; }
    else { S.P.writeHelp[key] = (S.P.writeHelp[key] || 0) + n; }
    S.save();
  }

  /* ── assembling the sentence ────────────────────────── */
  function build() {
    var who   = S.$('#fWho').value.trim();
    var what  = S.$('#fWhat').value.trim();
    var where = S.$('#fWhere').value.trim();

    var parts = [who, what, where].filter(Boolean);
    var s = parts.join(' ');
    if (s) {
      s = s.charAt(0).toUpperCase() + s.slice(1);
      if (!/[.!?]$/.test(s)) s += '.';
    }

    tidied = null;
    S.$('#fixList').innerHTML = '';
    var out = S.$('#sentOut');
    out.textContent = s || 'Your sentence will appear here.';
    out.classList.toggle('placeholder', !s);
    return s;
  }

  function clear() {
    Object.keys(FIELD_ID).forEach(function (f) { S.$('#' + FIELD_ID[f]).value = ''; });
    tidied = null;
    resetLadders();
    build();
  }

  /* ── saving ─────────────────────────────────────────── */
  function saveSentence() {
    var s = tidied || build();
    if (!s) { S.toast('Write something first'); return; }

    Object.keys(FIELD_ID).forEach(function (f) {
      if (S.$('#' + FIELD_ID[f]).value.trim()) creditLadder(f);
    });

    S.P.writings.unshift({ date: S.today(), prompt: current().q, text: s, kind: 'picture' });
    S.P.writings = S.P.writings.slice(0, 40);
    S.save();

    S.award(5, 'Saved your sentence');
    clear();
    paintSaved();
  }

  S.paintSaved = paintSaved;
  function paintSaved() {
    S.$$('[data-saved-list]').forEach(paintSavedInto);
  }
  function paintSavedInto(host) {
    if (!S.P.writings.length) {
      host.innerHTML = '<p class="sub" style="margin:0">Nothing saved yet. ' +
                       'Your sentences will collect here.</p>';
      return;
    }
    host.innerHTML = S.P.writings.slice(0, 6).map(function (w) {
      return '<div class="saved-item">' +
        '<button class="icon-xs" data-say="' + S.esc(w.text) + '" aria-label="Hear it"><span class="i" data-icon="speaker" data-icon-size="18"></span></button>' +
        '<span class="saved-text">' + S.esc(w.text) + '</span>' +
      '</div>';
    }).join('');
  }

  /* ── checking spelling, with reasons ────────────────── */

  /* Misspellings common enough in children's writing to be worth
     catching without a model. Each carries the reason, because a
     correction that does not explain itself teaches nothing. */
  var COMMON = {
    teh: ['the', 'The letters are t-h-e. "h" comes before "e".'],
    hte: ['the', 'The letters are t-h-e.'],
    adn: ['and', 'The letters are a-n-d.'],
    taht: ['that', 'The letters are t-h-a-t.'],
    wiht: ['with', 'The "t" goes last: w-i-t-h.'],
    thier: ['their', 'This one is "i" before "e": t-h-e-i-r.'],
    freind: ['friend', 'Remember: a friend is there to the "end".'],
    freinds: ['friends', 'Remember: a friend is there to the "end".'],
    beleive: ['believe', 'There is a "lie" in the middle of believe.'],
    recieve: ['receive', 'After "c" it is e-i: rec-ei-ve.'],
    becuase: ['because', 'Big Elephants Can Always Understand Small Elephants.'],
    becase: ['because', 'Big Elephants Can Always Understand Small Elephants.'],
    becuse: ['because', 'Big Elephants Can Always Understand Small Elephants.'],
    wich: ['which', 'It starts w-h: "which".'],
    whent: ['went', 'No "h" in went.'],
    sed: ['said', 'This one does not follow the sounds: s-a-i-d.'],
    ses: ['says', 'Another odd one: s-a-y-s.'],
    cud: ['could', 'could, would, should all end the same way: o-u-l-d.'],
    wud: ['would', 'could, would, should all end the same way: o-u-l-d.'],
    shud: ['should', 'could, would, should all end the same way: o-u-l-d.'],
    thay: ['they', 'It ends with "ey": t-h-e-y.'],
    ther: ['there', 'There needs an "e" at the end.'],
    wen: ['when', 'Question words start w-h: when, what, where.'],
    wat: ['what', 'Question words start w-h: when, what, where.'],
    wher: ['where', 'Question words start w-h: when, what, where.'],
    nite: ['night', 'This one uses "igh": n-igh-t.'],
    lite: ['light', 'This one uses "igh": l-igh-t.'],
    thru: ['through', 'The long way round: t-h-r-o-u-g-h.'],
    alot: ['a lot', '"A lot" is two separate words.'],
    happend: ['happened', 'It needs the "e": happen + ed.'],
    probaly: ['probably', 'There is a "b" before the "ly": proba-b-ly.'],
    rember: ['remember', 'There are two "m" sounds: re-mem-ber.'],
    sumthing: ['something', 'It is "some" + "thing".'],
    togther: ['together', 'to-get-her. The word "get" is inside it.'],
    tomorow: ['tomorrow', 'One "m", two "r"s: to-mor-row.'],
    seperate: ['separate', 'There is "a rat" in sep-a-rat-e.'],
    wierd: ['weird', 'This one breaks the rule: w-e-i-r-d.'],
    writting: ['writing', 'Only one "t" in writing.'],
    didnt: ["didn't", 'The apostrophe stands for the missing "o" in not.'],
    dont: ["don't", 'The apostrophe stands for the missing "o" in not.'],
    cant: ["can't", 'The apostrophe stands for the missing "no" in cannot.'],
    im: ["I'm", '"I\'m" is short for "I am", with a capital I.'],
    ive: ["I've", '"I\'ve" is short for "I have", with a capital I.'],
    u: ['you', 'Write the whole word: y-o-u.'],
    ur: ['your', 'Write the whole word: y-o-u-r.'],
    plz: ['please', 'Write the whole word: p-l-e-a-s-e.']
  };

  /* The mechanical rules and the word list — no model needed. */
  function localChecks(s) {
    var fixes = [];
    var out = s;

    /* known misspellings first, so later rules see corrected words */
    out = out.replace(/\b[A-Za-z']+\b/g, function (word) {
      var hit = COMMON[word.toLowerCase()];
      if (!hit) return word;
      var replacement = hit[0];
      /* keep the child's capitalisation */
      if (/^[A-Z]/.test(word)) {
        replacement = replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      fixes.push({ from: word, to: replacement, why: hit[1] });
      return replacement;
    });

    if (/^[a-z]/.test(out)) {
      fixes.push({ from: out.split(' ')[0], to: out.charAt(0).toUpperCase() + out.split(' ')[0].slice(1),
                   why: 'A sentence starts with a capital letter.' });
      out = out.charAt(0).toUpperCase() + out.slice(1);
    }
    if (!/[.!?]$/.test(out.trim())) {
      fixes.push({ from: '…' + out.trim().slice(-6), to: '…' + out.trim().slice(-6) + '.',
                   why: 'A sentence needs a full stop at the end.' });
      out = out.trim() + '.';
    }
    if (/\bi\b/.test(out)) {
      fixes.push({ from: 'i', to: 'I', why: '"I" is always a capital letter.' });
      out = out.replace(/\bi\b/g, 'I');
    }
    if (/  +/.test(out)) {
      fixes.push({ from: 'two spaces', to: 'one space', why: 'Only one space between words.' });
      out = out.replace(/  +/g, ' ');
    }
    return { corrected: out, fixes: fixes };
  }

  async function checkSpelling() {
    var s = build();
    if (!s) { S.toast('Write something first'); return; }

    var btn = S.$('#btnTidy');
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Checking…';

    var result = localChecks(s);

    /* an AI helper catches the actual spelling, which rules cannot */
    if (S.AI.ready) {
      try {
        var data = await S.AI.askJSON(
          'A child aged 9-14 with dyslexia wrote this sentence:\n\n"' + s + '"\n\n' +
          'Fix ONLY spelling, capital letters and punctuation. Keep their words, ' +
          'their word order and their voice. Do not make it longer or more grown-up.\n' +
          'Reply with only JSON:\n' +
          '{"corrected":string,"changes":[{"from":string,"to":string,"why":string}]}\n' +
          '"changes" lists each thing you fixed. "why" is ONE short friendly sentence ' +
          'a child understands, explaining the rule — for example ' +
          '"\\"friend\\" has the i before the e." ' +
          'If nothing needed fixing, return the sentence unchanged and an empty changes list.',
          { maxTokens: 420, temperature: 0.2 }
        );
        if (data && data.corrected) {
          result = { corrected: data.corrected,
                     fixes: Array.isArray(data.changes) ? data.changes : [] };
        }
      } catch (e) { /* keep the local result */ }
    }

    tidied = result.corrected;
    var out = S.$('#sentOut');
    out.textContent = tidied;
    out.classList.remove('placeholder');

    paintFixes(result.fixes, s === tidied);

    btn.disabled = false;
    btn.textContent = label;
  }

  function paintFixes(fixes, unchanged) {
    var host = S.$('#fixList');

    /* Be exact about what was actually checked. Claiming "all spelled
       correctly" after checking only capital letters would be a lie,
       and a child would believe it. */
    if (!fixes.length) {
      host.innerHTML = '<div class="fix-none">' +
        (S.AI.ready
          ? '✓ Nothing to fix — that all looks right.'
          : '✓ Capital letters and full stops are right.') +
        (!S.AI.ready
          ? '<p class="sub" style="margin:6px 0 0">Spark checked capitals, full stops ' +
            'and the words it knows. For a full spelling check, set up an AI helper ' +
            'in Settings.</p>'
          : '') +
      '</div>';
      return;
    }

    host.innerHTML =
      '<p class="eyebrow" style="margin:14px 0 8px">What changed</p>' +
      fixes.map(function (f) {
        return '<div class="fix">' +
          '<div class="fix-swap">' +
            '<span class="was">' + S.esc(f.from) + '</span>' +
            '<span class="arrow">→</span>' +
            '<span class="now">' + S.esc(f.to) + '</span>' +
          '</div>' +
          '<p class="fix-why">' + S.esc(f.why || '') + '</p>' +
        '</div>';
      }).join('') +
      (!S.AI.ready ? '<p class="sub" style="margin:10px 0 0">Spark checked capitals, ' +
        'full stops and the words it knows. For a full spelling check, set up an ' +
        'AI helper in Settings.</p>' : '');
  }

  /* ── wiring ─────────────────────────────────────────── */
  S.wireWrite = function () {
    Object.keys(FIELD_ID).forEach(function (f) {
      S.$('#' + FIELD_ID[f]).addEventListener('input', build);
    });

    /* the ladder, and anything the rungs offer */
    S.$('#v-write').addEventListener('click', function (e) {
      var open = e.target.closest('[data-write-open]');
      if (open) { S.openWriteActivity(open.dataset.writeOpen); return; }
      if (e.target.closest('[data-write-back]')) { S.closeWriteActivity(); return; }

      var stuck = e.target.closest('[data-stuck]');
      if (stuck) { climb(stuck.dataset.stuck); return; }

      var clue = e.target.closest('[data-clue]');
      if (clue) { showClue(clue.closest('[data-field]').dataset.field, clue.dataset.clue); return; }

      var choice = e.target.closest('[data-choice]');
      if (choice) {
        var field = choice.closest('[data-field]').dataset.field;
        S.$('#' + FIELD_ID[field]).value = choice.dataset.choice;
        build();
        S.say(choice.dataset.choice);
        return;
      }

      var use = e.target.closest('[data-use]');
      if (use) {
        var f2 = use.closest('[data-field]').dataset.field;
        S.$('#' + FIELD_ID[f2]).value = use.dataset.use;
        build();
        return;
      }

      var replay = e.target.closest('[data-replay]');
      if (replay) {
        var f3 = replay.closest('[data-field]').dataset.field;
        S.say(current().ladder[f3].cue.audio);
      }
    });

    S.$('#btnNewPrompt').addEventListener('click', function () {
      promptIndex++;
      clear();
      S.paintWrite();
    });
    S.$('#btnHearPrompt').addEventListener('click', function () { S.say(current().q); });
    S.$('#btnSaySent').addEventListener('click', function () {
      var s = tidied || build();
      if (s) S.say(s); else S.toast('Write something first');
    });
    S.$('#btnClearSent').addEventListener('click', clear);
    S.$('#btnTidy').addEventListener('click', checkSpelling);
    S.$('#btnSaveSent').addEventListener('click', saveSentence);
  };

})(window.Spark);
