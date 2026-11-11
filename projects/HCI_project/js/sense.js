/* ============================================================
   sense.js — which MEANING of the word is this?

   Words do not have one meaning or one sound:

     back      "at the back of the chair"  vs  "my back hurts"
     read      "I read it today" (reed)    vs  "I read it
               yesterday" (red)
     lead      the metal (led)             vs  to lead (leed)
     tear      a drop from the eye         vs  to rip

   Looking up the bare word gets the wrong picture ("back" gave a
   photograph of a human back) and the wrong pronunciation (every
   "read" came out in the present tense). So the word is never
   handled alone: the SENTENCE it sits in goes to the language
   model, which answers four things for that sense of the word:

     meaning   one short sentence a child understands
     say       how to spell the pronunciation for a speech engine,
               in THIS sentence (the past tense of read → "red")
     query     what to search for to find a picture of this sense
               ("chair back", not "back")
     draw      false when no picture would help or be suitable
               (feelings, body parts, grammar words)

   The answer is cached, so each word-in-a-sentence is asked once.
   With no model connected nothing here runs, and the older
   behaviour (bundled drawings, then pictograms) is what remains.
   ============================================================ */

(function (S) {
  'use strict';

  var KEY = 'spark.sense.v1';
  var cache = {};
  try { cache = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  var inflight = {};

  function keep() {
    var keys = Object.keys(cache);
    if (keys.length > 600) keys.slice(0, 150).forEach(function (k) { delete cache[k]; });
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) {}
  }

  function hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  /** The key a word-in-a-sentence is remembered under. */
  S.senseKey = function (word, sentence) {
    return S.norm(word) + '@' + hash(String(sentence || '').toLowerCase().trim());
  };

  function clean(raw, word) {
    if (!raw || typeof raw !== 'object') return null;
    var say = String(raw.say || '').replace(/[^A-Za-z' -]/g, '').trim().toLowerCase();
    var query = String(raw.query || '').replace(/[^A-Za-z' -]/g, '').trim().toLowerCase();
    return {
      meaning: String(raw.meaning || '').slice(0, 140),
      say: say && say.length <= 24 ? say : S.norm(word),
      query: query && query.length <= 40 ? query : S.norm(word),
      draw: raw.draw === true
    };
  }

  /**
   * Resolve the sense of a word inside its sentence.
   * Resolves { meaning, say, query, draw } or null when there is no
   * model to ask (callers then fall back to the old behaviour).
   */
  S.senseOf = async function (word, sentence) {
    var n = S.norm(word);
    if (!n || !sentence || !S.AI || !S.AI.ready) return null;
    var k = S.senseKey(n, sentence);
    if (cache[k]) return cache[k];
    if (inflight[k]) return inflight[k];

    inflight[k] = (async function () {
      try {
        var out = await S.AI.askJSON(
          'A child with dyslexia is reading this sentence:\n"' + String(sentence).slice(0, 240) + '"\n' +
          'They need help with the word "' + n + '" AS USED IN THAT SENTENCE.\n' +
          'Reply with only JSON: {"meaning":string,"say":string,"query":string,"draw":boolean}\n' +
          '- "meaning": what the word means HERE, one short sentence a 9-year-old understands, under 12 words.\n' +
          '- "say": the word spelled so a text-to-speech voice says it correctly in THIS sentence. ' +
          'If the usual spelling would be said wrongly (a past-tense "read" is "red", "lead" the metal is "led", ' +
          '"wind" the verb is "wynd"), give the respelling; otherwise repeat the word.\n' +
          '- "query": 1 to 3 plain words to search a picture library for THIS meaning, naming the thing it ' +
          'belongs to ("chair back" for the back of a chair, "wall", "cooking pot"), never the bare word ' +
          'when it has other meanings.\n' +
          '- "draw": true ONLY if one clear, harmless picture of an object, animal, place or action would ' +
          'show this meaning to a 7-year-old. false for feelings, ideas, grammar words, and for anything ' +
          'whose natural picture would show a person\'s body or bare skin.',
          { maxTokens: 160, temperature: 0 });
        var res = clean(out, n);
        if (res) { cache[k] = res; keep(); }
        return res;
      } catch (e) { return null; }
      finally { delete inflight[k]; }
    })();
    return inflight[k];
  };

  /** What was already worked out (no waiting), or null. */
  S.senseCached = function (word, sentence) {
    return (sentence && cache[S.senseKey(word, sentence)]) || null;
  };

  /* The sentence a word on the page belongs to. */
  S.sentenceOf = function (el) {
    var p = el && el.closest ? el.closest('p, .desc-text, .lw-wrap') : null;
    return p ? p.textContent.replace(/\s+/g, ' ').trim() : '';
  };

  /** The sentence in the current passage that contains a typed word. */
  S.sentenceFor = function (word) {
    var R = S.currentReading && S.currentReading();
    var n = S.norm(word);
    if (!R || !R.sentences) return '';
    for (var i = 0; i < R.sentences.length; i++) {
      var found = R.sentences[i].split(/\s+/).some(function (w) { return S.norm(w) === n; });
      if (found) return R.sentences[i];
    }
    return '';
  };

  /**
   * Say a single word the way it sounds in its sentence — right tense,
   * right meaning — as a clear isolated word (no story voice).
   */
  S.sayWord = async function (word, sentence, opts) {
    opts = Object.assign({ mode: 'word' }, opts || {});
    var sense = sentence ? await S.senseOf(word, sentence) : null;
    S.say(sense ? sense.say : word, opts);
  };

  /**
   * Said in parts: each chunk by its own respelling, a beat apart,
   * then the whole word. The respelling is what stops "ta-ble" being
   * read as the words "ta" and "ble".
   */
  S.sayParts = async function (word, sentence) {
    var parts = await S.partsFor(word);
    var sense = sentence ? await S.senseOf(word, sentence) : null;
    var whole = sense ? sense.say : word;
    var i = 0;
    S.stopSaying();
    (function next() {
      if (i >= parts.length) { setTimeout(function () { S.say(whole, { mode: 'word', rate: 0.8 }); }, 380); return; }
      S.say(parts[i++].say, { mode: 'word', rate: 0.6, onEnd: function () { setTimeout(next, 260); } });
    })();
  };

})(window.Spark);
