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
    S.$('#writeBank').hidden    = true;
    S.$('#writeDescribe').hidden = mode !== 'describe';
    S.$('#writeDictation').hidden = mode !== 'dictation';

    if (mode === null) paintWriteLibrary();
    if (mode === 'picture') {
      var p = current();
      /* one composed scene, so everything the questions ask about
         is actually in the picture */
      S.$('#writePic').innerHTML = S.Pictures.scene(p.scene);
      S.$('#writeQ').textContent = p.q;
      build();
    }
    paintSaved();
  };

  S.openWriteActivity = function (which) {
    mode = which;
    if (which === 'picture') S.DB.startSession({ world: 'practice', mode: 'write' });
    /* writing a chapter belongs to Worlds, not to Practice */
    S.$$('.tab').forEach(function (t) {
      var on = t.dataset.go === (which === 'dictation' ? 'worlds' : 'write');
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    S.paintWrite();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  S.resetWriteMode = function () {
    if (mode === 'picture') S.DB.endSession();
    if (mode === 'describe' && S.closeDescribe) S.closeDescribe();
    if (mode === 'dictation' && S.closeDictation) S.closeDictation();
    mode = null;
  };

  S.closeWriteActivity = function () {
    S.stopSaying();
    if (mode === 'picture') S.DB.endSession();
    if (S.closeDescribe) S.closeDescribe();
    if (S.closeDictation) S.closeDictation();
    mode = null;
    S.paintWrite();
  };

  /* Two activities, numbered, each saying plainly what to do. */
  function paintWriteLibrary() {
    var dd = S.P.describeDone || {};
    var described = Object.keys(dd).length;
    var stories = S.P.writings.filter(function (w) { return w.kind === 'picture'; }).length;
    S.$('#actDescribePic').innerHTML = S.Pictures.scene(S.PROMPTS[3].scene);
    S.$('#actStoryPic').innerHTML = S.Pictures.scene(S.PROMPTS[0].scene);
    S.$('#actDescribeFoot').textContent = described ? described + ' of ' + S.DESCRIBE.length + ' pictures described' : '6 pictures to describe';
    S.$('#actStoryFoot').textContent = stories ? stories + ' sentence' + (stories > 1 ? 's' : '') + ' written' : 'Who or what? · Doing? · Where?';
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
    /* every rung shown is a row in help_events (rung 2 is logged
       when the child picks which kind of clue they want) */
    if (step !== 2) logHelp(field, ['prompt', 'cue', 'choice', 'supply'][step - 1],
                             step === 1 ? 'visual' : step === 3 ? 'choice' : 'visual');

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
    logHelp(field, 'cue', kind === 'picture' ? 'visual' : 'audio');
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
      '<button class="notnow" data-notnow>Not now</button>' +
    '</div>';
  }

  /* help rows: written when the field is used (resolved), "Not now"
     (dismissed), or the session ends (unused) */
  var helpOpen = {};
  function logHelp(field, rungName, cueType) {
    (helpOpen[field] = helpOpen[field] || []).push(
      S.DB.help({ rung: rungName, cue_type: cueType, word: field, confusion_class: 'none' }));
  }
  function settleHelp(field, how) {
    (helpOpen[field] || []).forEach(function (h) { h[how](); });
    helpOpen[field] = [];
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
      if (S.$('#' + FIELD_ID[f]).value.trim()) { creditLadder(f); settleHelp(f, 'resolve'); }
    });
    S.DB.submission({ mode: 'write', word_count: S.wordCount(s), sentence_text: s, accuracy_pct: null });

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

  /* ── checking spelling and grammar ─────────────────────
     A full spelling and grammar checker (spell.js). Shows WHAT
     changed and WHY, word by word, so the correction teaches. */
  async function checkSpelling() {
    var s = build();
    if (!s) { S.toast('Write something first'); return; }

    var btn = S.$('#btnTidy');
    var label = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = 'Checking…';

    var result = await S.checkWriting(s, { where: 'Picture story' });
    tidied = result.corrected;
    var out = S.$('#sentOut');
    out.textContent = tidied;
    out.classList.remove('placeholder');

    paintFixes(result.fixes, result.full);
    btn.disabled = false;
    btn.innerHTML = label;
  }

  S.paintFixes = paintFixes;
  function paintFixes(fixes, full, hostSel) {
    var host = S.$(hostSel || '#fixList');
    if (!fixes.length) {
      host.innerHTML = '<div class="fix-none">✓ No mistakes found — well done!' +
        (full ? '' : '<p class="sub" style="margin:6px 0 0">Only a quick check ran — Spark is offline.</p>') +
      '</div>';
      S.say('No mistakes found. Well done!');
      return;
    }
    var LABEL = { spelling: 'Spelling', grammar: 'Grammar', capital: 'Capital letter', punctuation: 'Full stop' };
    host.innerHTML =
      '<p class="eyebrow" style="margin:14px 0 8px">' + fixes.length + ' thing' + (fixes.length > 1 ? 's' : '') + ' to fix</p>' +
      fixes.map(function (f) {
        return '<div class="fix fix-' + (f.kind || 'spelling') + '">' +
          '<span class="fix-kind">' + (LABEL[f.kind] || 'Fix') + '</span>' +
          '<div class="fix-swap">' +
            '<span class="was">' + S.esc(f.from) + '</span>' +
            '<span class="arrow">→</span>' +
            '<span class="now">' + S.esc(f.to) + '</span>' +
            '<button class="icon-xs" data-say="' + S.esc(f.to + '. ' + (f.why || '')) + '" aria-label="Hear why">' +
              '<span class="i" data-icon="speaker" data-icon-size="15"></span></button>' +
          '</div>' +
          '<p class="fix-why">' + S.esc(f.why || '') + '</p>' +
        '</div>';
      }).join('') +
      (full ? '' : '<p class="sub" style="margin:10px 0 0">Only a quick check ran — Spark is offline.</p>');
  }

  /* ── wiring ─────────────────────────────────────────── */
  S.wireWrite = function () {
    Object.keys(FIELD_ID).forEach(function (f) {
      S.$('#' + FIELD_ID[f]).addEventListener('input', build);
    });

    /* the ladder, and anything the rungs offer */
    S.$('#v-write').addEventListener('click', function (e) {
      var open = e.target.closest('[data-write-open]');
      if (open) {
        if (open.dataset.writeOpen === 'describe') S.openDescribe();
        else S.openWriteActivity(open.dataset.writeOpen);
        return;
      }
      var dict = e.target.closest('[data-dictation]');
      if (dict) { S.openDictation(dict.dataset.dictation); return; }

      if (e.target.closest('[data-write-back]')) { S.closeWriteActivity(); return; }

      var stuck = e.target.closest('[data-stuck]');
      if (stuck) { climb(stuck.dataset.stuck); return; }

      var nn = e.target.closest('[data-notnow]');
      if (nn) {
        var fieldEl = nn.closest('[data-field]');
        if (fieldEl) {
          settleHelp(fieldEl.dataset.field, 'dismiss');
          var hb = fieldEl.querySelector('.field-help');
          hb.hidden = true; hb.innerHTML = '';
        }
        return;
      }

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
