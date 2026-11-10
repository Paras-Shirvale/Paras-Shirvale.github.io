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
    S.$('#readDone').hidden = true;
    S.$('#readWork .reader-grid').hidden = false;
    S.$('#readWork .work-head').hidden = false;
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
    /* fetch pictures for the passage in the background, so every
       word has its visual ready the moment it is hovered or tapped */
    S.Pictures.warm(R.tokens.map(function (t) { return t.clean; }));
    /* ask the AI helper for how each longer word breaks and sounds,
       so "Parts" says them correctly the first time */
    S.prepareParts(R.tokens.map(function (t) { return t.clean; }));
    S.setStep('read');
    markStepsDone();
    updateStats();
    S.railSay('Read at your own speed. Tap any word you want help with.');
    S.markFavouredTool();
  };

  S.closePassage = function () {
    S.stopReading();
    stopReadAlong();
    if (R && R.rec) { R.rec.discard(); R.rec = null; }
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

    /* and record it, for the second, more accurate listen */
    if (S.modelListening() && S.Recorder) {
      if (!R.rec) R.rec = S.Recorder();
      if (R.rec.supported()) R.rec.start();
    }
  };

  S.stopReading = function () {
    if (mic) { mic.stop(); mic = null; }
    if (S.voiceCheck) S.voiceCheck.stop();
    clearTimeout(stallTimer);
    clearInterval(tick); tick = null;

    if (R && R.rec && !R.finished) R.rec.pause();
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
      ms: R.elapsed,
      seconds: Math.round(R.elapsed / 1000),
      family: R.src.family || null,
      pauseWords: R.stalls.map(function (x) { return x.word; }),
      mixups: R.misreads.map(function (m) { return { word: m.expected, said: m.heard, pairs: (m.pairs || []).map(function (p) { return p.key; }) }; })
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
      var session = S.P.sessions[S.P.sessions.length - 1];
      showDone(session);
      verifyWithModel(session);
      return;
    }

    setTimeout(function () { S.setStep('understand'); }, 900);
  };

  S.railSay = function (text) {
    var el = S.$('#railSay');
    if (el) el.textContent = text;
  };

  /* ── what Spark noticed ─────────────────────────────────
     Shown the moment a story is finished: how long it took, the
     pauses that were real difficulty, and any letters that got
     swapped — each with the word it happened on. */
  function showDone(session) {
    var src = R.src;
    var fam = S.familyOfStory(src.id);
    var mix = session.mixups || [];
    var secs = session.seconds || 0;

    S.$('#readWork .reader-grid').hidden = true;
    S.$('#readWork .work-head').hidden = true;
    var host = S.$('#readDone');
    host.hidden = false;
    host.innerHTML =
      '<section class="card done-card">' +
        '<span class="done-mascot">' + S.mascot(90, 'happy') + '</span>' +
        '<h1>You read “' + S.esc(src.title) + '”!</h1>' +
        '<div class="done-stats">' +
          '<div class="stat-tile tone-violet"><span class="st-ico">' + S.Pictures.icon('clock', 20) + '</span>' +
            '<b data-done="time">' + (secs ? fmtTime(secs) : '—') + '</b><span>reading time</span></div>' +
          '<div class="stat-tile tone-moss"><span class="st-ico">' + S.Pictures.icon('book', 20) + '</span>' +
            '<b data-done="wpm">' + (session.wpm || '—') + '</b><span>words a minute</span></div>' +
          '<div class="stat-tile tone-amber"><span class="st-ico">' + S.Pictures.icon('pause', 20) + '</span>' +
            '<b data-done="pauses">' + session.stalls + '</b><span>tricky pauses</span></div>' +
          '<div class="stat-tile tone-rose"><span class="st-ico">' + S.Pictures.icon('parts', 20) + '</span>' +
            '<b data-done="mix">' + mix.length + '</b><span>letter mix-ups</span></div>' +
        '</div>' +
        '<div class="done-detail" data-done="detail">' + detailHTML(session) + '</div>' +
        '<p class="done-model" data-done="model">' +
          (S.modelListening() && R.rec ? '<span class="pic-wait sm"></span> Spark is listening to your reading again, more carefully…' : '') +
        '</p>' +
        '<div class="toolbar" style="justify-content:center;margin:16px 0 0">' +
          '<button class="btn" id="doneAgain">' + S.Pictures.icon('refresh', 16) + ' Read it again</button>' +
          (nextStory(src.id) ? '<button class="btn btn-primary" id="doneNext">Next story →</button>' : '') +
          '<button class="btn" id="doneLib">All stories</button>' +
        '</div>' +
      '</section>';

    S.$('#doneAgain').addEventListener('click', function () { S.openPassage(src); });
    S.$('#doneLib').addEventListener('click', S.closePassage);
    var nx = S.$('#doneNext');
    if (nx) nx.addEventListener('click', function () { S.openPassage(nextStory(src.id)); });
    if (fam) S.say('Well done! You read ' + src.title + '.');
  }

  function fmtTime(secs) {
    secs = Math.round(secs);
    return secs < 60 ? secs + 's' : Math.floor(secs / 60) + 'm ' + (secs % 60) + 's';
  }

  function detailHTML(session) {
    var mix = session.mixups || [];
    var parts = [];
    if (mix.length) {
      parts.push('<p><b>Letters that got swapped</b></p><div class="done-chips">' + mix.map(function (m) {
        return '<span class="mix-chip"><s>' + S.esc(m.said) + '</s> → <b>' + S.esc(m.word) + '</b>' +
          (m.pairs && m.pairs.length ? ' <i>' + S.esc(S.Analysis.pairLabel(m.pairs[0])) + '</i>' : '') + '</span>';
      }).join('') + '</div>');
    }
    if ((session.pauseWords || []).length) {
      parts.push('<p><b>Words you stopped on</b></p><div class="done-chips">' +
        session.pauseWords.map(function (w) { return '<button class="mix-chip" data-say="' + S.esc(w) + '">' + S.esc(w) + '</button>'; }).join('') +
        '</div>');
    }
    if (!parts.length) parts.push('<p class="done-clean">No mix-ups and no tricky pauses. Smooth reading!</p>');
    return parts.join('');
  }

  function nextStory(id) {
    var all = [];
    S.FAMILIES.forEach(function (f) { f.stories.forEach(function (st) { all.push(Object.assign({ screening: true, level: null, pairs: f.pairs, family: f.id, about: f.blurb }, st)); }); });
    var i = all.map(function (x) { return x.id; }).indexOf(id);
    return i > -1 && i < all.length - 1 ? all[i + 1] : null;
  }

  /* ── the second listen, with Whisper ─────────────────────
     Whatever the live tracker missed, this finds. New letter
     mix-ups are added to the profile, and the timing is replaced
     by the model's exact one. */
  async function verifyWithModel(session) {
    var r = R;
    if (!r || !r.rec) return;
    var rec = r.rec; r.rec = null;
    var note = S.$('[data-done="model"]');
    try {
      var blob = await rec.stop();
      if (!blob || blob.size < 2000) throw new Error('too-short');
      var result = await S.transcribe(blob);
      var cmp = S.compareReading(r.tokens, result);

      var already = {};
      (session.mixups || []).forEach(function (m) { already[m.word] = 1; });
      var added = 0;
      cmp.misreads.forEach(function (m) {
        if (already[m.expected]) return;
        already[m.expected] = 1;
        var tok = r.tokens[m.ei];
        S.Analysis.recordMisread(m.analysis, {
          source: 'reading', sentence: r.sentences[tok ? tok.si : 0] || '', passage: r.src.title
        });
        session.mixups.push({ word: m.expected, said: m.heard,
          pairs: (m.analysis.pairs || []).map(function (p) { return p.key; }), model: true });
        added++;
      });
      if (cmp.seconds) session.seconds = Math.round(cmp.seconds);
      if (cmp.wpm) session.wpm = cmp.wpm;
      session.misreads = session.mixups.length;
      session.modelPauses = cmp.pauses.map(function (p) { return { word: p.word, s: p.seconds }; });
      session.model = true;

      /* the letter check record follows the better evidence too */
      if (r.src.screening && S.P.screening[r.src.id]) {
        var caught = {};
        (S.P.screening[r.src.id].pairs || []).forEach(function (k) { caught[k] = 1; });
        cmp.misreads.forEach(function (m) {
          (m.analysis.pairs || []).forEach(function (p) { if ((r.src.pairs || []).indexOf(p.key) > -1) caught[p.key] = 1; });
        });
        S.P.screening[r.src.id].pairs = Object.keys(caught);
      }
      S.save();

      if (!S.$('#readDone') || S.$('#readDone').hidden) return;
      var set = function (k, v) { var el = S.$('[data-done="' + k + '"]'); if (el) el.innerHTML = v; };
      set('time', session.seconds ? fmtTime(session.seconds) : '—');
      set('wpm', session.wpm || '—');
      set('mix', session.mixups.length);
      set('detail', detailHTML(session) + (session.modelPauses.length
        ? '<p><b>Longest pauses</b></p><div class="done-chips">' + session.modelPauses.slice(0, 6).map(function (p) {
            return '<span class="mix-chip">before <b>' + S.esc(p.word) + '</b> · ' + p.s + 's</span>';
          }).join('') + '</div>' : ''));
      if (note) note.innerHTML = S.Pictures.icon('check', 16) + ' Checked carefully' +
        (added ? ' — found ' + added + ' more mix-up' + (added > 1 ? 's' : '') + '.' : '. Nothing else to add.');
    } catch (e) {
      if (note) note.textContent = '';
    }
  }

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

  /* ── library: the letter families ──────────────────────
     One card per family. Each shows its letters, how many of its
     stories are done, and — once Spark has found anything — the
     letters that caught this child, so the card itself says where
     the work is. */
  S.paintLibrary = function () {
    var host = S.$('#famList');
    if (!host) return;
    var letters = S.P.letters || {};

    host.innerHTML = S.FAMILIES.map(function (f) {
      var done = f.stories.filter(function (st) { return S.P.doneSteps[st.id] && S.P.doneSteps[st.id].read; }).length;
      var hits = f.pairs.reduce(function (n, k) { return n + ((letters[k] && letters[k].count) || 0); }, 0);
      return '<div class="fam-card tone-violet">' +
        '<div class="fam-top">' + S.familyTiles(f) +
          (hits ? '<span class="badge badge-warn">' + hits + ' mix-up' + (hits > 1 ? 's' : '') + '</span>'
                : done === f.stories.length ? '<span class="badge badge-done">✓ Done</span>' : '') +
        '</div>' +
        '<h3>' + S.esc(f.title) + '</h3>' +
        '<p class="fam-blurb">' + S.esc(f.blurb) + '</p>' +
        '<div class="fam-stories">' + f.stories.map(function (st) {
          var read = S.P.doneSteps[st.id] && S.P.doneSteps[st.id].read;
          return '<button class="story-btn' + (read ? ' read' : '') + '" data-story="' + st.id + '">' +
            '<span class="story-ico">' + S.Pictures.icon(read ? 'check' : 'book', 16) + '</span>' +
            '<span class="story-t"><b>' + S.esc(st.title) + '</b><small>' + S.esc(st.blurb) + '</small></span>' +
            '<span class="story-go">→</span>' +
          '</button>';
        }).join('') + '</div>' +
      '</div>';
    }).join('');

    S.$$('[data-story]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        var f = S.familyOfStory(b.dataset.story);
        var st = f.stories.filter(function (x) { return x.id === b.dataset.story; })[0];
        S.openPassage(Object.assign({ screening: true, level: null, pairs: f.pairs, family: f.id, about: f.blurb }, st));
      });
    });
    paintScreeningReport();
  };

  S.paintScreening = function () { paintScreeningReport(); };

  /* What the stories have found so far, in one line per letter pair. */
  function paintScreeningReport() {
    var host = S.$('#screenReport');
    if (!host) return;
    var troubles = S.Analysis.letterTroubles(1);
    if (!troubles.length) { host.innerHTML = ''; return; }
    host.innerHTML =
      '<div class="screen-report">' +
        '<b>Letters Spark has noticed</b>' +
        '<ul class="found-list">' + troubles.slice(0, 5).map(function (t) {
          return '<li><span class="lt-pair sm">' + S.esc(t.label) + '</span>' +
            '<span class="found-words">' + t.count + '× · on ' +
            t.examples.slice(0, 3).map(function (w) { return '<b>' + S.esc(w) + '</b>'; }).join(', ') + '</span></li>';
        }).join('') + '</ul>' +
      '</div>';
  }

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
