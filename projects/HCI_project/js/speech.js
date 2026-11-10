/* ============================================================
   speech.js — Spark's voice and Spark's ears.

   VOICE. Three sources, best first:

     1  A neural voice from the site's server (/tts), when one is
        set up. Lively, natural, and pronounces words correctly.
     2  The browser's own NATURAL voices. Edge ships excellent
        neural voices (Ava, Andrew, Emma, Ana…), Chrome has Google's.
        These are strongly preferred.
     3  Anything else the system has. The old Windows desktop voices
        (David, Zira, Mark) are what made Spark sound robotic, so
        they are only used when nothing better exists.

   Each character asks for particular voices by name, so "Ava"
   really is Ava where she is installed, rather than whichever
   female voice happened to come first.

   EARS. Web Speech Recognition (Chrome and Edge) follows the
   reading live; listen.js adds a second, more accurate listen
   with Whisper afterwards.
   ============================================================ */

(function (S) {
  'use strict';

  /* ── the four characters ────────────────────────────────
     `prefer` is matched against system voice names, in order.
     `cloud` is the server voice used when /tts is available. */
  S.VOICES = {
    woman: { label: 'Ava', who: 'bright and friendly', want: 'female', cloud: 'coral',
             prefer: ['ava', 'emma', 'jenny', 'aria', 'sonia', 'libby', 'google uk english female',
                      'google us english', 'samantha', 'serena', 'karen'],
             pitch: 1.08, rate: 1.02, sample: 'Hi! I\'m Ava. Let\'s read something fun together!' },
    man:   { label: 'Andrew', who: 'warm and calm', want: 'male', cloud: 'ash',
             prefer: ['andrew', 'brian', 'guy', 'ryan', 'christopher', 'eric', 'thomas',
                      'google uk english male', 'daniel', 'alex'],
             pitch: 1.0, rate: 1.0, sample: 'Hello! I\'m Andrew. I can\'t wait to read with you.' },
    girl:  { label: 'Ana', who: 'a cheerful girl', want: 'female', cloud: 'nova', child: /ana|maisie/i,
             prefer: ['ana', 'maisie', 'emma', 'ava', 'jenny', 'google uk english female', 'samantha'],
             pitch: 1.18, rate: 1.04, sample: 'Hiya! I\'m Ana. Reading is more fun with a friend!' },
    boy:   { label: 'Ravi', who: 'a lively boy', want: 'male', cloud: 'verse',
             prefer: ['brian', 'andrew', 'ryan', 'guy', 'eric', 'google uk english male', 'daniel'],
             pitch: 1.14, rate: 1.04, sample: 'Hey! I\'m Ravi. Let\'s go — this is going to be great!' }
  };

  var NATURAL  = /natural|neural|online|premium|enhanced|google/i;
  var ROBOTIC  = /desktop|\bdavid\b|\bzira\b|\bmark\b|\bhazel\b|\bgeorge\b|\bsusan\b|espeak|compact/i;
  var MALE     = /andrew|brian|guy|ryan|christopher|eric|thomas|daniel|alex|david|mark|george|roger|steffan|male\b/i;
  var FEMALE   = /ava|emma|jenny|aria|sonia|libby|ana\b|maisie|samantha|serena|karen|zira|hazel|susan|female/i;

  var catalogue = [];
  function loadVoices() {
    if (!window.speechSynthesis) return;
    try { catalogue = window.speechSynthesis.getVoices() || []; } catch (e) { catalogue = []; }
  }
  if (window.speechSynthesis) {
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
  }

  /** The best installed voice for a character. */
  function voiceFor(key) {
    var c = S.VOICES[key] || S.VOICES.woman;
    if (!catalogue.length) loadVoices();
    var english = catalogue.filter(function (v) { return /^en/i.test(v.lang); });
    if (!english.length) return null;

    var scored = english.map(function (v) {
      var name = v.name.toLowerCase(), score = 0;
      c.prefer.forEach(function (p, i) {
        if (name.indexOf(p) > -1) score = Math.max(score, 40 - i * 2);
      });
      if (NATURAL.test(v.name)) score += 20;
      if (ROBOTIC.test(v.name)) score -= 25;
      if (c.want === 'female' && MALE.test(name) && !FEMALE.test(name)) score -= 30;
      if (c.want === 'male' && FEMALE.test(name) && !MALE.test(name)) score -= 30;
      if (/en-(GB|US)/i.test(v.lang)) score += 2;
      return { v: v, score: score };
    }).sort(function (a, b) { return b.score - a.score; });
    return scored[0].v;
  }
  S.voiceFor = voiceFor;

  /* A child voice (Edge's Ana, Maisie) already sounds young; only
     raise the pitch when an adult voice is standing in. */
  function pitchFor(key, v) {
    var c = S.VOICES[key] || S.VOICES.woman;
    if (c.child && v && c.child.test(v.name)) return 1.04;
    return c.pitch;
  }

  S.availableVoiceNames = function () {
    if (!catalogue.length) loadVoices();
    return catalogue.filter(function (v) { return /^en/i.test(v.lang); }).map(function (v) { return v.name; });
  };

  S.speechAvailable = !!window.speechSynthesis;

  /* ── the server's neural voice ──────────────────────────
     Tried once; if the server has no voice model it says so (501)
     and Spark quietly stays on the browser's voices. */
  var cloud = { state: 'unknown', audio: null, cache: {} };

  function cloudURL() { return S.serverURL ? S.serverURL('/tts') : ''; }
  function cloudOn() {
    return cloud.state !== 'off' && !!cloudURL() && S.P.settings.cloudVoice !== false;
  }
  S.cloudVoiceState = function () { return cloudURL() ? cloud.state : 'off'; };

  async function cloudAudio(text, key) {
    var c = S.VOICES[key] || S.VOICES.woman;
    var id = c.cloud + '|' + text;
    if (cloud.cache[id]) return cloud.cache[id];
    var res = await fetch(cloudURL(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text, voice: c.cloud })
    });
    if (!res.ok) {
      if (res.status === 501 || res.status === 400 || res.status === 404) cloud.state = 'off';
      throw new Error('tts ' + res.status);
    }
    cloud.state = 'on';
    var url = URL.createObjectURL(await res.blob());
    cloud.cache[id] = url;
    return url;
  }

  var playToken = 0;
  function playCloud(text, opts) {
    var token = ++playToken;
    var key = S.P.settings.voice || 'woman';
    return cloudAudio(text, key).then(function (url) {
      if (token !== playToken) return;            /* something newer was asked for */
      stopAudio();
      var a = new Audio(url);
      a.playbackRate = S.clamp((opts.rate != null ? opts.rate : S.P.settings.rate) / 0.95, 0.6, 1.5);
      a.preservesPitch = true;
      cloud.audio = a;
      if (opts.onEnd) a.onended = opts.onEnd;
      return a.play().then(function () { return a; });
    });
  }

  function stopAudio() {
    if (cloud.audio) { try { cloud.audio.pause(); } catch (e) {} cloud.audio.onended = null; cloud.audio = null; }
  }

  /* ── saying things ──────────────────────────────────── */
  function browserSay(text, opts) {
    if (!window.speechSynthesis) { if (opts.onEnd) opts.onEnd(); return; }
    try {
      window.speechSynthesis.cancel();
      var key = S.P.settings.voice || 'woman';
      var c = S.VOICES[key] || S.VOICES.woman;
      var chosen = voiceFor(key);
      var u = new SpeechSynthesisUtterance(String(text));
      if (chosen) { u.voice = chosen; u.lang = chosen.lang; }
      u.pitch = S.clamp(pitchFor(key, chosen) * (opts.pitch || 1), 0, 2);
      u.rate  = S.clamp((opts.rate != null ? opts.rate : S.P.settings.rate) * c.rate, 0.1, 10);
      if (opts.onEnd) u.onend = opts.onEnd;
      window.speechSynthesis.speak(u);
    } catch (e) { /* some browsers throw when the tab is hidden */ }
  }

  S.say = function (text, opts) {
    opts = opts || {};
    if (!text) return;
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    stopAudio();
    if (cloudOn()) {
      playCloud(String(text), opts).catch(function () {
        if (cloud.state !== 'off' && cloud.state !== 'on') cloud.state = 'off';
        browserSay(text, opts);
      });
      return;
    }
    browserSay(text, opts);
  };

  S.stopSaying = function () {
    playToken++;
    stopAudio();
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
  };

  S.voiceVariety = function () {
    var names = {};
    Object.keys(S.VOICES).forEach(function (k) {
      var v = voiceFor(k);
      if (v) names[v.name] = 1;
    });
    return { distinct: Object.keys(names).length };
  };

  /** Which real voice a character is using, for Settings. */
  S.voiceName = function (key) {
    if (cloud.state === 'on') return 'Spark\'s natural voice';
    var v = voiceFor(key);
    return v ? v.name.replace(/^Microsoft\s+|\s+-\s+English.*$|\s+Online|\s+\(Natural\)/gi, '') : '';
  };

  /* ── word parts, said so they sound right ───────────────
     Saying "ligh" and "thouse" one after the other is not how
     lighthouse sounds, and a speech engine mangles fragments it
     cannot pronounce. So each part carries a "say" spelling — from
     the AI helper when it is connected (see S.partsFor), or the
     part itself when it is a real word — and that is what is
     spoken. Then the whole word, at normal speed. */
  S.sayInParts = function (word) {
    var clean = String(word || '').replace(/[^A-Za-z'-]/g, '');
    if (!clean) return;
    S.partsFor(clean).then(function (parts) {
      if (parts.length < 2) { S.say(clean, { rate: 0.7, onEnd: function () {
        setTimeout(function () { S.say(clean); }, 300); } }); return; }
      var i = 0;
      (function next() {
        if (i >= parts.length) { setTimeout(function () { S.say(clean); }, 380); return; }
        var p = parts[i++];
        S.say(p.say || p.text, { rate: 0.7, onEnd: function () { setTimeout(next, 200); } });
      })();
    });
  };

  /** Spell a word out letter by letter — for letter-confusion work. */
  S.sayLetters = function (word) {
    var letters = String(word).replace(/[^A-Za-z]/g, '').split(''), i = 0;
    function next() {
      if (i >= letters.length) { setTimeout(function () { S.say(word); }, 420); return; }
      S.say(letters[i++], { rate: 0.7, onEnd: function () { setTimeout(next, 220); } });
    }
    next();
  };

  /**
   * Read a passage aloud and report which WORD is being said, so the
   * page can follow along. Returns a handle with .stop().
   *
   * Browser voices fire a `boundary` event per word. The server voice
   * does not, so its word times are estimated from each word's length
   * across the length of the audio — close enough to keep the
   * highlight on the word being heard.
   */
  S.readAlong = function (text, opts) {
    opts = opts || {};
    if (!text) { if (opts.onEnd) opts.onEnd(false); return null; }

    var starts = [];
    var re = /\S+/g, m;
    while ((m = re.exec(text)) !== null) starts.push(m.index);

    if (cloudOn()) return cloudReadAlong(text, opts);
    return browserReadAlong(text, opts, starts);
  };

  function cloudReadAlong(text, opts) {
    var words = text.split(/\s+/).filter(Boolean);
    var stopped = false, raf = 0;
    S.stopSaying();
    var token = playToken;
    var handle = { stop: function () { stopped = true; cancelAnimationFrame(raf); S.stopSaying(); } };

    cloudAudio(text, S.P.settings.voice || 'woman').then(function (url) {
      if (stopped || token !== playToken) return;
      var a = new Audio(url);
      a.playbackRate = S.clamp(S.P.settings.rate / 0.95, 0.6, 1.5);
      cloud.audio = a;
      var weights = words.map(function (w) { return w.length + 2 + (/[.!?]$/.test(w) ? 5 : /[,;:]$/.test(w) ? 2 : 0); });
      var total = weights.reduce(function (x, y) { return x + y; }, 0);
      var cum = [], acc = 0;
      weights.forEach(function (w) { cum.push(acc / total); acc += w; });
      var last = -1;
      function tick() {
        if (stopped || !a.duration) { if (!stopped) raf = requestAnimationFrame(tick); return; }
        var f = a.currentTime / a.duration, i = 0;
        while (i + 1 < cum.length && cum[i + 1] <= f) i++;
        if (i !== last) { last = i; if (opts.onWord) opts.onWord(i); }
        if (!a.ended) raf = requestAnimationFrame(tick);
      }
      a.onended = function () { cancelAnimationFrame(raf); if (!stopped && opts.onEnd) opts.onEnd(true); };
      a.play().then(tick).catch(function () { if (opts.onEnd) opts.onEnd(false); });
    }).catch(function () {
      if (stopped) return;
      var starts = [], re = /\S+/g, m;
      while ((m = re.exec(text)) !== null) starts.push(m.index);
      var h = browserReadAlong(text, opts, starts);
      handle.stop = function () { stopped = true; if (h) h.stop(); };
    });
    return handle;
  }

  function browserReadAlong(text, opts, starts) {
    if (!window.speechSynthesis) { if (opts.onEnd) opts.onEnd(false); return null; }
    function wordAt(charIndex) {
      var lo = 0, hi = starts.length - 1, best = 0;
      while (lo <= hi) {
        var mid = (lo + hi) >> 1;
        if (starts[mid] <= charIndex) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
      }
      return best;
    }
    try { window.speechSynthesis.cancel(); } catch (e) {}

    var key = S.VOICES[S.P.settings.voice] ? S.P.settings.voice : 'woman';
    var u = new SpeechSynthesisUtterance(String(text));
    var v = voiceFor(key);
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = (opts.rate != null ? opts.rate : S.P.settings.rate) * S.VOICES[key].rate;
    u.pitch = pitchFor(key, v);

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
  }

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
