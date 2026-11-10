/* ============================================================
   families.js — the letter families the whole app is built on.

   Spark is a confusion detector. Every reading and writing
   exercise belongs to one family of letters that readers with
   dyslexia commonly mix up, and is written so that those letters
   come up again and again. If a child confuses b and d, the b/d
   stories and sentences are where it shows — in their reading
   (what they say aloud) and in their writing (what they type).

   Each family has:
     stories   — short passages to read aloud
     dictation — sentences to hear and write
     bank      — a word bank for building sentences
     tip       — a visual way to remember the difference

   The first story in each family keeps its old "scr-" id, so a
   child's earlier letter-check results still count.
   ============================================================ */

(function (S) {
  'use strict';

  S.FAMILIES = [
    {
      id: 'bd', letters: ['b', 'd'], title: 'b and d', pairs: ['bd'], pic: 'dog',
      blurb: 'The same shape, turned around.',
      tip: 'Make a "bed" with your hands. Your left fist is b, your right fist is d.',
      stories: [
        { id: 'scr-bd', title: 'Ben and Bud', blurb: 'Ben and his big brown dog.',
          text: 'Ben had a big brown dog called Bud. Bud dug a deep bed in the dirt beside the door. ' +
                'Every day Ben brought him bread, and Bud would bound over, barking. ' +
                'One bad day the door banged shut and Bud was stuck outside in the drizzle. ' +
                'Ben dashed down and opened it, and Bud bundled back indoors.' },
        { id: 'fam-bd-2', title: 'Dad\'s Birthday', blurb: 'A cake, a bowl and a hungry dog.',
          text: 'It was Dad\'s birthday, and Dot wanted to bake a cake. ' +
                'She got a big bowl and a bag of brown sugar. ' +
                'Bob the dog sat by the door and begged for a bite. ' +
                'Dot dropped a blob of batter on the board. ' +
                'Bob licked it up before Dad came back.' }
      ],
      dictation: ['The dog dug a big bed.', 'Bob had a red bag.',
                  'Dad dropped the bread.', 'A bird sat by the door.'],
      bank: {
        starters: ['The big dog', 'Ben had a', 'My dad', 'One day'],
        who:      ['Ben', 'the dog', 'my dad', 'a bird', 'the baby'],
        doing:    ['dug', 'barked', 'bounced', 'dived', 'dashed', 'grabbed', 'had'],
        what:     ['a bed', 'a ball', 'a bone', 'some bread', 'a box'],
        where:    ['by the door', 'in the dirt', 'under the bed', 'down the road'],
        describe: ['big', 'brown', 'bad', 'bright', 'dirty'],
        glue:     ['the', 'a', 'and', 'was', 'is', 'his', '.', '!']
      }
    },
    {
      id: 'pq', letters: ['p', 'q'], title: 'p and q', pairs: ['pq', 'bp'], pic: 'boat',
      blurb: 'Tails that point different ways.',
      tip: 'p has its tail on the left side. q always comes with u: qu.',
      stories: [
        { id: 'scr-pq', title: 'Pip at the Pond', blurb: 'A puppy, a pond and a quacking duck.',
          text: 'Pip was a quick little puppy with a patch over one eye. ' +
                'She padded past the pond, where a quiet duck was paddling. ' +
                'Pip put her paws in the pool and the duck quacked at her. ' +
                'Quite put out, Pip picked up a pebble and dropped it in. ' +
                'Plop. The pond rippled, and the duck paddled away.' },
        { id: 'fam-pq-2', title: 'The Queen\'s Picnic', blurb: 'Pears, pies and a plump pigeon.',
          text: 'The queen packed a picnic for a quiet day in the park. ' +
                'She put pears, pies and a pot of pickles in her basket. ' +
                'A plump pigeon perched on a post and peeped at her. ' +
                'The queen giggled and passed it a piece of pie. ' +
                'It was the perfect picnic.' }
      ],
      dictation: ['The puppy is quick.', 'Pip put a pear on a plate.',
                  'The queen had a quiet pet.', 'Please pass the pink paper.'],
      bank: {
        starters: ['The puppy', 'Pip put', 'A quiet duck', 'Quickly,'],
        who:      ['Pip', 'the puppy', 'a duck', 'the queen', 'my pal'],
        doing:    ['paddled', 'picked up', 'quacked', 'played', 'peeped', 'pushed'],
        what:     ['a pebble', 'a pear', 'some pizza', 'a present', 'a paper plane'],
        where:    ['in the pond', 'at the park', 'past the pool', 'up the path'],
        describe: ['quick', 'quiet', 'pink', 'happy', 'puzzled'],
        glue:     ['the', 'a', 'and', 'was', 'with', 'her', '.', '?']
      }
    },
    {
      id: 'mw', letters: ['m', 'w', 'n', 'u'], title: 'm, w, n and u', pairs: ['mw', 'nu'], pic: 'mountain',
      blurb: 'Letters that flip upside down.',
      tip: 'm has mountains on top. w has waves at the bottom. n is a bridge, u is a cup.',
      stories: [
        { id: 'scr-mw', title: 'Wind on the Mountain', blurb: 'A windy morning in the hut.',
          text: 'The wind came down the mountain and woke everyone in the hut. ' +
                'Mum wound a warm scarf round her neck and went out into the murk. ' +
                'Snow was melting under the morning sun. ' +
                'A number of small brown marmots were running between the rocks. ' +
                'We watched them until the wind dropped.' },
        { id: 'fam-mw-2', title: 'Under the Moon', blurb: 'A warm night and a white moth.',
          text: 'Max and Nina went out under the moon. ' +
                'The wind was warm and the night was quiet. ' +
                'A mouse ran up a wall and vanished into a nest. ' +
                'Nina saw a number of white moths near the window. ' +
                'Max wanted to stay up much later, but Mum called them in.' }
      ],
      dictation: ['Mum went to the market.', 'We swam under the bridge.',
                  'The man saw a new moon.', 'Nina wants a warm mug.'],
      bank: {
        starters: ['The wind', 'Mum went', 'We walked', 'In the morning'],
        who:      ['Mum', 'we', 'the man', 'a worm', 'Nina'],
        doing:    ['walked', 'woke up', 'made', 'watched', 'waved', 'ran'],
        what:     ['a warm hat', 'some water', 'a map', 'the moon', 'a window'],
        where:    ['up the mountain', 'under the moon', 'in the woods', 'near the window'],
        describe: ['warm', 'wet', 'windy', 'muddy', 'new'],
        glue:     ['the', 'a', 'and', 'went', 'was', 'into', '.', '!']
      }
    },
    {
      id: 'cs', letters: ['c', 's'], title: 'c and s', pairs: ['cs', 'sz'], pic: 'sea',
      blurb: 'c can say "k" or "s".',
      tip: 'c says "k" in cat and cup, but "s" before e, i or y — city, ice, cycle.',
      stories: [
        { id: 'scr-cs', title: 'A Cold Sea', blurb: 'Ice for sale in the city.',
          text: 'The city sat close to a cold grey sea. ' +
                'In the centre, Sam sold ice from a small cart. ' +
                'Nobody bought much ice in such a season. ' +
                'Still, he sat in his seat and counted the circling gulls. ' +
                'Across the sand, a single sailing boat crossed slowly.' },
        { id: 'fam-cs-2', title: 'The Circus', blurb: 'Clowns, seals and ice cream.',
          text: 'The circus came to town on a cold Saturday. ' +
                'Cass saw a clown cycling in a circle. ' +
                'Six silly seals clapped and caught a ball. ' +
                'Sam ate a slice of cake and some ice cream. ' +
                'Nobody in the city could stop smiling.' }
      ],
      dictation: ['The cat sat in the sun.', 'Six cups sit on a shelf.',
                  'The city is cold.', 'Cass can see the sea.'],
      bank: {
        starters: ['The cat', 'Sam saw', 'In the city', 'Six seals'],
        who:      ['Sam', 'the cat', 'a seal', 'Cass', 'the clown'],
        doing:    ['sat', 'sang', 'cycled', 'sold', 'cooked', 'skipped'],
        what:     ['a cake', 'some ice', 'a sock', 'a cup', 'a circle'],
        where:    ['in the city', 'by the sea', 'on the sofa', 'at the circus'],
        describe: ['cold', 'small', 'sunny', 'silly', 'soft'],
        glue:     ['the', 'a', 'and', 'was', 'so', '.', '!']
      }
    },
    {
      id: 'gj', letters: ['g', 'j'], title: 'g and j', pairs: ['gj', 'dg'], pic: 'bee',
      blurb: 'g can sound like j.',
      tip: 'g says "g" in goat, but "j" in giant and gem. j has a dot, like a hat.',
      stories: [
        { id: 'scr-gj', title: 'The Glass Jar', blurb: 'Something buried in the garden.',
          text: 'Jess found a glass jar half buried in the garden. ' +
                'It had a dented gold lid and dirt all down one side. ' +
                'She dug it up gently and gave it a good wash. ' +
                'Inside were a jumble of beads, a badge, and a dried-up daisy. ' +
                'Jess decided to keep the jar on her desk.' },
        { id: 'fam-gj-2', title: 'The Giant\'s Garden', blurb: 'Jelly beans, juice and a goat.',
          text: 'A gentle giant grew a garden by a large gate. ' +
                'He grew jelly beans on a hedge and kept jugs of juice in the shade. ' +
                'One day a jolly goat jumped over the gate. ' +
                'It gobbled the jelly beans and gulped the juice. ' +
                'The giant just laughed and gave the goat a gold badge.' }
      ],
      dictation: ['Jess got a glass jar.', 'The giant jumped the gate.',
                  'Go and get the jam.', 'The goat is jolly.'],
      bank: {
        starters: ['The giant', 'Jess got', 'A jolly goat', 'Go and'],
        who:      ['Jess', 'the giant', 'a goat', 'a gull', 'my gran'],
        doing:    ['jumped', 'got', 'giggled', 'juggled', 'grabbed', 'gave'],
        what:     ['a jar', 'some jam', 'a gift', 'a jug', 'a gold badge'],
        where:    ['in the garden', 'by the gate', 'in the jungle', 'on the jet'],
        describe: ['jolly', 'giant', 'green', 'gentle', 'huge'],
        glue:     ['the', 'a', 'and', 'was', 'got', '.', '!']
      }
    },
    {
      id: 'vowels', letters: ['a', 'e', 'i', 'o', 'u'], title: 'Short vowels',
      pairs: ['ea', 'ie', 'ao'], pic: 'house',
      blurb: 'cat, bed, pig, dog, bun.',
      tip: 'Say them slowly: a in cat, e in bed, i in pig, o in dog, u in bun.',
      stories: [
        { id: 'scr-vowels', title: 'The Cat on the Stairs', blurb: 'A cat, a cot and a cup.',
          text: 'The cat slept in a cot at the top of the stairs. ' +
                'Ben set a cup of milk on the mat and sat back. ' +
                'The cat got up, had a sip, and then sat in the sun. ' +
                'A big red bus went past and the cat did not budge. ' +
                'It is not easy to shift a cat that has picked its spot.' },
        { id: 'fam-vowels-2', title: 'Pen, Pan and Pin', blurb: 'A hen hides in a pot.',
          text: 'Meg had a pen, a pan and a pin in her bag. ' +
                'She sat on a log by the pond with her dog. ' +
                'A big red hen ran past and hid in a pot. ' +
                'Meg got up and set the hen free. ' +
                'Then she put the lid back on the pot.' }
      ],
      dictation: ['The cat sat on a mat.', 'Ten men had a pen.',
                  'Put the lid on the pot.', 'A fox got in the box.'],
      bank: {
        starters: ['The cat', 'A big hen', 'Ten men', 'The fox'],
        who:      ['the cat', 'a hen', 'the fox', 'Meg', 'ten men'],
        doing:    ['sat', 'ran', 'hid', 'got', 'fed', 'hopped'],
        what:     ['a hat', 'a pen', 'a pot', 'a bun', 'a red cup'],
        where:    ['on the mat', 'in the box', 'on a log', 'in the pond', 'up the hill'],
        describe: ['big', 'red', 'hot', 'wet', 'sad'],
        glue:     ['the', 'a', 'and', 'in', 'on', '.', '!']
      }
    }
  ];

  S.family = function (id) {
    return S.FAMILIES.filter(function (f) { return f.id === id; })[0] || null;
  };

  /** Which family a story belongs to. */
  S.familyOfStory = function (storyId) {
    for (var i = 0; i < S.FAMILIES.length; i++) {
      var f = S.FAMILIES[i];
      for (var j = 0; j < f.stories.length; j++) {
        if (f.stories[j].id === storyId) return f;
      }
    }
    return null;
  };

  /** Which family a letter pair (e.g. "bd") belongs to. */
  S.familyOfPair = function (key) {
    for (var i = 0; i < S.FAMILIES.length; i++) {
      if (S.FAMILIES[i].pairs.indexOf(key) > -1) return S.FAMILIES[i];
    }
    return null;
  };

  /** The family's letters drawn as tiles — its picture everywhere. */
  S.familyTiles = function (f, size) {
    return '<span class="fam-tiles' + (size ? ' fam-' + size : '') + '">' +
      f.letters.map(function (l) {
        return '<i class="fam-tile">' + l + '</i>';
      }).join('') +
    '</span>';
  };

  /* Kept for anything that still asks for the old letter-check list:
     it is simply the first story in every family. */
  S.SCREENING = S.FAMILIES.map(function (f) {
    return Object.assign({ pairs: f.pairs, pic: f.pic, about: f.blurb, family: f.id }, f.stories[0]);
  });

})(window.Spark);
