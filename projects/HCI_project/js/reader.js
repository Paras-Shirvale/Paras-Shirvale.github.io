/* ============================================================
   reader.js — the reading engine and the cue engine.

   This is the heart of the project.

   While the child reads aloud, Spark:
     · follows along word by word, allowing for mishearing
     · measures words per minute, live
     · notices when they stop moving on a word (a stall)
     · offers help — choosing the KIND of help that has actually
       worked for this child before
     · records whether that help got them moving again

   Two things adapt over time:
     patience — how long Spark waits before stepping in. It grows
       when the child recovers on their own and shrinks when they
       needed the strongest help, so confident readers are left
       alone and struggling ones get help sooner.
     cue preference — picture, hearing it, or word parts. Spark
       offers whichever has the best record for this child.
   ============================================================ */

(function (S) {
  'use strict';

  var R = null;            /* the reading in progress */
  var mic = null;          /* speech recognition handle */
  var stallTimer = null;
  var lastAdvance = 0;
  var tick = null;

  S.currentReading = function () { return R; };

  /* ── opening a passage ──────────────────────────────── */
  S.openPassage = function (src) {
    S.stopReading();
    R = {
      src: src,
      sentences: S.toSentences(src.text),
      tokens: [],
      idx: 0,
      startedAt: 0,
      elapsed: 0,
      stalls: [],
      pauses: [],        /* every pause, with what it was judged to be */
      gaps: [],          /* rolling inter-word gaps = this child's rhythm */
      misreads: [],
      skipped: {},
      repeats: 0,
      tricky: {},
      aligner: null,
      lead: 0,
      lastVoiceAt: 0,
      lastInterimLength: 0,
      reading: false,
      readHandle: null,
      listening: false,
      finished: false,
      step: 'read',
      wpm: null,
      helpOpen: null,
      questions: null,
      answered: 0,
      order: null
    };

    S.$('#readLibrary').hidden = true;
    S.$('#readWork').hidden = false;
    S.$('#pTitle').textContent = src.title;
    S.$('#pMeta').textContent =
      (src.level ? 'Level ' + src.level + ' · ' : '') +
      S.wordCount(src.text) + ' words · ' + R.sentences.length + ' sentences';

    S.$('#micHint').textContent = S.micAvailable ? '' : S.micProblem();

    /* the letter check is one step, not three */
    var steps = S.$('.steps');
    if (steps) steps.hidden = !!src.screening;
    if (src.screening && src.about) {
      S.$('#pMeta').textContent = src.about;
    }

    renderProse();
    S.setStep('read');
    markStepsDone();
    updateStats();
    S.railSay('Read at your own speed. Tap any word you want help with.');
    S.markFavouredTool();
  };

  S.closePassage = function () {
    S.stopReading();
    stopReadAlong();
    R = null;
    S.$('#readWork').hidden = true;
    S.$('#readLibrary').hidden = false;
    S.paintLibrary();
    S.paintScreening();
  };

  S.paintLibraryIfIdle = function () { if (!R) { S.paintLibrary(); S.paintScreening(); } };

  function renderProse() {
    var host = S.$('#prose');
    host.innerHTML = '';
    R.tokens = [];

    R.sentences.forEach(function (sentence, si) {
      var p = document.createElement('p');
      sentence.split(/\s+/).forEach(function (raw) {
        var span = document.createElement('span');
        span.className = 'w';
        span.textContent = raw;
        var clean = S.norm(raw);
        /* words this child has stalled on before are marked up front */
        if (clean && S.P.words[clean] && S.P.words[clean].stalled >= 2) {
          span.classList.add('tricky');
        }
        R.tokens.push({ raw: raw, clean: clean, el: span, si: si });
        p.appendChild(span);
        p.appendChild(document.createTextNode(' '));
      });
      host.appendChild(p);
    });

    S.applySettings();
  }

  /* ── steps ──────────────────────────────────────────── */
  S.setStep = function (step) {
    if (!R) return;
    R.step = step;
    S.$$('.step').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.dataset.step === step));
    });
    S.$('#stepRead').hidden       = step !== 'read';
    S.$('#stepUnderstand').hidden = step !== 'understand';
    S.$('#stepOrder').hidden      = step !== 'order';

    if (step !== 'read') { S.stopReading(); stopReadAlong(); }
    if (step === 'understand' && !R.questions) showQuestions();
    if (step === 'order' && !R.order) buildOrder();
  };

  function markStepsDone() {
    var done = S.P.doneSteps[R.src.id] || {};
    S.$$('.step').forEach(function (b) {
      b.dataset.done = done[b.dataset.step] ? '1' : '';
    });
  }

  /* ── listening ──────────────────────────────────────── */
  S.startReading = function () {
    if (!R || R.listening) return;
    if (R.reading) stopReadAlong();
    var problem = S.micProblem();
    if (problem) { S.toast(problem); S.$('#micHint').textContent = problem; return; }

    /* the aligner owns the cursor from here on */
    R.aligner = S.makeAligner(R.tokens);
    R.aligner.moveTo(R.idx);
    R.lead = R.idx;

    mic = S.listenContinuous(onResults, function (msg) {
      S.toast(msg);
      S.stopReading();
    });
    if (!mic) return;

    R.listening = true;
    R.startedAt = Date.now();
    lastAdvance = Date.now();
    R.lastVoiceAt = Date.now();
    R.lastInterimLength = 0;

    var b = S.$('#btnMic');
    b.innerHTML = S.Pictures.icon("stop") + " Stop";
    b.classList.remove('btn-primary');
    b.classList.add('btn-rec', 'pulse');

    S.railSay('I\'m listening. Take your time.');
    armStall();
    tick = setInterval(updateStats, 1000);

    /* listen to the sound of the voice as well as the words */
    startVoiceCheck();
  };

  S.stopReading = function () {
    if (mic) { mic.stop(); mic = null; }
    if (S.voiceCheck) S.voiceCheck.stop();
    clearTimeout(stallTimer);
    clearInterval(tick); tick = null;

    if (R && R.listening) {
      R.elapsed += Date.now() - R.startedAt;
      R.startedAt = 0;
      R.listening = false;
    }
    var b = S.$('#btnMic');
    if (b) {
      b.innerHTML = S.Pictures.icon("mic") + " Read to Spark";
      b.classList.add('btn-primary');
      b.classList.remove('btn-rec', 'pulse');
    }
  };

  S.toggleReading = function () {
    if (R && R.listening) S.stopReading(); else S.startReading();
  };

  /* Every `onresult` event goes to the aligner, which decides what
     actually happened. It only ever moves the cursor on FINAL results,
     which is what stopped the highlight running ahead of the reader. */
  function onResults(resultList) {
    if (!R || !R.aligner) return;

    /* Any result at all — even an interim one that matches nothing —
       means the child is making sounds. That is what tells a pause
       from an attempt. */
    R.lastVoiceAt = Date.now();

    var events = R.aligner.feed(resultList);

    for (var i = 0; i < events.length; i++) {
      var ev = events[i];

      if (ev.type === 'advance') {
        /* anything stepped over was skipped, not read */
        ev.skipped.forEach(function (tok) {
          tok.el.classList.add('skipped');
          R.skipped[tok.clean] = (R.skipped[tok.clean] || 0) + 1;
        });
        for (var j = ev.from; j < ev.to; j++) {
          var tok = R.tokens[j];
          if (tok && !tok.el.classList.contains('skipped')) {
            tok.el.classList.remove('at');
            tok.el.classList.add('done');
          }
        }
        R.idx = ev.to;
        if (R.lead < R.idx) R.lead = R.idx;
        markPosition();
        afterAdvance();

      } else if (ev.type === 'misread') {
        handleMisread(ev);

      } else if (ev.type === 'repeat') {
        /* re-reading a word is a self-correction, not a mistake */
        R.repeats = (R.repeats || 0) + 1;

      } else if (ev.type === 'track') {
        /* A provisional move, from speech the browser has not
           finalised yet. It moves the highlight and nothing else:
           no word is marked read, no statistic changes, and the
           stall timer is left alone, because this is a guess. What
           it buys is a place-keeper that stays with the voice
           instead of a second behind it. */
        R.lead = ev.to;
        markPosition();
      }
      /* 'unplaced' is deliberately ignored — guessing is what drifts */
    }
  }

  /* A word said wrongly, close enough to know which word was meant.
     This is where letter confusions get caught. */
  function handleMisread(ev) {
    var analysis = S.Analysis.analyseMisread(ev.heard, ev.expected);
    if (!analysis) return;

    S.Analysis.recordMisread(analysis, {
      sentence: R.sentences[ev.token.si] || '',
      passage: R.src.title
    });
    R.misreads.push(analysis);
    R.tricky[ev.expected] = true;

    ev.token.el.classList.add('missaid');

    /* say what went wrong, in words a child can use */
    if (analysis.kind === 'letter-confusion' && analysis.pairs.length) {
      var p = analysis.pairs[0];
      S.railSay('Careful — that one has a "' + p.want + '", not a "' + p.got + '". ' +
                'Look at it again.');
    } else if (analysis.kind === 'word-reversal') {
      S.railSay('Close! That word is the other way round: "' + ev.expected + '".');
    } else {
      S.railSay('Nearly — the word is "' + ev.expected + '". Have another go.');
    }

    S.save();
  }

  /* The lit word is the one being spoken right now — the provisional
     position — falling back to the confirmed one before any interim
     speech has arrived. Words behind the confirmed cursor are the
     only ones marked read. */
  function markPosition() {
    var here = Math.max(R.idx, R.lead || 0);
    S.$$('.w.at').forEach(function (e) { e.classList.remove('at'); });
    var t = R.tokens[here];
    if (t && !t.el.classList.contains('skipped')) t.el.classList.add('at');
    S.moveRuler(t ? t.el : null);
    updateStats();
    if (R.idx >= R.tokens.length) S.finishReading();
  }

  function afterAdvance() {
    var gapMs = Date.now() - lastAdvance;
    lastAdvance = Date.now();

    /* Keep a rolling picture of this child's own rhythm. The pause
       classifier needs it: "a long pause" only means anything
       relative to how this particular child normally reads. */
    if (gapMs > 120 && gapMs < 6000) {
      R.gaps.push(gapMs);
      if (R.gaps.length > 40) R.gaps.shift();
    }

    /* reading smoothly with no help — earn more room before Spark steps in */
    if (gapMs / 1000 < S.P.patience * 0.6 && !R.helpOpen) {
      S.P.patience = S.clamp(S.P.patience + 0.12, 2.5, 9);
    }
    /* help was open and now they're moving again: that cue worked */
    if (R.helpOpen) resolveHelp(true);

    armStall();
  }

  /** This child's typical gap between words, in ms. */
  function baselineGap() {
    if (R.gaps.length < 5) return 600;
    var sorted = R.gaps.slice().sort(function (a, b) { return a - b; });
    return sorted[Math.floor(sorted.length / 2)];
  }

  /* How long the child must be SILENT before Spark even looks at a
     pause. Sounding a word out is not a pause — it is the work. */
  var SILENCE_BEFORE_LOOKING = 1400;

  function armStall() {
    clearTimeout(stallTimer);
    if (!R || !R.listening) return;
    stallTimer = setTimeout(onStall, Math.max(2200, S.P.patience * 1000));
  }

  /**
   * Is the child still having a go right now?
   *
   * This is the question the old version never asked. Speech
   * recognition sends interim results the whole time somebody is
   * making sounds — "l… li… ligh…" — and those arrive without ever
   * matching a word. Treating that as a pause meant Spark cut in
   * while the child was mid-attempt, which is the most discouraging
   * moment it could possibly choose.
   *
   * So: if any sound has reached us recently, or the interim text is
   * still growing, they are trying. Leave them alone.
   */
  function stillTrying() {
    if (!R) return false;

    var sinceVoice = Date.now() - (R.lastVoiceAt || 0);
    if (sinceVoice < SILENCE_BEFORE_LOOKING) return true;

    var interim = R.aligner ? (R.aligner.lastInterim || '') : '';
    if (interim && interim.length > (R.lastInterimLength || 0)) {
      R.lastInterimLength = interim.length;
      return true;
    }
    return false;
  }

  /* ── a stall: the moment this whole project exists for ──
     Not every stop is a difficulty. The classifier decides which
     ones are, and only those are allowed to change anything. */
  function onStall() {
    if (!R || !R.listening) return;
    var token = R.tokens[R.idx];
    if (!token || !token.clean) return;

    /* Still making sounds at the word? Then they have not stopped —
       wait, and look again shortly. */
    if (stillTrying()) { armStall(); return; }

    var verdict = S.Analysis.classifyPause({
      token: token,
      prevToken: R.idx > 0 ? R.tokens[R.idx - 1] : null,
      isSentenceStart: R.idx === 0 || (R.tokens[R.idx - 1] &&
                       R.tokens[R.idx - 1].si !== token.si),
      durationMs: Date.now() - lastAdvance,
      baselineMs: baselineGap(),
      partialHeard: R.aligner ? R.aligner.startedCurrentWord() : null,
      priorStalls: (S.P.words[token.clean] && S.P.words[token.clean].stalled) || 0
    });

    R.pauses.push({ word: token.clean, type: verdict.type, struggle: verdict.struggle });

    if (!verdict.struggle) {
      /* A natural pause. Counted, so the Progress page can show how
         many pauses were ordinary reading rhythm — but it must not
         touch the difficulty profile or build homework. */
      S.Analysis.recordNaturalPause(verdict);
      S.save();
      armStall();                     /* keep watching; it may turn into a real stall */
      return;
    }

    /* From here on it is a genuine struggle. */
    S.Analysis.countStrugglePause(verdict);
    S.Analysis.recordStall(token.clean, verdict, {
      seconds: (Date.now() - lastAdvance) / 1000,
      partial: R.aligner ? R.aligner.startedCurrentWord() : null,
      sentence: R.sentences[token.si] || '',
      passage: R.src.title
    });
    R.tricky[token.clean] = true;
    R.stalls.push({ word: token.clean, at: Date.now(), type: verdict.type });

    /* needed help here — step in a little sooner next time */
    S.P.patience = S.clamp(S.P.patience - 0.25, 2.5, 9);

    offerHelp(token, verdict);
    S.save();
  }

  /* ── the cue engine ─────────────────────────────────── */

  function offerHelp(token, verdict) {
    var kind = S.cueRank()[0];
    R.helpOpen = { word: token.clean, cue: kind, at: Date.now() };
    S.P.cue[kind].shown++;
    S.save();

    var word = token.raw.replace(/[^A-Za-z'-]/g, '');
    var phrase = { picture: 'a picture', sound: 'me say it', parts: 'the parts' }[kind];

    /* what Spark says depends on why it thinks they stopped */
    var opening;
    if (verdict && verdict.type === 'decoding') {
      opening = 'You\'ve started it — let me help you finish. ';
    } else if (verdict && verdict.type === 'word-specific') {
      opening = 'This one caught you before. ';
    } else if (verdict && verdict.type === 'complex-word') {
      opening = 'That\'s a long one. ';
    } else {
      opening = 'Take your time. ';
    }

    S.railSay(opening + 'Here\'s ' + phrase + ' for "' + word + '".');
    S.openWordCard(token.el, token.raw, kind);
    S.markFavouredTool();

    /* If they read on, resolveHelp() closes it. If they simply stop
       looking at it, close it anyway after a while — a cue left on
       screen becomes clutter the child has to clear. */
    clearTimeout(R.cueTimer);
    R.cueTimer = setTimeout(function () {
      if (R && R.helpOpen && R.helpOpen.word === token.clean) {
        S.closeWordCard();
      }
    }, 14000);
  }

  function resolveHelp(worked) {
    if (!R || !R.helpOpen) return;
    var h = R.helpOpen;
    if (worked) {
      S.P.cue[h.cue].worked++;
      var rec = S.P.words[h.word];
      if (rec) rec.helped = (rec.helped || 0) + 1;
    }
    R.helpOpen = null;
    S.save();
    S.markFavouredTool();

    /* The cue has done its job — take it away. Leaving it open reads
       as "you still haven't got this", and a child should not have to
       dismiss their own help before carrying on. */
    S.closeWordCard();
    S.railSay(worked ? 'Good. Keep going.' : 'Keep going.');
  }

  /** Called when the child chooses a kind of help themselves. */
  S.useCue = function (kind) {
    if (!S.P.cue[kind]) return;
    if (R && R.helpOpen) {
      /* they swapped to a different kind than the one offered —
         credit the one they actually chose */
      R.helpOpen.cue = kind;
    } else {
      /* chosen without being offered: counts as both shown and useful */
      S.P.cue[kind].shown++;
      S.P.cue[kind].worked++;
    }
    S.save();
    S.markFavouredTool();
  };

  S.markFavouredTool = function () {
    var fav = S.favourite();
    S.$$('.tool').forEach(function (b) {
      b.classList.toggle('favoured', !!fav && b.dataset.tool === fav);
    });
  };

  /* ── pace ───────────────────────────────────────────── */
  function updateStats() {
    if (!R) return;
    var read = R.idx;
    S.$('#statWords').textContent = read;

    var ms = R.elapsed + (R.startedAt ? Date.now() - R.startedAt : 0);
    var minutes = ms / 60000;
    var wpm = (read > 4 && minutes > 0.08) ? Math.round(read / minutes) : null;
    R.wpm = wpm;
    S.$('#statWpm').textContent = wpm == null ? '—' : wpm;
  }

  /* ── finishing ──────────────────────────────────────── */
  S.finishReading = function () {
    if (!R || R.finished) return;
    R.finished = true;
    S.stopReading();

    var words = R.idx || R.tokens.length;
    var wpm = (R.elapsed > 4000 && words > 8) ? Math.round(words / (R.elapsed / 60000)) : null;

    var natural = R.pauses.filter(function (p) { return !p.struggle; }).length;

    S.P.sessions.push({
      date: S.today(), id: R.src.id, title: R.src.title,
      words: words, wpm: wpm,
      stalls: R.stalls.length,            /* struggle pauses only */
      naturalPauses: natural,             /* ordinary phrasing, kept separate */
      misreads: R.misreads.length,
      repeats: R.repeats || 0,
      tricky: Object.keys(R.tricky),
      ms: R.elapsed
    });
    if (S.P.sessions.length > 80) S.P.sessions = S.P.sessions.slice(-80);

    var done = S.P.doneSteps[R.src.id] || (S.P.doneSteps[R.src.id] = {});
    done.read = 1;

    /* a letter-check set records which of ITS pairs actually tripped
       the child, which is the whole reason it exists */
    if (R.src.screening) {
      var caught = (R.src.pairs || []).filter(function (k) {
        return R.misreads.some(function (m) {
          return (m.pairs || []).some(function (p) { return p.key === k; });
        });
      });
      S.P.screening = S.P.screening || {};
      S.P.screening[R.src.id] = {
        date: S.today(),
        wpm: wpm,
        slips: R.misreads.length,
        stalls: R.stalls.length,
        pairs: caught
      };
    }

    S.bumpStreak();
    S.award(10, 'Finished the reading');
    S.save();
    markStepsDone();

    S.railSay(wpm
      ? 'You read ' + words + ' words at about ' + wpm + ' words a minute.'
      : 'Nicely done.');

    /* The letter check is about the letters. Questions about plot
       would be beside the point, so it ends here. */
    if (R.src.screening) {
      setTimeout(function () { S.closePassage(); }, 1400);
      return;
    }

    setTimeout(function () { S.setStep('understand'); }, 900);
  };

  S.railSay = function (text) {
    var el = S.$('#railSay');
    if (el) el.textContent = text;
  };

  /* ── listening to Spark read ────────────────────────────
     Not just audio: the word being spoken lights up as it is
     spoken. A child who cannot yet decode a line can still follow
     which word makes which sound, which is most of the value of
     hearing it read at all. */
  function startReadAlong() {
    S.stopReading();                     /* cannot listen and be listened to */
    R.reading = true;

    var btn = S.$('#btnListen');
    btn.innerHTML = S.Pictures.icon('stop') + ' Stop reading';
    btn.dataset.active = '1';
    S.railSay('Follow the words while I read.');

    var full = R.sentences.join(' ');

    R.readHandle = S.readAlong(full, {
      onWord: function (i) {
        clearAlong();
        var tok = R.tokens[i];
        if (tok) {
          tok.el.classList.add('saying');
          S.moveRuler(tok.el);
          /* keep the line in view without yanking the page about */
          var box = tok.el.getBoundingClientRect();
          if (box.top < 90 || box.bottom > window.innerHeight - 90) {
            tok.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
      },
      onEnd: function (sawWords) {
        /* no word events from this browser — fall back to sentences
           so the child still gets something to follow */
        if (!sawWords && R && R.reading) { sentenceFallback(); return; }
        stopReadAlong();
      }
    });

    if (!R.readHandle) stopReadAlong();
  }

  function sentenceFallback() {
    S.sayEach(R.sentences, function (si) {
      clearAlong();
      R.tokens.forEach(function (t) {
        if (t.si === si) t.el.classList.add('saying');
      });
      var first = R.tokens.filter(function (t) { return t.si === si; })[0];
      if (first) S.moveRuler(first.el);
    });
    /* sayEach has no completion callback for the whole list, so the
       button is cleared when the queue empties */
    var watch = setInterval(function () {
      if (!R || !R.reading) { clearInterval(watch); return; }
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        clearInterval(watch);
        stopReadAlong();
      }
    }, 400);
  }

  function clearAlong() {
    S.$$('.w.saying').forEach(function (e) { e.classList.remove('saying'); });
  }

  function hideRuler() {
    var r = S.$('#ruler');
    if (r) r.style.display = 'none';
  }

  function stopReadAlong() {
    if (R) {
      R.reading = false;
      if (R.readHandle) { R.readHandle.stop(); R.readHandle = null; }
    }
    S.stopSaying();
    clearAlong();
    hideRuler();
    var btn = S.$('#btnListen');
    if (btn) {
      btn.innerHTML = S.Pictures.icon('speaker') + ' Listen first';
      btn.dataset.active = '';
    }
  }
  S.stopReadAlong = stopReadAlong;

  /* Exposed so the pause logic can be exercised without a real
     microphone, which no automated test has. */
  S._armStall = armStall;
  S._stillTrying = stillTrying;

  /* ── is this still the same reader? ─────────────────────
     The whole profile is only meaningful if the voice it was built
     from is the child's. If somebody else takes over mid-passage,
     say so plainly and let them decide what it means. */
  function startVoiceCheck() {
    if (!S.voiceCheck || !S.P.settings.voiceCheck) return;
    S.voiceCheck.start(function (change) {
      var banner = S.$('#voiceWarn');
      if (!banner) return;
      banner.hidden = false;
      /* The child is the audience here. A frequency in hertz tells
         them nothing they can act on, and the number invites an
         argument about the measurement rather than the question
         being asked, which is simply: is this still you? */
      banner.querySelector('[data-msg]').textContent =
        change.direction === 'down'
          ? 'That sounds like a deeper voice than the one I learned. Is this still you?'
          : 'That sounds like a different voice than the one I learned. Is this still you?';
    });
  }

  S.dismissVoiceWarning = function (accept) {
    var banner = S.$('#voiceWarn');
    if (banner) banner.hidden = true;
    if (accept && S.voiceCheck) S.voiceCheck.acceptNewVoice();
  };

  /* ── step 2: questions ──────────────────────────────── */
  async function showQuestions() {
    var host = S.$('#stepUnderstand');
    host.innerHTML =
      '<p class="sub">Questions about what you just read.</p>' +
      '<div class="empty"><div class="e-ico"><span class="i" data-icon="spark" data-icon-size="18"></span></div><p>Writing your questions…</p></div>';

    var qs;
    try { qs = await S.buildQuestions(R.src); }
    catch (e) { qs = S.localQuestions(R.sentences); }
    if (!qs || !qs.length) qs = S.localQuestions(R.sentences);
    if (!R) return;

    R.questions = qs;
    R.answered = 0;

    host.innerHTML =
      '<p class="sub">' + qs.length + ' question' + (qs.length > 1 ? 's' : '') +
      ' about what you just read.</p>' +
      qs.map(function (q, i) {
        return '<div class="q" data-q="' + i + '">' +
          '<div class="q-head">' +
            '<span class="q-n">' + (i + 1) + '</span>' +
            '<div class="q-text">' + S.esc(q.q) + '</div>' +
            '<button class="icon-sq" data-say="' + S.esc(q.q) + '" aria-label="Hear the question"><span class="i" data-icon="speaker" data-icon-size="18"></span></button>' +
          '</div>' +
          '<div class="opts">' +
            q.options.map(function (o) {
              return '<div class="opt-row">' +
                '<button class="opt" data-o="' + S.esc(o) + '">' + S.esc(o) + '</button>' +
                '<button class="icon-sq opt-say" data-say="' + S.esc(o) + '" ' +
                  'aria-label="Hear this answer">' +
                  '<span class="i" data-icon="speaker" data-icon-size="16"></span></button>' +
              '</div>';
            }).join('') +
          '</div>' +
          '<button class="btn btn-sm read-all" data-say="' + S.esc(q.q + '. ' + q.options.join('. ')) + '">' +
            '<span class="i" data-icon="speaker" data-icon-size="16"></span> Read it all to me</button>' +
          '<div class="q-after" hidden></div>' +
        '</div>';
      }).join('');

    S.$$('.opt', host).forEach(function (b) { b.addEventListener('click', onAnswer); });
    S.applySettings();
  }

  function onAnswer(e) {
    var btn = e.currentTarget;
    var box = btn.closest('.q');
    if (box.querySelector('[data-s]')) return;   /* already answered */

    var q = R.questions[+box.dataset.q];
    var right = S.norm(btn.dataset.o) === S.norm(q.answer);
    btn.dataset.s = right ? 'right' : 'wrong';

    if (!right) {
      S.$$('.opt', box).forEach(function (b) {
        if (S.norm(b.dataset.o) === S.norm(q.answer)) b.dataset.s = 'right';
      });
    }

    var after = box.querySelector('.q-after');
    after.hidden = false;
    after.className = 'q-after' + (right ? ' good' : '');
    after.textContent = (right ? '✓ ' : '') +
      (q.why || (right ? 'That\'s right.' : 'The answer was "' + q.answer + '".'));

    if (right) S.award(3, 'Correct');

    R.answered++;
    if (R.answered >= R.questions.length) {
      var done = S.P.doneSteps[R.src.id] || (S.P.doneSteps[R.src.id] = {});
      done.understand = 1;
      S.save();
      markStepsDone();
      setTimeout(function () { S.setStep('order'); }, 1100);
    }
  }

  /* ── step 3: ordering ───────────────────────────────── */
  function buildOrder() {
    R.order = S.shuffledOrder(R.sentences.length);
    paintOrder();
  }

  function paintOrder() {
    S.$('#seqList').innerHTML = R.order.map(function (si, pos) {
      return '<div class="seq-row" data-pos="' + pos + '">' +
        '<span class="seq-pos">' + (pos + 1) + '</span>' +
        '<span class="seq-txt">' + S.esc(R.sentences[si]) + '</span>' +
        '<span class="seq-move">' +
          '<button class="mv" data-mv="-1" data-pos="' + pos + '"' +
            (pos === 0 ? ' disabled' : '') + ' aria-label="Move up">▲</button>' +
          '<button class="mv" data-mv="1" data-pos="' + pos + '"' +
            (pos === R.order.length - 1 ? ' disabled' : '') + ' aria-label="Move down">▼</button>' +
        '</span>' +
      '</div>';
    }).join('');

    S.$$('#seqList .mv').forEach(function (b) {
      b.addEventListener('click', function () {
        var from = +b.dataset.pos, to = from + (+b.dataset.mv);
        if (to < 0 || to >= R.order.length) return;
        var tmp = R.order[from]; R.order[from] = R.order[to]; R.order[to] = tmp;
        S.$('#seqMsg').innerHTML = '';
        paintOrder();
      });
    });
    S.applySettings();
  }

  S.checkOrder = function () {
    if (!R || !R.order) return;
    var rows = S.$$('#seqList .seq-row');
    var allRight = true;

    R.order.forEach(function (si, pos) {
      var ok = si === pos;
      rows[pos].dataset.s = ok ? 'right' : 'wrong';
      if (!ok) allRight = false;
    });

    var msg = S.$('#seqMsg');
    if (allRight) {
      msg.innerHTML = '<div class="q-after good">✓ That\'s the right order. Well done.</div>';
      S.award(8, 'Order correct');
      var done = S.P.doneSteps[R.src.id] || (S.P.doneSteps[R.src.id] = {});
      done.order = 1;
      S.save();
      markStepsDone();
    } else {
      var firstWrong = R.order.findIndex(function (si, pos) { return si !== pos; });
      msg.innerHTML = '<div class="q-after">Nearly. Look at row ' + (firstWrong + 1) +
                      ' — what happened before that?</div>';
    }
  };

  /* ── the help rail ──────────────────────────────────── */
  S.useTool = async function (tool) {
    if (!R) return;
    if (tool === 'ask') { S.openChat('About "' + R.src.title + '"'); return; }

    var token = R.tokens[R.idx] || R.tokens[0];
    if (tool === 'explain') { await explainHere(token); return; }
    if (!token) return;

    if (tool === 'picture') S.openWordCard(token.el, token.raw, 'picture');
    if (tool === 'sound')   { S.say(token.raw); S.openWordCard(token.el, token.raw, 'sound'); }
    if (tool === 'parts')   { S.sayInParts(token.raw); S.openWordCard(token.el, token.raw, 'parts'); }

    S.useCue(tool);
  };

  async function explainHere(token) {
    var sentence = R.sentences[token ? token.si : 0] || R.sentences[0];
    if (!S.AI.ready) {
      S.railSay('In short: ' + plainly(sentence));
      S.say(plainly(sentence));
      return;
    }
    S.railSay('Let me put that another way…');
    try {
      var text = await S.AI.ask(
        'Rewrite this sentence for a 10-year-old who finds reading hard. ' +
        'One short sentence, plain words, no preamble.\n\n"' + sentence + '"',
        { maxTokens: 120 }
      );
      var clean = text.replace(/^["']|["']$/g, '').trim();
      S.railSay(clean);
      S.say(clean);
    } catch (e) {
      S.railSay(S.AI.friendly(e) || ('In short: ' + plainly(sentence)));
    }
  }

  /* crude but honest: drop the subordinate clause */
  function plainly(s) {
    return String(s).replace(/,[^,]*,/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* ── library ────────────────────────────────────────── */
  /* ── the letter check ───────────────────────────────────
     Shown above the stories, because a child who mixes up b and d
     should meet that fact in the first five minutes rather than in
     week three. Each set is read exactly like a passage — the same
     tracker, the same analysis — but the words in it are chosen so
     that one family of confusions has nowhere to hide. */
  S.paintScreening = function () {
    var host = S.$('#screenList');
    if (!host) return;

    var done = 0;
    host.innerHTML = S.SCREENING.map(function (p) {
      var rec = (S.P.screening || {})[p.id];
      if (rec) done++;
      return '<button class="lib-card screen-card" data-screen="' + p.id + '">' +
        '<div class="lib-top">' +
          '<span class="lib-pic">' + S.Pictures.drawn(p.pic, 34) + '</span>' +
          '<span class="badge' + (rec ? ' badge-done' : '') + '">' +
            (rec ? 'Done' : 'Letters') + '</span>' +
        '</div>' +
        '<h3>' + S.esc(p.title) + '</h3>' +
        '<p>' + S.esc(p.blurb) + '</p>' +
        /* No word count and no tally. How many words a passage has is
           the author's problem, not the reader's, and a slip count on
           the card turns a diagnostic into a score to feel bad about.
           What a child needs here is only: have I done this one? */
        '<span class="lib-foot">' +
          (rec ? 'Read ' + S.esc(S.niceDate(rec.date)) : 'Not read yet') +
        '</span>' +
      '</button>';
    }).join('');

    S.$$('[data-screen]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var src = S.SCREENING.filter(function (x) { return x.id === b.dataset.screen; })[0];
        if (src) S.openPassage(Object.assign({ screening: true, level: null }, src));
      });
    });

    var score = S.$('#screenScore');
    if (score) {
      score.innerHTML = done
        ? '<b>' + done + ' of ' + S.SCREENING.length + '</b><span>done</span>'
        : '';
    }

    paintScreeningReport();
  };

  /* What the whole check adds up to, once some of it is done. */
  function paintScreeningReport() {
    var host = S.$('#screenReport');
    if (!host) return;

    var records = S.P.screening || {};
    var ids = Object.keys(records);
    if (!ids.length) { host.innerHTML = ''; return; }

    /* Which letter families actually gave trouble — and, more to the
       point, on which real words. A pair on its own ("b/d") is an
       abstraction a child can do nothing with. The word it happened
       on is a thing they can look at again. */
    var trouble = {};
    ids.forEach(function (id) {
      (records[id].pairs || []).forEach(function (k) { trouble[k] = true; });
    });
    var keys = Object.keys(trouble);
    var letters = S.P.letters || {};

    host.innerHTML =
      '<div class="screen-report">' +
        '<b>What the letter check found</b>' +
        (keys.length
          ? '<ul class="found-list">' +
            keys.map(function (k) {
              var ex = (letters[k] && letters[k].examples) || [];
              return '<li>' +
                '<span class="lt-pair sm">' + S.esc(S.Analysis.pairLabel(k)) + '</span>' +
                (ex.length
                  ? '<span class="found-words">on ' +
                    ex.slice(0, 4).map(function (w) {
                      return '<b>' + S.esc(w) + '</b>';
                    }).join(', ') + '</span>'
                  : '<span class="found-words">in this set</span>') +
              '</li>';
            }).join('') +
            '</ul>' +
            '<p>Spark keeps these words and builds practice from them. ' +
            'They are waiting in <b>Homework</b>.</p>'
          : '<p>No letter mix-ups so far. That is worth knowing too — it ' +
            'means the difficulty is somewhere other than the letter shapes.</p>') +
      '</div>';
  }

  S.paintLibrary = function () {
    S.$('#libList').innerHTML = S.LIBRARY.map(function (s) {
      var done = S.P.doneSteps[s.id] || {};
      var n = ['read', 'understand', 'order'].filter(function (k) { return done[k]; }).length;
      return '<button class="lib-card" data-read="' + s.id + '">' +
        '<div class="lib-top">' +
          '<span class="lib-pic">' + S.Pictures.drawn(s.pic, 40) + '</span>' +
          '<span class="badge' + (n === 3 ? ' badge-done' : '') + '">' +
            (n === 3 ? '✓ Done' : 'Level ' + s.level) + '</span>' +
        '</div>' +
        '<h3>' + S.esc(s.title) + '</h3>' +
        '<p>' + S.esc(s.blurb) + '</p>' +
        '<span class="lib-foot">' +
          (n ? n + ' of 3 steps done' : S.wordCount(s.text) + ' words') + '</span>' +
      '</button>';
    }).join('');

    S.$$('[data-read]').forEach(function (b) {
      b.addEventListener('click', function () {
        var src = S.LIBRARY.filter(function (x) { return x.id === b.dataset.read; })[0];
        if (src) S.openPassage(src);
      });
    });
  };

  /* ── wiring ─────────────────────────────────────────── */
  S.wireReader = function () {
    S.$('#btnMic').addEventListener('click', S.toggleReading);
    S.$('#btnFinishRead').addEventListener('click', function () {
      if (!R) return;
      R.idx = R.tokens.length;
      S.finishReading();
    });
    S.$('#btnListen').addEventListener('click', function () {
      if (!R) return;
      if (R.reading) { stopReadAlong(); return; }
      startReadAlong();
    });
    S.$('#backToLib').addEventListener('click', S.closePassage);
    S.$('#btnCheckSeq').addEventListener('click', S.checkOrder);

    S.$$('.step').forEach(function (b) {
      b.addEventListener('click', function () { S.setStep(b.dataset.step); });
    });

    S.$('#railTools').addEventListener('click', function (e) {
      var b = e.target.closest('.tool');
      if (b) S.useTool(b.dataset.tool);
    });

    S.$('#voiceWarn').addEventListener('click', function (e) {
      if (e.target.closest('[data-voice-accept]'))  S.dismissVoiceWarning(true);
      if (e.target.closest('[data-voice-dismiss]')) S.dismissVoiceWarning(false);
    });
  };

})(window.Spark);
