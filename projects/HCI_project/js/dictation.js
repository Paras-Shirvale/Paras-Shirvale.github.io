/* ============================================================
   dictation.js — the "write it" half of a chapter.

   Spark says a sentence from the chapter; the child writes it.
   Each world's sentences are full of its letter pair, so writing
   "bog" for "dog" shows the b/d confusion on the page — something
   reading aloud can never reveal.

   The child sees no red marks, no scores, no counts. A word that
   needs another look is softly highlighted, then the help ladder
   steps in:

     prompt  see: how many words and how long  ·  hear: say it slowly
     cue     see: the tricky letters left blank ·  hear: word by word
     choice  "Which one is right?" — their spelling or the real one
     supply  the word is shown, and said

   Everything measurable goes to the database instead (db.js):
   each mix-up, whether the child fixed it within 2 seconds while
   typing, how long each word took, and every rung they saw.
   ============================================================ */

(function (S) {
  'use strict';

  var D = null;

  function words(s) { return String(s || '').trim().split(/\s+/).filter(Boolean); }
  function bare(w) { return S.norm(w); }

  /** Open the writing part of a world's chapter. */
  S.openDictation = function (worldId, opts) {
    var w = S.world(worldId);
    if (!w) return;
    opts = opts || {};
    var level = opts.level || 1;
    D = { w: w, level: level, sentences: w.chapters[level - 1].write, i: 0,
          see: 0, hear: 0, help: [], checks: 0 };
    S.DB.startSession({ world: w.id, level: level, mode: 'write' });
    S.openWriteActivity('dictation');
    paint();
    setTimeout(hear, 500);
  };

  S.closeDictation = function () {
    if (!D) return;
    closeHelp('close');
    if (S.DB.session()) S.DB.endSession({ completed: false });
    D = null;
    S.stopSaying();
  };

  function target() { return D.sentences[D.i]; }
  function targetWords() { return words(target()).map(bare); }

  function newSentence() {
    D.see = 0; D.hear = 0; D.checks = 0; D.firstAccuracy = null;
    D.typing = { wrong: {}, logged: {}, lastAt: Date.now(), done: 0 };
  }

  function paint() {
    var w = D.w;
    if (!D.typing || D.typing.sentence !== D.i) { newSentence(); D.typing.sentence = D.i; }
    S.$('#writeDictation').innerHTML =
      '<button class="btn btn-sm" id="dBack">&larr; Back to the world</button>' +
      '<div class="dict-head">' +
        '<span class="dict-art">' + S.worldArt(w) + '</span>' +
        '<div><small class="eyebrow" style="margin:0">' + S.esc(w.title) + ' · Chapter ' + D.level + '</small>' +
        '<h1 class="work-title">Write it</h1>' +
        '<p class="sub" style="margin:0">Listen, then write what you hear.</p></div>' +
      '</div>' +

      '<div class="dict-dots">' + D.sentences.map(function (x, k) {
        return '<i data-state="' + (k < D.i ? 'good' : k === D.i ? 'now' : '') + '">' + (k + 1) + '</i>';
      }).join('') + '</div>' +

      '<section class="card dict-card">' +
        '<div class="dict-play">' +
          '<button class="dict-big" id="dHear" aria-label="Hear the sentence">' + S.Pictures.icon('speaker', 34) + '</button>' +
          '<div><b>Sentence ' + (D.i + 1) + ' of ' + D.sentences.length + '</b><span>Tap to hear it again</span></div>' +
        '</div>' +
        '<div class="dict-clue" id="dClue"></div>' +
        '<label class="bank-in-label" for="dIn">Write what you hear</label>' +
        '<textarea class="inp dict-in" id="dIn" rows="2" autocomplete="off" autocorrect="off" ' +
          'autocapitalize="off" spellcheck="false"></textarea>' +
        '<div class="toolbar" style="margin:12px 0 0">' +
          '<button class="btn btn-primary" id="dCheck">Done ✓</button>' +
          '<span class="stuck-label">Stuck?</span>' +
          '<button class="clue-btn sm" id="dSee">' + S.Pictures.icon('picture', 18) + '<span>See a clue</span></button>' +
          '<button class="clue-btn sm" id="dHearClue">' + S.Pictures.icon('speaker', 18) + '<span>Hear a clue</span></button>' +
        '</div>' +
        '<div id="dResult"></div>' +
      '</section>';

    var box = S.$('#dIn');
    S.$('#dBack').addEventListener('click', function () { var id = D.w.id; S.closeDictation(); S.openWorld(id); });
    S.$('#dHear').addEventListener('click', hear);
    S.$('#dCheck').addEventListener('click', check);
    S.$('#dSee').addEventListener('click', seeClue);
    S.$('#dHearClue').addEventListener('click', hearClue);
    box.addEventListener('input', onType);
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); check(); }
    });
    setTimeout(function () { box.focus(); }, 100);
  }

  function hear() { if (D) { S.say(target(), { rate: 0.85 }); D.typing.lastAt = Date.now(); } }

  /* ── watching the typing ────────────────────────────────
     A word typed wrongly and fixed within 2 seconds is a
     self-correction: the child noticed. Each finished word's
     time is a timing event. */
  function onType() {
    if (!D) return;
    var text = S.$('#dIn').value;
    var typed = words(text);
    var complete = /\s$/.test(text) ? typed.length : typed.length - 1;
    var want = targetWords();
    var T = D.typing, now = Date.now();

    /* timing: each newly finished word */
    if (complete > T.done) {
      for (var k = T.done; k < complete && k < want.length; k++) {
        S.DB.timing(want[k], now - T.lastAt, { prefer: D.w.id });
      }
      T.done = complete;
      T.lastAt = now;
    }

    for (var i = 0; i < Math.min(complete, want.length); i++) {
      var got = bare(typed[i]);
      if (got !== want[i]) {
        if (!T.wrong[i] && !T.logged[i]) {
          var a = S.Analysis.analyseMisread(got, want[i]);
          if (a) T.wrong[i] = { at: now, a: a };
        }
      } else if (T.wrong[i]) {
        /* fixed it themselves */
        var within = now - T.wrong[i].at <= 2000;
        S.DB.confusion(T.wrong[i].a, { self_corrected: within, prefer: D.w.id, mode: 'write' });
        S.Analysis.recordMisread(T.wrong[i].a, { source: 'writing', sentence: target(), passage: D.w.title });
        T.logged[i] = true;
        delete T.wrong[i];
      }
    }
  }

  /* ── clues (each one a rung, each one with "Not now") ─── */
  function logHelp(rung, type) {
    D.help.push(S.DB.help({ rung: rung, cue_type: type, word: target(), confusion_class: D.w.pair }));
  }
  function closeHelp(how) { (D ? D.help : []).forEach(function (h) { if (h.open) h[how](); }); if (D) D.help = []; }

  function trickyLetters() {
    var set = {};
    D.w.letters.forEach(function (l) { set[l] = 1; });
    return set;
  }

  function seeClue() {
    D.see = Math.min(3, D.see + 1);
    S.useCue('picture');
    var t = words(target());
    var tricky = trickyLetters();
    var host = S.$('#dClue');
    logHelp(['prompt', 'cue', 'supply'][D.see - 1], 'visual');
    if (D.see === 1) {
      host.innerHTML = clueBox('See it', t.length + ' words',
        '<div class="dict-slots">' + t.map(function (w) {
          return '<span class="dict-slot">' + bare(w).split('').map(function () { return '<i></i>'; }).join('') + '</span>';
        }).join('') + '</div>');
    } else if (D.see === 2) {
      host.innerHTML = clueBox('See it', 'Fill in the missing letters',
        '<p class="dict-blank">' + t.map(function (w) {
          return w.split('').map(function (ch) { return tricky[ch.toLowerCase()] ? '<i>_</i>' : S.esc(ch); }).join('');
        }).join(' ') + '</p>' +
        '<p class="dict-tip-line">' + S.Pictures.icon('idea', 15) + ' ' + S.esc(D.w.tip) + '</p>');
    } else {
      host.innerHTML = clueBox('See it', 'Look carefully, then write it',
        '<p class="dict-show">' + t.map(function (w) { return S.Pictures.wordVisual(w, { small: true }); }).join(' ') + '</p>');
      setTimeout(function () { var el = host.querySelector('.dict-show'); if (el) el.classList.add('hide'); }, 4000);
    }
  }

  function hearClue() {
    D.hear = Math.min(3, D.hear + 1);
    S.useCue('sound');
    var t = words(target());
    var host = S.$('#dClue');
    logHelp(['prompt', 'cue', 'supply'][D.hear - 1], 'audio');
    if (D.hear === 1) {
      host.innerHTML = clueBox('Hear it', 'Slowly this time', '');
      S.say(target(), { rate: 0.6 });
    } else if (D.hear === 2) {
      host.innerHTML = clueBox('Hear it', 'One word at a time',
        '<div class="dict-wordbtns">' + t.map(function (w, k) {
          return '<button class="btn btn-sm" data-sayword="' + S.esc(bare(w)) + '">' + (k + 1) + '</button>';
        }).join('') + '</div>');
      host.querySelectorAll('[data-sayword]').forEach(function (b) {
        b.addEventListener('click', function () { S.say(b.dataset.sayword, { rate: 0.75 }); });
      });
      var k = 0;
      (function nextWord() {
        if (!D || k >= t.length) return;
        S.say(bare(t[k++]), { rate: 0.75, onEnd: function () { setTimeout(nextWord, 350); } });
      })();
    } else {
      var tricky = trickyLetters();
      var hard = t.map(bare).filter(function (w) { return w.split('').some(function (ch) { return tricky[ch]; }); });
      host.innerHTML = clueBox('Hear it', 'Tricky words, letter by letter',
        '<div class="dict-wordbtns">' + hard.map(function (w) {
          return '<button class="btn btn-sm" data-spell="' + S.esc(w) + '">' + S.Pictures.icon('speaker', 14) +
            ' word ' + (t.map(bare).indexOf(w) + 1) + '</button>';
        }).join('') + '</div>');
      host.querySelectorAll('[data-spell]').forEach(function (b) {
        b.addEventListener('click', function () { S.sayLetters(b.dataset.spell); });
      });
      if (hard[0]) S.sayLetters(hard[0]);
    }
  }

  function clueBox(kind, title, body) {
    setTimeout(function () {
      var nn = S.$('#dClue [data-notnow]');
      if (nn && !nn.dataset.wired) { nn.dataset.wired = '1'; nn.addEventListener('click', notNow); }
    }, 0);
    return '<div class="rung"><span class="rung-n">' + kind + '</span>' +
      '<div class="rung-body"><b>' + title + '</b><div>' + body + '</div></div>' +
      '<button class="notnow" data-notnow>Not now</button></div>';
  }

  function notNow() {
    var last = D && D.help.filter(function (h) { return h.open; }).pop();
    if (last) last.dismiss();
    S.$('#dClue').innerHTML = '';
  }

  /* ── checking: gentle, no marks, no numbers ──────────── */
  function alignWords(want, got) {
    var n = want.length, m = got.length, i, j, d = [], bk = [];
    for (i = 0; i <= n; i++) { d[i] = [i]; bk[i] = ['u']; }
    for (j = 0; j <= m; j++) { d[0][j] = j; bk[0][j] = 'l'; }
    for (i = 1; i <= n; i++) for (j = 1; j <= m; j++) {
      var sub = want[i - 1] === got[j - 1] ? 0 : (S.distance(want[i - 1], got[j - 1]) <= Math.max(1, want[i - 1].length / 2) ? 0.6 : 1.4);
      var best = d[i - 1][j - 1] + sub, how = 'd';
      if (d[i - 1][j] + 1 < best) { best = d[i - 1][j] + 1; how = 'u'; }
      if (d[i][j - 1] + 1 < best) { best = d[i][j - 1] + 1; how = 'l'; }
      d[i][j] = best; bk[i][j] = how;
    }
    var out = []; i = n; j = m;
    while (i > 0 || j > 0) {
      var h = bk[i][j];
      if (i > 0 && j > 0 && h === 'd') { out.unshift({ wi: i - 1, want: want[i - 1], got: got[j - 1] }); i--; j--; }
      else if (i > 0 && (h === 'u' || j === 0)) { out.unshift({ wi: i - 1, want: want[i - 1], got: null }); i--; }
      else { j--; }
    }
    return out;
  }

  function check() {
    if (!D) return;
    var typed = S.$('#dIn').value.trim();
    if (!typed) { S.say('Write what you hear first.'); return; }
    D.checks++;
    var want = targetWords(), got = words(typed).map(bare).filter(Boolean);
    var pairs = alignWords(want, got);
    var off = pairs.filter(function (p) { return p.got !== p.want; });
    var right = pairs.length - off.length;
    if (D.firstAccuracy == null) D.firstAccuracy = want.length ? right / want.length * 100 : 0;

    /* the first check is the honest record of what they wrote */
    if (D.checks === 1) {
      off.forEach(function (p) {
        if (!p.got || D.typing.logged[p.wi]) return;
        var a = S.Analysis.analyseMisread(p.got, p.want);
        if (!a) return;
        S.DB.confusion(a, { self_corrected: false, prefer: D.w.id, mode: 'write' });
        S.Analysis.recordMisread(a, { source: 'writing', sentence: target(), passage: D.w.title });
        D.typing.logged[p.wi] = true;
      });
    }

    if (!off.length) {
      closeHelp('resolve');
      finishSentence(typed, true);
      return;
    }

    /* show their sentence with the words to look at again softly lit */
    var html = pairs.map(function (p) {
      if (p.got === p.want) return '<span class="dw ok">' + S.esc(p.want) + '</span>';
      if (!p.got) return '<span class="dw gap">…</span>';
      return '<span class="dw look">' + S.esc(p.got) + '</span>';
    }).join(' ');

    var first = off[0];
    if (D.checks >= 3 || !first.got) {
      /* supply: show the word and move on — never a dead end */
      var h = S.DB.help({ rung: 'supply', cue_type: 'visual', word: first.want, confusion_class: D.w.pair });
      h.close();
      S.$('#dResult').innerHTML = '<div class="dict-result">' +
        '<p class="dict-words">' + html + '</p>' +
        '<p class="dict-note">Here\'s how it\'s written: <b class="dict-answer">' + S.esc(target()) + '</b></p>' +
        '<div class="toolbar" style="margin:10px 0 0"><button class="btn btn-primary" id="dNext">' +
          (D.i < D.sentences.length - 1 ? 'Next sentence →' : 'Finish the chapter →') + '</button></div></div>';
      S.say(target());
      S.$('#dNext').addEventListener('click', function () { finishSentence(typed, false); });
      return;
    }

    /* choice: their spelling or the real one */
    var choice = S.DB.help({ rung: 'choice', cue_type: 'choice', word: first.want, confusion_class: D.w.pair });
    var options = S.shuffle([first.want, first.got]);
    S.$('#dResult').innerHTML = '<div class="dict-result">' +
      '<p class="dict-words">' + html + '</p>' +
      '<p class="dict-note">Nearly! Which one is right?</p>' +
      '<div class="wc-opts">' + options.map(function (o) {
        return '<button class="wc-opt" data-fix="' + S.esc(o) + '">' + S.esc(o) + '</button>';
      }).join('') + '</div>' +
      '<button class="notnow" id="dChoiceNo">Not now</button></div>';
    S.say('Nearly! Which one is right?');
    S.$$('#dResult [data-fix]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.fix === first.want) {
          choice.resolve();
          var box = S.$('#dIn');
          var ws = words(box.value);
          var idx = ws.map(bare).indexOf(first.got);
          if (idx > -1) ws[idx] = first.want;
          box.value = ws.join(' ');
          S.say(first.want);
          S.$('#dResult').innerHTML = '<p class="dict-note">Yes! Press Done when you\'re ready.</p>';
        } else {
          S.say('Listen: ' + first.want);
          b.classList.add('nope');
        }
      });
    });
    S.$('#dChoiceNo').addEventListener('click', function () {
      choice.dismiss();
      S.$('#dResult').innerHTML = '<p class="dict-note">Have another look, then press Done.</p>';
    });
  }

  function finishSentence(typed, allRight) {
    S.DB.submission({ mode: 'write', word_count: words(typed).length, sentence_text: typed,
                      accuracy_pct: D.firstAccuracy });
    closeHelp('close');
    S.P.writings.unshift({ date: S.today(), prompt: D.w.title, kind: 'chapter', text: typed });
    S.P.writings = S.P.writings.slice(0, 60);
    S.save();
    if (allRight) {
      S.$('#dResult').innerHTML = '<div class="dict-result good"><p class="dict-note">Lovely writing!</p></div>';
      S.say('Lovely writing!');
    }
    setTimeout(function () {
      if (!D) return;
      if (D.i < D.sentences.length - 1) { D.i++; paint(); setTimeout(hear, 350); }
      else finish();
    }, allRight ? 1000 : 0);
  }

  function finish() {
    var w = D.w, level = D.level;
    S.DB.endSession();
    var r = S.chapterPartDone(w.id, level, 'write');
    S.award(5, 'Chapter written');
    D = null;
    var more = level < 3;
    S.$('#writeDictation').innerHTML =
      '<section class="card done-card">' +
        '<span class="done-mascot">' + S.mascot(90, 'happy') + '</span>' +
        '<h1>Chapter ' + level + ' complete!</h1>' +
        '<p class="sub">' + (r.badge ? 'You finished ' + S.esc(w.title) + ' and earned a badge: ' + S.esc(w.badge) + '!'
                                     : 'Your story continues.') + '</p>' +
        (r.badge ? '<div class="badge-banner center">' + S.worldBadge(w, true) + '<div><b>' + S.esc(w.badge) + '</b></div></div>' : '') +
        '<div class="toolbar" style="justify-content:center;margin:14px 0 0">' +
          (more ? '<button class="btn btn-primary" id="dNextCh">Next chapter →</button>' : '') +
          '<button class="btn" id="dWorld">Back to the world</button>' +
        '</div>' +
      '</section>';
    S.say(r.badge ? 'World complete! You earned ' + w.badge : 'Chapter ' + level + ' complete!');
    var nx = S.$('#dNextCh');
    if (nx) nx.addEventListener('click', function () { S.playChapter(w.id, level + 1); });
    S.$('#dWorld').addEventListener('click', function () { S.openWorld(w.id); });
  }

})(window.Spark);
