/* ============================================================
   questions.js - the three questions for each picture story.

   Before, every picture asked the same three things ("Who or what?
   Doing? Where?") and a child could answer "cat", "sofa", "window",
   none of which is what the question was looking for. Now each
   picture has three SPECIFIC questions about THAT picture, each with
   one short answer and a frame that turns the answer into a sentence:

        What colour is the cat?        The cat is {orange}.
        What is the cat doing?         The cat is {sleeping}.
        Where is the cat?              The cat is {on the sofa}.

   Where they come from:
     1. The language model (Llama 3.3 70B through the Worker) writes
        them for the picture. It is given the FACTS that are true of
        the picture (written by hand in content.js) and is told to use
        only those, so it cannot invent a colour that is not there.
        The result is kept in this browser, so it is asked once.
     2. A hand-written set for every picture, used straight away and
        whenever the model is not connected.

   A question looks like:
     { q, frame, ladder: { prompt, cue: { visual, audio }, choices[3], answer } }
   and the ladder is the same four-step help as before: think, a
   clue, pick one, here it is.
   ============================================================ */

(function (S) {
  'use strict';

  function Q(q, frame, answer, choices, prompt, visual, audio, accept) {
    return { q: q, frame: frame, accept: accept || [], ladder: {
      prompt: prompt, cue: { visual: visual, audio: audio }, choices: choices, answer: answer } };
  }

  /* index = the picture in S.PROMPTS */
  var FALLBACK = [
    [ Q('What colour is the cat?', 'The cat is {}.', 'orange', ['orange', 'green', 'purple'],
        'Look at the cat\'s fur. What colour is it?', 'cat', 'The cat\'s fur is orange.', ['ginger', 'orangey']),
      Q('What is the cat doing?', 'The cat is {}.', 'sleeping', ['sleeping', 'running', 'eating'],
        'Are its eyes open or shut?', 'catnap', 'Its eyes are shut. The cat is sleeping.', ['asleep', 'napping', 'having a nap', 'resting', 'sleep', 'snoozing']),
      Q('Where is the cat?', 'The cat is {}.', 'on the sofa', ['on the sofa', 'in a tree', 'in the sea'],
        'What is the cat lying on?', 'sofa', 'Look under the cat. It is on the sofa.', ['sofa', 'couch', 'on a sofa', 'on the couch', 'on the blue sofa', 'on a couch']) ],

    [ Q('What is the weather like?', 'The weather is {}.', 'stormy', ['stormy', 'sunny', 'snowy'],
        'Look at the sky. Is it calm or wild?', 'storm', 'There is a storm. The weather is stormy.', ['rainy', 'windy', 'wild', 'cloudy', 'rain', 'storm', 'a storm', 'wet']),
      Q('What is the boat doing?', 'The boat is {}.', 'sailing', ['sailing', 'flying', 'driving'],
        'Is the boat on the sea or on the road?', 'boat', 'The boat is on the sea. It is sailing.', ['floating', 'sail', 'travelling', 'moving', 'going home']),
      Q('What is the tall tower by the sea?', 'The tall tower is a {}.', 'lighthouse', ['lighthouse', 'castle', 'tree'],
        'It has a light on top to help boats at night.', 'lighthouse', 'It is a lighthouse.', ['light house', 'a lighthouse', 'light']) ],

    [ Q('What colour is the rocket?', 'The rocket is {}.', 'white', ['white', 'pink', 'brown'],
        'Look at the big rocket. What colour is its body?', 'rocket', 'The rocket is white.', ['pale', 'grey', 'silver']),
      Q('What is the rocket doing?', 'The rocket is {}.', 'going up', ['going up', 'going down', 'sleeping'],
        'Fire comes out of the bottom. Which way does it go?', 'rocket', 'Fire is coming out of the bottom. It is going up.', ['flying', 'blasting off', 'lifting off', 'taking off', 'rising', 'up', 'launching', 'going into the sky']),
      Q('Where is the rocket going?', 'The rocket is going to {}.', 'space', ['space', 'school', 'the sea'],
        'What can you see in the sky around it?', 'star', 'There are stars and the moon. It is going to space.', ['sky', 'the sky', 'the stars', 'stars', 'the moon', 'moon', 'up', 'outer space']) ],

    [ Q('What colour is the flower?', 'The flower is {}.', 'pink', ['pink', 'black', 'blue'],
        'Look at the flower\'s petals. What colour are they?', 'flower', 'The flower is pink.', ['rose', 'light pink', 'dark pink']),
      Q('What is the bee doing?', 'The bee is {}.', 'landing', ['landing', 'swimming', 'sleeping'],
        'Is the bee going to the flower or away from it?', 'bee', 'The bee is landing on the flower.', ['flying', 'sitting', 'resting', 'arriving', 'coming down', 'going down']),
      Q('What is shining in the sky?', 'The {} is shining.', 'sun', ['sun', 'moon', 'rocket'],
        'It is a sunny day. What gives us light and heat?', 'sun', 'The sun is shining.', ['sunshine', 'the sun', 'sunlight']) ],

    [ Q('What colour is the grass?', 'The grass is {}.', 'green', ['green', 'red', 'yellow'],
        'Look at the pitch. What colour is the grass?', 'pitch', 'The grass is green.', ['dark green', 'light green']),
      Q('What is the ball doing?', 'The ball is {}.', 'flying', ['flying', 'sleeping', 'melting'],
        'Has someone kicked it? Is it still or moving?', 'ball', 'Someone kicked it. The ball is flying.', ['moving', 'kicked', 'going', 'bouncing', 'rolling', 'in the air', 'going fast']),
      Q('Where is the ball going?', 'The ball is going {}.', 'into the goal', ['into the goal', 'into the sea', 'up a tree'],
        'What are the players trying to kick it into?', 'goal', 'The ball is going into the goal.', ['goal', 'the goal', 'in the goal', 'the net', 'net', 'to the goal']) ],

    [ Q('What colour is the snow?', 'The snow is {}.', 'white', ['white', 'orange', 'green'],
        'Look at the ground. What colour is the snow?', 'snow', 'The snow is white.', ['pale', 'light', 'whitish']),
      Q('What is the bird doing?', 'The bird is {}.', 'hopping', ['hopping', 'swimming', 'driving'],
        'Is the bird flying, or on the ground?', 'bird', 'The bird is on the ground. It is hopping.', ['jumping', 'walking', 'playing', 'standing', 'moving']),
      Q('Where is the bird?', 'The bird is {}.', 'in the snow', ['in the snow', 'in a boat', 'on a sofa'],
        'What is the bird standing in?', 'snowflakes', 'The bird is in the snow.', ['snow', 'on the snow', 'on the ground', 'outside', 'in the cold', 'on snow']) ]
  ];

  function fallback(idx) { return FALLBACK[idx % FALLBACK.length]; }

  /** The three questions for a picture: the model's, once it has written them, else the hand-written ones. */
  S.pictureQs = function (idx) {
    var kept = S.P.storyQs && S.P.storyQs[idx];
    return (kept && kept.length === 3) ? kept : fallback(idx);
  };

  /* what is TRUE of a picture, for the model to build on */
  function facts(idx) {
    var p = S.PROMPTS[idx % S.PROMPTS.length], l = p.ladder || {};
    var objects = {};
    (p.scene.parts || []).forEach(function (x) { objects[x.k] = 1; });
    var f = [];
    ['who', 'what', 'where'].forEach(function (k) {
      if (l[k]) f.push(l[k].answer + ' (' + l[k].cue.audio + ')');
    });
    return { text: f.join('; '), objects: Object.keys(objects) };
  }

  function validQ(x, objects) {
    if (!x || typeof x.q !== 'string' || typeof x.frame !== 'string' || x.frame.indexOf('{}') < 0) return null;
    var l = x.ladder || x;
    var ans = String(x.answer || l.answer || '').trim();
    var ch = Array.isArray(x.choices) ? x.choices.map(String) : [];
    if (!ans || ans.split(/\s+/).length > 4 || ch.length !== 3 || ch.indexOf(ans) < 0) return null;
    var visual = String(x.visual || x.cue || '').trim().toLowerCase();
    if (objects.indexOf(visual) < 0) visual = objects[0] || 'picture';
    var accept = Array.isArray(x.accept) ? x.accept.map(function (a) { return String(a).trim(); }).filter(Boolean).slice(0, 8) : [];
    return Q(x.q.trim(), x.frame.trim(), ans, ch, String(x.hint || 'Look at the picture.').trim(),
             visual, String(x.clue || ('It is ' + ans + '.')).trim(), accept);
  }

  /* ══ checking what the child wrote ══════════════════════
     A child can answer a question correctly in many ways:
       "What colour is the cat?"  ->  orange / orange cat / the cat has
                                      orange fur / the colour is orange
     and some questions have more than one fair answer ("What is the
     weather like?" -> stormy, rainy, cloudy, wild). So matching one fixed
     word would mark good answers wrong.

     Two steps:
       1. Local: take the little filler words away and see whether the
          expected answer, or one of its known alternatives, is in what
          they wrote. If so it is right, and no model is needed.
       2. Anything left goes to the language model (Llama 3.3 70B through
          the Worker) with the question, the picture's true facts and the
          child's answer. It says whether the answer is a fair description
          of THIS picture, however it is worded, and why, kindly.
     With no model, an answer that is not matched locally is reported as
     "not sure", never as plain wrong. */
  var FILLER = {};
  ('the a an is are was were it its it\'s has have had of in on at to with and this that there colour color ' +
   'looks look like be being very really so just').split(' ').forEach(function (w) { FILLER[w] = 1; });

  function words(t) {
    return String(t || '').toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/)
      .filter(function (w) { return w && !FILLER[w]; });
  }
  function near(a, b) {                 /* the same word, give or take a slip (spelling is checked separately) */
    if (a === b) return true;
    if (a.length < 4 || b.length < 4 || Math.abs(a.length - b.length) > 1) return false;
    var i = 0, j = 0, miss = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++miss > 1) return false;
      if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
    }
    return miss + (a.length - i) + (b.length - j) <= 1;
  }
  function contains(have, want) {       /* do the words of `want` appear, in order, in `have`? */
    if (!want.length) return false;
    for (var s0 = 0; s0 + want.length <= have.length; s0++) {
      var all = true;
      for (var k = 0; k < want.length; k++) if (!near(have[s0 + k], want[k])) { all = false; break; }
      if (all) return true;
    }
    return false;
  }

  /** Is this answer plainly right? (no model needed) */
  S.answerMatches = function (q, said) {
    var have = words(said);
    if (!have.length) return false;
    return [q.ladder.answer].concat(q.accept || []).some(function (a) { return contains(have, words(a)); });
  };

  /**
   * Check the three answers for a picture.
   * Resolves [{ ok, unsure, why, best }] in question order.
   *   ok      a fair, correct answer
   *   unsure  could not be decided (no model) - never shown as "wrong"
   *   why     one short, kind sentence
   *   best    the answer to show when it is not right
   */
  S.judgeAnswers = async function (idx, answers) {
    var qsList = S.pictureQs(idx);
    var out = qsList.map(function (q, i) {
      var said = String(answers[i] || '').trim();
      if (!said) return { ok: false, unsure: false, why: 'There is no answer here yet.', best: q.ladder.answer };
      if (S.answerMatches(q, said)) return { ok: true, why: 'Yes, that is right!', best: q.ladder.answer, local: true };
      return null;
    });
    var left = out.map(function (o, i) { return o ? -1 : i; }).filter(function (i) { return i >= 0; });
    if (!left.length) return out;

    var asked = false;
    if (S.AI && S.AI.ready) {
      var f = facts(idx);
      try {
        var res = await S.AI.askJSON(
          'A child with dyslexia is answering questions about a picture. Mark each answer.\n' +
          'What is TRUE in the picture: ' + f.text + '.\n' +
          'Things drawn in it: ' + f.objects.join(', ') + '.\n\n' +
          left.map(function (i, n) {
            var q = qsList[i];
            return (n + 1) + '. Question: "' + q.q + '"  A model answer: "' + q.ladder.answer + '"  ' +
                   'The child wrote: "' + String(answers[i]).replace(/"/g, "'") + '"';
          }).join('\n') + '\n\n' +
          'Rules: the answer is CORRECT if it is a fair, true description of this picture that answers the question, ' +
          'in ANY wording (a short phrase, a full sentence, a synonym, a close alternative that fits what is drawn, ' +
          'for example "rainy" or "cloudy" for a stormy picture). Ignore spelling mistakes if the meaning is clear. ' +
          'It is WRONG if it contradicts the picture, is about something else, or does not answer the question. ' +
          'Reply with only JSON: an array with one object per question, in order: ' +
          '{"ok": true or false, "why": one short kind sentence for a 9-year-old (if wrong, say what is true in the picture ' +
          'without being harsh), "best": the best short answer}',
          { maxTokens: 500, temperature: 0 });
        var list = Array.isArray(res) ? res : (res && res.answers);
        if (Array.isArray(list) && list.length === left.length) {
          asked = true;
          left.forEach(function (i, n) {
            var r = list[n] || {};
            out[i] = { ok: r.ok === true, why: String(r.why || (r.ok === true ? 'Yes, that is right!' : 'Not quite.')).slice(0, 160),
                       best: String(r.best || qsList[i].ladder.answer).slice(0, 60) };
          });
        }
      } catch (e) { /* offline: fall through */ }
    }
    if (!asked) {
      left.forEach(function (i) {
        out[i] = { ok: false, unsure: true, best: qsList[i].ladder.answer,
                   why: 'I am not sure about this one. A good answer is "' + qsList[i].ladder.answer + '".' };
      });
    }
    return out;
  };

  var inflight = {};

  /**
   * Ask the model to write three specific questions for a picture.
   * Resolves the questions (and keeps them) or null.
   */
  S.refreshPictureQs = function (idx) {
    idx = idx % S.PROMPTS.length;
    if (S.P.storyQs && S.P.storyQs[idx]) return Promise.resolve(S.P.storyQs[idx]);
    if (!S.AI || !S.AI.ready) return Promise.resolve(null);
    if (inflight[idx]) return inflight[idx];
    var f = facts(idx);
    inflight[idx] = S.AI.askJSON(
      'A child aged 7 to 14 with dyslexia is looking at a picture and will answer 3 questions about it, ' +
      'one short answer each.\n' +
      'What is TRUE in the picture: ' + f.text + '.\n' +
      'Things drawn in it: ' + f.objects.join(', ') + '.\n\n' +
      'Write 3 SPECIFIC questions that each have exactly one right short answer a child can see in the picture, ' +
      'using ONLY the facts above (never invent a colour or detail that is not given). Make them different kinds: ' +
      '(1) a colour, size or number question about one thing, (2) what one thing is doing, (3) where something is ' +
      'or where it is going. Never ask "who or what is it" or "what is in the picture". Use very simple words.\n' +
      'Reply with only JSON: an array of 3 objects, each:\n' +
      '{"q": the question, "frame": a short sentence for the answer with {} where it goes, e.g. "The cat is {}.", ' +
      '"answer": 1 to 3 words, "choices": 3 answers including the right one, the others plainly wrong, ' +
      '"hint": a hint that does not give the answer away, "visual": one of [' + f.objects.join(', ') + '] to show as a clue, ' +
      '"clue": one short sentence that tells the answer, ' +
      '"accept": 3 to 5 other short answers that would ALSO be right (synonyms, other ways to say it)}',
      { maxTokens: 700, temperature: 0.3 }
    ).then(function (out) {
      var list = Array.isArray(out) ? out : (out && out.questions);
      var qs = (list || []).map(function (x) { return validQ(x, f.objects); });
      if (qs.length !== 3 || qs.some(function (x) { return !x; })) return null;
      S.P.storyQs = S.P.storyQs || {};
      S.P.storyQs[idx] = qs;
      S.save();
      return qs;
    }, function () { return null; })
    .then(function (r) { delete inflight[idx]; return r; });
    return inflight[idx];
  };

})(window.Spark);
