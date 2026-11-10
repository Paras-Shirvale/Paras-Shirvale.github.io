/* ============================================================
   listen.js — a second, more accurate listen to the reading.

   The live tracker uses the browser's own speech recognition.
   It is fast enough to follow a child word by word, but it is
   tuned for adults dictating, and it quietly "corrects" what it
   hears into the word that was probably meant — which hides the
   very slips Spark is looking for.

   So the reading is also recorded, and when the child finishes
   it is sent to Whisper (large-v3, via the site's server) — a much
   stronger speech model that returns every word with its start
   and end time. Spark then lines that up against the story:

     · words said differently  → letter confusions (b/d, p/q, …)
     · gaps between words      → exact pause lengths
     · first to last word      → true reading time, not button time

   Whisper is deliberately NOT given the story text as a hint.
   A hint would bias it towards hearing the right word, which is
   exactly the bias this second listen exists to remove.

   Needs the Worker's /transcribe route (see _server/README.md).
   Without it, the live tracker's results stand on their own.
   ============================================================ */

(function (S) {
  'use strict';

  function endpoint(path) {
    var base = (window.SPARK_CONFIG && window.SPARK_CONFIG.ENDPOINT) || '';
    return base ? base.replace(/\/$/, '') + path : '';
  }
  S.serverURL = endpoint;

  /* ── recording ──────────────────────────────────────── */
  S.Recorder = function () {
    var rec = null, stream = null, chunks = [];

    return {
      supported: function () {
        return !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      },
      start: async function () {
        if (rec && rec.state === 'paused') { rec.resume(); return true; }
        if (rec) return true;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 }
          });
          var type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
            .filter(function (t) { return MediaRecorder.isTypeSupported(t); })[0] || '';
          rec = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : {});
          chunks = [];
          rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
          rec.start(1000);
          return true;
        } catch (e) { this.discard(); return false; }
      },
      pause: function () { if (rec && rec.state === 'recording') rec.pause(); },
      /** Stop and hand back the audio as one Blob. */
      stop: function () {
        return new Promise(function (resolve) {
          if (!rec) { resolve(null); return; }
          var r = rec;
          r.onstop = function () {
            var blob = chunks.length ? new Blob(chunks, { type: r.mimeType || 'audio/webm' }) : null;
            cleanup();
            resolve(blob);
          };
          try { r.state === 'inactive' ? r.onstop() : r.stop(); } catch (e) { cleanup(); resolve(null); }
        });
      },
      discard: function () { try { if (rec && rec.state !== 'inactive') rec.stop(); } catch (e) {} cleanup(); }
    };

    function cleanup() {
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null; rec = null;
    }
  };

  /* ── transcribing ───────────────────────────────────── */
  S.modelListening = function () { return !!endpoint('/transcribe'); };

  /** Resolves { text, words:[{word,start,end}] } or throws. */
  S.transcribe = async function (blob) {
    var url = endpoint('/transcribe');
    if (!url || !blob) throw new Error('no-endpoint');
    var form = new FormData();
    var ext = /mp4/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm';
    form.append('file', blob, 'reading.' + ext);
    var res = await fetch(url, { method: 'POST', body: form });
    if (!res.ok) throw new Error('transcribe ' + res.status);
    var data = await res.json();
    if (!data || !Array.isArray(data.words)) throw new Error('bad-reply');
    return data;
  };

  /* ── lining the model's words up against the story ──────
     A standard edit-distance alignment over WORDS. Two words count
     as a near match (cost 0.5) when they are close in spelling, so
     "bog" lines up against "dog" as a misread rather than as one
     word dropped and another added. */
  function align(expected, heard) {
    var n = expected.length, m = heard.length, i, j;
    var d = [], back = [];
    for (i = 0; i <= n; i++) { d[i] = [i]; back[i] = ['u']; }
    for (j = 0; j <= m; j++) { d[0][j] = j; back[0][j] = 'l'; }
    for (i = 1; i <= n; i++) {
      for (j = 1; j <= m; j++) {
        var e = expected[i - 1], h = heard[j - 1].clean;
        var sub = e === h ? 0 : (S.distance(e, h) <= Math.max(1, Math.floor(e.length / 2)) ? 0.5 : 1.2);
        var best = d[i - 1][j - 1] + sub, how = 'd';
        if (d[i - 1][j] + 1 < best) { best = d[i - 1][j] + 1; how = 'u'; }   /* word skipped   */
        if (d[i][j - 1] + 1 < best) { best = d[i][j - 1] + 1; how = 'l'; }   /* extra word said */
        d[i][j] = best; back[i][j] = how;
      }
    }
    var pairs = [];
    i = n; j = m;
    while (i > 0 || j > 0) {
      var step = back[i][j];
      if (i > 0 && j > 0 && step === 'd') { pairs.unshift({ ei: i - 1, hi: j - 1 }); i--; j--; }
      else if (i > 0 && (step === 'u' || j === 0)) { pairs.unshift({ ei: i - 1, hi: -1 }); i--; }
      else { j--; }
    }
    return pairs;
  }

  /**
   * Compare the model's transcript with the story.
   * tokens: the passage words [{raw, clean, si}]
   * Returns { misreads:[{ei, expected, heard, analysis}], skipped:[ei],
   *           pauses:[{ei, word, seconds}], seconds, wpm, wordsMatched }
   */
  S.compareReading = function (tokens, result) {
    var heard = (result.words || []).map(function (w) {
      return { clean: S.norm(w.word), start: +w.start, end: +w.end, raw: w.word };
    }).filter(function (w) { return w.clean; });

    var expected = tokens.map(function (t) { return t.clean; });
    var pairs = align(expected, heard);

    var out = { misreads: [], skipped: [], pauses: [], seconds: 0, wpm: null, wordsMatched: 0 };
    var prevEnd = null, prevTok = null, gaps = [];

    pairs.forEach(function (p) {
      var tok = tokens[p.ei];
      if (!tok || !tok.clean) return;
      if (p.hi < 0) { out.skipped.push(p.ei); return; }
      var h = heard[p.hi];
      if (h.clean === tok.clean) out.wordsMatched++;
      else {
        var a = S.Analysis.analyseMisread(h.clean, tok.clean);
        if (a) out.misreads.push({ ei: p.ei, expected: tok.clean, heard: h.clean, analysis: a });
      }
      if (prevEnd != null) {
        var gap = h.start - prevEnd;
        gaps.push(gap);
        var afterStop = prevTok && /[.!?,;:]["')]?$/.test(prevTok.raw);
        if (!afterStop) out.pauses.push({ ei: p.ei, word: tok.clean, seconds: gap });
      }
      prevEnd = h.end; prevTok = tok;
    });

    /* A pause only counts when it is long for THIS reader: well past
       their own usual gap, and over a second in absolute terms. */
    var sorted = gaps.slice().sort(function (a, b) { return a - b; });
    var typical = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0.3;
    var limit = Math.max(1.0, typical * 3);
    out.pauses = out.pauses.filter(function (p) { return p.seconds >= limit; })
      .map(function (p) { p.seconds = Math.round(p.seconds * 10) / 10; return p; });

    if (heard.length) {
      out.seconds = Math.max(0, heard[heard.length - 1].end - heard[0].start);
      if (out.seconds > 3) out.wpm = Math.round(heard.length / (out.seconds / 60));
    }
    return out;
  };

})(window.Spark);
