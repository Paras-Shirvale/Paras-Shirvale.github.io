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
        'Using: ' + S.esc(S.voiceName(st.voice || 'woman') || 'this computer\'s voice') +
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

        S.$('#vBack').addEventListener('click', function () { S.openMenu(); });
      }
    );
  };

  function voiceAvatar(key) {
    return { woman: 'owl', man: 'bear', girl: 'bunny', boy: 'fox', story: 'cat', chief: 'panda' }[key] || 'owl';
  }

  /* ── reset ──────────────────────────────────────────── */
  S.confirmReset = confirmReset;
  function confirmReset() {
    S.sheet(
      '<h2>Start over?</h2>' +
      '<p class="sub">This clears <b>' + S.esc(S.P.name || 'your') + (S.P.name ? '\'s' : '') + '</b> worlds, badges and streak, ' +
      'and everything Spark has kept about ' + (S.P.name ? 'them' : 'you') + ' for the teacher. ' +
      'Nobody else\'s are touched. You will pick a name and age again. It cannot be undone.</p>' +
      '<div class="toolbar" style="margin:0">' +
        '<button class="btn btn-rose" id="rYes">Yes, start over</button>' +
        '<button class="btn" data-close>Keep it</button>' +
      '</div>',
      function () {
        S.$('#rYes').addEventListener('click', async function () {
          var b = S.$('#rYes');
          b.disabled = true; b.textContent = 'Clearing…';
          var id = S.P.childId;
          S.DB.wipeLocal();                 /* this device's copy, at once */
          await S.DB.resetRemote(id);       /* the shared copy: only this child_id */
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
  /* Light / Dark / Auto, in the menu and on the profile page, not only
     down inside Reading settings. */
  S.themeControl = function () {
    var cur = S.P.settings.theme || 'light';
    return '<div class="srow theme-row"><label>Page colours</label><div class="seg" data-theme-seg>' +
      [['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']].map(function (t) {
        return '<button type="button" data-theme-quick="' + t[0] + '" aria-pressed="' + (cur === t[0]) + '">' + t[1] + '</button>';
      }).join('') + '</div><p class="srow-note">Auto follows your device.</p></div>';
  };
  S.wireThemeControl = function (root) {
    S.$$('[data-theme-quick]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        S.P.settings.theme = b.dataset.themeQuick;
        S.save(); S.applySettings();
        S.$$('[data-theme-quick]', root).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        if (S.paintScene) S.paintScene();
      });
    });
  };

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
      { icon: 'pencil',  label: 'Try it out',
        note: 'Practise reading and writing. Nothing you do there counts.',
        go: function () { if (S.practiceMode) S.endPractice(); else S.startPractice(); } },
      { icon: 'spark',   label: 'Show me around',
        note: 'The guided tour of where everything is', go: function () { S.startTour(); } },
    ];
    /* A student's menu has nothing about teachers. A teacher's has the
       Students page and a way out. */
    if (S.teacherMode) {
      items.push({ icon: 'home', label: 'Students',
        note: "Every student's results, from any device",
        go: function () { location.href = 'teacher.html'; } });
      items.push({ icon: 'lock', label: 'Sign out',
        note: 'Back to the login page',
        go: function () { try { sessionStorage.clear(); } catch (e) {} location.href = 'login.html'; } });
    } else {
      items.push({ icon: 'lock', label: 'Switch user',
        note: 'Go back to the login page',
        go: function () { try { sessionStorage.removeItem('spark.role'); } catch (e) {} location.href = 'login.html?switch=1'; } });
    }

    S.sheet(
      '<h2>Menu</h2>' +
      S.themeControl() +
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
      (S.teacherMode ? '' : '<button class="btn btn-sm" id="menuReset" style="margin-top:14px">Start over</button>'),
      function () {
        S.$$('[data-menu]').forEach(function (b) {
          b.addEventListener('click', function () {
            var it = items[Number(b.dataset.menu)];
            S.closeSheet();
            if (it && it.go) setTimeout(it.go, 120);
          });
        });
        S.wireThemeControl(S.$('#sheet'));
        var reset = S.$('#menuReset');
        if (reset) reset.addEventListener('click', S.confirmReset);
      }
    );
  };

  S.wireSettings = function () {
    S.$('#btnMenu').addEventListener('click', S.openMenu);
  };

})(window.Spark);
