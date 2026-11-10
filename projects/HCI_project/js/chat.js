/* ============================================================
   chat.js — Ask Spark.

   With an AI helper configured this is a real conversation: it
   knows which passage is open, which words this child keeps
   pausing on, and which kind of help works for them, and it keeps
   the thread of what has been said.

   With no helper it still answers usefully — it reads the question,
   works out what is being asked, and does something about it
   (says the word, breaks it up, simplifies the sentence) rather
   than returning a random encouraging line.
   ============================================================ */

(function (S) {
  'use strict';

  var turns = [];        /* the conversation so far, for context */
  var busy = false;
  var controller = null;

  /* ── the standing instructions ──────────────────────── */
  function instructions() {
    var R = S.currentReading();
    var WS = S.currentWorksheet && S.currentWorksheet();
    var tricky = S.allTricky().slice(0, 8).map(function (w) { return w.word; });
    var fav = S.favourite();

    return [
      'You are Spark, a warm, patient reading buddy inside a learning app.',
      'You are talking with a child aged 9-14 who has dyslexia' +
        (S.P.name ? ', called ' + S.P.name : '') + '.',
      '',
      'HAVE A REAL CONVERSATION.',
      'Talk the way a kind person sitting next to them would. Answer what they',
      'actually asked, follow what they say, and let the conversation wander',
      'where they take it — their pet, their day, a film, a question about the',
      'world. You do not have to steer everything back to reading.',
      'Ask a short question back when it keeps things going naturally.',
      '',
      'How you sound:',
      '- Usually one to three short sentences. Simple everyday words.',
      '- Warm and relaxed. Never babyish, never a lecture, never a checklist.',
      '- Do not open with praise like "Great question!". Just answer.',
      '- Do not repeat their question back to them before answering.',
      '- You are Spark. Never say you are an AI, a model or a program.',
      '',
      'When it is about reading:',
      '- Asked what a word means: say it plainly, then one tiny everyday example.',
      '- Stuck on a word: break it into its sound chunks and say them.',
      '- Asked what a sentence means: put it in simpler words.',
      '- They can tap any word in the text to hear it, see its parts and get a',
      '  picture. Mention that only when it is genuinely the quickest help.',
      '- If they ask to SEE something, the app shows them a real picture — so',
      '  just talk about it, do not describe a picture they can already see.',
      '',
      'Never suggest their reading trouble means they are not clever. Dyslexia is',
      'about how the brain handles the sounds inside words, nothing else. Do not',
      'raise it unprompted; if they bring it up, be matter-of-fact and kind.',
      '',
      'If something is unsafe or upsetting, or they seem to need a grown-up,',
      'say so gently and suggest someone they trust.',
      '',
      '--- what is on their screen right now ---',
      WS ? 'Doing their homework worksheet "' + WS.name + '":\n' + WS.text.slice(0, 2000) +
           '\nHelp them understand the questions and work out answers themselves. ' +
           'Explain and give hints; do not just hand over the answers.'
      : R ? 'Reading "' + R.src.title + '":\n' + R.src.text.slice(0, 1200)
        : 'They are browsing the app, not reading anything yet.',
      tricky.length ? 'Words they have paused on before: ' + tricky.join(', ') + '.' : '',
      fav ? 'The kind of help that works best for them: ' + labelOf(fav) + '.' : ''
    ].filter(Boolean).join('\n');
  }

  function labelOf(cue) {
    return { picture: 'pictures', sound: 'hearing words out loud', parts: 'breaking words into parts' }[cue] || cue;
  }

  /* ── opening and closing ────────────────────────────── */
  S.openChat = function (context) {
    S.$('#chat').dataset.open = '1';
    if (context) S.$('#chatCtx').textContent = context;
    else S.paintAIStatus();

    if (!S.$('#chatBody').children.length) {
      if (S.AI.ready) {
        addBubble('Hi' + (S.P.name ? ' ' + S.P.name : '') + '. I\'m Spark.', 's');
        showWhatFor();
      } else {
        showNotConnected();
      }
    }
    paintChips();
    setTimeout(function () { S.$('#chatIn').focus(); }, 60);
  };

  /* What this is for. A child handed a blank chat box does not know
     what to type, and "ask me anything" is not an answer. These are
     the three things Spark is genuinely better at than the rest of
     the app — understanding a word, unpicking a sentence, and
     showing what something looks like. */
  function showWhatFor() {
    var body = S.$('#chatBody');
    var card = document.createElement('div');
    card.className = 'chat-uses';
    card.innerHTML =
      '<b>Things I\'m good at</b>' +
      '<ul>' +
        '<li>What a word means, in plain words</li>' +
        '<li>Saying a tricky sentence a simpler way</li>' +
        '<li>Showing you a picture of something</li>' +
      '</ul>' +
      '<span>Or just talk to me. I don\'t mind what about.</span>';
    body.appendChild(card);
  }

  /* Not connected is a setup problem, not a conversation. Saying so
     plainly beats answering out of a lookup table and leaving the
     child wondering why Spark has gone strange. */
  function showNotConnected() {
    var body = S.$('#chatBody');
    var card = document.createElement('div');
    card.className = 'chat-setup';
    card.innerHTML =
      '<b>My thinking helper is resting</b>' +
      '<p>I can\'t have a full chat right now, but I can still read words to you, ' +
      'break them into parts and show you pictures — tap any word on the page.</p>';
    body.appendChild(card);
  }

  S.closeChat = function () {
    if (controller) { try { controller.abort(); } catch (e) {} }
    S.$('#chat').dataset.open = '';
  };

  /** Clear the thread — used after connecting, so the "I can't chat
      yet" card does not sit there once Spark can. */
  S.resetChat = function () {
    turns = [];
    var body = S.$('#chatBody');
    if (body) body.innerHTML = '';
    S.paintAIStatus();
  };

  S.paintAIStatus = function () {
    var el = S.$('#chatCtx');
    if (!el) return;
    el.textContent = S.AI.ready
      ? 'ask me anything about your reading'
      : 'offline — I can still read and break up words';
  };

  /* ── suggestions ────────────────────────────────────────
     Only ever about the word in front of them right now. No stock
     questions: a child did not wonder "why is reading hard for me"
     — the app put the thought there, and seeing it on the screen is
     not a kind thing to do to them. When there is nothing specific
     to suggest, suggest nothing. */
  function paintChips() {
    var R = S.currentReading();
    var ideas = [];

    if (R && S.AI.ready) {
      var t = R.tokens[R.idx];
      if (t && t.clean) {
        var w = t.raw.replace(/[^A-Za-z'-]/g, '');
        ideas.push('What does "' + w + '" mean?');
        ideas.push('Show me a picture of "' + w + '"');
      }
      ideas.push('Say that sentence more simply');
    }

    S.$('#chatChips').innerHTML = ideas.slice(0, 3).map(function (x) {
      return '<button class="chip">' + S.esc(x) + '</button>';
    }).join('');

    S.$$('#chatChips .chip').forEach(function (b) {
      b.addEventListener('click', function () {
        S.$('#chatIn').value = b.textContent;
        send();
      });
    });
  }

  /**
   * Did they ask to SEE something? Returns the word, or null.
   * Tried most specific first, because "show me a picture of a cat"
   * contains three different phrasings layered on top of each other.
   */
  function pictureRequest(text) {
    var t = String(text).toLowerCase().replace(/[^a-z\s'-]/g, ' ');
    var article = '(?:a|an|the|some)\\s+';
    var noun = "([a-z][a-z'-]{1,20})";

    var patterns = [
      /* "a picture of a cat", "show me an image of the sea" */
      new RegExp('(?:picture|photo|image|drawing|pic)\\s+of\\s+(?:' + article + ')?' + noun),
      /* "what does a lighthouse look like" */
      new RegExp('what\\s+(?:does|do)\\s+(?:' + article + ')?' + noun + '\\s+look\\s+like'),
      /* "show me a lighthouse", "can i see the sofa" */
      new RegExp('(?:show\\s+me|let\\s+me\\s+see|can\\s+i\\s+see|i\\s+want\\s+to\\s+see)\\s+(?:' +
                 article + ')?' + noun),
      /* bare "picture of condenses" */
      new RegExp('^(?:picture|photo|image)\\s+(?:' + article + ')?' + noun)
    ];

    /* words that are part of the request, never the thing wanted */
    var filler = {
      picture: 1, photo: 1, image: 1, drawing: 1, pic: 1, one: 1, it: 1,
      that: 1, this: 1, me: 1, look: 1, like: 1, of: 1, what: 1, show: 1,
      see: 1, please: 1, word: 1, something: 1, anything: 1
    };

    for (var i = 0; i < patterns.length; i++) {
      var m = t.match(patterns[i]);
      if (m && m[1] && !filler[m[1]]) return m[1];
    }
    return null;
  }

  /** Put a real picture in the thread. */
  function showPicture(word) {
    var body = S.$('#chatBody');
    var holder = document.createElement('div');
    holder.className = 'bub s chat-pic';
    holder.innerHTML = '<div class="chat-pic-slot"></div>' +
                       '<span class="chat-pic-word">' + S.esc(word) + '</span>';
    body.appendChild(holder);
    scrollDown();

    S.Pictures.render(holder.querySelector('.chat-pic-slot'), word, { noShape: true })
      .then(function (found) {
        if (!found) holder.querySelector('.chat-pic-word').textContent =
          'I couldn\'t find a picture for "' + word + '".';
        else S.useCue('picture');
        scrollDown();
      });
  }

  function addBubble(text, who) {
    var d = document.createElement('div');
    d.className = 'bub ' + who;
    var body = S.$('#chatBody');
    body.appendChild(d);
    if (who === 's' && text) finishBubble(d, text);
    else d.textContent = text;
    body.scrollTop = body.scrollHeight;
    return d;
  }

  /* Every answer from Spark can be heard. A child who finds reading
     hard should not have to read the reply to their own question —
     so each finished reply gets a button that reads it out loud. */
  function finishBubble(bubble, text) {
    bubble.textContent = '';
    var words = document.createElement('span');
    words.className = 'bub-text';
    words.textContent = text;
    bubble.appendChild(words);

    var hear = document.createElement('button');
    hear.className = 'bub-say';
    hear.type = 'button';
    hear.setAttribute('aria-label', 'Read this out loud');
    hear.innerHTML = S.Pictures.icon('speaker', 16) + '<span>Read it to me</span>';
    hear.addEventListener('click', function (e) {
      e.stopPropagation();
      if (hear.dataset.on === '1') { S.stopSaying(); hear.dataset.on = ''; return; }
      S.$$('.bub-say[data-on="1"]').forEach(function (b) { b.dataset.on = ''; });
      hear.dataset.on = '1';
      S.say(text, { onEnd: function () { hear.dataset.on = ''; } });
    });
    bubble.appendChild(hear);
  }

  /* ── sending ────────────────────────────────────────── */
  async function send() {
    var input = S.$('#chatIn');
    var message = input.value.trim();
    if (!message || busy) return;

    input.value = '';
    addBubble(message, 'u');
    turns.push({ role: 'user', content: message });
    if (turns.length > 12) turns = turns.slice(-12);
    paintChips();

    /* "show me a picture of X" is something the app can actually do,
       so do it — a described picture is no use to a child who asked
       to see one. The model still talks about it alongside. */
    var wanted = pictureRequest(message);
    if (wanted) showPicture(wanted);

    if (!S.AI.ready) {
      if (!wanted) addBubble(offlineAnswer(message), 's');
      return;
    }

    busy = true;
    setSending(true);

    var bubble = addBubble('', 's');
    bubble.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    controller = new AbortController();

    var started = false;
    try {
      var messages = [{ role: 'user', content: instructions() }].concat(turns);
      var text = await S.AI.ask(messages, {
        signal: controller.signal,
        cache: false,
        maxTokens: 400,
        onText: function (partial) {
          started = true;
          bubble.textContent = partial;
          scrollDown();
        }
      });
      finishBubble(bubble, text);
      turns.push({ role: 'assistant', content: text });
      /* keep the thread from growing without limit, but never drop
         the instructions — those are rebuilt fresh every call */
      if (turns.length > 14) turns = turns.slice(-14);
    } catch (e) {
      var friendly = S.AI.friendly(e);
      if (!friendly && !started) { bubble.remove(); }
      else if (started) {
        finishBubble(bubble, bubble.textContent);
      } else {
        finishBubble(bubble, friendly + '\n\n' + offlineAnswer(message));
      }
    }

    busy = false;
    setSending(false);
    scrollDown();
    paintChips();
  }

  function setSending(on) {
    var send = S.$('#chatSend');
    send.innerHTML = on ? '<span class="i" data-icon="stop" data-icon-size="18"></span>' : '<span class="i" data-icon="send" data-icon-size="18"></span>';
    send.setAttribute('aria-label', on ? 'Stop' : 'Send');
    S.$('#chatIn').disabled = false;
  }

  function scrollDown() {
    var body = S.$('#chatBody');
    body.scrollTop = body.scrollHeight;
  }

  /* ── answering without a helper ─────────────────────── */
  /* Not canned lines: it reads the question, works out the intent,
     and takes an action (speaks the word, splits it, simplifies). */
  function offlineAnswer(question) {
    var q = question.toLowerCase();

    var m = q.match(/what (?:does|is) ["']?([a-z'-]{3,})["']? (?:mean|means)/) ||
            q.match(/mean(?:ing)? of ["']?([a-z'-]{3,})["']?/) ||
            q.match(/help me with ["']?([a-z'-]{3,})["']?/) ||
            q.match(/how do (?:i|you) (?:say|read) ["']?([a-z'-]{3,})["']?/);
    if (m) {
      var word = m[1];
      S.sayInParts(word);
      var pic = S.Pictures.hasDrawn(word);
      return 'Let\'s take "' + word + '" apart: ' + S.syllables(word).join(' · ') +
        '. I\'ve said each piece out loud for you.' +
        (pic ? ' Tap the word in the text and I will show you a picture of it.'
               : ' Tap the word in the text for more help.');
    }

    if (/simpl|again|another way|what does that sentence/.test(q)) {
      var R = S.currentReading();
      if (R) {
        var t = R.tokens[R.idx] || R.tokens[0];
        var s = R.sentences[t ? t.si : 0];
        var plain = String(s).replace(/,[^,]*,/g, ' ').replace(/\s+/g, ' ').trim();
        S.say(plain);
        return plain;
      }
      return 'Open a reading first and I\'ll put any sentence in simpler words.';
    }

    if (/long word|big word|tip|trick|how do i read/.test(q)) {
      return 'For a long word, find the vowels first — a, e, i, o, u. ' +
        'Each vowel sound usually starts a new chunk. Read the chunks slowly, ' +
        'then push them together.';
    }

    if (/dyslexi|why.*hard|why.*me|am i (?:stupid|dumb|slow)/.test(q)) {
      return 'Dyslexia means your brain does something different with the sounds inside words. ' +
        'It has nothing to do with how clever you are — plenty of brilliant people have it. ' +
        'It just means reading needs different tools, and that\'s what I\'m for.';
    }

    if (/stuck|hard|can.?t|difficult|slow/.test(q)) {
      return 'That\'s alright — hard words slow everyone down. ' +
        'Try covering the word and uncovering one part at a time. ' +
        'Tap it and I\'ll say the parts for you.';
    }

    return 'I can\'t think that one through right now, but I can still help: ' +
      'tap any word to see its parts, hear it, and get a picture. ' +
      'Or ask me what a word means.';
  }

  /* ── wiring ─────────────────────────────────────────── */
  S.wireChat = function () {
    S.$('#fab').addEventListener('click', function () { S.openChat(); });
    S.$('#chatClose').addEventListener('click', S.closeChat);
    S.$('#chatSend').addEventListener('click', function () {
      if (busy) { if (controller) { try { controller.abort(); } catch (e) {} } return; }
      send();
    });
    S.$('#chatIn').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') send();
    });
    S.$('#chatMic').addEventListener('click', function () {
      S.dictateInto(S.$('#chatIn'), S.$('#chatMic'), send);
    });
    S.paintAIStatus();
  };

})(window.Spark);
