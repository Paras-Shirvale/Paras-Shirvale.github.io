/* ============================================================
   dictation.js — Listen and write.

   The writing half of the confusion detector. Spark says a short
   sentence packed with one family of letters; the child writes
   what they hear. Then every word is compared with what was said:

     "the bog dug a big bed"  for  "The dog dug a big bed."
          ↑ b for d  →  recorded as a b/d confusion IN WRITING

   That is something reading aloud can never show: a child may
   read "dog" correctly and still write "bog".

   The help ladder still runs, as two kinds of clue the child
   chooses between, each giving a little more every time:

     See it   1 how many words, and how long each is
              2 the sentence with the tricky letters left blank
              3 the whole sentence, for a few seconds
     Hear it  1 the sentence again, slowly
              2 one word at a time
              3 the tricky words spelled out letter by letter
   ============================================================ */

(function (S) {
  'use strict';

  var D = null;   /* the set in progress */

  function words(s) { return String(s || '').trim().split(/\s+/).filter(Boolean); }
  function bare(w) { return S.norm(w); }

  S.openDictation = function (familyId) {
    var f = S.family(familyId);
    if (!f) return;
    D = { f: f, i: 0, results: [], see: 0, hear: 0, help: { see: 0, hear: 0 }, checked: false };
    S.openWriteActivity('dictation');
    paint();
    setTimeout(function () { hear(); }, 500);
  };

  S.closeDictation = function () { D = null; S.stopSaying(); };

  function target() { return D.f.dictation[D.i]; }

  /* the family's letters inside a word, which are what get blanked */
  function trickyLetters() {
    var set = {};
    D.f.letters.forEach(function (l) { set[l] = 1; });
    return set;
  }

  function paint() {
    var f = D.f, n = f.dictation.length;
    S.$('#writeDictation').innerHTML =
      '<button class="btn btn-sm" data-write-back>&larr; All writing</button>' +
      '<div class="dict-head">' +
        S.familyTiles(f, 'md') +
        '<div><h1 class="work-title">Listen and write</h1>' +
        '<p class="sub" style="margin:0">' + S.esc(f.title) + ' · Hear it, then write it.</p></div>' +
      '</div>' +

      '<div class="dict-tip"><span>' + S.Pictures.icon('idea', 18) + '</span><p>' + S.esc(f.tip) + '</p>' +
        '<button class="icon-xs" data-say="' + S.esc(f.tip) + '" aria-label="Hear the tip">' +
        S.Pictures.icon('speaker', 15) + '</button></div>' +

      '<div class="dict-dots">' + f.dictation.map(function (x, k) {
        var r = D.results[k];
        return '<i data-state="' + (r ? (r.right === r.total ? 'good' : 'some') : k === D.i ? 'now' : '') + '">' + (k + 1) + '</i>';
      }).join('') + '</div>' +

      '<section class="card dict-card">' +
        '<div class="dict-play">' +
          '<button class="dict-big" id="dHear" aria-label="Hear the sentence">' + S.Pictures.icon('speaker', 34) + '</button>' +
          '<div><b>Sentence ' + (D.i + 1) + ' of ' + n + '</b><span>Tap to hear it again</span></div>' +
        '</div>' +

        '<div class="dict-clue" id="dClue"></div>' +

        '<label class="bank-in-label" for="dIn">Write what you hear</label>' +
        '<textarea class="inp dict-in" id="dIn" rows="2" autocomplete="off" autocorrect="off" ' +
          'autocapitalize="off" spellcheck="false"></textarea>' +

        '<div class="toolbar" style="margin:12px 0 0">' +
          '<button class="btn btn-primary" id="dCheck">Check ✓</button>' +
          '<span class="stuck-label">Stuck?</span>' +
          '<button class="clue-btn sm" id="dSee">' + S.Pictures.icon('picture', 18) + '<span>See a clue</span></button>' +
          '<button class="clue-btn sm" id="dHearClue">' + S.Pictures.icon('speaker', 18) + '<span>Hear a clue</span></button>' +
        '</div>' +
        '<div id="dResult"></div>' +
      '</section>';

    var box = S.$('#dIn');
    S.$('#dHear').addEventListener('click', hear);
    S.$('#dCheck').addEventListener('click', check);
    S.$('#dSee').addEventListener('click', seeClue);
    S.$('#dHearClue').addEventListener('click', hearClue);
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!D.checked) check(); else next(); }
    });
    setTimeout(function () { box.focus(); }, 100);
  }

  function hear() { if (D) S.say(target(), { rate: 0.85 }); }

  /* ── clues ──────────────────────────────────────────── */
  function seeClue() {
    D.see = Math.min(3, D.see + 1);
    D.help.see++;
    S.useCue('picture');
    var t = words(target());
    var tricky = trickyLetters();
    var host = S.$('#dClue');
    if (D.see === 1) {
      host.innerHTML = clueBox('See it · 1 of 3', t.length + ' words',
        '<div class="dict-slots">' + t.map(function (w) {
          return '<span class="dict-slot">' + bare(w).split('').map(function () { return '<i></i>'; }).join('') + '</span>';
        }).join('') + '</div>');
    } else if (D.see === 2) {
      host.innerHTML = clueBox('See it · 2 of 3', 'Fill in the tricky letters',
        '<p class="dict-blank">' + t.map(function (w) {
          return w.split('').map(function (ch) {
            return tricky[ch.toLowerCase()] ? '<i>_</i>' : S.esc(ch);
          }).join('');
        }).join(' ') + '</p>');
    } else {
      host.innerHTML = clueBox('See it · 3 of 3', 'Look carefully, then write it',
        '<p class="dict-show">' + t.map(function (w) {
          return S.Pictures.wordVisual(w, { small: true });
        }).join(' ') + '</p>');
      setTimeout(function () {
        var el = host.querySelector('.dict-show');
        if (el) { el.classList.add('hide'); }
      }, 4000);
    }
  }

  function hearClue() {
    D.hear = Math.min(3, D.hear + 1);
    D.help.hear++;
    S.useCue('sound');
    var t = words(target());
    var host = S.$('#dClue');
    if (D.hear === 1) {
      host.innerHTML = clueBox('Hear it · 1 of 3', 'Slowly this time', '');
      S.say(target(), { rate: 0.6 });
    } else if (D.hear === 2) {
      host.innerHTML = clueBox('Hear it · 2 of 3', 'One word at a time',
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
      var hard = t.map(bare).filter(function (w) {
        return w.split('').some(function (ch) { return tricky[ch]; }) && w.length > 1;
      });
      host.innerHTML = clueBox('Hear it · 3 of 3', 'Tricky words, letter by letter',
        '<div class="dict-wordbtns">' + hard.map(function (w) {
          return '<button class="btn btn-sm" data-spell="' + S.esc(w) + '">' + S.Pictures.icon('speaker', 14) + ' word ' +
            (t.map(bare).indexOf(w) + 1) + '</button>';
        }).join('') + '</div>');
      host.querySelectorAll('[data-spell]').forEach(function (b) {
        b.addEventListener('click', function () { S.sayLetters(b.dataset.spell); });
      });
      if (hard[0]) S.sayLetters(hard[0]);
    }
  }

  function clueBox(n, title, body) {
    return '<div class="rung"><span class="rung-n">' + n + '</span>' +
      '<div class="rung-body"><b>' + title + '</b><div>' + body + '</div></div></div>';
  }

  /* ── checking ───────────────────────────────────────────
     Line the child's words up against the sentence (so one missed
     word does not make every word after it "wrong"), then look at
     each mismatch letter by letter. */
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
      if (i > 0 && j > 0 && h === 'd') { out.unshift({ want: want[i - 1], got: got[j - 1] }); i--; j--; }
      else if (i > 0 && (h === 'u' || j === 0)) { out.unshift({ want: want[i - 1], got: null }); i--; }
      else { j--; }
    }
    return out;
  }

  function diff(a, b) {
    var out = '';
    for (var k = 0; k < a.length; k++) out += a[k] !== b[k] ? '<em>' + S.esc(a[k]) + '</em>' : S.esc(a[k]);
    return out;
  }

  function check() {
    var typed = S.$('#dIn').value.trim();
    if (!typed) { S.say('Write what you hear first.'); S.toast('Write what you hear first'); return; }
    var wantRaw = words(target());
    var want = wantRaw.map(bare), got = words(typed).map(bare).filter(Boolean);
    var pairs = alignWords(want, got);
    var right = 0, confusions = [];

    var html = pairs.map(function (p, k) {
      if (p.got === p.want) { right++; return '<span class="dw ok">' + S.esc(p.want) + '</span>'; }
      if (!p.got) return '<span class="dw miss">' + S.esc(p.want) + '<small>missed</small></span>';
      var a = S.Analysis.analyseMisread(p.got, p.want);
      if (a && a.pairs && a.pairs.length) {
        confusions.push(a);
        S.Analysis.recordMisread(a, { source: 'writing', sentence: target(), passage: 'Listen and write: ' + D.f.title });
      } else if (a) {
        S.Analysis.recordMisread(a, { source: 'writing', sentence: target(), passage: 'Listen and write: ' + D.f.title });
      }
      return '<span class="dw bad"><s>' + diff(p.got, p.want) + '</s>' + diff(p.want, p.got) + '</span>';
    }).join(' ');

    var total = want.length;
    D.results[D.i] = { right: right, total: total, typed: typed, confusions: confusions.length };
    D.checked = true;
    S.save();

    var good = right === total;
    var note = good ? '✓ Every word right!'
      : confusions.length
        ? 'Watch the ' + confusions.map(function (a) { return '"' + a.pairs[0].want + '"'; })
            .filter(function (x, k, arr) { return arr.indexOf(x) === k; }).join(' and ') + '. ' + D.f.tip
        : right + ' of ' + total + ' words right. Look at the coloured letters.';

    S.$('#dResult').innerHTML =
      '<div class="dict-result' + (good ? ' good' : '') + '">' +
        '<p class="dict-words">' + html + '</p>' +
        '<p class="dict-note">' + S.esc(note) + '</p>' +
        '<div class="toolbar" style="margin:10px 0 0">' +
          '<button class="btn btn-sm" id="dHearRight">' + S.Pictures.icon('speaker', 16) + ' Hear it</button>' +
          '<button class="btn btn-primary" id="dNext">' +
            (D.i < D.f.dictation.length - 1 ? 'Next sentence →' : 'See how I did →') + '</button>' +
        '</div>' +
      '</div>';
    S.$('#dHearRight').addEventListener('click', hear);
    S.$('#dNext').addEventListener('click', next);
    S.$('#dCheck').disabled = true;
    if (good) S.award(2, 'Every word right');
    else S.say(note);
  }

  function next() {
    if (!D) return;
    if (D.i < D.f.dictation.length - 1) {
      D.i++; D.see = 0; D.hear = 0; D.checked = false;
      paint();
      setTimeout(hear, 350);
      return;
    }
    finish();
  }

  function finish() {
    var right = 0, total = 0, mixed = 0;
    D.results.forEach(function (r) { if (r) { right += r.right; total += r.total; mixed += r.confusions; } });
    S.P.dictationDone = S.P.dictationDone || {};
    S.P.dictationDone[D.f.id] = { date: S.today(), right: right, total: total, mixed: mixed, help: D.help };
    S.P.writings.unshift({ date: S.today(), prompt: D.f.title, kind: 'dictation',
      text: 'Listen and write: ' + D.f.title, score: right + ' of ' + total + ' words' });
    S.P.writings = S.P.writings.slice(0, 60);
    S.bumpStreak();
    S.save();
    S.award(5, 'Finished Listen and write');

    var pct = total ? Math.round(right / total * 100) : 0;
    S.$('#writeDictation').innerHTML =
      '<button class="btn btn-sm" data-write-back>&larr; All writing</button>' +
      '<section class="card done-card">' +
        '<span class="done-mascot">' + S.mascot(90, 'happy') + '</span>' +
        '<h1>' + (pct >= 90 ? 'Brilliant listening!' : pct >= 60 ? 'Great work!' : 'Well done for finishing!') + '</h1>' +
        '<div class="done-stats">' +
          '<div class="stat-tile tone-moss"><b>' + right + '/' + total + '</b><span>words right</span></div>' +
          '<div class="stat-tile tone-amber"><b>' + mixed + '</b><span>letter mix-ups</span></div>' +
          '<div class="stat-tile tone-violet"><b>' + (D.help.see + D.help.hear) + '</b><span>clues used</span></div>' +
        '</div>' +
        (mixed ? '<p class="sub">Spark has noted which letters got swapped. You can see them on your Progress page.</p>' : '') +
        '<div class="toolbar" style="justify-content:center;margin:14px 0 0">' +
          '<button class="btn btn-primary" id="dAgain">Try again</button>' +
          '<button class="btn" data-write-back>Choose another</button>' +
        '</div>' +
      '</section>';
    var id = D.f.id;
    S.$('#dAgain').addEventListener('click', function () { S.openDictation(id); });
  }

})(window.Spark);
