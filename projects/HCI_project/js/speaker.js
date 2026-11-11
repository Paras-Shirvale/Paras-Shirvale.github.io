/* ============================================================
   speaker.js — is this still the same person reading?

   Why it exists: a reading app that adapts to a child is only
   useful if the voice it adapts to is actually the child's. If an
   older sibling or a parent reads the passage, every number the app
   collects is wrong, and the homework it builds is for the wrong
   person.

   How it works: while the microphone is open the audio is also fed
   to a Web Audio analyser. For every voiced moment three kinds of
   evidence are measured (see voiceprint.js for why):

     vocal-tract length  formants F1-F3, which rise as the throat
                         gets shorter. A child's are about 25-30%
                         higher than a man's at ANY pitch. This is
                         the main child-versus-adult signal.
     timbre              the mean of 12 MFCCs, the standard
                         speaker-verification feature.
     pitch (F0)          only a supporting vote. One person's pitch
                         swings by a third of an octave between a
                         question and a statement, so pitch alone
                         never changes the verdict unless it jumps
                         by well over half an octave.

   The first seconds of voiced audio become the voiceprint. After
   that a rolling window is compared against it and the verdict is a
   vote: two of the three signals must agree, or the vocal tract
   alone must be clearly different.

   What this is NOT: speaker identification. Two children of similar
   age have similar throats and cannot be told apart, and it is not
   security. The UI says "that sounds like a different voice" rather
   than making an accusation, and one tap says "it is still me".
   ============================================================ */

(function (S) {
  'use strict';

  var ctx = null, stream = null, analyser = null, timer = null;
  var live = null, onLive = null;   /* the live readout, for the meter */
  var timeBuf = null, freqBuf = null;

  var baseline = null;        /* { f0, centroid } once enrolled */
  var enrol = [];             /* voiced samples collected while enrolling */
  var recent = [];            /* rolling window after enrolment */
  var onChange = null;
  var flagged = false;
  var trend = [];             /* recent pitch values, for how a phrase ends */
  var print = null;           /* the voiceprint (MFCC mean + vocal-tract scale) */
  /* In calibration the voice print is only fixed when the WHOLE
     paragraph has been read — never after the first second. */
  var calibrating = false;

  /* Only voiced frames count, and those are roughly half of speech,
     so these numbers are smaller than they look in wall-clock terms.

     Sampled more often and decided on a shorter window than before,
     because a swap that is announced five seconds late has already
     let the wrong voice into the profile. At 90ms a frame, 10 voiced
     frames to enrol is around two seconds of reading, and the
     8-frame decision window follows roughly a second and a half
     behind the voice instead of four. */
  var ENROL_SAMPLES = 10;
  var WINDOW = 8;
  var SAMPLE_MS = 90;

  /* How far the pitch must move before it stops being the same person.
     In octaves, so it is scale-free: 0.22 octaves is a 16% change,
     comfortably past the wobble of one person reading aloud, and far
     inside the gap between a child (~250 Hz) and an adult man
     (~120 Hz), which is a whole octave.

     Timbre is a SUPPORTING signal, not a second requirement. Spectral
     centroid moves with the microphone, the room and which vowel is
     being said, so demanding a big shift in both at once meant the
     check almost never fired. Instead a clear timbre shift lowers the
     pitch threshold, and a big enough pitch shift stands on its own. */
  /* Votes. Thresholds come from voiceprint tests (synthetic source-filter
     voices): the same adult at any pitch stays under 0.08 tract / 0.4
     timbre; a child, even one speaking in a low voice, is above 0.38 tract
     and 0.7 timbre. These sit well clear of both. */
  var PITCH_VOTE   = 0.35;     /* octaves, a supporting vote only        */
  var PITCH_ALONE  = 0.75;     /* nobody's own pitch moves this far      */
  var TIMBRE_VOTE  = 0.60;     /* MFCC distance in the speaker's own spread */
  var TRACT_VOTE   = 0.12;     /* |log2| formant ratio                   */
  var TRACT_CLEAR  = 0.20;     /* a clearly different throat, on its own */
  var VP = function () { return S.Voiceprint; };

  function median(list) {
    if (!list.length) return 0;
    var a = list.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  /* ── pitch by autocorrelation ───────────────────────────
     Standard approach: correlate the signal with a delayed copy of
     itself and look for the strongest repeat. The delay that repeats
     best is the pitch period. Returns 0 when the frame is unvoiced
     (silence, breath, consonant) so those frames are skipped. */
  function detectPitch(buf, sampleRate) {
    var n = buf.length, i;

    /* enough signal to bother with? */
    var rms = 0;
    for (i = 0; i < n; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / n);
    if (rms < 0.012) return 0;

    /* trim near-silent edges */
    var thresh = 0.2, start = 0, end = n - 1;
    for (i = 0; i < n / 2; i++) if (Math.abs(buf[i]) < thresh) { start = i; break; }
    for (i = 1; i < n / 2; i++) if (Math.abs(buf[n - i]) < thresh) { end = n - i; break; }
    var b = buf.slice(start, end);
    var m = b.length;
    if (m < 256) return 0;

    var c = new Float32Array(m).fill(0);
    for (i = 0; i < m; i++) {
      for (var j = 0; j < m - i; j++) c[i] += b[j] * b[j + i];
    }

    /* walk past the first dip, then take the highest peak */
    var d = 0;
    while (d < m - 1 && c[d] > c[d + 1]) d++;
    var maxVal = -1, maxPos = -1;
    for (i = d; i < m; i++) {
      if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
    }
    if (maxPos <= 0) return 0;

    /* parabolic interpolation for sub-sample accuracy */
    var y1 = c[maxPos - 1] || 0, y2 = c[maxPos], y3 = c[maxPos + 1] || 0;
    var a = (y1 + y3 - 2 * y2) / 2, bb = (y3 - y1) / 2;
    var pos = a ? maxPos - bb / (2 * a) : maxPos;

    var f0 = sampleRate / pos;
    /* human speech lives in this range; anything else is an artefact */
    return (f0 > 60 && f0 < 500) ? f0 : 0;
  }

  function spectralCentroid(freq, sampleRate, fftSize) {
    var num = 0, den = 0;
    for (var i = 0; i < freq.length; i++) {
      var mag = freq[i] / 255;
      var hz = i * sampleRate / fftSize;
      num += hz * mag;
      den += mag;
    }
    return den ? num / den : 0;
  }

  function sample() {
    if (!analyser) return;
    analyser.getFloatTimeDomainData(timeBuf);
    analyser.getByteFrequencyData(freqBuf);

    var f0 = detectPitch(timeBuf, ctx.sampleRate);
    if (!f0) return;                                  /* unvoiced frame */

    var cen = spectralCentroid(freqBuf, ctx.sampleRate, analyser.fftSize);
    var point = { f0: f0, cen: cen, t: Date.now() };
    if (VP()) {
      point.cep = VP().mfcc(timeBuf, ctx.sampleRate);
      point.scale = VP().tractScale(VP().formants(timeBuf, ctx.sampleRate));
    }
    trend.push({ t: point.t, f0: f0 });
    if (trend.length > 40) trend.shift();

    if (!baseline) {
      enrol.push(point);
      if (calibrating) { report(); return; }
      if (enrol.length >= ENROL_SAMPLES) setBaseline(enrol);
      return;
    }

    recent.push(point);
    if (recent.length > WINDOW) recent.shift();
    if (recent.length < WINDOW) { report(); return; }

    var f0Now = median(recent.map(function (p) { return p.f0; }));
    var cenNow = median(recent.map(function (p) { return p.cen; }));

    var octaves = Math.abs(Math.log2(f0Now / baseline.f0));

    var cmp = (print && VP() && recent[0].cep) ? VP().compare(print, recent) : { timbre: 0, tract: 0 };
    var votes = (octaves > PITCH_VOTE ? 1 : 0) + (cmp.timbre > TIMBRE_VOTE ? 1 : 0) +
                (cmp.tract > TRACT_VOTE ? 1 : 0);
    var different = votes >= 2 || cmp.tract > TRACT_CLEAR || octaves > PITCH_ALONE;

    live = {
      baselineHz: Math.round(baseline.f0),
      nowHz: Math.round(f0Now),
      octaves: Math.round(octaves * 100) / 100,
      timbre: Math.round(cmp.timbre * 100) / 100,
      tract: Math.round(cmp.tract * 100) / 100,
      votes: votes,
      direction: f0Now < baseline.f0 ? 'lower' : 'higher',
      different: different
    };

    if (different && !flagged) {
      flagged = true;
      if (onChange) onChange(live);
    } else if (!different && flagged) {
      /* they handed the book back — clear it without being asked */
      flagged = false;
      if (onChange) onChange(Object.assign({}, live, { recovered: true }));
    }
    report();
  }

  function setBaseline(points) {
    baseline = {
      f0: median(points.map(function (p) { return p.f0; })),
      cen: median(points.map(function (p) { return p.cen; }))
    };
    print = (VP() && points[0].cep) ? VP().enrol(points) : null;
  }

  /* A live readout, so this can actually be seen working rather than
     taken on trust. Settings uses it for the "test my voice" meter. */
  function report() { if (onLive) onLive(S.voiceCheck.live()); }

  /* ── public ─────────────────────────────────────────── */

  S.voiceCheck = {
    /** Is the hardware here at all? */
    supported: function () {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
                (window.AudioContext || window.webkitAudioContext));
    },

    /** Start listening to the sound of the voice (not the words). */
    start: async function (callback, opts) {
      opts = opts || {};
      if (!S.P.settings.voiceCheck && !opts.calibrate) return false;
      if (!this.supported()) return false;
      if (ctx) return true;

      calibrating = !!opts.calibrate;
      onChange = callback;
      flagged = false;
      baseline = null; print = null;
      enrol = [];
      recent = [];

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true }
        });
        var Ctor = window.AudioContext || window.webkitAudioContext;
        ctx = new Ctor();
        if (ctx.state === 'suspended') await ctx.resume();

        var src = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.6;
        src.connect(analyser);

        timeBuf = new Float32Array(analyser.fftSize);
        freqBuf = new Uint8Array(analyser.frequencyBinCount);

        timer = setInterval(sample, SAMPLE_MS);
        return true;
      } catch (e) {
        this.stop();
        return false;
      }
    },

    stop: function () {
      clearInterval(timer); timer = null;
      if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
      if (ctx) { try { ctx.close(); } catch (e) {} ctx = null; }
      analyser = null;
      onChange = null;
      calibrating = false;
    },

    /** For the UI: still learning the voice, watching, or flagged. */
    status: function () {
      if (!ctx) return 'off';
      if (!baseline) return 'learning';
      return flagged ? 'changed' : 'matched';
    },

    /** Everything the check currently knows, for a live readout. */
    live: function () {
      return {
        status: S.voiceCheck.status(),
        enrolled: !!baseline,
        progress: baseline ? 1 : Math.min(1, enrol.length / ENROL_SAMPLES),
        baselineHz: baseline ? Math.round(baseline.f0) : null,
        nowHz: live ? live.nowHz : null,
        octaves: live ? live.octaves : null,
        timbre: live ? live.timbre : null,
        tract: live ? live.tract : null,
        direction: live ? live.direction : null
      };
    },

    /** Stream the readout to a callback, for the Settings meter. */
    watch: function (fn) { onLive = fn; },
    unwatch: function () { onLive = null; },

    /**
     * How the last stretch of voiced speech ended, for judging a pause.
     * A phrase that is FINISHED falls in pitch and then stops; a child
     * who is stuck trails off level, or rises, or stops mid-sound.
     * Returns { falling, level, rising, ms } or null with no voice.
     */
    endingTrend: function () {
      if (trend.length < 5) return null;
      var tail = trend.slice(-6), first = median(tail.slice(0, 3).map(function (p) { return p.f0; })),
          last = median(tail.slice(-3).map(function (p) { return p.f0; }));
      var st = 12 * Math.log2(last / first);          /* semitones */
      return { semitones: Math.round(st * 10) / 10, falling: st < -1.2, rising: st > 1.2,
               level: Math.abs(st) <= 1.2, ms: Date.now() - tail[tail.length - 1].t };
    },

    /** Forget the baseline and learn the voice again from scratch. */
    relearn: function () {
      baseline = null; print = null; enrol = []; recent = []; flagged = false; live = null;
      report();
    },

    /** How many voiced moments have been heard so far. */
    voicedSamples: function () { return enrol.length; },

    /**
     * End a calibration: build the voice print from everything heard
     * while the paragraph was read. Returns it, or null if too little
     * voice came through to be trusted.
     */
    finishCalibration: function () {
      calibrating = false;
      if (enrol.length < 20) return null;
      setBaseline(enrol);
      return { hz: Math.round(baseline.f0), samples: enrol.length };
    },

    /** Accept the current voice as correct and carry on. */
    acceptNewVoice: function () {
      if (recent.length) setBaseline(recent);
      flagged = false;
      recent = [];
    }
  };

})(window.Spark);
