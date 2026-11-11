/* ============================================================
   voiceprint.js - what a voice sounds like, apart from its pitch.

   Pitch is a poor way to tell people apart. One person's pitch
   moves by a third of an octave between a question and a statement,
   and a child can read in a low voice while an adult reads high.
   What does NOT change when somebody speaks higher or lower is the
   shape of the throat and mouth. That shape filters the voice, and
   it shows up in two places:

     MFCCs      a 12-number summary of the spectral envelope (the
                shape of the filter). The mean over a stretch of
                speech is the "timbre" of the voice. This is the
                feature classical speaker-verification systems are
                built on.

     formants   the resonant peaks (F1, F2, F3) of the vocal tract.
                They scale with its length: a child's tract is
                roughly 25 to 30 percent shorter than a man's, so
                every formant sits that much higher whatever pitch
                is being spoken. This is the standard acoustic way
                to tell a child from an adult, and it is unaffected
                by pitch.

   Everything here is plain arithmetic on a frame of audio, so it
   runs in the browser with no model download and no audio leaving
   the device. (A neural speaker-embedding model could replace the
   MFCC part later; see AI-MODELS-AND-NOVELTY.md.)
   ============================================================ */

(function (root) {
  'use strict';

  var V = {};

  /* FFT (radix-2, in place) */
  function fft(re, im) {
    var n = re.length, i, j, k, m;
    for (i = 1, j = 0; i < n; i++) {
      var bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (var len = 2; len <= n; len <<= 1) {
      var ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (i = 0; i < n; i += len) {
        var cr = 1, ci = 0;
        for (k = 0; k < len / 2; k++) {
          m = i + k + len / 2;
          var ur = re[i + k], ui = im[i + k];
          var vr = re[m] * cr - im[m] * ci, vi = re[m] * ci + im[m] * cr;
          re[i + k] = ur + vr; im[i + k] = ui + vi;
          re[m] = ur - vr; im[m] = ui - vi;
          var nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
  }

  /* MFCCs */
  var NMEL = 26, NCEP = 12, mel = {};
  function hz2mel(f) { return 2595 * Math.log10(1 + f / 700); }
  function mel2hz(m) { return 700 * (Math.pow(10, m / 2595) - 1); }

  function melBank(n, sr) {
    var key = n + '@' + sr;
    if (mel[key]) return mel[key];
    var lo = hz2mel(100), hi = hz2mel(Math.min(7000, sr / 2 - 100)), pts = [];
    for (var i = 0; i < NMEL + 2; i++) pts.push(Math.floor((n + 1) * mel2hz(lo + (hi - lo) * i / (NMEL + 1)) / sr));
    var bank = [];
    for (var m = 1; m <= NMEL; m++) {
      var row = new Float32Array(n / 2 + 1);
      for (var k = pts[m - 1]; k < pts[m]; k++) row[k] = (k - pts[m - 1]) / Math.max(1, pts[m] - pts[m - 1]);
      for (k = pts[m]; k < pts[m + 1]; k++) row[k] = (pts[m + 1] - k) / Math.max(1, pts[m + 1] - pts[m]);
      bank.push(row);
    }
    return (mel[key] = bank);
  }

  /** 12 MFCCs (c1..c12) of one frame; the frame length must be a power of two. */
  V.mfcc = function (frame, sr) {
    var n = frame.length, re = new Float64Array(n), im = new Float64Array(n), i;
    for (i = 0; i < n; i++) {
      var pre = i ? frame[i] - 0.97 * frame[i - 1] : frame[i];
      re[i] = pre * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)));
    }
    fft(re, im);
    var bank = melBank(n, sr), logE = new Float64Array(NMEL);
    for (var m = 0; m < NMEL; m++) {
      var e = 0;
      for (i = 0; i <= n / 2; i++) e += bank[m][i] * (re[i] * re[i] + im[i] * im[i]);
      logE[m] = Math.log(e + 1e-10);
    }
    var out = new Float64Array(NCEP);
    for (var c = 1; c <= NCEP; c++) {
      var sum = 0;
      for (m = 0; m < NMEL; m++) sum += logE[m] * Math.cos(Math.PI * c * (m + 0.5) / NMEL);
      out[c - 1] = sum;
    }
    return out;
  };

  /* formants by linear prediction */
  function downsample(frame, factor) {
    var n = Math.floor(frame.length / factor), out = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      var s = 0; for (var k = 0; k < factor; k++) s += frame[i * factor + k];
      out[i] = s / factor;                       /* box filter doubles as the anti-alias */
    }
    return out;
  }

  function lpc(x, order) {
    var n = x.length, r = new Float64Array(order + 1), i, j;
    for (i = 0; i <= order; i++) { var s = 0; for (j = 0; j < n - i; j++) s += x[j] * x[j + i]; r[i] = s; }
    if (r[0] < 1e-9) return null;
    r[0] *= 1.0001;                              /* white-noise correction keeps it stable */
    var a = new Float64Array(order + 1), e = r[0];
    a[0] = 1;
    for (i = 1; i <= order; i++) {
      var acc = r[i];
      for (j = 1; j < i; j++) acc += a[j] * r[i - j];
      var k = -acc / e, tmp = a.slice();
      for (j = 1; j < i; j++) a[j] = tmp[j] + k * tmp[i - j];
      a[i] = k; e *= (1 - k * k);
      if (e <= 0) return null;
    }
    return a;
  }

  function roots(a) {                            /* Durand-Kerner on a monic polynomial */
    var n = a.length - 1, re = [], im = [], i, j, it;
    for (i = 0; i < n; i++) { var ang = 2 * Math.PI * i / n + 0.4; re.push(0.9 * Math.cos(ang)); im.push(0.9 * Math.sin(ang)); }
    for (it = 0; it < 80; it++) {
      var moved = 0;
      for (i = 0; i < n; i++) {
        var pr = 1, pi = 0;                      /* p(z) = z^n + a1 z^(n-1) + ... */
        for (j = 1; j <= n; j++) {
          var nr = pr * re[i] - pi * im[i] + a[j], ni = pr * im[i] + pi * re[i];
          pr = nr; pi = ni;
        }
        var dr = 1, di = 0;
        for (j = 0; j < n; j++) {
          if (j === i) continue;
          var xr = re[i] - re[j], xi = im[i] - im[j];
          var tr = dr * xr - di * xi; di = dr * xi + di * xr; dr = tr;
        }
        var den = dr * dr + di * di + 1e-30;
        var qr = (pr * dr + pi * di) / den, qi = (pi * dr - pr * di) / den;
        re[i] -= qr; im[i] -= qi; moved += Math.abs(qr) + Math.abs(qi);
      }
      if (moved < 1e-9) break;
    }
    return { re: re, im: im };
  }

  /**
   * The first three formants (Hz) of a voiced frame, or null if the
   * frame does not give a clean answer. Frames are decimated to about
   * 11 kHz first, because the formants of interest are below 5 kHz.
   */
  V.formants = function (frame, sr) {
    var factor = Math.max(1, Math.round(sr / 11025)), rate = sr / factor;
    var x = downsample(frame, factor), n = x.length, i;
    for (i = n - 1; i > 0; i--) x[i] = x[i] - 0.97 * x[i - 1];
    for (i = 0; i < n; i++) x[i] *= 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1));
    var a = lpc(x, 12);
    if (!a) return null;
    var r = roots(a), found = [];
    for (i = 0; i < r.re.length; i++) {
      if (r.im[i] <= 0.01) continue;
      var mag = Math.sqrt(r.re[i] * r.re[i] + r.im[i] * r.im[i]);
      var hz = Math.atan2(r.im[i], r.re[i]) * rate / (2 * Math.PI);
      var bw = -Math.log(mag) * rate / Math.PI;
      if (hz > 200 && hz < 4800 && bw < 400) found.push(hz);   /* narrow resonances only */
    }
    found.sort(function (p, q) { return p - q; });
    return found.length >= 3 ? { f1: found[0], f2: found[1], f3: found[2] } : null;
  };

  /** Vocal-tract scale: formants rise as the tract gets shorter. */
  V.tractScale = function (f) { return f ? (f.f1 / 500 + f.f2 / 1500 + f.f3 / 2500) / 3 : 0; };

  /* compare two voices */
  function mean(list, d) {
    var m = new Float64Array(d);
    list.forEach(function (v) { for (var i = 0; i < d; i++) m[i] += v[i] / list.length; });
    return m;
  }
  function sd(list, m, d) {
    var s = new Float64Array(d);
    list.forEach(function (v) { for (var i = 0; i < d; i++) s[i] += Math.pow(v[i] - m[i], 2) / list.length; });
    for (var i = 0; i < d; i++) s[i] = Math.sqrt(s[i]);
    return s;
  }
  function median(list) {
    if (!list.length) return 0;
    var a = list.slice().sort(function (p, q) { return p - q; }), h = a.length >> 1;
    return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2;
  }

  /**
   * Build a voiceprint from frames: [{ cep: Float64Array(12), scale: number|0 }].
   * `spread` is how much this speaker varies from frame to frame; the
   * comparison is measured in those units, so a noisy microphone makes
   * the check more forgiving rather than more trigger-happy.
   */
  V.enrol = function (frames) {
    var ceps = frames.map(function (f) { return f.cep; });
    var m = mean(ceps, NCEP), s = sd(ceps, m, NCEP);
    var scales = frames.map(function (f) { return f.scale; }).filter(Boolean);
    return { mean: m, spread: s, scale: median(scales), n: frames.length };
  };

  /**
   * How different a recent stretch of speech is from the voiceprint.
   * Returns { timbre, tract } where
   *   timbre  average distance of the MFCC means, in the speaker's own
   *           spread
   *   tract   |log2| of the formant ratio (0 = same throat; a child
   *           against a man is about 0.4)
   */
  V.compare = function (print, frames) {
    var ceps = frames.map(function (f) { return f.cep; });
    var m = mean(ceps, NCEP), z = 0;
    for (var i = 0; i < NCEP; i++) {
      /* the mean of N frames wanders by spread/sqrt(N) on its own */
      var floor = print.spread[i] / Math.sqrt(Math.max(1, ceps.length)) + 1e-6;
      z += Math.abs(m[i] - print.mean[i]) / Math.max(print.spread[i], floor);
    }
    var scales = frames.map(function (f) { return f.scale; }).filter(Boolean);
    var tract = (print.scale && scales.length >= 3) ? Math.abs(Math.log2(median(scales) / print.scale)) : 0;
    return { timbre: z / NCEP, tract: tract };
  };

  V.NCEP = NCEP;
  V.fft = fft;
  if (typeof module !== 'undefined' && module.exports) module.exports = V;
  else if (root.Spark) root.Spark.Voiceprint = V;
})(typeof window !== 'undefined' ? window : globalThis);
