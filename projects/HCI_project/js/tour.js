/* ============================================================
   tour.js — "let me show you around".

   Runs once, straight after the first welcome, and any time from
   the menu. Each step lights up one part of the screen with a box
   and explains it in one or two lines, which Sparky also says out
   loud. Next moves the light to the next part.
   ============================================================ */

(function (S) {
  'use strict';

  var STEPS = [
    { sel: null, title: 'Welcome to Spark!',
      text: 'Let me show you around. It only takes a minute.' },
    { sel: '.tab[data-go="home"]', title: 'Home',
      text: 'Your start page. It always shows what to do next.' },
    { sel: '#homeNext', go: 'home', title: 'Your next adventure',
      text: 'Tap here to carry on with your story. Easy!' },
    { sel: '.tab[data-go="worlds"]', title: 'Let\'s read',
      text: 'Six story worlds. Pick any one. Read a chapter out loud, then write a little of it.' },
    { sel: '.tab[data-go="write"]', title: 'Let\'s write',
      text: 'Describe pictures with a word bank, and write your own picture stories.' },
    { sel: '.tab[data-go="progress"]', title: 'Progress',
      text: 'See the worlds you\'ve explored, your badges and your streak.' },
    { sel: '.streak-chip', title: 'Your streak',
      text: 'Do one thing every day to keep your streak growing.' },
    { sel: '#btnProfile', title: 'Your profile',
      text: 'Change your name and picture here.' },
    { sel: '#btnMenu', title: 'Menu',
      text: 'Text size, voices, and this tour again if you need it.' },
    { sel: '#exploreHint', go: 'home', title: 'Your goal',
      text: 'Try at least one chapter in every world. Have fun!' }
  ];

  var at = 0, layer = null;

  S.startTour = function () {
    S.go('home');
    at = 0;
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
    layer.querySelector('#tourNext').addEventListener('click', function () { if (at < STEPS.length - 1) { at++; show(); } else end(); });
    layer.querySelector('#tourBack').addEventListener('click', function () { if (at > 0) { at--; show(); } });
    layer.querySelector('#tourSkip').addEventListener('click', end);
    layer.querySelector('#tourHear').addEventListener('click', function () { S.say(STEPS[at].text); });
    window.addEventListener('resize', function () { if (layer && !layer.hidden) place(); });
  }

  function show() {
    var st = STEPS[at];
    if (st.go) S.go(st.go);
    layer.querySelector('#tourCount').textContent = 'Step ' + (at + 1) + ' of ' + STEPS.length;
    layer.querySelector('#tourTitle').textContent = st.title;
    layer.querySelector('#tourText').textContent = st.text;
    layer.querySelector('#tourBack').hidden = at === 0;
    layer.querySelector('#tourNext').textContent = at === STEPS.length - 1 ? 'Let\'s go!' : 'Next →';
    var el = target(st);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' in document.body.style ? 'instant' : 'auto' });
    setTimeout(place, 60);
    S.say(st.title + '. ' + st.text);
  }

  function target(st) {
    if (!st.sel) return null;
    var list = S.$$(st.sel).filter(function (e) { return e.offsetParent !== null; });
    return list[0] || null;
  }

  /* Put the light on the target, and the bubble beside it. */
  function place() {
    var st = STEPS[at], el = target(st);
    var spot = layer.querySelector('#tourSpot'), tip = layer.querySelector('#tourTip');
    if (!el) {
      spot.style.cssText = 'left:50%;top:40%;width:0;height:0;';
      tip.style.left = Math.max(12, (innerWidth - tip.offsetWidth) / 2) + 'px';
      tip.style.top = Math.max(12, innerHeight * 0.3) + 'px';
      return;
    }
    var r = el.getBoundingClientRect(), pad = 8;
    spot.style.cssText = 'left:' + (r.left - pad) + 'px;top:' + (r.top - pad) + 'px;width:' +
      (r.width + pad * 2) + 'px;height:' + (r.height + pad * 2) + 'px;';
    var below = r.bottom + 16, above = r.top - tip.offsetHeight - 16;
    var top = below + tip.offsetHeight < innerHeight - 8 ? below : Math.max(8, above);
    tip.style.top = top + 'px';
    tip.style.left = S.clamp(r.left + r.width / 2 - tip.offsetWidth / 2, 12, innerWidth - tip.offsetWidth - 12) + 'px';
  }

  function end() {
    layer.hidden = true;
    S.stopSaying();
    S.P.tourDone = S.today();
    S.save();
    S.go('home');
  }

})(window.Spark);
