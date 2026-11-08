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
      '<p class="sub">Change these until the words feel comfortable. ' +
      'The sample at the bottom shows what you are choosing.</p>' +

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
        '<p class="srow-note">Extra space between letters and words. The one ' +
        'change here with solid evidence behind it — in a 2012 study, dyslexic ' +
        'readers were about 20% faster and made half the errors.</p></div>' +

      '<div class="srow"><label>Letter shapes</label>' +
        '<div class="seg">' +
          '<button data-font="dyslexic" aria-pressed="' + (st.font !== 'plain') + '">OpenDyslexic</button>' +
          '<button data-font="plain" aria-pressed="' + (st.font === 'plain') + '">Plain</button>' +
        '</div>' +
        '<p class="srow-note">OpenDyslexic weights the bottom of each letter. ' +
        'Worth trying, but be aware the trials have not found it beats a plain ' +
        'sans-serif — use whichever this reader finds easier.</p></div>' +

      '<div class="srow"><label>Theme</label><div class="seg">' +
        ['auto', 'light', 'dark'].map(function (t) {
          return '<button data-theme-set="' + t + '" aria-pressed="' + (st.theme === t) + '">' +
            t.charAt(0).toUpperCase() + t.slice(1) + '</button>';
        }).join('') +
      '</div></div>' +

      '<div class="sample-text" id="sampleText">' +
        'The big dog dug a bed in the dirt.' +
      '</div>' +

      '<div class="toolbar" style="margin:18px 0 0">' +
        '<button class="btn btn-sm" id="sVoice">Voices…</button>' +
        '<button class="btn btn-sm" id="sAI">Thinking helper…</button>' +
        '<button class="btn btn-sm" id="sReset">Start over</button>' +
      '</div>' +

      '<button class="btn btn-primary btn-block" data-close style="margin-top:14px">Done</button>',

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

        S.$$('[data-font]').forEach(function (b) {
          b.addEventListener('click', function () {
            S.P.settings.font = b.dataset.font;
            S.save(); S.applySettings();
            press('[data-font]', b);
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

        S.$('#sVoice').addEventListener('click', S.openVoiceSettings);
        S.$('#sAI').addEventListener('click', S.openAISettings);
        S.$('#sReset').addEventListener('click', confirmReset);
      }
    );
  };

  function press(sel, active) {
    S.$$(sel).forEach(function (x) { x.setAttribute('aria-pressed', String(x === active)); });
  }

  /* ── Spark's voice, and who is reading ──────────────── */
  /* ── voices, and who is reading ─────────────────────────
     Two separate things, both about voices, so they live together.

     The calibration used to be a meter with numbers on it, which
     told a child nothing and gave them no reason to take part. It
     is now a short reading task with a clear outcome: read this
     sentence, and Spark tells you it has learned your voice.    */
  S.openVoiceSettings = function () {
    var st = S.P.settings;
    var variety = S.voiceVariety ? S.voiceVariety() : { distinct: 4 };
    var line = S.CALIBRATION[Math.floor(Math.random() * S.CALIBRATION.length)];

    S.sheet(
      '<h2>Voices</h2>' +
      '<p class="sub">Who reads to you. Tap one to hear it.</p>' +

      '<div class="voice-grid four">' +
        Object.keys(S.VOICES).map(function (key) {
          var v = S.VOICES[key];
          return '<button class="voice-card" data-voice="' + key + '"' +
            (st.voice === key ? ' data-on="1"' : '') + '>' +
            '<b>' + v.label + '</b>' +
            '<span class="voice-sub">' + v.who + '</span>' +
          '</button>';
        }).join('') +
      '</div>' +

      (variety.distinct < 2
        ? '<p class="sub" style="margin-top:12px">This computer has one English ' +
          'voice installed, so these differ by pitch rather than sounding like ' +
          'four people. Installing more system voices gives a bigger difference.</p>'
        : '') +

      /* Named speeds, not a bare slider. A slider gives a child a
         position on a track with no idea what it means, and no way
         to get back to the one that worked. */
      '<div class="srow" style="margin-top:14px"><label>Speaking speed</label>' +
        '<div class="seg">' +
          [['slow', 0.75, 'Slow'], ['normal', 0.95, 'Normal'], ['brisk', 1.15, 'Brisk']]
            .map(function (o) {
              var on = Math.abs((st.rate || 0.95) - o[1]) < 0.06;
              return '<button data-rate="' + o[1] + '" aria-pressed="' + on + '">' +
                     o[2] + '</button>';
            }).join('') +
        '</div>' +
        '<p class="srow-note">How fast Spark reads out loud. Slower is easier ' +
        'to follow along with; brisk sounds more natural once you can.</p></div>' +

      /* ── the calibration, as an activity ─────────────── */
      '<div class="calib" id="calib">' +
        '<div class="calib-head">' +
          '<h3>Let Spark learn your voice</h3>' +
          '<p>Then if someone else reads for you, Spark will notice — so what ' +
            'it learns stays about <b>you</b>.</p>' +
        '</div>' +

        '<div class="calib-stage" data-stage="intro">' +
          '<p class="calib-line">' + S.esc(line) + '</p>' +
          '<div class="toolbar" style="margin:0">' +
            '<button class="btn btn-primary" id="calibGo">' +
              '<span class="i" data-icon="mic" data-icon-size="18"></span> ' +
              'Read this out loud</button>' +
            '<button class="btn btn-sm" id="calibHear">' +
              '<span class="i" data-icon="speaker" data-icon-size="18"></span> ' +
              'Hear it first</button>' +
          '</div>' +
          (S.P.voicePrint
            ? '<p class="calib-known">Spark already knows your voice, from ' +
              S.esc(S.P.voicePrint.date) + '. Read it again to update.</p>'
            : '') +
        '</div>' +

        '<div class="calib-stage" data-stage="listening" hidden>' +
          '<p class="calib-line big">' + S.esc(line) + '</p>' +
          '<div class="calib-level"><i id="calibBar"></i></div>' +
          '<p class="calib-status" id="calibStatus">Go ahead — read it out loud.</p>' +
          '<button class="btn btn-sm" id="calibStop">Stop</button>' +
        '</div>' +

        '<div class="calib-stage" data-stage="done" hidden>' +
          '<div class="calib-done">' +
            '<span class="i" data-icon="check" data-icon-size="30"></span>' +
            '<div>' +
              '<b id="calibDoneTitle">That is your voice</b>' +
              '<p id="calibDoneText"></p>' +
            '</div>' +
          '</div>' +
          '<button class="btn btn-sm" id="calibAgain">Do it again</button>' +
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
            S.$$('[data-rate]').forEach(function (x) {
              x.setAttribute('aria-pressed', String(x === b));
            });
            S.say('This is how fast I will read.');   /* hear it at once */
          });
        });

        wireCalibration(line);

        S.$('#vBack').addEventListener('click', function () {
          stopCalibration();
          S.openSettings();
        });
      }
    );
  };

  /* ── the calibration activity ───────────────────────── */
  var calibTimer = null;

  function calibStage(name) {
    S.$$('.calib-stage').forEach(function (el) {
      el.hidden = el.dataset.stage !== name;
    });
  }

  function wireCalibration(line) {
    var go = S.$('#calibGo');
    if (!go) return;

    if (!S.voiceCheck.supported()) {
      S.$('#calib').innerHTML =
        '<div class="calib-head"><h3>Let Spark learn your voice</h3>' +
        '<p>This needs a microphone. Chrome or Edge, opened through ' +
        'start.bat, can do it.</p></div>';
      return;
    }

    S.$('#calibHear').addEventListener('click', function () { S.say(line); });
    S.$('#calibStop').addEventListener('click', stopCalibration);
    S.$('#calibAgain').addEventListener('click', function () { calibStage('intro'); });

    go.addEventListener('click', async function () {
      var wasOff = !S.P.settings.voiceCheck;
      if (wasOff) S.P.settings.voiceCheck = true;
      S.voiceCheck.relearn();
      var ok = await S.voiceCheck.start(function () {});
      if (wasOff) S.P.settings.voiceCheck = false;

      if (!ok) {
        S.$('#calibStatus').textContent =
          'I could not open the microphone. Allow it in the address bar?';
        calibStage('listening');
        return;
      }

      calibStage('listening');
      S.voiceCheck.watch(onCalibTick);

      /* a hard stop, so it cannot sit listening forever */
      clearTimeout(calibTimer);
      calibTimer = setTimeout(function () {
        var live = S.voiceCheck.live();
        if (!live.enrolled) {
          S.$('#calibStatus').textContent =
            'I did not hear enough. Try again, a bit louder?';
        }
      }, 25000);
    });
  }

  function onCalibTick(live) {
    var bar = S.$('#calibBar');
    var status = S.$('#calibStatus');
    if (!bar) return;

    if (!live.enrolled) {
      bar.style.width = Math.round(live.progress * 100) + '%';
      bar.dataset.state = 'learning';
      status.textContent = live.progress > 0.08
        ? 'I can hear you — keep going.'
        : 'Go ahead — read it out loud.';
      return;
    }

    /* enough voice captured: keep it and say so */
    bar.style.width = '100%';
    bar.dataset.state = 'done';

    S.P.voicePrint = { date: S.today(), hz: live.baselineHz };
    S.save();

    var hz = live.baselineHz;
    var band = hz > 250 ? 'a bright, high voice'
             : hz > 190 ? 'a fairly high voice'
             : hz > 150 ? 'a middle voice'
                        : 'a low voice';

    S.$('#calibDoneTitle').textContent = 'Got it — that is your voice';
    S.$('#calibDoneText').textContent =
      'Spark heard ' + band + '. If a different voice starts reading, it will ' +
      'say so, so your progress stays yours.';

    stopCalibration(true);
    calibStage('done');
  }

  function stopCalibration(keepStage) {
    clearTimeout(calibTimer);
    if (S.voiceCheck) { S.voiceCheck.unwatch(); S.voiceCheck.stop(); }
    if (!keepStage && S.$('#calibGo')) calibStage('intro');
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
            S.paintAIStatus();
            S.resetChat();
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
            S.save(); S.AI.refresh(); S.paintAIStatus();
            report('Cleared. Back to whatever js/config.js says.', true);
          });
        }

        S.$('#aiBack').addEventListener('click', S.openSettings);

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
      { icon: 'mic',     label: 'Voices and calibration',
        note: 'Pick a voice, let Spark learn yours',      go: S.openVoiceSettings },
      { icon: 'spark',   label: 'Thinking helper',
        note: 'The model behind Ask Spark',               go: S.openAISettings },
      { icon: 'trophy',  label: 'Your progress',
        note: 'What Spark has noticed so far',
        go: function () { S.go('progress'); } }
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
