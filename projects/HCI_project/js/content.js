/* ============================================================
   content.js — the picture-story prompts, the voice calibration
   paragraphs, and text helpers.

   The reading stories and writing sentences live in families.js,
   grouped by the letters they test.
   ============================================================ */

(function (S) {
  'use strict';

  /* ── the voice calibration paragraph ────────────────────
     Read once, in Settings, so Spark learns what this child sounds
     like and can tell later if somebody else takes over the reading.

     A whole paragraph, not one line: pitch is measured on vowels,
     and a short sample gives a poor voice print. These deliberately
     mix high vowels (ee, i) with low ones (o, u). */
  S.CALIBRATION = [
    'The moon came up over the quiet blue sea. Three seagulls flew low ' +
    'across the sand, looking for something to eat. A little boat bobbed ' +
    'by the pier, and the lights in the town began to glow.',

    'My green bike has a squeaky wheel and a loud bell. Everyone in the ' +
    'street knows exactly when I am coming home. On sunny days I ride it ' +
    'to the park and race my friends around the pond.',

    'On Tuesday we found a tiny brown mouse behind the shed. It was eating ' +
    'seeds from an old flowerpot in the cool shade. We kept very still and ' +
    'watched it until it ran back under the fence.'
  ];

  /* ── picture-story prompts ──────────────────────────────
     Every question is about something that is IN the picture. The
     scene is drawn from several pieces, so the cat really is asleep
     on the sofa, and the boat really is passing the lighthouse.

     The help ladder for each piece:
       1 prompt — the question asked a different way
       2 cue    — a picture or a spoken clue, the child chooses
       3 choice — three options to pick between
       4 answer — a model answer, finally                       */
  S.PROMPTS = [
    {
      q: 'What is happening in this picture?',
      scene: { bg: 'room', parts: [
        { k: 'sofa', x: 44, y: 34, s: 1.5 },
        { k: 'catnap', x: 64, y: 23, s: 0.75 },
        { k: 'zzz', x: 96, y: 14, s: 0.5 }
      ] },
      ladder: {
        who: {
          prompt: 'Look at the picture. Which animal can you see?',
          cue: { visual: 'cat', audio: 'There is an orange cat.' },
          choices: ['the orange cat', 'a big dog', 'a small bird'],
          answer: 'the orange cat'
        },
        what: {
          prompt: 'Are its eyes open or shut? What is it doing?',
          cue: { visual: 'bed', audio: 'Its eyes are shut. The cat is having a nap.' },
          choices: ['is fast asleep', 'is running fast', 'is eating dinner'],
          answer: 'is fast asleep'
        },
        where: {
          prompt: 'What is the cat lying on?',
          cue: { visual: 'sofa', audio: 'Look under the cat. It is on the blue sofa.' },
          choices: ['on the blue sofa', 'under the table', 'in the garden'],
          answer: 'on the blue sofa'
        }
      }
    },
    {
      q: 'What is happening on this stormy night?',
      scene: { bg: 'night-sea', parts: [
        { k: 'storm', x: 6, y: 0, s: 0.9 },
        { k: 'lighthouse', x: 104, y: 22, s: 1.3 },
        { k: 'boat', x: 30, y: 52, s: 0.9 }
      ] },
      ladder: {
        who: {
          prompt: 'What is floating on the sea?',
          cue: { visual: 'boat', audio: 'It is a small boat with a white sail.' },
          choices: ['the small boat', 'a big bus', 'a red car'],
          answer: 'the small boat'
        },
        what: {
          prompt: 'Is the boat sailing or flying?',
          cue: { visual: 'sea', audio: 'The boat is sailing over the waves.' },
          choices: ['is sailing home', 'is flying away', 'is parked on a road'],
          answer: 'is sailing home'
        },
        where: {
          prompt: 'Which tall building is shining a light?',
          cue: { visual: 'lighthouse', audio: 'The boat is going past the lighthouse.' },
          choices: ['past the lighthouse', 'into a shop', 'up a hill'],
          answer: 'past the lighthouse'
        }
      }
    },
    {
      q: 'What is happening on launch day?',
      scene: { bg: 'night', parts: [
        { k: 'moon', x: 10, y: 6, s: 0.6 },
        { k: 'star', x: 120, y: 8, s: 0.4 },
        { k: 'star', x: 40, y: 50, s: 0.3 },
        { k: 'star', x: 130, y: 60, s: 0.3 },
        { k: 'rocket', x: 62, y: 14, s: 1.5 }
      ] },
      ladder: {
        who: {
          prompt: 'What is the tall thing going up into the sky?',
          cue: { visual: 'rocket', audio: 'It is a rocket.' },
          choices: ['the huge rocket', 'a slow bus', 'a small boat'],
          answer: 'the huge rocket'
        },
        what: {
          prompt: 'Is it going up or coming down?',
          cue: { visual: 'rocket', audio: 'Fire is coming out of the bottom. It is going up.' },
          choices: ['is blasting off', 'is parked quietly', 'is sinking down'],
          answer: 'is blasting off'
        },
        where: {
          prompt: 'What can you see in the sky around it?',
          cue: { visual: 'star', audio: 'There are stars and the moon. It is going into space.' },
          choices: ['up to the stars', 'into the sea', 'down a road'],
          answer: 'up to the stars'
        }
      }
    },
    {
      q: 'What is this bee doing?',
      scene: { bg: 'garden', parts: [
        { k: 'sun', x: 120, y: 2, s: 0.6 },
        { k: 'flower', x: 54, y: 30, s: 1.4 },
        { k: 'bee', x: 84, y: 12, s: 0.8 }
      ] },
      ladder: {
        who: {
          prompt: 'Which little insect can you see?',
          cue: { visual: 'bee', audio: 'It is a bee. A yellow and black striped bee.' },
          choices: ['the striped bee', 'a big elephant', 'a grey cat'],
          answer: 'the striped bee'
        },
        what: {
          prompt: 'Is it flying to the flower or away?',
          cue: { visual: 'bee', audio: 'The bee is coming down onto the flower.' },
          choices: ['is landing', 'is reading a book', 'is having a bath'],
          answer: 'is landing'
        },
        where: {
          prompt: 'What colour is the flower it is landing on?',
          cue: { visual: 'flower', audio: 'The flower has pink petals.' },
          choices: ['on the pink flower', 'on the moon', 'inside a cupboard'],
          answer: 'on the pink flower'
        }
      }
    },
    {
      q: 'What is happening in this match?',
      scene: { bg: 'pitch', parts: [
        { k: 'goal', x: 70, y: 18, s: 1.5 },
        { k: 'ball', x: 36, y: 46, s: 0.55 },
        { k: 'whoosh', x: 8, y: 50, s: 0.55 }
      ] },
      ladder: {
        who: {
          prompt: 'What round thing can you see?',
          cue: { visual: 'ball', audio: 'It is a black and white football.' },
          choices: ['the football', 'a big cake', 'an apple'],
          answer: 'the football'
        },
        what: {
          prompt: 'Is the ball moving or still?',
          cue: { visual: 'ball', audio: 'The ball is flying through the air.' },
          choices: ['is flying', 'is sleeping', 'is melting'],
          answer: 'is flying'
        },
        where: {
          prompt: 'Where is the ball going?',
          cue: { visual: 'goal', audio: 'It is going into the net. A goal!' },
          choices: ['into the goal', 'into a cupboard', 'up a tree'],
          answer: 'into the goal'
        }
      }
    },
    {
      q: 'What is this bird doing?',
      scene: { bg: 'snow', parts: [
        { k: 'snowflakes', x: 0, y: 0, s: 1 },
        { k: 'bird', x: 58, y: 40, s: 1.1 }
      ] },
      ladder: {
        who: {
          prompt: 'Which small animal can you see?',
          cue: { visual: 'bird', audio: 'It is a little blue bird.' },
          choices: ['the little bird', 'a yellow duck', 'a grey whale'],
          answer: 'the little bird'
        },
        what: {
          prompt: 'Is it flying in the sky or on the ground?',
          cue: { visual: 'bird', audio: 'It is on the ground, hopping along.' },
          choices: ['is hopping', 'is swimming', 'is shouting'],
          answer: 'is hopping'
        },
        where: {
          prompt: 'What is on the ground?',
          cue: { visual: 'snow', audio: 'The ground is white. It is snow.' },
          choices: ['in the snow', 'inside a shop', 'on a bus'],
          answer: 'in the snow'
        }
      }
    }
  ];

  /** Split any text into sentences. */
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
