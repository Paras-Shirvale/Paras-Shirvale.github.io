/* ============================================================
   speaker.js — is this still the same person reading?

   Why it exists: a reading app that adapts to a child is only
   useful if the voice it adapts to is actually the child's. If an
   older sibling or a parent reads the passage, every number the app
   collects is wrong, and the homework it builds is for the wrong
   person.

   How it works: while the microphone is open, the audio is also fed
   to a Web Audio analyser. Two cheap acoustic features are measured
   several times a second:

     pitch (F0)         — via autocorrelation of the waveform
     spectral centroid  — where the energy sits in the spectrum

   The first few seconds of voiced audio become a baseline. After
   that, a rolling median is compared against it. A sustained shift
   in BOTH features is reported.

   What this is NOT: speaker identification. It cannot tell two
   children of similar age apart, and it is not security. An adult
   reading in place of a child is a large, obvious pitch shift and
   that is the case it catches. The UI says as much rather than
   making an accusation.
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
  var OCTAVE_CLEAR   = 0.22;   /* pitch alone is enough past this    */
  var OCTAVE_SUPPORT = 0.14;   /* with timbre agreeing, this is enough */
  var CENTROID_RATIO = 1.22;

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
    var point = { f0: f0, cen: cen };

    if (!baseline) {
      enrol.push(point);
      if (enrol.length >= ENROL_SAMPLES) {
        baseline = {
          f0: median(enrol.map(function (p) { return p.f0; })),
          cen: median(enrol.map(function (p) { return p.cen; }))
        };
      }
      return;
    }

    recent.push(point);
    if (recent.length > WINDOW) recent.shift();
    if (recent.length < WINDOW) { report(); return; }

    var f0Now = median(recent.map(function (p) { return p.f0; }));
    var cenNow = median(recent.map(function (p) { return p.cen; }));

    var octaves = Math.abs(Math.log2(f0Now / baseline.f0));
    var cenRatio = Math.max(cenNow, baseline.cen) /
                   Math.max(1, Math.min(cenNow, baseline.cen));

    var different = octaves > OCTAVE_CLEAR ||
                    (octaves > OCTAVE_SUPPORT && cenRatio > CENTROID_RATIO);

    live = {
      baselineHz: Math.round(baseline.f0),
      nowHz: Math.round(f0Now),
      octaves: Math.round(octaves * 100) / 100,
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
    start: async function (callback) {
      if (!S.P.settings.voiceCheck) return false;
      if (!this.supported()) return false;
      if (ctx) return true;

      onChange = callback;
      flagged = false;
      baseline = null;
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
        direction: live ? live.direction : null
      };
    },

    /** Stream the readout to a callback, for the Settings meter. */
    watch: function (fn) { onLive = fn; },
    unwatch: function () { onLive = null; },

    /** Forget the baseline and learn the voice again from scratch. */
    relearn: function () {
      baseline = null; enrol = []; recent = []; flagged = false; live = null;
      report();
    },

    /** Accept the current voice as correct and carry on. */
    acceptNewVoice: function () {
      if (recent.length) {
        baseline = {
          f0: median(recent.map(function (p) { return p.f0; })),
          cen: median(recent.map(function (p) { return p.cen; }))
        };
      }
      flagged = false;
      recent = [];
    }
  };

})(window.Spark);
