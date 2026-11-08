/* ============================================================
   speech.js — Spark's voice and Spark's ears.

   Voice : Web Speech Synthesis, with four characters to choose from.
           Browsers expose whatever voices the operating system has,
           and there are no genuine child voices among them — so a
           "boy" or "girl" is built by taking the closest adult voice
           and raising the pitch. It is a decent impression, not a
           real child, and the settings panel says so.

   Ears  : Web Speech Recognition (Chrome and Edge only).
           Needs a secure context: http://localhost is fine,
           opening the file directly is not.
   ============================================================ */

(function (S) {
  'use strict';

  /* ── the four characters ────────────────────────────── */
  S.VOICES = {
    woman: { label: 'Sarah', who: 'a woman', want: 'female', older: true,
             pitch: 1.02, rate: 1.00, sample: 'Hello, I\'m Sarah. I\'ll read with you.' },
    man:   { label: 'Tom',   who: 'a man',   want: 'male',   older: true,
             pitch: 0.90, rate: 0.97, sample: 'Hello, I\'m Tom. I\'ll read with you.' },
    girl:  { label: 'Mia',   who: 'a girl',  want: 'female', older: false,
             pitch: 1.42, rate: 1.03, sample: 'Hi! I\'m Mia. Let\'s read together.' },
    boy:   { label: 'Ravi',  who: 'a boy',   want: 'male',   older: false,
             pitch: 1.34, rate: 1.03, sample: 'Hi! I\'m Ravi. Let\'s read together.' }
  };

  /* Operating-system voice names, which is all we have to go on. */
  var FEMALE_NAMES = /aria|jenny|samantha|zira|susan|sara|karen|moira|tessa|serena|libby|sonia|emma|olivia|female|woman|victoria|allison|ava|joanna|kendra|kimberly|salli|heera|neerja|veena|raveena|zoe|natasha|hazel|catherine|fiona|amelie|nicky/i;
  var MALE_NAMES   = /guy|davis|daniel|david|mark|alex|fred|tom|oliver|ryan|george|james|male|\bman\b|matthew|brian|eric|christopher|roger|ravi|prabhat|rishi|arthur|aaron|gordon|liam|thomas/i;
  var NATURAL      = /natural|neural|premium|enhanced|online/i;

  var catalogue = [];

  function loadVoices() {
    if (!window.speechSynthesis) return;
    try { catalogue = window.speechSynthesis.getVoices() || []; } catch (e) { catalogue = []; }
  }

  if (window.speechSynthesis) {
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
  }

  /** Best operating-system voice for a character. */
  function voiceFor(key) {
    var want = (S.VOICES[key] || S.VOICES.woman).want;
    if (!catalogue.length) loadVoices();

    var english = catalogue.filter(function (v) { return /^en/i.test(v.lang); });
    if (!english.length) return null;

    var scored = english.map(function (v) {
      var score = 0;
      if (NATURAL.test(v.name)) score += 5;
      if (/google/i.test(v.name)) score += 1;
      if (want === 'female') {
        if (FEMALE_NAMES.test(v.name)) score += 6;
        if (MALE_NAMES.test(v.name)) score -= 8;
      } else {
        if (MALE_NAMES.test(v.name)) score += 6;
        if (FEMALE_NAMES.test(v.name)) score -= 8;
      }
      if (/en-(GB|US|IN|AU)/i.test(v.lang)) score += 1;
      return { v: v, score: score };
    }).sort(function (a, b) { return b.score - a.score; });

    return scored[0] ? scored[0].v : english[0];
  }

  S.availableVoiceNames = function () {
    if (!catalogue.length) loadVoices();
    return catalogue.filter(function (v) { return /^en/i.test(v.lang); })
                    .map(function (v) { return v.name; });
  };

  S.speechAvailable = !!window.speechSynthesis;

  /* ── saying things ──────────────────────────────────── */
  S.say = function (text, opts) {
    opts = opts || {};
    if (!window.speechSynthesis || !text) return;
    try {
      window.speechSynthesis.cancel();

      var key = S.P.settings.voice || 'woman';
      var character = S.VOICES[key] || S.VOICES.woman;
      var chosen = voiceFor(key);

      var u = new SpeechSynthesisUtterance(String(text));
      if (chosen) { u.voice = chosen; u.lang = chosen.lang; }
      u.pitch = S.clamp(character.pitch * (opts.pitch || 1), 0, 2);
      u.rate  = S.clamp((opts.rate != null ? opts.rate : S.P.settings.rate) * character.rate, 0.1, 10);
      if (opts.onEnd) u.onend = opts.onEnd;
      window.speechSynthesis.speak(u);
    } catch (e) { /* some browsers throw when the tab is hidden */ }
  };

  S.stopSaying = function () {
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
  };

  /** One syllable at a time, then the whole word. */
  /**
   * How many genuinely different system voices back the four
   * characters. On a machine with one English voice they will all
   * sound alike apart from pitch, and the Settings panel says so
   * rather than pretending otherwise.
   */
  S.voiceVariety = function () {
    var names = {};
    Object.keys(S.VOICES).forEach(function (k) {
      var v = voiceFor(k);
      if (v) names[v.name] = 1;
    });
    return { distinct: Object.keys(names).length };
  };

  S.sayInParts = function (word) {
    var parts = S.syllables(word), i = 0;
    function next() {
      if (i >= parts.length) { setTimeout(function () { S.say(word); }, 380); return; }
      S.say(parts[i++], { rate: 0.62, onEnd: function () { setTimeout(next, 170); } });
    }
    next();
  };

  /** Spell a word out letter by letter — for letter-confusion work. */
  S.sayLetters = function (word) {
    var letters = String(word).replace(/[^A-Za-z]/g, '').split(''), i = 0;
    function next() {
      if (i >= letters.length) { setTimeout(function () { S.say(word); }, 420); return; }
      S.say(letters[i++], { rate: 0.6, onEnd: function () { setTimeout(next, 220); } });
    }
    next();
  };

  /**
   * Read a passage aloud and report which WORD is being said, so the
   * page can follow along.
   *
   * Browsers fire a `boundary` event as each word starts, carrying
   * its character offset into the text. Mapping that offset back to
   * a word index gives a proper read-along — the child sees exactly
   * the word they are hearing, which is the point of listening first.
   *
   * Not every browser fires `boundary`, so when none arrives the
   * caller is told, and can fall back to whole-sentence highlighting.
   *
   * Returns a handle with .stop().
   */
  S.readAlong = function (text, opts) {
    opts = opts || {};
    if (!window.speechSynthesis || !text) { if (opts.onEnd) opts.onEnd(false); return null; }

    /* character offset -> word index, worked out once up front */
    var starts = [];
    var re = /\S+/g, m;
    while ((m = re.exec(text)) !== null) starts.push(m.index);

    function wordAt(charIndex) {
      var lo = 0, hi = starts.length - 1, best = 0;
      while (lo <= hi) {
        var mid = (lo + hi) >> 1;
        if (starts[mid] <= charIndex) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
      }
      return best;
    }

    try { window.speechSynthesis.cancel(); } catch (e) {}

    var u = new SpeechSynthesisUtterance(String(text));
    var chosen = S.VOICES[S.P.settings.voice] ? S.P.settings.voice : 'woman';
    var v = voiceFor(chosen);
    if (v) { u.voice = v; u.lang = v.lang; }
    var character = S.VOICES[chosen];
    u.rate = (opts.rate != null ? opts.rate : S.P.settings.rate) * (character ? character.rate : 1);
    u.pitch = character ? character.pitch : 1.05;

    var sawBoundary = false;
    u.onboundary = function (e) {
      if (e.name && e.name !== 'word') return;
      sawBoundary = true;
      if (opts.onWord) opts.onWord(wordAt(e.charIndex));
    };
    u.onstart = function () { if (opts.onStart) opts.onStart(); };
    u.onend   = function () { if (opts.onEnd) opts.onEnd(sawBoundary); };
    u.onerror = function () { if (opts.onEnd) opts.onEnd(sawBoundary); };

    try { window.speechSynthesis.speak(u); }
    catch (e) { if (opts.onEnd) opts.onEnd(false); return null; }

    return { stop: function () { try { window.speechSynthesis.cancel(); } catch (e) {} } };
  };

  S.sayEach = function (sentences, onSentence) {
    var i = 0;
    function next() {
      if (i >= sentences.length) return;
      var idx = i;
      if (onSentence) onSentence(idx);
      S.say(sentences[idx], { onEnd: function () { i++; next(); } });
    }
    next();
  };

  /* ── listening ──────────────────────────────────────── */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  S.micAvailable = !!SR;

  S.micProblem = function () {
    if (!SR) return 'This browser can\'t listen. Chrome or Edge can.';
    if (window.isSecureContext === false)
      return 'Open Spark through start.sh or start.bat (http://localhost) so the microphone works.';
    return '';
  };

  /**
   * Continuous listening. Unlike before, the whole result list is
   * handed over untouched — the aligner needs to see which results
   * are final and which are still being revised.
   */
  S.listenContinuous = function (onResults, onProblem) {
    if (!SR) { onProblem && onProblem(S.micProblem()); return null; }
    var rec, stopped = false;
    try {
      rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = S.P.settings.lang || 'en-GB';
      rec.maxAlternatives = 1;
    } catch (e) {
      onProblem && onProblem('Couldn\'t start the microphone.');
      return null;
    }

    rec.onresult = function (e) { onResults(e.results); };
    rec.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        stopped = true;
        onProblem && onProblem('The microphone is blocked. Allow it in the address bar and try again.');
      }
    };
    /* Chrome ends the session after a silence; restart unless we meant to stop */
    rec.onend = function () { if (!stopped) { try { rec.start(); } catch (e) {} } };

    try { rec.start(); }
    catch (e) { onProblem && onProblem('Couldn\'t start the microphone.'); return null; }

    return { stop: function () { stopped = true; try { rec.onend = null; rec.stop(); } catch (e) {} } };
  };

  /** One-shot dictation into a field. */
  S.listenOnce = function (onText, onDone, onProblem) {
    if (!SR) { onProblem && onProblem(S.micProblem()); return null; }
    var rec, best = '';
    try {
      rec = new SR();
      rec.lang = S.P.settings.lang || 'en-GB';
      rec.interimResults = true;
    } catch (e) {
      onProblem && onProblem('Couldn\'t start the microphone.');
      return null;
    }
    rec.onresult = function (e) {
      best = Array.prototype.slice.call(e.results)
        .map(function (r) { return r[0].transcript; }).join(' ').trim();
      onText && onText(best);
    };
    rec.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        onProblem && onProblem('The microphone is blocked. Allow it in the address bar.');
      }
    };
    rec.onend = function () { onDone && onDone(best); };

    try { rec.start(); }
    catch (e) { onProblem && onProblem('Couldn\'t start the microphone.'); return null; }

    return { stop: function () { try { rec.stop(); } catch (e) {} } };
  };

})(window.Spark);
