/* ============================================================
   content.js — the reading library and the writing prompts.

   The passages are "hi-lo": written at an accessible reading level
   but about things a 9- to 14-year-old actually cares about, which
   is what older struggling readers need. Nothing babyish.

   Add your own by appending to S.LIBRARY — everything else in the
   app (questions, ordering, word tracking) is generated from the
   text, so no other file needs changing.
   ============================================================ */

(function (S) {
  'use strict';

  S.LIBRARY = [
    {
      id: 'cat', level: 1, pic: 'cat',
      title: 'The Cat and the Sofa',
      blurb: 'A short, gentle one to warm up with.',
      text: 'The orange cat jumped onto the blue sofa. It turned around twice and sat down. ' +
            'Warm sunlight came through the window. The cat closed its eyes and purred. ' +
            'Soon it was fast asleep.'
    },
    {
      id: 'goal', level: 1, pic: 'goal',
      title: 'The Last Minute',
      blurb: 'One minute left, and the ball comes to you.',
      text: 'There was one minute left in the match. Sam was tired and his legs ached. ' +
            'Then the ball came loose near the goal. He ran forward and kicked it hard. ' +
            'The net shook and everyone shouted.'
    },
    {
      id: 'storm', level: 2, pic: 'lighthouse',
      title: 'The Lighthouse Keeper',
      blurb: 'A storm, a light, and a boat that needs it.',
      text: 'The storm arrived just after dark. Rain hammered against the tall windows of the lighthouse. ' +
            'Mira climbed the narrow stairs and checked the great lamp. ' +
            'Far below, a small fishing boat was struggling in the waves. ' +
            'She turned the beam towards it and held it steady. ' +
            'Slowly, the boat found its way home.'
    },
    {
      id: 'water', level: 2, pic: 'water',
      title: 'Where Rain Comes From',
      blurb: 'The water cycle, explained simply.',
      text: 'Water on Earth is always moving. ' +
            'When the sun warms a lake, some of the water evaporates and rises as invisible vapour. ' +
            'High in the sky the air is colder, so the vapour condenses into tiny droplets. ' +
            'Millions of droplets together make a cloud. ' +
            'When the droplets grow heavy they fall as rain or snow. ' +
            'The water collects in rivers and returns to the sea.'
    },
    {
      id: 'mars', level: 3, pic: 'rocket',
      title: 'A Day on Mars',
      blurb: 'Longer sentences, bigger ideas.',
      text: 'A day on Mars is almost exactly as long as a day on Earth, which surprises most people. ' +
            'The planet turns once every twenty-four hours and thirty-seven minutes. ' +
            'But a year on Mars lasts nearly twice as long as ours, because Mars travels a much wider circle around the sun. ' +
            'Its thin atmosphere cannot hold heat, so the temperature drops sharply once the sun goes down. ' +
            'Dust storms sometimes cover the whole planet for weeks.'
    },
    {
      id: 'bees', level: 3, pic: 'bee',
      title: 'How Bees Give Directions',
      blurb: 'A real thing bees do that sounds invented.',
      text: 'When a honeybee finds flowers worth visiting, it returns to the hive and dances. ' +
            'The dance is not decoration; it carries information. ' +
            'The angle of the bee\'s movement describes the direction of the flowers from the sun. ' +
            'The length of the dance tells the other bees how far they must travel. ' +
            'Scientists spent years decoding this language before they believed what they were seeing.'
    }
  ];

  /* ── writing prompts, each with a help ladder ───────────
     The child gets NO placeholder to copy. They try first.
     Only when they ask for help does Spark climb the ladder:

       1 prompt — the question asked a different way
       2 cue    — a picture or a spoken hint, whichever suits them
       3 choice — two or three options to pick between
       4 answer — a model answer, finally

     Which rung got them moving is recorded, exactly as the reading
     cues are, so the help can be tuned to the child over time. */
  /* ── the letter-confusion check ─────────────────────────
     A short screening set, read before anything else.

     These are not stories. Each passage is loaded with one family
     of letters that readers with dyslexia commonly swap, so that
     if a child has that difficulty it shows up in the first few
     minutes rather than after weeks of reading. The sentences are
     deliberately plain and short — the point is the letters, not
     comprehension, so nothing else should get in the way.

     The pairs come from the error types the analysis engine
     already looks for: mirror shapes (b/d, p/q), rotations (m/w,
     n/u), similar sounds (c/s, g/j, f/v), and the short vowels
     that blur into one another.

     Running all six takes about five minutes and gives Spark a
     baseline it can compare later reading against.               */
  S.SCREENING = [
    {
      id: 'scr-bd', pairs: ['bd'], pic: 'dog',
      title: 'b and d',
      blurb: 'Ben and his dog.',
      about: 'b and d are the same shape turned around — the most common ' +
             'mix-up there is.',
      text: 'Ben had a big brown dog called Bud. ' +
            'Bud dug a deep bed in the dirt beside the door. ' +
            'Every day Ben brought him bread, and Bud would bound over, ' +
            'barking. ' +
            'One bad day the door banged shut and Bud was stuck outside in ' +
            'the drizzle. ' +
            'Ben dashed down and opened it, and Bud bundled back indoors.'
    },
    {
      id: 'scr-pq', pairs: ['pq', 'bp'], pic: 'apple',
      title: 'p, q and b',
      blurb: 'A puppy by the pond.',
      about: 'p, q and b differ only in which way the tail and the circle ' +
             'point.',
      text: 'Pip was a quick little puppy with a patch over one eye. ' +
            'She padded past the pond, where a quiet duck was paddling. ' +
            'Pip put her paws in the pool and the duck quacked at her. ' +
            'Quite put out, Pip picked up a pebble and dropped it in. ' +
            'Plop. The pond rippled, and the duck paddled away.'
    },
    {
      id: 'scr-mw', pairs: ['mw', 'nu'], pic: 'mountain',
      title: 'm, w, n and u',
      blurb: 'Wind on the mountain.',
      about: 'm and w are each other upside down, and so are n and u.',
      text: 'The wind came down the mountain and woke everyone in the hut. ' +
            'Mum wound a warm scarf round her neck and went out into the murk. ' +
            'Snow was melting under the morning sun. ' +
            'A number of small brown marmots were running between the rocks. ' +
            'We watched them until the wind dropped.'
    },
    {
      id: 'scr-cs', pairs: ['sz'], pic: 'sea',
      title: 'c and s',
      blurb: 'A cold sea in the city.',
      about: 'c is sometimes a k and sometimes an s, which makes it hard ' +
             'to trust.',
      text: 'The city sat close to a cold grey sea. ' +
            'In the centre, Sam sold ice from a small cart. ' +
            'Nobody bought much ice in such a season. ' +
            'Still, he sat in his seat and counted the circling gulls. ' +
            'Across the sand, a single sailing boat crossed slowly.'
    },
    {
      id: 'scr-gj', pairs: ['dg'], pic: 'bee',
      title: 'g, j and d',
      blurb: 'Something buried in the garden.',
      about: 'g can sound like j, and both get confused with d.',
      text: 'Jess found a glass jar half buried in the garden. ' +
            'It had a dented gold lid and dirt all down one side. ' +
            'She dug it up gently and gave it a good wash. ' +
            'Inside were a jumble of beads, a badge, and a dried-up daisy. ' +
            'Jess decided to keep the jar on her desk.'
    },
    {
      id: 'scr-vowels', pairs: ['ea', 'ie', 'ao'], pic: 'house',
      title: 'Short vowels',
      blurb: 'A cat, a cot and a cup.',
      about: 'The short vowel sounds sit close together, and swapping one ' +
             'changes the whole word.',
      text: 'The cat slept in a cot at the top of the stairs. ' +
            'Ben set a cup of milk on the mat and sat back. ' +
            'The cat got up, had a sip, and then sat in the sun. ' +
            'A big red bus went past and the cat did not budge. ' +
            'It is not easy to shift a cat that has picked its spot.'
    }
  ];

  /** Every word in the screening set, for the baseline report. */
  S.screeningWords = function () {
    var all = {};
    S.SCREENING.forEach(function (p) {
      p.text.split(/\s+/).forEach(function (w) {
        var n = String(w).toLowerCase().replace(/[^a-z']/g, '');
        if (n) all[n] = 1;
      });
    });
    return Object.keys(all);
  };

  /* ── the voice calibration line ─────────────────────────
     Read once, in Settings, so Spark learns what this child sounds
     like and can tell later if somebody else takes over the reading.

     It has to be a real sentence, long enough to carry a range of
     vowel sounds — pitch is measured on vowels, and a short flat
     line gives a flat, useless reading. These run about 25 words
     and deliberately mix high vowels (ee, i) with low ones (o, u),
     because a voice print taken from only one is a poor one.      */
  S.CALIBRATION = [
    'The moon came up over the quiet blue sea, and three seagulls flew low ' +
    'across the sand looking for something to eat.',

    'My green bike has a squeaky wheel and a loud bell, so everyone in the ' +
    'street knows exactly when I am coming home.',

    'On Tuesday we found a tiny brown mouse behind the shed, eating seeds ' +
    'from an old flowerpot in the cool afternoon shade.'
  ];

  S.PROMPTS = [
    {
      pic: 'sofa', q: 'What is happening in this picture?',
      scene: 'an orange cat curled up asleep on a blue sofa in the sunshine',
      ladder: {
        who: {
          prompt: 'Look at the picture. Which animal can you see?',
          cue: { visual: 'cat', audio: 'There is a cat. What colour is it?' },
          choices: ['the orange cat', 'the big dog', 'a small bird'],
          answer: 'the orange cat'
        },
        what: {
          prompt: 'Is the cat awake or asleep? What is its body doing?',
          cue: { visual: 'bed', audio: 'The cat has its eyes shut. It is sleeping.' },
          choices: ['is curled up asleep', 'is running fast', 'is eating dinner'],
          answer: 'is curled up asleep'
        },
        where: {
          prompt: 'What is the cat lying on?',
          cue: { visual: 'sofa', audio: 'Look underneath the cat. It is on the sofa.' },
          choices: ['on the blue sofa', 'under the table', 'in the garden'],
          answer: 'on the blue sofa'
        }
      }
    },
    {
      pic: 'storm', q: 'What is happening on this stormy night?',
      scene: 'a lighthouse keeper watching a small boat in a storm at night',
      ladder: {
        who: {
          prompt: 'Who looks after a lighthouse?',
          cue: { visual: 'lighthouse', audio: 'The person who looks after the light is the keeper.' },
          choices: ['the lighthouse keeper', 'a football team', 'a shopkeeper'],
          answer: 'the lighthouse keeper'
        },
        what: {
          prompt: 'What is she doing with the big lamp?',
          cue: { visual: 'lighthouse', audio: 'She is turning the light so the boat can see it.' },
          choices: ['is turning the light on', 'is going to sleep', 'is cooking dinner'],
          answer: 'is turning the light on'
        },
        where: {
          prompt: 'Where is she standing?',
          cue: { visual: 'lighthouse', audio: 'She is high up, at the top of the lighthouse.' },
          choices: ['at the top of the lighthouse', 'in a car park', 'under the sea'],
          answer: 'at the top of the lighthouse'
        }
      }
    },
    {
      pic: 'rocket', q: 'What is happening on launch day?',
      scene: 'a rocket lifting off with smoke and a crowd watching',
      ladder: {
        who: {
          prompt: 'What is the tall thing going up into the sky?',
          cue: { visual: 'rocket', audio: 'It is a rocket.' },
          choices: ['the huge rocket', 'a slow bus', 'a small boat'],
          answer: 'the huge rocket'
        },
        what: {
          prompt: 'Is it going up or coming down?',
          cue: { visual: 'rocket', audio: 'It is lifting off the ground and climbing.' },
          choices: ['is blasting off', 'is parked quietly', 'is sinking down'],
          answer: 'is blasting off'
        },
        where: {
          prompt: 'Where is it heading?',
          cue: { visual: 'star', audio: 'It is going up into space.' },
          choices: ['up into space', 'into the sea', 'down a road'],
          answer: 'up into space'
        }
      }
    },
    {
      pic: 'bee', q: 'What is this bee doing?',
      scene: 'a honeybee landing on a yellow flower in a garden',
      ladder: {
        who: {
          prompt: 'Which little insect can you see?',
          cue: { visual: 'bee', audio: 'It is a bee. A striped, buzzing bee.' },
          choices: ['the striped bee', 'a big elephant', 'a grey cat'],
          answer: 'the striped bee'
        },
        what: {
          prompt: 'What is it doing on the flower?',
          cue: { visual: 'flower', audio: 'It has landed and is collecting from the flower.' },
          choices: ['is collecting nectar', 'is reading a book', 'is having a nap'],
          answer: 'is collecting nectar'
        },
        where: {
          prompt: 'Where is the flower growing?',
          cue: { visual: 'flower', audio: 'The flower is in a garden.' },
          choices: ['in the sunny garden', 'on the moon', 'inside a cupboard'],
          answer: 'in the sunny garden'
        }
      }
    },
    {
      pic: 'goal', q: 'What is happening in this match?',
      scene: 'a player kicking the ball towards the goal in the last minute',
      ladder: {
        who: {
          prompt: 'Who is running with the ball?',
          cue: { visual: 'goal', audio: 'A player on the team is running with the ball.' },
          choices: ['the tired player', 'a sleeping cat', 'the head teacher'],
          answer: 'the tired player'
        },
        what: {
          prompt: 'What does he do with his foot?',
          cue: { visual: 'ball', audio: 'He kicks the ball as hard as he can.' },
          choices: ['kicks the ball hard', 'eats his lunch', 'reads a sign'],
          answer: 'kicks the ball hard'
        },
        where: {
          prompt: 'Where does the ball go?',
          cue: { visual: 'goal', audio: 'It goes into the net — a goal!' },
          choices: ['into the goal net', 'into a cupboard', 'up a tree'],
          answer: 'into the goal net'
        }
      }
    },
    {
      pic: 'bird', q: 'What is this bird doing?',
      scene: 'a small bird hopping across a snowy field at dusk',
      ladder: {
        who: {
          prompt: 'Which small animal can you see hopping about?',
          cue: { visual: 'bird', audio: 'It is a little bird.' },
          choices: ['the little bird', 'a yellow duck', 'a grey whale'],
          answer: 'the little bird'
        },
        what: {
          prompt: 'Is it running fast or moving quietly?',
          cue: { visual: 'bird', audio: 'It is creeping along very quietly.' },
          choices: ['is creeping quietly', 'is shouting loudly', 'is swimming'],
          answer: 'is creeping quietly'
        },
        where: {
          prompt: 'What is on the ground?',
          cue: { visual: 'snow', audio: 'The ground is covered in snow.' },
          choices: ['across the snowy field', 'inside a shop', 'on a bus'],
          answer: 'across the snowy field'
        }
      }
    }
  ];

  /** Split any text into sentences — used for ordering and questions. */
  S.toSentences = function (text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  };

  S.wordCount = function (text) {
    return String(text || '').trim().split(/\s+/).filter(Boolean).length;
  };

})(window.Spark);
