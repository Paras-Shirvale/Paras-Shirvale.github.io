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

  /* Which picture story the child is on. Remembered, so the tile on
     Let's write and the page it opens always show the same picture. */
  function storyIdx() { return S.P.storyIndex || 0; }
  function storyDone(i) { return !!(S.P.storyDone && S.P.storyDone[i == null ? storyIdx() : i]); }
  var tidied = null;
  var rung = { who: 0, what: 0, where: 0 };   /* how far up the ladder each field is */

  function current() { return S.PROMPTS[storyIdx() % S.PROMPTS.length]; }

  /* Both writing activities are open to every child. */
  S.writeActivities = function () { return ['describe', 'story']; };   /* everyone gets both */
  var FIELD_ID = { who: 'fWho', what: 'fWhat', where: 'fWhere' };
  var FIELDS = ['who', 'what', 'where'];     /* the three answer boxes, in order */

  /* the three questions for the picture on screen, and the ladder for one */
  function qs() { return S.pictureQs(storyIdx()); }
  function qOf(field) { return qs()[FIELDS.indexOf(field)]; }
  function ladderOf(field) { return qOf(field).ladder; }

  /* put this picture's own questions on the page */
  function paintQuestions() {
    var q = qs();
    [['qWho', 0], ['qWhat', 1], ['qWhere', 2]].forEach(function (x) {
      S.$('#' + x[0]).textContent = q[x[1]].q;
      S.$('#' + x[0] + 'Say').dataset.say = q[x[1]].q;
    });
  }

  /* the model writes better, picture-specific questions; swap them in
     only if the child has not started answering */
  function upgradeQuestions() {
    var at = storyIdx();
    if (S.P.storyQs && S.P.storyQs[at % S.PROMPTS.length]) return;
    S.refreshPictureQs(at).then(function (got) {
      if (!got || mode !== 'picture' || storyIdx() !== at) return;
      var untouched = FIELDS.every(function (f) { return !S.$('#' + FIELD_ID[f]).value.trim() && !rung[f]; });
      if (untouched) paintQuestions();
    });
  }

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
      paintQuestions();
      upgradeQuestions();
      /* "Next picture" only appears once this one is written */
      S.$('#btnNewPrompt').hidden = !storyDone();
    }
    paintSaved();
  };

  S.openWriteActivity = function (which) {
    mode = which;
    if (which === 'picture') S.DB.startSession({ world: 'practice', mode: 'write' });
    /* every visit starts with empty boxes and no help showing */
    if (which === 'picture') {
      FIELDS.forEach(function (f) { S.$('#' + FIELD_ID[f]).value = ''; });
      tidied = null;
      resetLadders();
    }
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
    /* each tile shows the picture that will actually open */
    S.$('#actDescribePic').innerHTML = S.Pictures.scene(S.PROMPTS[S.DESCRIBE[S.describeNext()].scene].scene);
    S.$('#actStoryPic').innerHTML = S.Pictures.scene(current().scene);
    var acts = S.writeActivities();
    S.$('.act-story').hidden = acts.indexOf('story') < 0;
    S.$('.write-acts').classList.toggle('one', acts.length === 1);
    S.$('#actDescribeFoot').textContent = described ? described + ' of ' + S.DESCRIBE.length + ' pictures described' : '6 pictures to describe';
    S.$('#actStoryFoot').textContent = stories ? stories + ' picture' + (stories > 1 ? 's' : '') + ' written' : '3 questions about each picture';
  }

  function resetLadders() {
    rung = { who: 0, what: 0, where: 0 };
    S.$$('.field-help').forEach(function (h) { h.hidden = true; h.innerHTML = ''; });
    S.$$('.stuck').forEach(function (b) { b.textContent = 'Stuck?'; b.disabled = false; });
  }

  /* ── the help ladder ────────────────────────────────── */

  function climb(field) {
    var ladder = ladderOf(field);
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
    var ladder = ladderOf(field);
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
      S.DB.help({ rung: rungName, cue_type: cueType, word: qOf(field).q, confusion_class: 'none' }));
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

  /* ── the answers ────────────────────────────────────
     Three boxes, one per question. Each answer goes into its own frame
     to make a sentence: "The cat is {orange}." */
  function answers() { return FIELDS.map(function (f) { return S.$('#' + FIELD_ID[f]).value.trim(); }); }

  function sentenceFrom(list) {
    var q = qs();
    return FIELDS.map(function (f, i) {
      var v = (list[i] || '').replace(/[.!?]+$/, '');
      if (!v) return '';
      var t = q[i].frame.replace('{}', v);
      return t.charAt(0).toUpperCase() + t.slice(1);
    }).filter(Boolean).join(' ');
  }
  function build() { return sentenceFrom(answers()); }

  function clearFeedback(field) {
    var fx = S.$('[data-fixes="' + field + '"]'), vd = S.$('[data-verdict="' + field + '"]');
    if (fx) fx.innerHTML = '';
    if (vd) { vd.hidden = true; vd.innerHTML = ''; vd.className = 'field-verdict'; }
  }

  function clear() {
    FIELDS.forEach(function (f) { S.$('#' + FIELD_ID[f]).value = ''; clearFeedback(f); });
    tidied = null;
    var r = S.$('#picResult'); if (r) r.innerHTML = '';
    resetLadders();
  }

  /* ── spelling, then right or wrong, then save ───────────
     "Check my spelling" looks at all three answers. "Save it" does that
     too, then checks each answer against the picture and says which are
     right, shows the right answer for any that are not, and saves all
     three. */
  var busy = false;

  /** Spelling-only check of each answer; corrects the boxes and shows what changed. */
  async function spellAll() {
    var list = answers(), changed = 0;
    await Promise.all(FIELDS.map(async function (f, i) {
      var fx = S.$('[data-fixes="' + f + '"]');
      fx.innerHTML = '';
      if (!list[i]) return;
      var res = await S.checkWriting(list[i], { where: 'Picture story', spellingOnly: true });
      if (res.fixes.length) {
        var fixed = res.corrected.trim();
        S.$('#' + FIELD_ID[f]).value = fixed;
        list[i] = fixed; changed++;
        paintFixes(res.fixes, res.full, '[data-fixes="' + f + '"]');
      }
    }));
    return { list: list, changed: changed };
  }

  async function checkSpelling() {
    if (busy) return;
    if (!answers().some(Boolean)) { S.toast('Write your answers first'); return; }
    busy = true;
    var btn = S.$('#btnTidy'), label = btn.innerHTML;
    btn.disabled = true; btn.textContent = 'Checking…';
    var r = await spellAll();
    btn.disabled = false; btn.innerHTML = label; busy = false;
    S.toast(r.changed ? 'Check the changes below' : 'No spelling mistakes found');
    if (!r.changed) S.say('No spelling mistakes found. Well done!');
  }

  function showVerdict(field, v, q) {
    var host = S.$('[data-verdict="' + field + '"]');
    host.hidden = false;
    host.className = 'field-verdict ' + (v.ok ? 'is-ok' : v.unsure ? 'is-unsure' : 'is-no');
    host.innerHTML =
      '<span class="verdict-mark">' + (v.ok ? '&#10003;' : v.unsure ? '?' : '&#10007;') + '</span>' +
      '<div class="verdict-body"><b>' + (v.ok ? 'Right!' : v.unsure ? 'Not sure' : 'Not quite') + '</b> ' + S.esc(v.why) +
      (v.ok ? '' :
        '<div class="verdict-fix">The answer: <b>' + S.esc(q.ladder.answer) + '</b> ' +
        '<button class="btn btn-sm" data-useright="' + field + '">Use the right answer</button></div>') +
      '</div>' +
      '<button class="icon-xs" data-say="' + S.esc(v.ok ? 'Right!' : 'Not quite. ' + v.why) + '" aria-label="Hear it">' +
        '<span class="i" data-icon="speaker" data-icon-size="18"></span></button>';
  }

  async function saveSentence() {
    if (busy) return;
    var first = answers();
    var empty = first.findIndex(function (a) { return !a; });
    if (empty >= 0) {
      S.toast('Answer all three questions first');
      S.$('#' + FIELD_ID[FIELDS[empty]]).focus();
      return;
    }
    busy = true;
    var btn = S.$('#btnSaveSent'), label = btn.innerHTML;
    btn.disabled = true; btn.textContent = 'Checking…';

    var sp = await spellAll();                       /* 1. spelling, boxes corrected */
    var verdicts = await S.judgeAnswers(storyIdx(), sp.list);   /* 2. right or wrong */
    var q = qs();
    FIELDS.forEach(function (f, i) { showVerdict(f, verdicts[i], q[i]); });

    /* 3. save all three */
    FIELDS.forEach(function (f, i) {
      creditLadder(f); settleHelp(f, 'resolve');
    });
    var sentence = sentenceFrom(sp.list);
    var right = verdicts.filter(function (v) { return v.ok; }).length;
    S.DB.submission({ mode: 'write', word_count: S.wordCount(sentence), sentence_text: sentence,
                      accuracy_pct: Math.round(100 * right / FIELDS.length) });

    var entry = { date: S.today(), prompt: current().q, text: sentence, kind: 'picture', story: storyIdx(),
                  answers: sp.list.map(function (a, i) { return { q: q[i].q, said: a, right: verdicts[i].ok, unsure: !!verdicts[i].unsure }; }) };
    var again = S.P.writings[0] && S.P.writings[0].kind === 'picture' && S.P.writings[0].story === storyIdx();
    if (again) S.P.writings[0] = entry; else S.P.writings.unshift(entry);   /* saving again replaces, not duplicates */
    S.P.writings = S.P.writings.slice(0, 40);
    S.save();

    if (!again) S.award(5 + right * 2, 'Saved your answers');
    S.P.storyDone = S.P.storyDone || {};
    S.P.storyDone[storyIdx()] = true;
    S.save();

    var sum = S.$('#picResult');
    sum.innerHTML = '<div class="pic-summary' + (right === 3 ? ' all' : '') + '"><b>' + right + ' of 3 right</b> ' +
      (right === 3 ? 'Brilliant! All three answers are right.' :
       'Look at the answers marked below. Tap "Use the right answer" to fix one, then press Save it again.') + '</div>';
    S.say(right + ' of 3 right.' + (right === 3 ? ' Brilliant!' : ''));

    paintSaved();
    S.$('#btnNewPrompt').hidden = false;
    btn.disabled = false; btn.innerHTML = label; busy = false;
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
    /* changing an answer clears what was said about the old one */
    Object.keys(FIELD_ID).forEach(function (f) {
      S.$('#' + FIELD_ID[f]).addEventListener('input', function () { clearFeedback(f); });
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

      var hear = e.target.closest('[data-hearans]');
      if (hear) {
        var said = S.$('#' + FIELD_ID[hear.dataset.hearans]).value.trim();
        if (said) S.say(said); else S.toast('Write your answer first');
        return;
      }

      var right = e.target.closest('[data-useright]');
      if (right) {
        var rf = right.dataset.useright;
        S.$('#' + FIELD_ID[rf]).value = ladderOf(rf).answer;
        clearFeedback(rf);
        S.say(ladderOf(rf).answer);
        return;
      }

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
        clearFeedback(field);
        S.say(choice.dataset.choice);
        return;
      }

      var use = e.target.closest('[data-use]');
      if (use) {
        var f2 = use.closest('[data-field]').dataset.field;
        S.$('#' + FIELD_ID[f2]).value = use.dataset.use;
        clearFeedback(f2);
        return;
      }

      var replay = e.target.closest('[data-replay]');
      if (replay) {
        var f3 = replay.closest('[data-field]').dataset.field;
        S.say(ladderOf(f3).cue.audio);
      }
    });

    S.$('#btnNewPrompt').addEventListener('click', function () {
      if (!storyDone()) return;
      S.P.storyIndex = storyIdx() + 1;
      S.save();
      clear();
      S.paintWrite();
    });
    S.$('#btnHearPrompt').addEventListener('click', function () { S.say(current().q); });
    S.$('#btnClearSent').addEventListener('click', clear);
    S.$('#btnTidy').addEventListener('click', checkSpelling);
    S.$('#btnSaveSent').addEventListener('click', saveSentence);
  };

})(window.Spark);
