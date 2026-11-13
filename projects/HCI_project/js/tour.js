/* ============================================================
   tour.js - "let me show you around".

   Runs once, straight after the first welcome, and any time from
   the menu. Each step OPENS the page it is talking about, lights up one
   part of it, and says how to use it. Where it helps, the step also shows
   it working: it opens a story and reads the first words, picks a help
   tool for a word, points at a word, places a word in a describe-a-
   picture sentence, and answers a picture-story question.

   Nothing in the tour counts. For a student it runs inside a sandbox (a
   throw-away profile and nothing recorded, see practice.js); when it ends
   the real profile and the recorded rows are put back exactly as they were.
   A teacher is already in a no-record view.
   ============================================================ */

(function (S) {
  'use strict';

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function el(sel) { return document.querySelector(sel); }

  /* ── things a step can show ───────────────────────────── */

  /* a story, opened, so there is something real to look at */
  function openStory() {
    if (!S.$('#v-read').hidden && S.currentReading && S.currentReading()) return wait(50);
    S.go('worlds');
    S.playChapter('bd', 1);
    return wait(500);
  }

  /* the first words, read: each lights up as it is "heard" */
  function readFirstWords() {
    var my = shown;
    return openStory().then(function () {
      if (my !== shown) return;
      function fin(t) { return { isFinal: true, 0: { transcript: t }, length: 1 }; }
      var chunks = ['bud is', 'a big', 'dog'], done = [];
      var seq = Promise.resolve();
      chunks.forEach(function (c) {
        seq = seq.then(function () { if (my !== shown) return; done.push(fin(c)); S._readerFeed(done.slice()); return wait(700); });
      });
      return seq;
    });
  }

  /* the "Stuck on a word?" box, used */
  function useHelp(tool, word) {
    var my = shown;
    return openStory().then(function () {
      var box = S.$('#helpWord');
      if (!box || my !== shown) return;
      box.value = word;
      var b = el('[data-tool="' + tool + '"]');
      if (b) b.click();
      return wait(500);
    });
  }

  /* pointing at a word */
  function pointAtWord() {
    var my = shown;
    return openStory().then(function () {
      var w = S.$$('#prose .w')[3];
      if (!w || my !== shown) return;
      w.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      return wait(700);
    });
  }

  /* Describe a picture: open it and put the first word in its gap */
  function describeDemo() {
    var my = shown;
    S.go('write');
    S.openDescribe();
    return wait(500).then(function () {
      if (my !== shown) return;
      var gap = el('#dsBody .gap[data-gap="0"]');
      var want = S.DESCRIBE[S.describeNext()].lines.join(' ').match(/\{(\w+)\}/);
      if (!gap || !want) return;
      var chip = S.$$('#dsBody .chip-word').filter(function (c) { return c.dataset.word === want[1]; })[0];
      if (chip) { chip.click(); return wait(300).then(function () { if (my === shown) gap.click(); return wait(300); }); }
    });
  }

  /* Picture story: open it and answer the first question */
  function storyDemo() {
    var my = shown;
    if (S.closeWriteActivity) S.closeWriteActivity();
    S.go('write');
    S.openWriteActivity('picture');
    return wait(500).then(function () {
      if (my !== shown) return;
      var q = S.pictureQs(S.P.storyIndex || 0)[0];
      var box = S.$('#fWho');
      if (box && q) { box.value = q.ladder.answer; box.dispatchEvent(new Event('input')); }
      return wait(300);
    });
  }

  /* put things back when leaving a step */
  function tidy() {
    try { S.hideHoverTip && S.hideHoverTip(); } catch (e) {}
    try { S.closeSheet(); } catch (e) {}
    try { if (S.closeWriteActivity) S.closeWriteActivity(); } catch (e) {}
  }

  /* What each part is and how to use it. Each step opens the page it is about
     (and, where it helps, shows it working) and just explains it: no
     "I opened this" narration. A step with no sel is a plain card. */
  var STUDENT_STEPS = [
    { sel: null, title: 'Welcome to Spark!',
      text: 'This short tour shows you how to use Spark. Nothing you do during the tour counts.' },
    { sel: '#homeNext', go: 'home', title: 'Home',
      text: 'Your start page. It always shows what to do next. Press Start to carry on with your story.' },
    { sel: '#worldGrid', go: 'worlds', title: 'Let\'s read',
      text: 'Six story worlds. Tap a world to see its three chapters. Choose a chapter, read it out loud, then write it. Finish all three chapters and the world\'s badge turns from grey to colour.' },
    { sel: '#prose', act: readFirstWords, title: 'Reading a story',
      text: 'Press "Read to Spark" and read out loud. Each word lights up as you say it. Spark waits for you and never interrupts. Press "Done reading" when you finish.' },
    { sel: '.help-box', act: function () { return useHelp('picture', 'bed'); }, title: 'Stuck on a word?',
      text: 'Type the word you are stuck on, or tap it in the story. Then choose Picture to see what it is.' },
    { sel: '.help-box', act: function () { return useHelp('split', 'basket'); }, title: 'Hear it, Say it, Split it',
      text: 'Hear it says the word. Say it: you say the word and Spark listens. Split it breaks the word into chunks. Use whichever helps you.' },
    { sel: '#prose p:first-child .w:nth-of-type(4)', act: openStory, after: pointAtWord, title: 'Point at a word',
      text: 'Move your mouse over any word in the story, or touch it, to see a bigger picture and how the word breaks up. Move away and it goes.' },
    { sel: '#writeLibrary', go: 'write', act: tidy, title: 'Let\'s write',
      text: 'Two ways to write. Describe a picture: put words into sentences. Picture story: answer questions about a picture in your own words.' },
    { sel: '#writeDescribe', act: describeDemo, title: 'Describe a picture',
      text: 'Tap a word in the word bank, then tap the gap where it fits. Press the speaker to hear your sentence. Then look at it, cover it, and write it from memory.' },
    { sel: '#writePicture .write-grid', act: storyDemo, title: 'Picture story',
      text: 'Answer the three questions about the picture. Press Stuck? for a little help at a time. Press the speaker beside an answer to hear it. Press Check my spelling, then Save it. Spark tells you which answers are right and shows you the right one if not.' },
    { sel: '#progMain .me-grid', go: 'progress', act: tidy, title: 'Progress',
      text: 'Worlds explored: a path that fills in as you try each world. Chapters completed: how many of each world\'s three chapters you have finished. Streak: the days in a row you have finished something. Badges: one for each world, grey until you finish all three chapters. Words read this week and sentences written.' },
    { sel: '.streak-chip', title: 'Your streak',
      text: 'Finish something each day, like a story, a chapter or a writing exercise, to keep your streak growing.' },
    { sel: '.prof-hero', go: 'profile', title: 'Your profile',
      text: 'Change your picture here, and choose Light, Dark or Auto colours. Your name and age stay the same.' },
    { sel: '#sheet', act: function () { S.go('home'); S.openMenu(); return wait(400); }, leave: tidy, title: 'Menu',
      text: 'Text size, voices, colours, and this tour again. Choose "Try it out" to practise everything safely: nothing you do there counts.' },
    { sel: '#exploreHint', go: 'home', act: tidy, title: 'Your goal',
      text: 'Try at least one chapter in every world. Have fun!' }
  ];

  /* A teacher or parent looking round gets their own tour: the same
     website, then the Students page and where to sign out. */
  var TEACHER_STEPS = [
    { sel: null, title: 'Welcome, teacher!',
      text: 'This is the same website your students use. I will open each page. Nothing you do here is saved or counted as theirs.' },
    { sel: '.tab[data-go="worlds"]', go: 'worlds', title: 'Let\'s read',
      text: 'The six story worlds your students read aloud.' },
    { sel: '#readWork .work-head', act: openStory, title: 'A story, opened',
      text: 'Each world has three chapters. Students read one out loud, then write it. This is exactly what they see.' },
    { sel: '#prose', act: readFirstWords, title: 'Reading',
      text: 'Words light up as the student reads them. Slips, repeats and pauses are noted for you, and nothing interrupts the child.' },
    { sel: '.help-box', act: function () { return useHelp('picture', 'bed'); }, title: 'Help the student asks for',
      text: 'A student types or taps a word they are stuck on and chooses Picture, Hear it, Say it or Split it. Each use is recorded for you, with whether it got them moving again.' },
    { sel: '.tab[data-go="write"]', go: 'write', act: tidy, title: 'Let\'s write',
      text: 'The two writing activities.' },
    { sel: '#writeDescribe', act: describeDemo, title: 'Describe a picture',
      text: 'Students put words in gaps, listen, then look, cover and write the sentence from memory.' },
    { sel: '#writePicture .write-grid', act: storyDemo, title: 'Picture story',
      text: 'Three questions about each picture. Spelling is checked, and each answer is marked right or wrong in any wording.' },
    { sel: '.tab[data-go="progress"]', go: 'progress', act: tidy, title: 'Progress',
      text: 'The page a student sees about their own worlds and badges.' },
    { sel: '#tabStudents', go: 'home', title: 'Students',
      text: 'This is yours: every student from every device. Press "Let\'s go!" at the end and I will show you round that page too.' },
    { sel: '#sheet', act: function () { S.openMenu(); return wait(400); }, leave: tidy, title: 'Menu',
      text: 'Reading settings, voices, colours, this tour again, the Students page, and Sign out.' }
  ];

  function steps() { return S.teacherMode ? TEACHER_STEPS : STUDENT_STEPS; }

  var at = 0, layer = null, shown = 0, sandboxed = false, last = null;

  S.startTour = function () {
    /* a student's tour runs in the sandbox, so nothing it does is kept */
    sandboxed = !S.teacherMode && !S.practiceMode && S.sandboxEnter ? S.sandboxEnter() : false;
    S.go('home');
    at = 0; last = null;
    if (!layer) build();
    layer.hidden = false;
    show();
  };

  function build() {
    layer = document.createElement('div');
    layer.className = 'tour';
    layer.innerHTML =
      '<div class="tour-spot" id="tourSpot"></div>' +
      '<div class="tour-tip" id="tourTip" role="dialog" aria-live="polite">' +
        '<div class="tour-head"><span class="tour-mascot">' + S.mascot(44, 'bob') + '</span>' +
          '<div><small id="tourCount"></small><b id="tourTitle"></b></div>' +
          '<button class="icon-sq" id="tourHear" aria-label="Hear it">' + S.Pictures.icon('speaker', 16) + '</button></div>' +
        '<p id="tourText"></p>' +
        '<div class="tour-foot">' +
          '<button class="btn btn-sm" id="tourSkip">Skip tour</button>' +
          '<span></span>' +
          '<button class="btn btn-sm" id="tourBack">← Back</button>' +
          '<button class="btn btn-sm btn-primary" id="tourNext">Next →</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(layer);
    layer.querySelector('#tourNext').addEventListener('click', function () { if (at < steps().length - 1) { at++; show(); } else end(true); });
    layer.querySelector('#tourBack').addEventListener('click', function () { if (at > 0) { at--; show(); } });
    layer.querySelector('#tourSkip').addEventListener('click', function () { end(false); });
    layer.querySelector('#tourHear').addEventListener('click', function () { S.say(steps()[at].text); });
    window.addEventListener('resize', function () { if (layer && !layer.hidden) place(); });
  }

  function show() {
    var st = steps()[at], mine = ++shown;
    if (last && last.leave) { try { last.leave(); } catch (e) {} }
    last = st;
    layer.querySelector('#tourCount').textContent = 'Step ' + (at + 1) + ' of ' + steps().length;
    layer.querySelector('#tourTitle').textContent = st.title;
    layer.querySelector('#tourText').textContent = st.text;
    layer.querySelector('#tourBack').hidden = at === 0;
    layer.querySelector('#tourNext').textContent = at === steps().length - 1 ? 'Let\'s go!' : 'Next →';
    S.say(st.title + '. ' + st.text);

    if (st.go) S.go(st.go);
    var ready = Promise.resolve();
    if (st.act) { try { ready = Promise.resolve(st.act()); } catch (e) { ready = Promise.resolve(); } }
    ready.catch(function () {}).then(function () {
      if (mine !== shown) return;                       /* the child already moved on */
      var t = target(st);
      if (t) t.scrollIntoView({ block: 'center', behavior: 'instant' in document.body.style ? 'instant' : 'auto' });
      setTimeout(place, 60);
      /* something that must happen AFTER the page has scrolled to the target
         (pointing at a word: scrolling hides a hover tip) */
      if (st.after) setTimeout(function () { if (mine === shown) { try { st.after(); } catch (e) {} } }, 250);
    });
  }

  function target(st) {
    if (!st.sel) return null;
    /* a fixed element (the menu) has no offsetParent, so test for a box instead */
    var list = S.$$(st.sel).filter(function (e) { return e.getClientRects().length > 0; });
    return list[0] || null;
  }

  /* Put the light on the target, and the bubble beside it. */
  function place() {
    var st = steps()[at], t = target(st);
    var spot = layer.querySelector('#tourSpot'), tip = layer.querySelector('#tourTip');
    if (!t) {
      spot.style.cssText = 'left:50%;top:40%;width:0;height:0;';
      tip.style.left = Math.max(12, (innerWidth - tip.offsetWidth) / 2) + 'px';
      tip.style.top = Math.max(12, innerHeight * 0.3) + 'px';
      return;
    }
    var r = t.getBoundingClientRect(), pad = 8;
    spot.style.cssText = 'left:' + (r.left - pad) + 'px;top:' + (r.top - pad) + 'px;width:' +
      (r.width + pad * 2) + 'px;height:' + (r.height + pad * 2) + 'px;';
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var below = r.bottom + 16, above = r.top - th - 16;
    if (below + th < innerHeight - 8) {
      tip.style.top = below + 'px';
      tip.style.left = S.clamp(r.left + r.width / 2 - tw / 2, 12, innerWidth - tw - 12) + 'px';
    } else if (above > 8) {
      tip.style.top = above + 'px';
      tip.style.left = S.clamp(r.left + r.width / 2 - tw / 2, 12, innerWidth - tw - 12) + 'px';
    } else if (r.right + tw + 16 < innerWidth) {          /* a tall thing: beside it */
      tip.style.top = Math.max(8, r.top) + 'px'; tip.style.left = (r.right + 16) + 'px';
    } else if (r.left - tw - 16 > 0) {
      tip.style.top = Math.max(8, r.top) + 'px'; tip.style.left = (r.left - tw - 16) + 'px';
    } else {
      tip.style.top = Math.max(8, innerHeight - th - 12) + 'px';
      tip.style.left = S.clamp(r.left + r.width / 2 - tw / 2, 12, innerWidth - tw - 12) + 'px';
    }
  }

  function end(finished) {
    layer.hidden = true;
    shown++;
    if (last && last.leave) { try { last.leave(); } catch (e) {} }
    last = null;
    S.stopSaying();
    try { if (S.stopReading) S.stopReading(); } catch (e) {}
    tidy();
    try { if (S.teacherMode) sessionStorage.setItem('spark.teacher.toured', '1'); } catch (e) {}

    /* a teacher who finished the website tour carries on to the Students page */
    if (finished === true && S.teacherMode) { location.href = 'teacher.html?tour=1'; return; }

    /* a student: put the real profile back (and remember the tour is done),
       then reload so nothing from the tour is left anywhere */
    if (sandboxed && S.sandboxLeave) { sandboxed = false; S.sandboxLeave({ tourDone: true, reload: false }); return; }

    S.P.tourDone = S.today();
    S.save();
    S.go('home');
  }

})(window.Spark);
