/* ============================================================
   lexicon.js — turning a word into something a struggling reader
   can get hold of: where it breaks, how it sounds, what it looks like.

   All of this runs offline. When an AI helper is configured it adds
   a plain-English meaning on top, but nothing here depends on it.
   ============================================================ */

(function (S) {
  'use strict';

  var VOW = 'aeiouy';

  /* Two different things, which the old single list ran together.

     A DIGRAPH is one sound written with two letters. A split must
     never fall inside one: "mother" is mo-ther, never mot-her.

     A BLEND is two sounds that can begin a syllable. A split MAY
     fall inside one, and usually should: "sister" is sis-ter, not
     si-ster. Treating blends as unsplittable was why it produced
     si-ster, and an open first syllable tells the child to say a
     long "i", which is the opposite of the help intended.

     Where both readings are possible, this follows the rule taught
     first in structured phonics: with two consonants between
     vowels, split between them, so the first syllable is closed and
     its vowel is short. That is the commoner English pattern. */
  var DIGRAPH = {};
  ['ch','ck','gh','ng','ph','sh','th','wh'].forEach(function (d) { DIGRAPH[d] = true; });

  var BLEND = {};
  ['bl','br','cl','cr','dr','fl','fr','gl','gr','pl','pr','sc','sk','sl','sm',
   'sn','sp','st','sw','tr','tw','qu','wr']
    .forEach(function (b) { BLEND[b] = true; });

  /* ── syllable splitting ─────────────────────────────────
     Finds the vowel sounds, then decides where the consonants
     between them belong. Handles silent final -e (make) and the
     syllabic -le that forms its own beat (ta-ble).
     It is a heuristic, not a dictionary, but it is right often
     enough to decode by — and always gives something usable. */
  function splitOne(word) {
    var w = word.toLowerCase(), n = w.length;
    if (n < 3) return [word];

    /* vowel groups = the nuclei of the syllables */
    var nuc = [], i, j;
    for (i = 0; i < n; i++) {
      if (VOW.indexOf(w[i]) > -1) {
        j = i;
        while (j + 1 < n && VOW.indexOf(w[j + 1]) > -1) j++;
        nuc.push([i, j]);
        i = j;
      }
    }
    if (nuc.length < 2) return [word];

    /* a lone final "e" is normally silent — unless it is the -le of "table" */
    var last = nuc[nuc.length - 1];
    if (last[0] === last[1] && w[last[0]] === 'e' && last[1] === n - 1) {
      var syllabicLe = n >= 4 && w.slice(-2) === 'le' && VOW.indexOf(w[n - 3]) === -1;
      if (!syllabicLe) nuc.pop();
    }
    if (nuc.length < 2) return [word];

    var cuts = [];
    for (var k = 0; k < nuc.length - 1; k++) {
      var a = nuc[k][1], b = nuc[k + 1][0], gap = b - a - 1;
      var pair = w.slice(a + 1, a + 3), cut;
      if (gap === 0)                       cut = b;       /* V | V          */
      else if (gap === 1)                  cut = b - 1;   /* V | CV         */
      else if (gap === 2 && DIGRAPH[pair]) cut = a + 1;   /* mo | ther      */
      else if (gap === 2)                  cut = a + 2;   /* sis | ter      */
      else if (gap >= 3) {
        /* A longer run of consonants: give the next syllable as much
           as can legally start one — a digraph or a blend — and
           leave the rest closing the syllable before it. */
        var onset2 = w.slice(b - 2, b);
        cut = (DIGRAPH[onset2] || BLEND[onset2]) ? b - 2 : b - 1;
      }
      else                                 cut = a + 2;
      cuts.push(cut);
    }
    if (/[^aeiouy]le$/.test(w) && cuts.length) cuts[cuts.length - 1] = n - 3;

    var parts = [], prev = 0;
    cuts.forEach(function (c) {
      if (c > prev && c < n) { parts.push(word.slice(prev, c)); prev = c; }
    });
    parts.push(word.slice(prev));

    /* a fragment with no vowel is not a syllable — glue it back */
    var out = [];
    parts.forEach(function (p) {
      if (!/[aeiouy]/i.test(p) && out.length) out[out.length - 1] += p;
      else out.push(p);
    });
    return out.filter(Boolean);
  }

  /* Endings that are their own beat AND their own piece of meaning.
     Splitting these off first matters for more than rhythm: spotting
     a known ending is one of the few decoding strategies that keeps
     paying off as words get longer, so "jumping" should come apart
     as jump-ing, not jum-ping.

     "-er" is deliberately NOT in this list. It is the one common
     ending that cannot be told from an ordinary syllable without a
     dictionary: teacher is teach-er, but water is not wat-er, and
     there is nothing in the spelling to separate the two. The
     general rules get water right, so the suffix rule stays out of
     their way. */
  var SUFFIX = /^(.{3,}?)(ing|edly|ness|ment|less|ful|able|ible|tion|sion|est|ly)$/;

  function withSuffix(word) {
    var m = SUFFIX.exec(word.toLowerCase());
    if (!m) return null;
    var stem = word.slice(0, m[1].length), end = word.slice(m[1].length);

    /* the stem still has to be a word-shaped thing with a vowel in it */
    if (!/[aeiouy]/i.test(stem)) return null;
    /* A consonant doubled to protect a short vowel belongs to the
       ending, not the stem: running is run-ning, not runn-ing. */
    var dbl = /([^aeiouy])\1$/i.exec(stem);
    if (dbl) return splitOne(stem.slice(0, -1)).concat([stem.slice(-1) + end]);

    return splitOne(stem).concat([end]);
  }

  S.syllables = function (word) {
    var raw = String(word == null ? '' : word).replace(/^[^A-Za-z'-]+|[^A-Za-z'-]+$/g, '');
    if (!raw) return [String(word == null ? '' : word)];

    if (raw.indexOf('-') > -1) {
      var bits = raw.split('-'), out = [];
      bits.forEach(function (b, i) {
        var s = b ? splitOne(b) : [];
        if (i < bits.length - 1) {
          if (s.length) s[s.length - 1] += '-'; else s.push('-');
        }
        out.push.apply(out, s);
      });
      return out.filter(Boolean);
    }
    return withSuffix(raw) || splitOne(raw);
  };

  /* ── rough "say it like this" spelling ──────────────────
     A respelling is only worth showing if it is RIGHT. Showing a
     dyslexic child a wrong one is worse than showing nothing: they
     cannot tell it is wrong, and the whole reason they are looking
     is that they do not already know. So this is built to refuse.

     The old rule set mapped every "ough" to "uff". That is correct
     for rough and tough and wrong for brought, through, though,
     cough and plough — "ough" is the most irregular string in
     English, and it turns up in exactly the words children get
     stuck on. The fix is a dictionary for the irregulars, and a
     refusal to guess at anything still ambiguous afterwards. */

  /* The irregular words a 9-14 year old actually meets. */
  var SAY_AS = {
    brought: 'brawt', thought: 'thawt', bought: 'bawt', fought: 'fawt',
    ought: 'awt', sought: 'sawt', nought: 'nawt', caught: 'cawt',
    taught: 'tawt', daughter: 'daw-ter', naughty: 'naw-tee',
    through: 'throo', though: 'thoh', although: 'awl-thoh',
    thorough: 'thu-ruh', borough: 'bu-ruh', dough: 'doh',
    rough: 'ruff', tough: 'tuff', enough: 'ee-nuff',
    cough: 'coff', trough: 'troff', plough: 'plow', bough: 'bow',
    one: 'wun', once: 'wunce', two: 'too', who: 'hoo', whose: 'hooz',
    said: 'sed', says: 'sez', again: 'a-gen', friend: 'frend',
    busy: 'biz-ee', business: 'biz-nes', because: 'be-cawz',
    people: 'pee-pul', island: 'eye-land', aisle: 'ile',
    colonel: 'ker-nel', yacht: 'yot', choir: 'kwire',
    knight: 'nite', night: 'nite', light: 'lite', right: 'rite',
    height: 'hite', eight: 'ate', weight: 'wate', sign: 'sine',
    answer: 'an-ser', sword: 'sord', castle: 'cas-ul', listen: 'lis-un',
    whistle: 'whis-ul', often: 'off-un', climb: 'clime', comb: 'kome',
    lamb: 'lam', thumb: 'thum', doubt: 'dowt', debt: 'det',
    guard: 'gard', guess: 'gess', guest: 'gest', build: 'bild',
    heart: 'hart', learn: 'lern', earth: 'erth', search: 'serch',
    beautiful: 'bew-ti-ful', women: 'wim-in', woman: 'woo-man',
    minute: 'min-it', separate: 'sep-a-rate', February: 'feb-roo-ree'
  };

  /* Strings whose sound genuinely depends on the word. If one of
     these survives the rules below, Spark does not know how the word
     sounds and says nothing rather than making something up. */
  var AMBIGUOUS = /ough|augh|eigh|ei|ie(?!s$)|ea|ou|oo|ow|ch|gh/;

  var SOUNDS = [
    [/tion$/, 'shun'], [/sion$/, 'zhun'],
    [/ph/g, 'f'], [/ck/g, 'k'], [/^kn/, 'n'], [/^wr/, 'r'],
    [/^wh/, 'w'], [/qu/g, 'kw'], [/dge/g, 'j'],
    [/ce$/, 'ss'], [/c([eiy])/g, 's$1'], [/c/g, 'k'],
    [/igh/g, 'y'], [/au/g, 'aw'], [/([^aeiou])y$/, '$1ee']
  ];

  S.phonetic = function (word) {
    var s = S.norm(word);
    if (!s) return '';

    /* known irregular: use the real answer */
    if (SAY_AS[s]) return SAY_AS[s];

    /* regular enough to sound out: apply the rules */
    var out = s;
    SOUNDS.forEach(function (r) { out = out.replace(r[0], r[1]); });

    /* still carrying a spelling that could go several ways? then
       Spark does not actually know, and says so by staying quiet.
       The picture and the Hear-it button still work. */
    if (AMBIGUOUS.test(out)) return '';

    return S.syllables(out).join('-');
  };

  /* Pictures used to live here as an emoji lookup. They now come
     from pictures.js — drawn SVG illustrations, with ARASAAC
     pictograms for anything not in the drawn set. */

  /* Words too common to be worth quizzing on. */
  S.STOPWORDS = (function () {
    var set = {};
    ('the a an and or but of to in on at it its is was were be been are am for ' +
     'with from this that these those he she they them his her their you your i ' +
     'we us our as by so if then than there here when what which who how not no ' +
     'yes do did does had have has will would can could some into out up down ' +
     'over under again very just more most much many')
      .split(' ').forEach(function (w) { set[w] = true; });
    return set;
  })();

  /* Levenshtein distance — how far apart two words are. */
  S.distance = function (a, b) {
    var d = [], i, j, prev, tmp;
    for (j = 0; j <= b.length; j++) d[j] = j;
    for (i = 1; i <= a.length; i++) {
      prev = d[0]; d[0] = i;
      for (j = 1; j <= b.length; j++) {
        tmp = d[j];
        d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = tmp;
      }
    }
    return d[b.length];
  };

  /* Did the child say close enough to this word? Speech recognition
     mishears constantly, so an exact match would be far too strict. */
  S.soundsLike = function (heard, wanted) {
    if (!heard || !wanted) return false;
    if (heard === wanted) return true;
    if (wanted.length > 3 && S.distance(heard, wanted) <= 1) return true;
    if (wanted.length > 6 && S.distance(heard, wanted) <= 2) return true;
    return false;
  };

})(window.Spark);
