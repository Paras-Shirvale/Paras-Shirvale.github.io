/* ============================================================
   ui.js — navigation, toasts, the sheet dialog, the word card,
   and the reading comfort settings that every page respects.
   ============================================================ */

(function (S) {
  'use strict';

  /* ── navigation ─────────────────────────────────────── */
  S.go = function (name) {
    S.$$('.view').forEach(function (v) { v.hidden = (v.id !== 'v-' + name); });
    var btnP = S.$('#btnProfile');
    if (btnP) btnP.dataset.on = name === 'profile' ? '1' : '';
    var tabFor = { world: 'home', read: 'home' }[name] || name;
    S.$$('.tab').forEach(function (t) {
      if (t.dataset.go === tabFor) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    });

    if (name !== 'read' && S.stopReading) S.stopReading();
    S.stopSaying();

    if (name === 'home')     S.paintHome && S.paintHome();
    if (name === 'read')     S.paintLibraryIfIdle && S.paintLibraryIfIdle();
    if (name === 'write')    S.paintWrite && S.paintWrite();
    if (name === 'profile')  S.paintProfile && S.paintProfile();
    if (name === 'world')    S.paintWorld && S.paintWorld();
    /* arriving at Progress always lands on the summary, not on the
       detail list somebody left open last time */
    if (name === 'progress') {
      S.closeReview && S.closeReview();
      S.paintProgress && S.paintProgress();
    }

    try { history.replaceState(null, '', '#' + name); } catch (e) {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── toast ──────────────────────────────────────────── */
  var toastTimer = null;
  /**
   * A brief message. Takes either plain text or an icon placeholder
   * followed by text — anything else is escaped, because toasts
   * sometimes carry words the child typed.
   */
  S.toast = function (msg) {
    var t = S.$('#toast');
    if (!t) return;

    var icon = String(msg).match(/^<span class="i" data-icon="([a-z]+)"[^>]*><\/span>\s*/);
    if (icon) {
      t.innerHTML = S.Pictures.icon(icon[1], 17);
      t.appendChild(document.createTextNode(' ' + String(msg).slice(icon[0].length)));
    } else {
      t.textContent = msg;
    }
    t.dataset.on = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.dataset.on = ''; }, 2800);
  };

  /* ── sheet dialog ───────────────────────────────────── */
  S.sheet = function (html, after) {
    S.$('#sheet').innerHTML = html;
    S.$('#scrim').dataset.open = '1';
    S.$$('[data-close]').forEach(function (b) {
      b.addEventListener('click', S.closeSheet);
    });
    if (after) after();
  };
  S.closeSheet = function () { S.$('#scrim').dataset.open = ''; };

  /* ── reading comfort ────────────────────────────────── */
  /**
   * Push the comfort settings into CSS variables on the root, so
   * every piece of text in the app follows them — not only the
   * passage. (The old version set inline styles on #prose, which is
   * why moving a slider from the Home page appeared to do nothing.)
   */
  /* ── reading comfort ────────────────────────────────────
     Three sizes rather than a slider. A slider invites fiddling and
     lands on arbitrary values; a child asked "which of these three
     can you read most easily" gives a better answer in less time.

     Each size carries its own spacing, set as a PROPORTION of the
     type size rather than a fixed number of pixels. That matters:
     letter spacing is the part of this with real evidence behind
     it (Zorzi et al., PNAS 2012 — around 20% faster reading and
     half the errors with extra spacing), and spacing only works if
     it grows with the text. A fixed 0.4px looks generous at 16px
     and does nothing at 27px.

     The proportions follow the British Dyslexia Association's
     style guide: letter spacing about 35% of average character
     width, word spacing at least 3.5x letter spacing, line height
     1.5 or more.                                                */
  var SIZES = {
    normal: { px: 18, label: 'Normal',  space: 0.045, word: 0.17, lead: 1.65, ui: 1.00 },
    large:  { px: 26, label: 'Large',   space: 0.060, word: 0.22, lead: 1.80, ui: 1.12 },
    huge:   { px: 36, label: 'Largest', space: 0.075, word: 0.28, lead: 1.95, ui: 1.25 }
  };
  S.SIZES = SIZES;

  function sizeSpec() {
    var st = S.P.settings;
    /* older profiles stored a pixel number from the slider */
    if (typeof st.size === 'number') {
      st.size = st.size >= 30 ? 'huge' : st.size >= 22 ? 'large' : 'normal';
    }
    return SIZES[st.size] || SIZES.normal;
  }

  /**
   * Push the comfort settings into CSS variables on the root, so
   * every piece of text in the app follows them — not only the
   * passage. (An earlier version set inline styles on #prose alone,
   * which is why moving a control from the Home page appeared to
   * do nothing.)
   */
  S.applySettings = function () {
    var st = S.P.settings;
    var spec = sizeSpec();
    var root = document.documentElement;
    var extra = st.extraSpacing ? 1.6 : 1;   /* the "wider letters" switch */

    root.style.setProperty('--read-size', spec.px + 'px');
    root.style.setProperty('--read-space', (spec.space * extra) + 'em');
    root.style.setProperty('--read-word', (spec.word * extra) + 'em');
    root.style.setProperty('--read-lead', String(spec.lead));
    root.style.setProperty('--ui-scale', String(spec.ui));

    root.setAttribute('data-font', st.font === 'plain' ? 'plain' : 'dyslexic');

    if (st.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', st.theme);

    /* The ruler is no longer a setting. It appears only while Spark
       is reading aloud, following the word being spoken — which is
       what a reading guide is actually for. */
  };

  /**
   * Put the reading band behind an element.
   * Used during read-along to mark the line being spoken; hidden
   * the rest of the time, so it never competes with the child's
   * own place on the page.
   */
  S.moveRuler = function (el) {
    var r = S.$('#ruler'), box = S.$('.passage');
    if (!r || !box) return;
    if (!el) { r.style.display = 'none'; return; }
    var b = el.getBoundingClientRect(), p = box.getBoundingClientRect();
    r.style.display = 'block';
    r.style.top    = (b.top - p.top - 4) + 'px';
    r.style.height = (b.height + 8) + 'px';
  };

  /* ── word card ──────────────────────────────────────── */
  var cardWord = '';
  var cardOpts = null;

  /**
   * Show help for a word. `focus` says which kind of help to lead
   * with — the cue engine decides that, not this function.
   *
   * opts.mode — when the help ladder opened it:
   *   prompt  just the word's shape, letters coloured: look closely
   *   cue     the full card (picture, sound, parts)
   *   choice  two words to pick from — the word and its letter twin
   *   supply  the word, said aloud
   * opts.onNotNow — shows "Not now"; called if the child taps it.
   */
  S.openWordCard = function (anchorEl, raw, focus, opts) {
    cardWord = raw;
    cardOpts = opts || null;
    var card  = S.$('#wordcard');
    card.dataset.mode = (opts && opts.mode) || 'tap';
    S.$('#wcNotNow').hidden = !(opts && opts.onNotNow);
    var choiceHost = S.$('#wcChoice');
    choiceHost.innerHTML = '';
    if (opts && opts.mode === 'choice' && opts.choices) {
      choiceHost.innerHTML = '<p class="wc-ask">Which word is it?</p><div class="wc-opts">' +
        opts.choices.map(function (c) {
          return '<button class="wc-opt" data-pick="' + S.esc(c) + '">' + S.esc(c) + '</button>';
        }).join('') + '</div>';
      S.$$('[data-pick]', choiceHost).forEach(function (b) {
        b.addEventListener('click', function () { if (opts.onPick) opts.onPick(b.dataset.pick); });
      });
    }
    var clean = S.norm(raw);
    var shown = String(raw).replace(/[^A-Za-z'-]/g, '');

    S.$('#wcWord').textContent = shown || raw;
    /* the coloured shape of the word, with flippable letters marked */
    var prompt = opts && opts.mode === 'prompt';
    S.$('#wcShape').innerHTML = (S.Pictures.hasFlippy(shown) || prompt)
      ? S.Pictures.wordVisual(shown) + '<span class="wc-shape-note">' +
        (prompt ? 'Look closely at each letter. Try the first sound.' : 'Look closely at the coloured letters.') + '</span>'
      : '';

    var ph = S.phonetic(raw);
    S.$('#wcPhon').textContent = ph ? 'say it: ' + ph : '';

    S.$('#wcSyls').innerHTML = S.syllables(shown)
      .map(function (s) { return '<span class="syl">' + S.esc(s) + '</span>'; }).join('');
    /* better parts may arrive from the AI helper — redraw them if so */
    S.partsFor(shown).then(function (parts) {
      if (S.norm(cardWord) !== clean || !parts.length) return;
      S.$('#wcSyls').innerHTML = parts.map(function (p) {
        return '<span class="syl">' + S.esc(p.text) + '</span>';
      }).join('');
    });

    var picEl = S.$('#wcPic');
    picEl.style.display = 'grid';
    S.Pictures.render(picEl, shown || raw).then(function (found) {
      /* no picture: the picture box already shows the word's shape,
         so don't show it twice */
      if (!found && S.norm(cardWord) === clean && !prompt) S.$('#wcShape').innerHTML = '';
    });

    S.$('#wcMean').textContent = '';
    S.$('#hovertip').style.display = 'none';

    position(card, anchorEl);
    card.dataset.open = '1';

    if (focus === 'sound') S.say(raw);
    if (focus === 'parts') S.sayInParts(raw);

    /* A model fills in the meaning and a better "how it sounds".
       The picture does not come from here — a drawn illustration or
       a pictogram is a far better clue than anything a text model
       can describe, and it has already been started above. */
    if (S.AI.ready && clean.length > 2) {
      S.AI.askJSON(
        'For the English word "' + clean + '", reply with only JSON:\n' +
        '{"meaning":string,"sounds":string}\n' +
        '"meaning": one short sentence a 10-year-old understands, under 12 words.\n' +
        '"sounds": the word written how it sounds, syllables split by hyphens.',
        { maxTokens: 140 }
      ).then(function (d) {
        if (card.dataset.open !== '1' || S.norm(cardWord) !== clean) return;
        if (d.meaning) S.$('#wcMean').textContent = d.meaning;
        if (d.sounds)  S.$('#wcPhon').textContent = 'say it: ' + d.sounds;
      }).catch(function () { /* the card still has syllables and a picture */ });
    }
  };

  function position(card, anchor) {
    /* measure off-screen so the first open isn't mispositioned */
    card.style.visibility = 'hidden';
    card.dataset.open = '1';
    var cw = card.offsetWidth || 280, ch = card.offsetHeight || 300;
    card.dataset.open = '';
    card.style.visibility = '';

    var x, y;
    if (anchor) {
      var b = anchor.getBoundingClientRect();
      x = S.clamp(b.left + b.width / 2 - cw / 2, 12, window.innerWidth - cw - 12);
      y = b.bottom + 10;
      if (y + ch > window.innerHeight - 12) y = Math.max(12, b.top - ch - 10);
    } else {
      x = (window.innerWidth - cw) / 2;
      y = Math.max(12, (window.innerHeight - ch) / 2);
    }
    card.style.left = x + 'px';
    card.style.top  = y + 'px';
  }

  S.closeWordCard = function () {
    var c = S.$('#wordcard');
    if (c) c.dataset.open = '';
    cardOpts = null;
  };

  /* "Not now", or the ✕ on a card the help ladder opened: a dismissal */
  function notNow() {
    var o = cardOpts;
    S.closeWordCard();
    if (o && o.onNotNow) o.onNotNow();
  }

  /* ── wiring that belongs to the shell ───────────────── */
  S.wireShell = function () {
    S.$('#wcClose').addEventListener('click', notNow);
    S.$('#wcNotNow').addEventListener('click', notNow);

    S.$('#wcSay').addEventListener('click', function () {
      S.say(cardWord);
      S.useCue('sound');
    });
    S.$('#wcSlow').addEventListener('click', function () {
      S.sayInParts(cardWord);
      S.useCue('parts');
    });

    S.$('#scrim').addEventListener('click', function (e) {
      if (e.target.id === 'scrim') S.closeSheet();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      S.closeWordCard();
      S.closeSheet();
      var chat = S.$('#chat');
      if (chat.dataset.open === '1') chat.dataset.open = '';
    });

    /* one delegated click handler for the whole app */
    document.addEventListener('click', function (e) {
      var goBtn = e.target.closest('[data-go]');
      if (goBtn) {
        e.preventDefault();
        /* the Practice tab always opens on its list */
        if (goBtn.classList.contains('tab') && goBtn.dataset.go === 'write' && S.closeWriteActivity) S.resetWriteMode();
        S.go(goBtn.dataset.go);
        return;
      }

      var word = e.target.closest('.w');
      if (word) {
        S.$('#hovertip').style.display = 'none';
        S.noteWord(word.textContent, 'seen');
        S.save();
        S.openWordCard(word, word.textContent, S.favourite() || 'picture');
        return;
      }

      if (!e.target.closest('#wordcard')) S.closeWordCard();

      var sayBtn = e.target.closest('[data-say]');
      if (sayBtn) S.say(sayBtn.dataset.say);
    });

    /* Hovering a word previews where it breaks, and shows a picture
       for it when there is one. It follows the pointer properly:
       the moment the pointer is not over a word, the tip goes. */
    var hoverTimer = null;
    var hoverWord = null;

    function hideTip() {
      clearTimeout(hoverTimer);
      hoverWord = null;
      var tip = S.$('#hovertip');
      if (tip) { tip.style.display = 'none'; tip.innerHTML = ''; }
    }
    S.hideHoverTip = hideTip;

    document.addEventListener('pointerover', function (e) {
      var w = e.target.closest ? e.target.closest('.w') : null;
      if (!w) { if (hoverWord) hideTip(); return; }
      if (w === hoverWord) return;

      clearTimeout(hoverTimer);
      hoverWord = w;

      hoverTimer = setTimeout(function () {
        if (hoverWord !== w || !document.contains(w)) return;

        var shown = w.textContent.replace(/[^A-Za-z'-]/g, '');
        if (shown.length < 2) return;

        var parts = S.syllables(shown);
        /* only what can be drawn immediately — waiting on a fetch
           inside a hover reads as the app being broken */
        var picture = S.Pictures.instant(shown, 40);
        var phon = S.phonetic(shown);

        /* The tip always has something in it. Bailing out on short
           words — the old behaviour — meant hovering "cat" did
           nothing at all, which a child reads as the feature being
           broken rather than as the word being easy. Every word can
           at least be heard. */
        var bits = [];
        /* There is ALWAYS a visual. A picture where one exists or
           is on its way; otherwise the coloured shape of the word. */
        var lookable = !picture && !S.Pictures.SKIP[S.norm(shown)] &&
                       S.P.settings.pictures !== 'off';
        bits.push({ cue: 'picture',
          html: '<span class="tip-pic" data-tippic>' +
                (picture || (lookable ? '<span class="pic-wait sm"></span>' : '')) +
                '</span>' });
        bits.push({ cue: 'shape',
          html: '<span class="tip-shape">' + S.Pictures.wordVisual(shown, { small: true }) + '</span>' });
        if (parts.length === 1 && phon) bits.push({ cue: 'parts',
          html: '<span class="tip-parts">' + S.esc(phon) + '</span>' });
        bits.push({ cue: 'sound',
          html: '<button class="tip-say" data-hearword="' + S.esc(shown) + '" ' +
                'aria-label="Hear it">' + S.Pictures.icon('speaker', 17) + '</button>' });

        /* Whichever kind of help has been working for this child goes
           first, where the eye lands. This is the adaptive part, and
           it stays silent: no badge, no "recommended", just order. */
        var fav = S.favourite();
        bits.sort(function (a, b) {
          return (b.cue === fav ? 1 : 0) - (a.cue === fav ? 1 : 0);
        });

        var tip = S.$('#hovertip');
        tip.innerHTML = bits.map(function (x) { return x.html; }).join('');
        tip.style.display = 'flex';

        /* Fetch the picture now and drop it in if the pointer is
           still on the same word when it arrives. */
        var slot = tip.querySelector('[data-tippic]');
        if (!picture && !lookable && slot) slot.remove();
        if (lookable) {
          S.Pictures.lookup(shown).then(function (hit) {
            var slotNow = tip.querySelector('[data-tippic]');
            if (hoverWord !== w || !slotNow) return;
            if (hit && hit.url) {
              slotNow.innerHTML = S.Pictures.instant(shown, 40) || '';
            } else {
              slotNow.remove();
            }
          });
        }

        var b = w.getBoundingClientRect();
        tip.style.left = S.clamp(b.left + b.width / 2 - tip.offsetWidth / 2,
                                 8, window.innerWidth - tip.offsetWidth - 8) + 'px';
        var above = b.top - tip.offsetHeight - 9;
        tip.style.top = (above > 8 ? above : b.bottom + 9) + 'px';
      }, 260);
    });

    /* Leaving a word, leaving the window, scrolling, or tapping
       anywhere all dismiss it — the tip must never be left behind. */
    document.addEventListener('pointerout', function (e) {
      var to = e.relatedTarget;
      if (to && to.closest && to.closest('.w') === hoverWord && hoverWord) return;
      /* moving INTO the tip must not dismiss it, or the Hear-it
         button could never be reached */
      if (to && to.closest && to.closest('#hovertip')) return;
      hideTip();
    });

    /* Hear it, straight from the tip. This also tells the cue engine
       that sound is what this child reaches for. */
    document.addEventListener('click', function (e) {
      var hear = e.target.closest ? e.target.closest('[data-hearword]') : null;
      if (!hear) return;
      e.preventDefault();
      e.stopPropagation();
      S.say(hear.dataset.hearword);
      S.useCue('sound');
    }, true);

    document.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('#hovertip')) return;
      hideTip();
    });
    window.addEventListener('scroll', hideTip, true);
    window.addEventListener('blur', hideTip);

    /* microphone buttons that dictate into a field */
    S.$$('[data-micfor]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        S.dictateInto(S.$('#' + btn.dataset.micfor), btn);
      });
    });
  };

  /* ── dictation into a text field ────────────────────── */
  var activeDictation = null, activeBtn = null;

  S.dictateInto = function (input, btn, onFinish) {
    if (activeDictation) {
      activeDictation.stop();
      return;
    }
    var handle = S.listenOnce(
      function (text) {
        input.value = text;
        input.dispatchEvent(new Event('input'));
      },
      function (finalText) {
        btn.dataset.on = '';
        activeDictation = null; activeBtn = null;
        if (finalText && onFinish) onFinish(finalText);
      },
      function (problem) {
        btn.dataset.on = '';
        activeDictation = null; activeBtn = null;
        S.toast(problem);
      }
    );
    if (handle) { activeDictation = handle; activeBtn = btn; btn.dataset.on = '1'; }
  };

})(window.Spark);
