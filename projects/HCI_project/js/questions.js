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

  function Q(q, frame, answer, choices, prompt, visual, audio) {
    return { q: q, frame: frame, ladder: {
      prompt: prompt, cue: { visual: visual, audio: audio }, choices: choices, answer: answer } };
  }

  /* index = the picture in S.PROMPTS */
  var FALLBACK = [
    [ Q('What colour is the cat?', 'The cat is {}.', 'orange', ['orange', 'green', 'purple'],
        'Look at the cat\'s fur. What colour is it?', 'cat', 'The cat\'s fur is orange.'),
      Q('What is the cat doing?', 'The cat is {}.', 'sleeping', ['sleeping', 'running', 'eating'],
        'Are its eyes open or shut?', 'catnap', 'Its eyes are shut. The cat is sleeping.'),
      Q('Where is the cat?', 'The cat is {}.', 'on the sofa', ['on the sofa', 'in a tree', 'in the sea'],
        'What is the cat lying on?', 'sofa', 'Look under the cat. It is on the sofa.') ],

    [ Q('What is the weather like?', 'The weather is {}.', 'stormy', ['stormy', 'sunny', 'snowy'],
        'Look at the sky. Is it calm or wild?', 'storm', 'There is a storm. The weather is stormy.'),
      Q('What is the boat doing?', 'The boat is {}.', 'sailing', ['sailing', 'flying', 'driving'],
        'Is the boat on the sea or on the road?', 'boat', 'The boat is on the sea. It is sailing.'),
      Q('What is the tall tower by the sea?', 'The tall tower is a {}.', 'lighthouse', ['lighthouse', 'castle', 'tree'],
        'It has a light on top to help boats at night.', 'lighthouse', 'It is a lighthouse.') ],

    [ Q('What colour is the rocket?', 'The rocket is {}.', 'white', ['white', 'pink', 'brown'],
        'Look at the big rocket. What colour is its body?', 'rocket', 'The rocket is white.'),
      Q('What is the rocket doing?', 'The rocket is {}.', 'going up', ['going up', 'going down', 'sleeping'],
        'Fire comes out of the bottom. Which way does it go?', 'rocket', 'Fire is coming out of the bottom. It is going up.'),
      Q('Where is the rocket going?', 'The rocket is going to {}.', 'space', ['space', 'school', 'the sea'],
        'What can you see in the sky around it?', 'star', 'There are stars and the moon. It is going to space.') ],

    [ Q('What colour is the flower?', 'The flower is {}.', 'pink', ['pink', 'black', 'blue'],
        'Look at the flower\'s petals. What colour are they?', 'flower', 'The flower is pink.'),
      Q('What is the bee doing?', 'The bee is {}.', 'landing', ['landing', 'swimming', 'sleeping'],
        'Is the bee going to the flower or away from it?', 'bee', 'The bee is landing on the flower.'),
      Q('What is shining in the sky?', 'The {} is shining.', 'sun', ['sun', 'moon', 'rocket'],
        'It is a sunny day. What gives us light and heat?', 'sun', 'The sun is shining.') ],

    [ Q('What colour is the grass?', 'The grass is {}.', 'green', ['green', 'red', 'yellow'],
        'Look at the pitch. What colour is the grass?', 'pitch', 'The grass is green.'),
      Q('What is the ball doing?', 'The ball is {}.', 'flying', ['flying', 'sleeping', 'melting'],
        'Has someone kicked it? Is it still or moving?', 'ball', 'Someone kicked it. The ball is flying.'),
      Q('Where is the ball going?', 'The ball is going {}.', 'into the goal', ['into the goal', 'into the sea', 'up a tree'],
        'What are the players trying to kick it into?', 'goal', 'The ball is going into the goal.') ],

    [ Q('What colour is the snow?', 'The snow is {}.', 'white', ['white', 'orange', 'green'],
        'Look at the ground. What colour is the snow?', 'snow', 'The snow is white.'),
      Q('What is the bird doing?', 'The bird is {}.', 'hopping', ['hopping', 'swimming', 'driving'],
        'Is the bird flying, or on the ground?', 'bird', 'The bird is on the ground. It is hopping.'),
      Q('Where is the bird?', 'The bird is {}.', 'in the snow', ['in the snow', 'in a boat', 'on a sofa'],
        'What is the bird standing in?', 'snowflakes', 'The bird is in the snow.') ]
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
    return Q(x.q.trim(), x.frame.trim(), ans, ch, String(x.hint || 'Look at the picture.').trim(),
             visual, String(x.clue || ('It is ' + ans + '.')).trim());
  }

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
      '"clue": one short sentence that tells the answer}',
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
