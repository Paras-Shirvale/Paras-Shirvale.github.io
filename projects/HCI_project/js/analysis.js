/* ============================================================
   analysis.js — working out WHY the child stopped.

   This is the part that makes Spark different from a reading app
   that just times you.

   Everybody pauses while reading. A fluent reader pauses at full
   stops, at commas, to breathe, to think about what a sentence
   meant. A reader with dyslexia also pauses in places a fluent
   reader never would: in the middle of a phrase, before a long
   word, on the same word they stumbled over yesterday.

   Treating those two kinds of pause the same produces nonsense —
   you end up "teaching" a child the word they stopped after
   simply because they took a breath. So every stall gets
   classified before it is allowed to affect anything.

   Only pauses classified as a struggle feed the difficulty
   profile, and only the difficulty profile builds homework.

   The second half of this file watches what the child actually
   SAID when it did not match the text, and pulls out the letter
   confusions behind it — b/d, p/q, m/w, n/u, and whole-word
   reversals like was/saw.
   ============================================================ */

(function (S) {
  'use strict';

  var A = S.Analysis = {};

  /* ── pause classification ───────────────────────────── */

  /* Letter pairs that readers with dyslexia commonly swap.
     Each entry is stored in one canonical order. */
  var CONFUSABLE = [
    ['b', 'd'], ['p', 'q'], ['b', 'p'], ['d', 'q'], ['d', 'g'],
    ['m', 'w'], ['n', 'u'], ['i', 'j'], ['f', 't'], ['v', 'w'],
    ['a', 'o'], ['e', 'a'], ['i', 'e'], ['s', 'z'], ['h', 'n'],
    ['c', 's'], ['g', 'j'], ['c', 'k'], ['f', 'v'], ['o', 'u']
  ];

  var PAIR_LABEL = {};
  CONFUSABLE.forEach(function (p) { PAIR_LABEL[p[0] + p[1]] = p[0] + ' / ' + p[1]; });

  function pairKey(a, b) {
    for (var i = 0; i < CONFUSABLE.length; i++) {
      var p = CONFUSABLE[i];
      if ((p[0] === a && p[1] === b) || (p[0] === b && p[1] === a)) return p[0] + p[1];
    }
    return null;
  }
  A.pairLabel = function (key) { return PAIR_LABEL[key] || key; };

  /* Words that are irregular enough to be worth flagging as hard
     even when they are short. */
  var IRREGULAR = {};
  ('said says been come some one once done two could would should ' +
   'through though thought enough rough laugh friend because people ' +
   'where were there their they\'re here hear eye eyes who whose ' +
   'island school ocean sure sugar busy build answer')
    .split(' ').forEach(function (w) { IRREGULAR[w] = true; });

  /** How demanding a word is to decode, 0-1. */
  A.wordDifficulty = function (word) {
    var w = S.norm(word);
    if (!w) return 0;
    var score = 0;
    var syl = S.syllables(w).length;
    if (syl >= 4) score += 0.45; else if (syl === 3) score += 0.3; else if (syl === 2) score += 0.12;
    if (w.length >= 9) score += 0.25; else if (w.length >= 7) score += 0.15;
    if (IRREGULAR[w]) score += 0.35;
    if (/[^aeiouy]{3}/.test(w)) score += 0.15;          /* consonant cluster */
    if (/(ough|augh|tion|sion|phth|sch)/.test(w)) score += 0.2;
    return Math.min(1, score);
  };

  /**
   * Decide what a pause means.
   *
   * ctx = {
   *   token,          the word they are stopped on   {raw, clean, si}
   *   prevToken,      the word before it, or null
   *   isSentenceStart,
   *   durationMs,     how long they have been stopped
   *   baselineMs,     this child's own typical gap between words
   *   partialHeard,   anything they said that matched the start of the word
   *   priorStalls     times they have stalled on this exact word before
   * }
   *
   * Returns { type, struggle, reason, confidence }
   *   type: 'sentence-break' | 'clause-break' | 'breath' | 'planning'
   *       | 'decoding' | 'word-specific' | 'complex-word' | 'struggle'
   *   struggle: true only when this should affect the profile
   */
  /* Where people breathe even when there is no punctuation: just before
     a word that starts a new phrase or clause. A pause here is phrasing,
     not trouble, the way a fluent reader does it. */
  var PHRASE_START = {};
  ('and but or so because when while then that which who where if although though ' +
   'after before until with without in on at into onto under over by for from to of ' +
   'as like')
    .split(' ').forEach(function (w) { PHRASE_START[w] = 1; });

  A.classifyPause = function (ctx) {
    var prev = ctx.prevToken ? ctx.prevToken.raw : '';
    var endsSentence = /[.!?]["')\]]?$/.test(prev);
    var endsClause   = /[,;:—–]["')\]]?$/.test(prev);
    var base = Math.max(250, ctx.baselineMs || 600);
    var ratio = ctx.durationMs / base;
    var hard = A.wordDifficulty(ctx.token.clean);

    /* ---- the natural cases, checked first ---------------
       A pause right after a full stop is how reading is meant
       to sound. Only an extreme one counts as trouble. */
    if (endsSentence && ratio < 6) {
      return natural('sentence-break',
        'a pause after a full stop — that is how reading should sound');
    }
    if (endsClause && ratio < 4) {
      return natural('clause-break', 'a pause at a comma, which is normal phrasing');
    }
    if (ctx.isSentenceStart && ratio < 5) {
      return natural('planning', 'getting ready to start the next sentence');
    }

    /* The VOICE says how the stretch before the silence ended (pitch
       falls at the end of a finished phrase; it stays level or lifts
       when somebody trails off mid-word). This is the acoustic cue
       listeners themselves use to tell a pause from a stumble. */
    var pr = ctx.prosody || null;
    var sounding = !!ctx.partialHeard;
    if (pr && pr.falling && !sounding && ratio < 3.5) {
      return natural('phrase-end', 'their voice fell the way it does at the end of a phrase');
    }
    /* A breath before a joining word ("and", "because", "in") is phrasing. */
    if (PHRASE_START[ctx.token.clean] && !sounding && ratio < 3.5) {
      return natural('phrase-break', 'a breath before "' + ctx.token.clean + '", where a new phrase starts');
    }
    /* Barely longer than this child's own rhythm. */
    if (ratio < 1.8) {
      return natural('breath', 'a normal gap between words');
    }

    /* ---- now the signals that mean real trouble --------- */

    /* The voice trailed off level or rising, then stopped, well past
       this child's usual gap: hesitating, not finishing a thought. */
    if (pr && (pr.level || pr.rising) && ratio >= 2.2 && !sounding && !endsSentence && !endsClause) {
      return struggle('trailed-off', 0.75,
        'their voice trailed off level before the word, then stopped');
    }

    /* They started sounding it out and could not finish. That is
       decoding, and it is the clearest signal there is. */
    if (ctx.partialHeard) {
      return struggle('decoding', 0.95,
        'started sounding out "' + ctx.token.clean + '" but could not finish it');
    }

    /* Stuck on the same word before — this word itself is the problem. */
    if (ctx.priorStalls >= 1) {
      return struggle('word-specific', 0.9,
        'stopped on "' + ctx.token.clean + '" before, so this word is the problem');
    }

    /* A demanding word, and a pause well past their normal rhythm. */
    if (hard >= 0.4 && ratio >= 2) {
      return struggle('complex-word', 0.8,
        '"' + ctx.token.clean + '" is a demanding word to decode');
    }

    /* Mid-phrase, nowhere near punctuation, and much longer than
       their own rhythm. Nothing here explains it except difficulty. */
    if (!endsSentence && !endsClause && ratio >= 2.5) {
      return struggle('struggle', 0.7,
        'stopped in the middle of a phrase, well past the usual rhythm');
    }

    /* A long pause at punctuation is still probably punctuation. */
    if (endsSentence || endsClause) {
      return natural('sentence-break', 'a long pause, but at a natural break');
    }

    return { type: 'uncertain', struggle: false, confidence: 0.4,
             reason: 'not clear enough to count either way' };

    function natural(type, reason) {
      return { type: type, struggle: false, confidence: 0.85, reason: reason };
    }
    function struggle(type, confidence, reason) {
      return { type: type, struggle: true, confidence: confidence, reason: reason };
    }
  };

  /* ── what went wrong in a misread word ──────────────── */

  /**
   * Compare what the child said against what is written and work
   * out the letter-level story.
   * Returns null when the two are too far apart to compare
   * meaningfully (they probably read a different word entirely).
   */
  A.analyseMisread = function (heard, expected) {
    var h = S.norm(heard), e = S.norm(expected);
    if (!h || !e || h === e) return null;

    var dist = S.distance(h, e);
    if (dist > Math.max(2, Math.floor(e.length / 2))) return null;

    /* whole-word reversal: was/saw, on/no, net/ten */
    if (h === e.split('').reverse().join('') && e.length >= 2) {
      return {
        kind: 'word-reversal', heard: h, expected: e, pairs: [],
        note: 'read "' + e + '" backwards as "' + h + '"'
      };
    }

    /* letters present but out of order: form/from */
    if (h.length === e.length && sorted(h) === sorted(e)) {
      return {
        kind: 'transposition', heard: h, expected: e, pairs: [],
        note: 'the right letters in the wrong order'
      };
    }

    /* align the two and pull out substitutions */
    var subs = align(h, e);
    var pairs = [];
    subs.forEach(function (s) {
      var key = pairKey(s.got, s.want);
      if (key) pairs.push({ key: key, got: s.got, want: s.want, at: s.at });
    });

    if (pairs.length) {
      return {
        kind: 'letter-confusion', heard: h, expected: e, pairs: pairs,
        note: 'swapped ' + pairs.map(function (p) {
          return '"' + p.want + '" for "' + p.got + '"';
        }).join(' and ')
      };
    }

    if (subs.length) {
      return {
        kind: 'substitution', heard: h, expected: e, pairs: [],
        note: 'said "' + h + '" where the text says "' + e + '"'
      };
    }

    /* letters missed out or added */
    return {
      kind: h.length < e.length ? 'omission' : 'insertion',
      heard: h, expected: e, pairs: [],
      note: h.length < e.length ? 'left out part of "' + e + '"'
                                : 'added a sound to "' + e + '"'
    };
  };

  function sorted(s) { return s.split('').sort().join(''); }

  /* Needleman-Wunsch style walk back through the edit matrix, so we
     know which letter was swapped for which rather than just how
     many edits apart the words are. */
  function align(a, b) {
    var n = a.length, m = b.length, i, j;
    var d = [];
    for (i = 0; i <= n; i++) { d[i] = [i]; }
    for (j = 0; j <= m; j++) { d[0][j] = j; }
    for (i = 1; i <= n; i++) {
      for (j = 1; j <= m; j++) {
        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    var subs = [];
    i = n; j = m;
    while (i > 0 && j > 0) {
      var cost = a[i - 1] === b[j - 1] ? 0 : 1;
      if (d[i][j] === d[i - 1][j - 1] + cost) {
        if (cost) subs.push({ got: a[i - 1], want: b[j - 1], at: j - 1 });
        i--; j--;
      } else if (d[i][j] === d[i - 1][j] + 1) { i--; }
      else { j--; }
    }
    return subs.reverse();
  }

  /* ── recording what we learned ──────────────────────── */

  /** A classified struggle pause goes into the profile. */
  A.recordStall = function (word, verdict, context) {
    var w = S.norm(word);
    if (!w) return;
    var rec = S.P.words[w] || (S.P.words[w] = { seen: 0, stalled: 0, helped: 0, kinds: {} });
    rec.seen = (rec.seen || 0) + 1;
    rec.stalled = (rec.stalled || 0) + 1;
    rec.kinds = rec.kinds || {};
    rec.kinds[verdict.type] = (rec.kinds[verdict.type] || 0) + 1;
    rec.lastReason = verdict.reason;

    /* The whole event, kept so the review page can say exactly what
       happened rather than only how often. */
    S.P.events = S.P.events || [];
    S.P.events.push({
      at: Date.now(),
      date: S.today(),
      kind: 'pause',
      type: verdict.type,
      word: w,
      reason: verdict.reason,
      seconds: context && context.seconds ? Math.round(context.seconds * 10) / 10 : null,
      partial: (context && context.partial) || null,
      sentence: (context && context.sentence) || '',
      passage: (context && context.passage) || ''
    });
    if (S.P.events.length > 400) S.P.events = S.P.events.slice(-400);
  };

  /** A natural pause is counted, but kept out of the difficulty profile. */
  A.recordNaturalPause = function (verdict) {
    S.P.pauses = S.P.pauses || { natural: 0, struggle: 0, byType: {} };
    S.P.pauses.natural++;
    S.P.pauses.byType[verdict.type] = (S.P.pauses.byType[verdict.type] || 0) + 1;
  };

  A.countStrugglePause = function (verdict) {
    S.P.pauses = S.P.pauses || { natural: 0, struggle: 0, byType: {} };
    S.P.pauses.struggle++;
    S.P.pauses.byType[verdict.type] = (S.P.pauses.byType[verdict.type] || 0) + 1;
  };

  /** A misread word, with whatever letter story came out of it. */
  A.recordMisread = function (analysis, context) {
    if (!analysis) return;
    S.P.misreads = S.P.misreads || [];
    var source = (context && context.source) || 'reading';
    S.P.misreads.push({
      date: S.today(), heard: analysis.heard,
      expected: analysis.expected, kind: analysis.kind, source: source
    });
    if (S.P.misreads.length > 300) S.P.misreads = S.P.misreads.slice(-300);

    S.P.events = S.P.events || [];
    S.P.events.push({
      at: Date.now(),
      date: S.today(),
      kind: source === 'writing' ? 'spelling' : 'misread',
      source: source,
      type: analysis.kind,
      word: analysis.expected,
      said: analysis.heard,
      pairs: analysis.pairs.map(function (p) { return p.key; }),
      reason: analysis.note,
      sentence: (context && context.sentence) || '',
      passage: (context && context.passage) || ''
    });
    if (S.P.events.length > 400) S.P.events = S.P.events.slice(-400);

    S.P.letters = S.P.letters || {};
    analysis.pairs.forEach(function (p) {
      var rec = S.P.letters[p.key] || (S.P.letters[p.key] = { count: 0, examples: [] });
      rec.count++;
      /* where it showed up: aloud, or on the page */
      if (source === 'writing') rec.write = (rec.write || 0) + 1;
      else rec.read = (rec.read || 0) + 1;
      if (rec.examples.length < 6 &&
          rec.examples.indexOf(analysis.expected) === -1) {
        rec.examples.push(analysis.expected);
      }
    });

    S.P.errorKinds = S.P.errorKinds || {};
    S.P.errorKinds[analysis.kind] = (S.P.errorKinds[analysis.kind] || 0) + 1;

    var w = S.norm(analysis.expected);
    if (w) {
      var rec2 = S.P.words[w] || (S.P.words[w] = { seen: 0, stalled: 0, helped: 0 });
      rec2.misread = (rec2.misread || 0) + 1;
    }
  };

  /* ── what the profile adds up to ────────────────────── */

  /** Letter pairs worth drilling, most confused first. */
  A.letterTroubles = function (minCount) {
    var min = minCount || 2;
    var out = [];
    var letters = S.P.letters || {};
    Object.keys(letters).forEach(function (k) {
      if (letters[k].count >= min) {
        out.push({ key: k, label: A.pairLabel(k),
                   count: letters[k].count, examples: letters[k].examples });
      }
    });
    return out.sort(function (a, b) { return b.count - a.count; });
  };

  /** Words worth drilling: struggled on, or misread, and not yet practised. */
  A.wordTroubles = function () {
    var out = [];
    Object.keys(S.P.words).forEach(function (w) {
      var r = S.P.words[w];
      var weight = (r.stalled || 0) + (r.misread || 0) * 1.5;
      if (weight >= 2 && !S.P.practised[w]) {
        out.push({ word: w, weight: weight, stalled: r.stalled || 0,
                   misread: r.misread || 0, kinds: r.kinds || {},
                   reason: r.lastReason || '' });
      }
    });
    return out.sort(function (a, b) { return b.weight - a.weight; });
  };

  /** One plain-English summary of what Spark has worked out so far. */
  A.summary = function () {
    var p = S.P.pauses || { natural: 0, struggle: 0, byType: {} };
    var words = A.wordTroubles();
    var letters = A.letterTroubles();
    var lines = [];

    if (p.natural + p.struggle > 0) {
      lines.push('Of ' + (p.natural + p.struggle) + ' pauses, ' + p.struggle +
        ' looked like real difficulty and ' + p.natural + ' were normal phrasing.');
    }
    if (words.length) {
      lines.push('Hardest words so far: ' +
        words.slice(0, 5).map(function (w) { return w.word; }).join(', ') + '.');
    }
    if (letters.length) {
      lines.push('Letters getting mixed up: ' +
        letters.slice(0, 3).map(function (l) { return l.label; }).join(', ') + '.');
    }
    var kinds = S.P.errorKinds || {};
    if (kinds['word-reversal']) {
      lines.push('Has read ' + kinds['word-reversal'] +
        ' word' + (kinds['word-reversal'] > 1 ? 's' : '') + ' backwards.');
    }
    return lines;
  };

})(window.Spark);
