/* ============================================================
   spell.js — checking spelling AND grammar, properly.

   The old check only knew a short list of common misspellings,
   so most real mistakes slipped through. This uses LanguageTool,
   a full open-source spelling and grammar checker (the same engine
   behind many word processors), through its free public API. It
   needs no key, and it catches:

     · misspelt words          "teh" → "the", "freind" → "friend"
     · grammar                 "they was" → "they were"
     · capitals and full stops "bob" → "Bob"

   If the AI helper is connected, it then rewrites each reason in
   words a child understands. With no network at all, the local
   list of common slips still runs, and the child is told the check
   was only partial.

   Every spelling fix is also run through the letter-confusion
   analysis: writing "bog" for "dog" is the b/d confusion showing
   up on the page instead of out loud, and it is recorded as such.
   ============================================================ */

(function (S) {
  'use strict';

  var LT_URL = 'https://api.languagetool.org/v2/check';

  /* Misspellings common in children's writing, with a reason a
     child can use. Used offline, and to give a better "why" than
     the checker's own message when one of these comes up. */
  var COMMON = {
    teh: ['the', 'The letters are t-h-e. "h" comes before "e".'],
    hte: ['the', 'The letters are t-h-e.'],
    adn: ['and', 'The letters are a-n-d.'],
    taht: ['that', 'The letters are t-h-a-t.'],
    wiht: ['with', 'The "t" goes last: w-i-t-h.'],
    thier: ['their', 'This one is "e" before "i": t-h-e-i-r.'],
    freind: ['friend', 'A friend is there to the "end".'],
    beleive: ['believe', 'There is a "lie" in the middle of believe.'],
    recieve: ['receive', 'After "c" it is e-i: rec-ei-ve.'],
    becuase: ['because', 'Big Elephants Can Always Understand Small Elephants.'],
    becase: ['because', 'Big Elephants Can Always Understand Small Elephants.'],
    wich: ['which', 'It starts w-h: "which".'],
    sed: ['said', 'This one does not follow the sounds: s-a-i-d.'],
    thay: ['they', 'It ends with "ey": t-h-e-y.'],
    wen: ['when', 'Question words start w-h: when, what, where.'],
    wat: ['what', 'Question words start w-h: when, what, where.'],
    nite: ['night', 'This one uses "igh": n-igh-t.'],
    alot: ['a lot', '"A lot" is two separate words.'],
    happend: ['happened', 'It needs the "e": happen + ed.'],
    sumthing: ['something', 'It is "some" + "thing".'],
    dont: ["don't", 'The apostrophe stands for the missing "o" in not.'],
    cant: ["can't", 'The apostrophe stands for the missing letters in cannot.'],
    im: ["I'm", '"I\'m" is short for "I am", with a capital I.']
  };

  /** Turn the checker's wording into something short and friendly. */
  function friendlyWhy(match, from, to) {
    var type = match.rule && match.rule.issueType;
    if (type === 'misspelling') {
      var a = S.Analysis.analyseMisread(from, to);
      if (a && a.pairs && a.pairs.length) {
        var p = a.pairs[0];
        return 'Check the "' + p.want + '" — you wrote "' + p.got + '". ' + letterTip(p.key);
      }
      return 'The word is spelt ' + to.split('').join('-') + '.';
    }
    if (/uppercase|capital/i.test(match.message)) return 'Start with a capital letter.';
    if (/punctuation|full stop|period/i.test(match.message)) return 'End with a full stop.';
    return match.shortMessage || match.message;
  }

  function letterTip(key) {
    var f = S.familyOfPair && S.familyOfPair(key);
    return f ? f.tip : '';
  }

  /** The offline fallback: known slips, capitals, full stop. */
  function localCheck(text) {
    var fixes = [];
    var out = text.replace(/\b[A-Za-z']+\b/g, function (word) {
      var hit = COMMON[word.toLowerCase()];
      if (!hit) return word;
      var to = /^[A-Z]/.test(word) ? hit[0].charAt(0).toUpperCase() + hit[0].slice(1) : hit[0];
      fixes.push({ from: word, to: to, why: hit[1], kind: 'spelling' });
      return to;
    });
    if (/^[a-z]/.test(out)) {
      var first = out.split(' ')[0];
      fixes.push({ from: first, to: first.charAt(0).toUpperCase() + first.slice(1),
                   why: 'Start with a capital letter.', kind: 'capital' });
      out = out.charAt(0).toUpperCase() + out.slice(1);
    }
    if (/\bi\b/.test(out)) {
      fixes.push({ from: 'i', to: 'I', why: '"I" is always a capital letter.', kind: 'capital' });
      out = out.replace(/\bi\b/g, 'I');
    }
    if (out.trim() && !/[.!?]$/.test(out.trim())) {
      fixes.push({ from: '…' + out.trim().slice(-8), to: '…' + out.trim().slice(-8) + '.',
                   why: 'End with a full stop.', kind: 'punctuation' });
      out = out.trim() + '.';
    }
    return { corrected: out, fixes: fixes, full: false };
  }

  /**
   * Check a piece of writing.
   * Resolves { corrected, fixes:[{from,to,why,kind}], full }
   * where full=false means only the offline check could run.
   */
  S.checkWriting = async function (text, opts) {
    opts = opts || {};
    text = String(text || '').trim();
    if (!text) return { corrected: '', fixes: [], full: true };

    var matches;
    try {
      var body = new URLSearchParams({ text: text, language: 'en-GB', level: 'default' });
      var res = await fetch(LT_URL, { method: 'POST', body: body });
      if (!res.ok) throw new Error('checker ' + res.status);
      matches = (await res.json()).matches || [];
    } catch (e) {
      return localCheck(text);
    }

    /* apply fixes from the end so earlier offsets stay valid */
    var fixes = [];
    var out = text;
    matches.slice().sort(function (a, b) { return b.offset - a.offset; }).forEach(function (m) {
      var from = text.substr(m.offset, m.length);
      var rep = m.replacements && m.replacements[0] && m.replacements[0].value;
      if (!rep) return;
      /* prefer a known child-friendly fix when there is one */
      var known = COMMON[from.toLowerCase()];
      if (known) rep = /^[A-Z]/.test(from) ? known[0].charAt(0).toUpperCase() + known[0].slice(1) : known[0];
      out = out.slice(0, m.offset) + rep + out.slice(m.offset + m.length);
      var type = (m.rule && m.rule.issueType) || '';
      fixes.unshift({
        from: from, to: rep,
        why: known ? known[1] : friendlyWhy(m, from, rep),
        kind: type === 'misspelling' ? 'spelling' : type === 'grammar' ? 'grammar' :
              /uppercase/i.test(m.message) ? 'capital' : 'punctuation'
      });
    });

    if (out.trim() && !/[.!?]["')]?$/.test(out.trim())) {
      fixes.push({ from: '…' + out.trim().slice(-8), to: '…' + out.trim().slice(-8) + '.',
                   why: 'End with a full stop.', kind: 'punctuation' });
      out = out.trim() + '.';
    }

    /* Every slip is kept, with its type, so the teacher can see what
       kind of spelling trouble this is: swapped letters, letters left
       out or added, letters in the wrong order, a different word, or a
       grammar slip. Letter swaps also feed the confusion profile. */
    if (opts.record !== false) {
      fixes.forEach(function (f) {
        if (f.kind === 'spelling') {
          var a = S.Analysis.analyseMisread(f.from, f.to) ||
                  { kind: 'other', heard: S.norm(f.from), expected: S.norm(f.to), pairs: [], note: 'spelt differently' };
          if (a.pairs && a.pairs.length) {
            S.Analysis.recordMisread(a, { source: 'writing', sentence: text, passage: opts.where || 'Writing' });
          }
          if (S.DB && S.norm(f.to)) S.DB.confusion(a, { detected_by: 'spelling', mode: 'write' });
        } else if (f.kind === 'grammar' && S.DB) {
          S.DB.confusion({ kind: 'grammar', heard: S.norm(f.from), expected: S.norm(f.to), pairs: [] },
                         { detected_by: 'spelling', mode: 'write' });
        }
      });
      S.save();
    }

    return { corrected: out, fixes: fixes, full: true };
  };

})(window.Spark);
