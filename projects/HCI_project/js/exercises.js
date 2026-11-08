/* ============================================================
   exercises.js — questions and ordering, generated from whatever
   text is open.

   This matters: the exercises are built from the passage itself,
   so a teacher's uploaded worksheet gets the same three steps as
   the built-in stories. Nothing is hard-coded to one story.

   With an AI helper the questions are better (inference, meaning).
   Without one, the built-in generator makes cloze and order
   questions from the sentences, which still works.
   ============================================================ */

(function (S) {
  'use strict';

  /* ── built-in question generator (no AI needed) ─────── */

  function contentWords(text) {
    var seen = {}, out = [];
    String(text).split(/\s+/).forEach(function (raw) {
      var w = S.norm(raw);
      if (w.length > 3 && !S.STOPWORDS[w] && !seen[w]) { seen[w] = 1; out.push(w); }
    });
    return out;
  }

  function shuffle(a) {
    var arr = a.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  S.localQuestions = function (sentences) {
    var pool = contentWords(sentences.join(' '));
    var qs = [];

    /* fill-the-gap questions from the middle of sentences */
    for (var i = 0; i < sentences.length && qs.length < 2; i++) {
      var s = sentences[i];
      var cands = s.split(/\s+/).filter(function (raw) {
        var w = S.norm(raw);
        return w.length > 3 && !S.STOPWORDS[w];
      });
      if (!cands.length) continue;

      var pick = cands[Math.floor(cands.length / 2)];
      var answer = S.norm(pick);
      var wrong = pool.filter(function (w) { return w !== answer; });
      if (wrong.length < 3) continue;
      wrong = shuffle(wrong).slice(0, 3);

      qs.push({
        q: s.replace(pick, '______'),
        options: shuffle([answer].concat(wrong)),
        answer: answer,
        why: 'The sentence was: "' + s + '"'
      });
    }

    /* one question about order, which is where sequencing shows up */
    if (sentences.length >= 3) {
      var firstWords = sentences.map(function (s) {
        return s.split(/\s+/).slice(0, 5).join(' ') + '…';
      });
      qs.push({
        q: 'Which of these happened first?',
        options: shuffle(firstWords.slice(0, 4)),
        answer: firstWords[0],
        why: 'The passage opens with: "' + sentences[0] + '"'
      });
    }

    return qs;
  };

  /* ── questions, best available source ───────────────── */

  S.buildQuestions = async function (passage) {
    var sentences = S.toSentences(passage.text);

    if (S.AI.ready) {
      try {
        var qs = await S.AI.askJSON(
          'Write 3 reading-comprehension questions for a child aged 9-14 who has dyslexia, ' +
          'about the passage below.\n' +
          'Mix them: one factual, one about order or cause, one about meaning or how someone feels.\n' +
          'Use short, plain wording. Each question needs exactly 4 options, one correct.\n' +
          'Reply with only a JSON array of ' +
          '{"q":string,"options":[string,string,string,string],"answer":string,"why":string}.\n' +
          '"answer" must be exactly one of the options. "why" is one short friendly sentence.\n\n' +
          'PASSAGE:\n' + passage.text,
          { maxTokens: 700 }
        );
        if (Array.isArray(qs) && qs.length && qs[0] && Array.isArray(qs[0].options)) {
          return qs.filter(function (q) {
            return q.q && Array.isArray(q.options) && q.options.length >= 2 && q.answer;
          });
        }
      } catch (e) { /* fall through to the built-in generator */ }
    }

    return S.localQuestions(sentences);
  };

  /* ── ordering ───────────────────────────────────────── */

  /** A shuffle guaranteed not to be the right answer already. */
  S.shuffledOrder = function (count) {
    var right = [];
    for (var i = 0; i < count; i++) right.push(i);
    if (count < 2) return right;
    var mixed;
    var guard = 0;
    do { mixed = shuffle(right); guard++; }
    while (guard < 20 && mixed.every(function (v, i) { return v === right[i]; }));
    return mixed;
  };

  S.shuffle = shuffle;

})(window.Spark);
