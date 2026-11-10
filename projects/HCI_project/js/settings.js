/* ============================================================
   settings.js — reading comfort, Spark's voice, and the AI helper.

   The reading controls are not decoration. Larger text and wider
   letter and line spacing are standard adjustments for readers
   with dyslexia, and the right setting differs from child to
   child — so they are adjustable, and they apply everywhere text
   appears, not only inside a passage.

   The reading band is no longer among them. It now appears by
   itself, tracking the word being spoken while Spark reads aloud,
   and clears when it stops.
   ============================================================ */

(function (S) {
  'use strict';

  /* ── main panel ─────────────────────────────────────── */
  S.openSettings = function () {
    var st = S.P.settings;

    S.sheet(
      '<h2>Reading settings</h2>' +
      '<p class="sub">Try them — the sample below changes.</p>' +

      '<label class="set-label">Text size</label>' +
      '<div class="size-grid">' +
        Object.keys(S.SIZES).map(function (key) {
          var spec = S.SIZES[key];
          return '<button class="size-btn" data-size="' + key + '"' +
            (st.size === key ? ' data-on="1"' : '') + '>' +
            '<span class="size-demo" style="font-size:' + Math.round(spec.px * 0.95) + 'px">Aa</span>' +
            '<b>' + spec.label + '</b>' +
            '<span class="size-px">' + spec.px + 'px</span>' +
          '</button>';
        }).join('') +
      '</div>' +

      /* The explanation is a sibling of the label, not a child of
         it, so the grid can run it the full width of the row
         underneath both. Nested inside, it was squeezed into
         whatever the control left over. */
      '<div class="srow" style="margin-top:4px"><label>Wider letters</label>' +
        '<div class="seg">' +
          '<button data-spacing="off" aria-pressed="' + (!st.extraSpacing) + '">Off</button>' +
          '<button data-spacing="on"  aria-pressed="' + (!!st.extraSpacing) + '">On</button>' +
        '</div>' +
        '<p class="srow-note">More space between letters.</p></div>' +

      '<div class="srow"><label>Letter shapes</label>' +
        '<div class="seg">' +
          '<button data-font="dyslexic" aria-pressed="' + (st.font !== 'plain') + '">OpenDyslexic</button>' +
          '<button data-font="plain" aria-pressed="' + (st.font === 'plain') + '">Plain</button>' +
        '</div>' +
        '<p class="srow-note">Pick whichever is easier to read.</p></div>' +

      '<div class="srow"><label>Theme</label><div class="seg">' +
        ['light', 'dark', 'auto'].map(function (t) {
          return '<button data-theme-set="' + t + '" aria-pressed="' + (st.theme === t) + '">' +
            t.charAt(0).toUpperCase() + t.slice(1) + '</button>';
        }).join('') +
      '</div><p class="srow-note">Light or dark page.</p></div>' +

      '<div class="sample-text" id="sampleText">' +
        'The big dog dug a bed in the dirt.' +
      '</div>' +

      '<div class="toolbar" style="margin:18px 0 0">' +
        '<button class="btn" id="sBack">&larr; Back</button>' +
        '<button class="btn btn-primary" data-close style="flex:1">Done</button>' +
      '</div>',

      function () {
        S.$$('[data-size]').forEach(function (b) {
          b.addEventListener('click', function () {
            S.P.settings.size = b.dataset.size;
            S.save(); S.applySettings();
            S.$$('[data-size]').forEach(function (x) { x.dataset.on = x === b ? '1' : ''; });
          });
        });

        S.$$('[data-spacing]').forEach(function (b) {
          b.addEventListener('click', function () {
            S.P.settings.extraSpacing = b.dataset.spacing === 'on';
            S.save(); S.applySettings();
            press('[data-spacing]', b);
          });
        });

        S.$$('button[data-font]').forEach(function (b) {
          b.addEventListener('click', function () {
            S.P.settings.font = b.dataset.font;
            S.save(); S.applySettings();
            press('button[data-font]', b);
          });
        });

        S.$$('[data-theme-set]').forEach(function (b) {
          b.addEventListener('click', function () {
            S.P.settings.theme = b.dataset.themeSet;
            S.save(); S.applySettings();
            press('[data-theme-set]', b);
            S.paintScene();
            if (!S.$('#v-progress').hidden) S.paintProgress();
          });
        });

        S.$('#sBack').addEventListener('click', S.openMenu);
      }
    );
  };

  function press(sel, active) {
    S.$$(sel).forEach(function (x) { x.setAttribute('aria-pressed', String(x === active)); });
  }

  S.openVoiceSettings = function () {
    var st = S.P.settings;
    var line = S.CALIBRATION[Math.floor(Math.random() * S.CALIBRATION.length)];
    var cloudOn = S.cloudVoiceState && S.cloudVoiceState() === 'on';

    S.sheet(
      '<h2>Voices</h2>' +
      '<p class="sub">Who reads to you. Tap one to hear it.</p>' +

      '<div class="voice-grid four">' +
        Object.keys(S.VOICES).map(function (key) {
          var v = S.VOICES[key];
          return '<button class="voice-card" data-voice="' + key + '"' +
            (st.voice === key ? ' data-on="1"' : '') + '>' +
            '<span class="voice-face">' + S.avatarSVG(voiceAvatar(key), 40) + '</span>' +
            '<b>' + v.label + '</b>' +
            '<span class="voice-sub">' + v.who + '</span>' +
          '</button>';
        }).join('') +
      '</div>' +
      '<p class="srow-note" style="margin-top:8px">' +
        (cloudOn ? 'Using Spark\'s natural voice.'
                 : 'Using: ' + S.esc(S.voiceName(st.voice || 'woman') || 'this computer\'s voice')) +
      '</p>' +

      '<div class="srow" style="margin-top:14px"><label>Speaking speed</label>' +
        '<div class="seg">' +
          [['slow', 0.8, 'Slow'], ['normal', 0.95, 'Normal'], ['brisk', 1.12, 'Quick']]
            .map(function (o) {
              var on = Math.abs((st.rate || 0.95) - o[1]) < 0.06;
              return '<button data-rate="' + o[1] + '" aria-pressed="' + on + '">' + o[2] + '</button>';
            }).join('') +
        '</div>' +
        '<p class="srow-note">How fast Spark talks.</p></div>' +

      /* ── the calibration, as an activity ─────────────── */
      '<div class="calib" id="calib">' +
        '<div class="calib-head">' +
          '<h3>Let Spark learn your voice</h3>' +
          '<p>Read the whole paragraph out loud. Spark listens to all of it.</p>' +
        '</div>' +
        '<p class="calib-para" id="calibPara">' +
          line.split(/\s+/).map(function (w, i) {
            return '<span class="cw" data-cw="' + i + '">' + S.esc(w) + '</span>';
          }).join(' ') +
        '</p>' +
        '<div class="calib-level"><i id="calibBar"></i></div>' +
        '<p class="calib-status" id="calibStatus">' +
          (S.P.voicePrint ? 'Spark already knows your voice, from ' + S.esc(S.niceDate(S.P.voicePrint.date)) +
                            '. Read again to update it.' : 'Press start, then read at your own speed.') +
        '</p>' +
        '<div class="toolbar" style="margin:0">' +
          '<button class="btn btn-primary" id="calibGo">' + S.Pictures.icon('mic', 18) + ' Start reading</button>' +
          '<button class="btn" id="calibHear">' + S.Pictures.icon('speaker', 18) + ' Hear it first</button>' +
          '<button class="btn" id="calibDone" hidden>I\'ve finished ✓</button>' +
        '</div>' +
      '</div>' +

      '<div class="toolbar" style="margin:18px 0 0">' +
        '<button class="btn" id="vBack">&larr; Back</button>' +
        '<button class="btn btn-primary" data-close style="flex:1">Done</button>' +
      '</div>',

      function () {
        S.$$('[data-voice]').forEach(function (b) {
          b.addEventListener('click', function () {
            S.P.settings.voice = b.dataset.voice;
            S.save();
            S.$$('[data-voice]').forEach(function (x) { x.dataset.on = x === b ? '1' : ''; });
            S.say(S.VOICES[b.dataset.voice].sample);
          });
        });

        S.$$('[data-rate]').forEach(function (b) {
          b.addEventListener('click', function () {
            S.P.settings.rate = Number(b.dataset.rate);
            S.save();
            S.$$('[data-rate]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
            S.say('This is how fast I will read.');
          });
        });

        wireCalibration(line);

        S.$('#vBack').addEventListener('click', function () { stopCalibration(); S.openMenu(); });
        S.$$('[data-close]').forEach(function (b) { b.addEventListener('click', function () { stopCalibration(); }); });
      }
    );
  };

  function voiceAvatar(key) {
    return { woman: 'owl', man: 'bear', girl: 'bunny', boy: 'fox' }[key] || 'owl';
  }

  /* ── the calibration activity ───────────────────────────
     The old version fixed the voice print after about a second of
     speech and declared "that is your voice" while the child was
     still on the first line. Now:

       · the voice is sampled for the WHOLE paragraph
       · speech recognition follows along, lighting each word as it
         is read, so the child can see Spark is really listening
       · it only finishes when (nearly) every word has been read,
         or the child says they have finished and has read most of it
       · it refuses to finish on too little voice, and says why  */
  var calib = null;

  function wireCalibration(line) {
    var words = line.split(/\s+/).map(function (w) { return S.norm(w); });

    if (!S.voiceCheck.supported()) {
      S.$('#calibStatus').textContent = 'This needs a microphone. Chrome or Edge can do it.';
      S.$('#calibGo').disabled = true;
      return;
    }

    S.$('#calibHear').addEventListener('click', function () { S.say(line); });
    S.$('#calibDone').addEventListener('click', function () { tryFinish(true); });

    S.$('#calibGo').addEventListener('click', async function () {
      if (calib) { stopCalibration(); return; }
      S.stopSaying();
      S.voiceCheck.stop();
      var ok = await S.voiceCheck.start(function () {}, { calibrate: true });
      if (!ok) { status('I could not open the microphone. Allow it in the address bar?'); return; }

      calib = { words: words, upTo: 0, started: Date.now(), mic: null, timer: null };
      S.$$('#calibPara .cw').forEach(function (e) { e.classList.remove('done'); });
      S.$('#calibGo').innerHTML = S.Pictures.icon('stop', 18) + ' Stop';
      S.$('#calibDone').hidden = false;
      status('Go ahead — read the whole paragraph out loud.');

      /* follow the words, where the browser can */
      if (!S.micProblem()) {
        calib.mic = S.listenContinuous(onHeard, function () { calib && (calib.mic = null); });
      }
      calib.timer = setInterval(tick, 300);
    });
  }

  /* Line up everything heard so far against the paragraph. */
  function onHeard(results) {
    if (!calib) return;
    var heard = [];
    for (var i = 0; i < results.length; i++) {
      heard = heard.concat(String(results[i][0].transcript).split(/\s+/).map(S.norm).filter(Boolean));
    }
    var at = 0;
    heard.forEach(function (h) {
      for (var k = at; k < Math.min(at + 4, calib.words.length); k++) {
        if (S.soundsLike(h, calib.words[k]) || h === calib.words[k]) { at = k + 1; break; }
      }
    });
    if (at > calib.upTo) calib.upTo = at;
  }

  function tick() {
    if (!calib) return;
    var n = calib.words.length;
    var secs = (Date.now() - calib.started) / 1000;
    /* no speech recognition here: go by time instead */
    if (!calib.mic) calib.upTo = Math.max(calib.upTo, Math.min(n, Math.floor(secs / 0.42)));

    S.$$('#calibPara .cw').forEach(function (e) {
      e.classList.toggle('done', +e.dataset.cw < calib.upTo);
    });
    var bar = S.$('#calibBar');
    if (bar) { bar.style.width = Math.round(calib.upTo / n * 100) + '%'; bar.dataset.state = 'learning'; }

    if (calib.upTo >= n - 1 && !calib.ending) {
      calib.ending = true;
      status('Nearly there…');
      setTimeout(function () { tryFinish(false); }, 1200);   /* let the last word land */
    } else if (!calib.ending && calib.upTo > 0) {
      status('I can hear you — keep going. ' + Math.round(calib.upTo / n * 100) + '% read.');
    }
    if (secs > 180) tryFinish(true);
  }

  function tryFinish(asked) {
    if (!calib) return;
    var n = calib.words.length;
    if (asked && calib.upTo < n * 0.6 && calib.mic) {
      status('Keep going — you\'re ' + Math.round(calib.upTo / n * 100) + '% through. Read to the end.');
      return;
    }
    var print = S.voiceCheck.finishCalibration();
    var readTo = calib.upTo;
    stopCalibration(true);

    if (!print) {
      status('I didn\'t hear enough of your voice. Try again, a little closer to the microphone.');
      return;
    }
    S.P.voicePrint = { date: S.today(), hz: print.hz, words: readTo };
    S.save();

    var hz = print.hz;
    var band = hz > 250 ? 'a bright, high voice' : hz > 190 ? 'a fairly high voice'
             : hz > 150 ? 'a middle voice' : 'a low voice';
    var bar = S.$('#calibBar');
    if (bar) { bar.style.width = '100%'; bar.dataset.state = 'done'; }
    S.$$('#calibPara .cw').forEach(function (e) { e.classList.add('done'); });
    status('✓ Got it — that is your voice. Spark heard ' + band +
           ' across the whole paragraph. If someone else reads, Spark will notice.');
    S.award(3, 'Taught Spark your voice');
  }

  function status(t) { var el = S.$('#calibStatus'); if (el) el.textContent = t; }

  function stopCalibration(keepText) {
    if (calib) {
      clearInterval(calib.timer);
      if (calib.mic) calib.mic.stop();
      calib = null;
    }
    if (S.voiceCheck) { S.voiceCheck.unwatch(); S.voiceCheck.stop(); }
    var go = S.$('#calibGo');
    if (go) go.innerHTML = S.Pictures.icon('mic', 18) + ' ' + (keepText ? 'Read it again' : 'Start reading');
    var done = S.$('#calibDone');
    if (done) done.hidden = true;
    if (!keepText) status('Press start, then read at your own speed.');
  }

  /* ── reset ──────────────────────────────────────────── */
  S.confirmReset = confirmReset;
  function confirmReset() {
    S.sheet(
      '<h2>Start over?</h2>' +
      '<p class="sub">This clears your sparks, the words and letters Spark has learned ' +
      'about you, and everything you have written. It cannot be undone.</p>' +
      '<div class="toolbar" style="margin:0">' +
        '<button class="btn btn-rose" id="rYes">Yes, clear it</button>' +
        '<button class="btn" data-close>Keep it</button>' +
      '</div>',
      function () {
        S.$('#rYes').addEventListener('click', function () {
          S.reset();
          location.reload();
        });
      }
    );
  }

  /* ── the thinking helper ────────────────────────────────
     The key lives in js/config.js, set once by whoever installs
     this. A child should never meet an API key, and a teacher
     should not have to. So this panel reports the state and says
     where to change it — nothing more, unless config.js has
     explicitly allowed overriding from here. */
  /* ── the thinking helper ────────────────────────────────
     The key is set once in js/config.js. This panel reports what is
     happening and nothing more — no provider list, no model picker.
     Spark works out which model the key can use by itself, because
     providers retire model names and a picker full of dead names
     helps nobody.

     Set ALLOW_UI_OVERRIDE in config.js to allow pasting a key here
     instead; useful while setting up, off for a shared machine. */
  S.openAISettings = function () {
    var working = S.AI.ready && S.AI.verified;
    var untested = S.AI.ready && !S.AI.verified;
    var allowUI = S.AI.uiAllowed();
    var model = (S.P.ai && S.P.ai.model) || '';

    S.sheet(
      '<h2>Thinking helper</h2>' +

      '<div class="ai-state" data-on="' + (working ? '1' : '') + '">' +
        '<b>' + (working ? 'Connected — ' + S.esc(S.AI.label())
                         : untested ? 'Key found, not checked yet'
                                    : 'Not connected') + '</b>' +
        '<p>' + (working
          ? (model ? 'Using ' + S.esc(model) + '. ' : '') +
            'Ask Spark holds a real conversation, word cards show a meaning, ' +
            'questions are written for each passage, and spelling fixes explain the rule.'
          : untested
            ? 'Press Check below and Spark will find a model that works.'
            : 'Spark is running on its built-in answers.') + '</p>' +
      '</div>' +

      '<p class="sub" style="margin-top:14px"><b>Spark works without this.</b> ' +
      'Classifying pauses, spotting letter mix-ups, learning which cue helps, ' +
      'the drills, the reading tracker — all of that is arithmetic in the app, ' +
      'not a model.</p>' +

      (working ? '' :
        '<div class="ai-howto">' +
          '<p class="eyebrow" style="margin:0 0 10px">To switch it on</p>' +
          '<ol>' +
            '<li>Get a free key at <b>console.groq.com</b> — sign in with Google, ' +
              'then <b>API Keys</b> &rarr; <b>Create API Key</b>. No card needed.</li>' +
            '<li>Open <code>js/config.js</code> and paste it into ' +
              '<code>API_KEY</code>.</li>' +
            '<li>Save the file and reload this page.</li>' +
          '</ol>' +
          '<p class="sub" style="margin:10px 0 0">Leave <code>MODEL</code> blank — ' +
          'Spark finds a working one by itself.</p>' +
        '</div>') +

      (allowUI
        ? '<div style="margin-top:16px">' +
            '<p class="eyebrow" style="margin:0 0 8px">Or paste one here</p>' +
            '<input class="inp" id="aiKey" type="password" autocomplete="off" ' +
              'placeholder="paste a key to use on this computer only" value="' +
              S.esc((S.P.ai && S.P.ai.key) || '') + '">' +
            '<div class="toolbar" style="margin:12px 0 0">' +
              '<button class="btn btn-sm btn-primary" id="aiTest">' +
                (working ? 'Check again' : 'Connect') + '</button>' +
              '<button class="btn btn-sm" id="aiClear">Clear</button>' +
            '</div>' +
            '<div id="aiMsg"></div>' +
          '</div>'
        : '<div class="toolbar" style="margin:16px 0 0">' +
            '<button class="btn btn-sm btn-primary" id="aiTest">Check the connection</button>' +
            '<div id="aiMsg" style="width:100%"></div>' +
          '</div>') +

      '<div class="toolbar" style="margin:18px 0 0">' +
        '<button class="btn" id="aiBack">&larr; Back</button>' +
        '<button class="btn btn-primary" data-close style="flex:1">Done</button>' +
      '</div>',

      function () {
        var testBtn = S.$('#aiTest');
        testBtn.addEventListener('click', async function () {
          if (allowUI && S.$('#aiKey')) {
            S.P.ai.key = S.$('#aiKey').value.trim();
            if (!S.P.ai.provider) {
              S.P.ai.provider = (window.SPARK_CONFIG && window.SPARK_CONFIG.PROVIDER) || 'groq';
            }
            S.P.ai.model = '';          /* let it find one */
            S.save();
            S.AI.refresh();
          }
          if (!S.AI.ready) {
            report('No key yet — add one above, or in js/config.js.', false);
            return;
          }

          testBtn.disabled = true;
          var label = testBtn.textContent;
          testBtn.textContent = 'Checking…';
          try {
            var r = await S.AI.test();
            var note = 'Connected. Using ' + r.model + '.';
            if (r.tried && r.tried.length > 1) {
              note += ' (' + (r.tried.length - 1) + ' older model' +
                      (r.tried.length > 2 ? 's were' : ' was') + ' retired.)';
            }
            report(note, true);
            if (S.paintAIStatus) S.paintAIStatus();
          } catch (e) {
            report(e.message || 'That did not work.', false);
          }
          testBtn.disabled = false;
          testBtn.textContent = label;
        });

        var clearBtn = S.$('#aiClear');
        if (clearBtn) {
          clearBtn.addEventListener('click', function () {
            S.P.ai.key = '';
            S.P.ai.model = '';
            if (S.$('#aiKey')) S.$('#aiKey').value = '';
            S.save(); S.AI.refresh();
            report('Cleared. Back to whatever js/config.js says.', true);
          });
        }

        S.$('#aiBack').addEventListener('click', S.openMenu);

        function report(text, good) {
          var box = S.$('#aiMsg');
          if (box) {
            box.innerHTML = '<div class="q-after' + (good ? ' good' : '') +
              '" style="margin-top:10px">' + S.esc(text) + '</div>';
          }
        }
      }
    );
  };

  /* ── the menu ───────────────────────────────────────────
     A cog says "settings" and nothing else, so everything that was
     not reading settings — voices, the model, starting over — ended
     up buried a level down inside a panel about letter spacing.
     A menu button says "there is more in here", which is true, and
     each destination is named in words rather than guessed from a
     symbol. */
  S.openMenu = function () {
    var items = [
      { icon: 'book',    label: 'Reading settings',
        note: 'Text size, spacing, letter shapes, theme', go: S.openSettings },
      { icon: 'mic',     label: 'Voices',
        note: 'Pick a voice, let Spark learn yours',      go: S.openVoiceSettings },
      { icon: 'home',    label: 'My profile',
        note: 'Your picture, name and history',
        go: function () { S.go('profile'); } },
      /* the grown-ups' dashboard is its own page with its own login,
         so nothing diagnostic ever appears on the child's screen */
      { icon: 'lock',    label: 'For grown-ups',
        note: 'Teacher and parent dashboard (needs a login)',
        go: function () { location.href = 'teacher.html'; } }
    ];

    S.sheet(
      '<h2>Menu</h2>' +
      '<div class="menu-list">' +
        items.map(function (it, i) {
          return '<button class="menu-item" data-menu="' + i + '">' +
            '<span class="menu-ico">' + S.Pictures.icon(it.icon, 20) + '</span>' +
            '<span class="menu-text"><b>' + S.esc(it.label) + '</b>' +
            '<small>' + S.esc(it.note) + '</small></span>' +
            '<span class="menu-arrow">→</span>' +
          '</button>';
        }).join('') +
      '</div>' +
      '<button class="btn btn-sm" id="menuReset" style="margin-top:14px">Start over</button>',
      function () {
        S.$$('[data-menu]').forEach(function (b) {
          b.addEventListener('click', function () {
            var it = items[Number(b.dataset.menu)];
            S.closeSheet();
            if (it && it.go) setTimeout(it.go, 120);
          });
        });
        var reset = S.$('#menuReset');
        if (reset) reset.addEventListener('click', S.confirmReset);
      }
    );
  };

  S.wireSettings = function () {
    S.$('#btnMenu').addEventListener('click', S.openMenu);
  };

})(window.Spark);
