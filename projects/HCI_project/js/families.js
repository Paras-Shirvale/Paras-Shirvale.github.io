/* ============================================================
   families.js — the six story worlds.

   Every world is secretly built around ONE pair of letters that
   readers with dyslexia commonly confuse. The child never sees
   that: they are with "Bud the Dog", not "the b/d world". The pair
   only appears on the teacher/parent dashboard.

     Bud the Dog      b / d      Nell's Sunny Day   n / u
     Pip and the Duck p / q      Sam and the Cat    c / s
     Windy Day Kite   m / w      Gran's Jam         g / j

   The stories are for SMALL children: things they know (a dog, a
   duck, a kite, a cat, jam), short sentences, easy words, about
   forty words a chapter. The letters being watched come up again
   and again, because that is the point — but the story never needs
   a hard word to do it.

   Each world has three chapters. A chapter is read aloud, then
   written: the child hears three short sentences from it and
   writes them. Finishing all three earns the world's badge.
   ============================================================ */

(function (S) {
  'use strict';

  S.WORLDS = [
    {
      id: 'bd', pair: 'bd', letters: ['b', 'd'], pairs: ['bd'], swap: { b: 'd', d: 'b' },
      title: 'Bud the Dog', genre: 'Pets', badge: 'Dog Helper', tone: 'yard',
      blurb: 'Bud is a big dog who loves his bed and his bone.',
      chapters: [
        { id: 'scr-bd', title: 'Bud\'s Bed',
          text: 'Bud is a big dog. Bud has a bed. The bed is big and soft. Bud digs in his bed. ' +
                'Dad says, "Bud, stop!" Bud does a big bark.',
          write: ['Bud is a big dog.', 'Bud has a big bed.', 'Dad said no.'] },
        { id: 'w-bd-2', title: 'The Bone',
          text: 'Dad gave Bud a bone. Bud hid the bone in the garden. Bud dug a deep hole. ' +
                'Bob, the baby, did a big giggle. Bud dug it up and ran back to Bob.',
          write: ['Dad gave Bud a bone.', 'Bud dug a deep hole.', 'Bob did a big giggle.'] },
        { id: 'w-bd-3', title: 'Bath Day',
          text: 'Today is bath day. Bud does not like the bath. Dad fills the bath with bubbles. ' +
                'Bud jumps in with a big splash! Bud is a bubbly, happy dog.',
          write: ['Today is bath day.', 'Bud is in the bubbles.', 'Dad dries Bud.'] }
      ]
    },
    {
      id: 'pq', pair: 'pq', letters: ['p', 'q'], pairs: ['pq', 'bp'], swap: { p: 'q', q: 'p' },
      title: 'Pip and the Duck', genre: 'Animals', badge: 'Pond Pal', tone: 'pond',
      blurb: 'Pip the pup plays with a quacking duck.',
      chapters: [
        { id: 'scr-pq', title: 'The Pond',
          text: 'Pip is a little pup. Pip plays by the pond. A duck is in the pond. ' +
                'Quack, quack! Pip jumps up. Pip is not quiet.',
          write: ['Pip is a pup.', 'The duck says quack.', 'Pip is quick.'] },
        { id: 'w-pq-2', title: 'Puddle Fun',
          text: 'It is a wet day. Pip finds a big puddle. Pip pops in the puddle. Splash! ' +
                'The duck quacks and quacks. Pip pulls a stick from the puddle.',
          write: ['Pip finds a puddle.', 'Pip plays in the puddle.', 'The duck quacks.'] },
        { id: 'w-pq-3', title: 'The Quilt',
          text: 'Pip is wet and cold. Mum puts a soft quilt on Pip. The quilt is pink. ' +
                'Pip is quiet now. Pip is fast asleep on the quilt.',
          write: ['Mum puts on a quilt.', 'The quilt is pink.', 'Pip is quiet.'] }
      ]
    },
    {
      id: 'mw', pair: 'mw', letters: ['m', 'w'], pairs: ['mw'], swap: { m: 'w', w: 'm' },
      title: 'Windy Day Kite', genre: 'Weather', badge: 'Kite Flyer', tone: 'windy',
      blurb: 'It\'s a windy day! Fly a kite with Mum and Max.',
      chapters: [
        { id: 'scr-mw', title: 'The Wind',
          text: 'It is a windy day. Mum and Max go up the hill. Mum has a kite. ' +
                'The wind pulls the kite up, up, up! Max waves at the kite.',
          write: ['It is a windy day.', 'Mum has a kite.', 'Max waves.'] },
        { id: 'w-mw-2', title: 'The Kite Runs Away',
          text: 'The kite is red. It has a long tail. The wind blows the kite away! ' +
                'Max runs and runs. Mum runs with Max. They want the kite back.',
          write: ['The wind is wild.', 'Mum and Max run.', 'The kite is away.'] },
        { id: 'w-mw-3', title: 'Home Time',
          text: 'The kite lands in a tree. Max climbs up and gets it. Mum is so glad. ' +
                'They walk home. Mum makes warm milk. Max waves bye to the wind.',
          write: ['Max gets the kite.', 'Mum makes warm milk.', 'We walk home.'] }
      ]
    },
    {
      id: 'nu', pair: 'nu', letters: ['n', 'u'], pairs: ['nu'], swap: { n: 'u', u: 'n' },
      title: 'Nell\'s Sunny Day', genre: 'Fun', badge: 'Sun Star', tone: 'sunny',
      blurb: 'Nell and Nan have fun in the sun.',
      chapters: [
        { id: 'w-nu-1', title: 'Sun Fun',
          text: 'Nell has a sun hat. It is a sunny day. Nell and Nan run in the sun. ' +
                'Nell has fun. Nan has a nut bun.',
          write: ['Nell has a sun hat.', 'Nan runs in the sun.', 'We have fun.'] },
        { id: 'w-nu-2', title: 'Under the Tree',
          text: 'Nell and Nan sit under a tree. Nan has nine nuts. A little bug runs under a nut. ' +
                'Nell laughs. It is fun in the sun.',
          write: ['Nan has nine nuts.', 'They sit under a tree.', 'A bug runs under a nut.'] },
        { id: 'w-nu-3', title: 'Nap Time',
          text: 'The sun is hot. Nan has a nap under the tree. Nell hums a tune. ' +
                'Then it is time to go. Nell and Nan run home for lunch.',
          write: ['Nan has a nap.', 'Nell hums a tune.', 'They run home.'] }
      ]
    },
    {
      id: 'cs', pair: 'cs', letters: ['c', 's'], pairs: ['cs', 'sz'], swap: { c: 's', s: 'c' },
      title: 'Sam and the Cat', genre: 'Home', badge: 'Cat Friend', tone: 'home',
      blurb: 'Sam has a cat. The cat gets into lots of fun.',
      chapters: [
        { id: 'scr-cs', title: 'Cat on the Mat',
          text: 'Sam has a cat. The cat sits on a mat. Sam sits next to the cat. ' +
                'The cat is soft. Sam is so happy.',
          write: ['Sam has a cat.', 'The cat sits on a mat.', 'The cat is soft.'] },
        { id: 'w-cs-2', title: 'The Sock',
          text: 'The cat has a sock. It is Sam\'s sock! Sam says, "Cat, drop it!" ' +
                'The cat runs. Sam runs after the cat. Sam is so silly.',
          write: ['The cat has a sock.', 'Sam says stop.', 'Sam runs after the cat.'] },
        { id: 'w-cs-3', title: 'The Cake',
          text: 'Sam makes a cake. The cat smells the cake. Sam cuts the cake. ' +
                'Sam gets a slice and the cat gets milk. They sit and smile.',
          write: ['Sam makes a cake.', 'The cat smells the cake.', 'We sit and smile.'] }
      ]
    },
    {
      id: 'gj', pair: 'gj', letters: ['g', 'j'], pairs: ['gj', 'dg'], swap: { g: 'j', j: 'g' },
      title: 'Gran\'s Jam', genre: 'Food', badge: 'Jam Maker', tone: 'kitchen',
      blurb: 'Gran makes jam, and Jess helps. Yum!',
      chapters: [
        { id: 'scr-gj', title: 'The Jam Jar',
          text: 'Gran has jam. Jess helps Gran. Jess gets the jam jar. The jam is red and sweet. ' +
                'Jess gives Gran a hug.',
          write: ['Gran has jam.', 'Jess gets a jar.', 'Jess gives a hug.'] },
        { id: 'w-gj-2', title: 'Jam on Bread',
          text: 'Gran puts jam on the bread. Jess is so glad. Jess gobbles it up. Yum! ' +
                'Jess giggles and Gran giggles too.',
          write: ['Gran puts jam on the bread.', 'Jess is glad.', 'Jess giggles.'] },
        { id: 'w-gj-3', title: 'The Garden',
          text: 'Gran has a big garden. A frog jumps in the grass. Jess giggles. ' +
                'The frog jumps again. Jess jumps too! Gran laughs.',
          write: ['A frog jumps in the garden.', 'Jess jumps too.', 'Gran laughs.'] }
      ]
    }
  ];

  /* Memory tips for the letters — used as cues, never as titles. */
  var TIPS = {
    bd: 'Make a "bed" with your hands. Your left fist is b, your right fist is d.',
    pq: 'p has its tail on the left. q always comes with u, like in queen.',
    mw: 'm has mountains on top. w has waves at the bottom.',
    nu: 'n is a bridge you walk over. u is a cup that holds water.',
    cs: 'c says "k" in cat, but "s" in city and ice.',
    gj: 'g says "g" in goat, but "j" in jam. j wears a dot like a hat.'
  };

  /* ── compatibility: the shape older code expects ──────── */
  S.WORLDS.forEach(function (w, i) {
    w.index = i;
    w.tip = TIPS[w.id];
    w.stories = w.chapters;
    w.dictation = w.chapters.reduce(function (all, c) { return all.concat(c.write); }, []);
    w.pic = { yard: 'dog', pond: 'fish', windy: 'cloud', sunny: 'sun', home: 'cat', kitchen: 'apple' }[w.tone];
  });
  S.FAMILIES = S.WORLDS;

  S.world = S.family = function (id) {
    return S.WORLDS.filter(function (f) { return f.id === id; })[0] || null;
  };

  S.familyOfStory = function (storyId) {
    for (var i = 0; i < S.WORLDS.length; i++) {
      for (var j = 0; j < S.WORLDS[i].chapters.length; j++) {
        if (S.WORLDS[i].chapters[j].id === storyId) return S.WORLDS[i];
      }
    }
    return null;
  };

  /* ── confusion classes ───────────────────────────────────
     The six pairs the dashboard tracks. Related pairs fold into
     their world's class: b/p counts as p/q, s/z as c/s, d/g as g/j. */
  S.CLASSES = ['bd', 'pq', 'mw', 'nu', 'cs', 'gj'];
  var FOLD = { bp: 'pq', sz: 'cs', dg: 'gj' };
  S.classOfPair = function (key) { return FOLD[key] || key; };

  S.familyOfPair = function (key) {
    var k = S.classOfPair(key);
    return S.WORLDS.filter(function (w) { return w.pair === k; })[0] || null;
  };

  /**
   * Which confusion class a word belongs to (does it contain that
   * pair's letters?). With `strict` and a preferred class, a word
   * outside the preferred pair is an ORDINARY word (null) — that is
   * what lets hesitation on target words be compared with hesitation
   * on everything else.
   */
  S.classOfWord = function (word, prefer, strict) {
    var w = S.norm(word);
    if (!w) return null;
    function has(cls) { return w.indexOf(cls[0]) > -1 || w.indexOf(cls[1]) > -1; }
    if (prefer && has(prefer)) return prefer;
    if (prefer && strict) return null;
    for (var i = 0; i < S.CLASSES.length; i++) if (has(S.CLASSES[i])) return S.CLASSES[i];
    return null;
  };

  /**
   * How many words in a text contain each pair's letters — the
   * "exposure". A child who meets 8 b/d words and slips twice is
   * not doing worse than one who meets 40 and slips four times,
   * so every session records how much it asked of each pair.
   */
  S.exposureOf = function (text) {
    var out = {};
    S.CLASSES.forEach(function (c) { out[c] = 0; });
    String(text || '').split(/\s+/).forEach(function (raw) {
      var w = S.norm(raw);
      if (!w) return;
      S.CLASSES.forEach(function (c) { if (w.indexOf(c[0]) > -1 || w.indexOf(c[1]) > -1) out[c]++; });
    });
    return out;
  };

  /** The confusable twin of a word: "dog" → "bog". Null if none. */
  S.twinOf = function (word, cls) {
    var w = String(word || '');
    var classes = cls ? [cls].concat(S.CLASSES) : S.CLASSES;
    for (var c = 0; c < classes.length; c++) {
      var a = classes[c][0], b = classes[c][1];
      for (var i = 0; i < w.length; i++) {
        var ch = w[i].toLowerCase();
        if (ch === a || ch === b) {
          var to = ch === a ? b : a;
          if (w[i] !== ch) to = to.toUpperCase();
          return w.slice(0, i) + to + w.slice(i + 1);
        }
      }
    }
    return null;
  };

  /** A friendly picture banner for each world. */
  S.worldArt = function (w, locked) {
    var art = {
      yard: '<rect width="320" height="120" fill="#BFE6F7"/><circle cx="272" cy="26" r="17" fill="#FFD75E"/>' +
            '<ellipse cx="56" cy="30" rx="28" ry="10" fill="#fff"/><ellipse cx="78" cy="24" rx="20" ry="9" fill="#fff"/>' +
            '<rect y="86" width="320" height="34" fill="#7CC36A"/>' +
            '<rect x="206" y="58" width="62" height="40" fill="#C97B4A"/><path d="M198 60 L237 30 L276 60Z" fill="#B5473A"/>' +
            '<path d="M225 98 V80 a12 12 0 0 1 24 0 V98Z" fill="#3A2416"/>' +
            '<path d="M86 84 q-22 -6 -26 -26" stroke="#B07A4A" stroke-width="7" fill="none" stroke-linecap="round"/>' +
            '<ellipse cx="116" cy="86" rx="32" ry="17" fill="#B07A4A"/><rect x="92" y="94" width="9" height="16" rx="3" fill="#8E5F38"/><rect x="130" y="94" width="9" height="16" rx="3" fill="#8E5F38"/>' +
            '<circle cx="150" cy="68" r="15" fill="#C68A55"/><ellipse cx="163" cy="64" rx="6" ry="11" fill="#8E5F38"/>' +
            '<circle cx="146" cy="65" r="2.6" fill="#2B2118"/><ellipse cx="158" cy="73" rx="4.5" ry="3.4" fill="#2B2118"/>' +
            '<path d="M142 96 q8 14 18 0z" fill="#F08A8A"/>',
      pond: '<rect width="320" height="120" fill="#CFEBFA"/><circle cx="40" cy="24" r="14" fill="#FFD75E"/>' +
            '<rect y="88" width="320" height="32" fill="#8CCB6E"/><ellipse cx="170" cy="86" rx="110" ry="26" fill="#5BB3E6"/>' +
            '<ellipse cx="170" cy="86" rx="90" ry="19" fill="#7CC6F0"/>' +
            '<ellipse cx="108" cy="92" rx="16" ry="6" fill="#4FA95A"/><ellipse cx="232" cy="96" rx="14" ry="5" fill="#4FA95A"/>' +
            '<ellipse cx="172" cy="84" rx="26" ry="16" fill="#FFD34D"/><circle cx="196" cy="68" r="12" fill="#FFD34D"/>' +
            '<path d="M206 68 l14 4 -14 5z" fill="#F5873A"/><circle cx="199" cy="65" r="2.4" fill="#2B2118"/>' +
            '<path d="M160 82 q10 -10 22 0" stroke="#E8B820" stroke-width="4" fill="none"/>' +
            '<ellipse cx="38" cy="96" rx="22" ry="13" fill="#B07A4A"/><circle cx="58" cy="84" r="11" fill="#C68A55"/>' +
            '<ellipse cx="68" cy="80" rx="5" ry="9" fill="#8E5F38"/><circle cx="58" cy="82" r="2.2" fill="#2B2118"/>',
      windy: '<rect width="320" height="120" fill="#D6F0FF"/><ellipse cx="60" cy="28" rx="34" ry="11" fill="#fff"/><ellipse cx="86" cy="22" rx="22" ry="10" fill="#fff"/>' +
             '<path d="M0 104 Q90 70 190 98 T320 92 V120 H0Z" fill="#7CC36A"/>' +
             '<g stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"><path d="M20 62 q30 -14 60 0 t50 -6"/><path d="M40 82 q26 -10 52 0"/></g>' +
             '<path d="M226 16 L252 46 L226 76 L200 46Z" fill="#E2503A"/><path d="M226 16 V76 M200 46 H252" stroke="#fff" stroke-width="2"/>' +
             '<path d="M226 76 q-10 14 4 24 t-8 20" stroke="#8B5E3C" stroke-width="2.5" fill="none"/>' +
             '<path d="M229 90 l10 -4 -4 10z M222 108 l-10 -3 5 9z" fill="#F5B731"/>',
      sunny: '<rect width="320" height="120" fill="#FFF1B8"/><g stroke="#FFC93C" stroke-width="5" stroke-linecap="round">' +
             '<path d="M250 6 v10 M250 74 v10 M216 40 h-10 M294 40 h10 M226 16 l-7 -7 M274 64 l7 7 M274 16 l7 -7 M226 64 l-7 7"/></g>' +
             '<circle cx="250" cy="40" r="22" fill="#FFC93C"/><circle cx="243" cy="36" r="2.6" fill="#7A4A00"/><circle cx="257" cy="36" r="2.6" fill="#7A4A00"/>' +
             '<path d="M241 46 q9 8 18 0" stroke="#7A4A00" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
             '<path d="M0 100 Q100 70 200 96 T320 90 V120 H0Z" fill="#8FD16A"/>' +
             '<rect x="86" y="58" width="12" height="40" fill="#8B5E3C"/><circle cx="92" cy="50" r="28" fill="#4FB06D"/><circle cx="74" cy="62" r="16" fill="#5CC27A"/><circle cx="110" cy="62" r="16" fill="#5CC27A"/>' +
             '<circle cx="30" cy="104" r="4" fill="#E0558B"/><circle cx="46" cy="110" r="4" fill="#fff"/><circle cx="150" cy="106" r="4" fill="#E0558B"/>',
      home: '<rect width="320" height="120" fill="#FBE8D2"/><rect y="88" width="320" height="32" fill="#D9A87A"/>' +
            '<rect x="30" y="14" width="64" height="52" rx="3" fill="#9FD0EC" stroke="#8B5E3C" stroke-width="4"/><path d="M62 14 V66 M30 40 H94" stroke="#8B5E3C" stroke-width="3"/>' +
            '<rect x="130" y="92" width="110" height="18" rx="8" fill="#5B7FC7"/>' +
            '<ellipse cx="186" cy="82" rx="26" ry="18" fill="#E8894A"/><circle cx="168" cy="62" r="15" fill="#F09C5C"/>' +
            '<path d="M156 52 l-2 -14 12 8z M178 50 l4 -14 8 12z" fill="#E8894A"/>' +
            '<circle cx="163" cy="61" r="2.4" fill="#2B2118"/><circle cx="174" cy="61" r="2.4" fill="#2B2118"/><path d="M166 67 l2 3 2 -3z" fill="#C25A47"/>' +
            '<path d="M210 86 q26 -6 18 -28" stroke="#E8894A" stroke-width="7" fill="none" stroke-linecap="round"/>' +
            '<path d="M262 76 h18 v24 q-9 6 -18 0z" fill="#E2503A"/><rect x="262" y="70" width="18" height="8" fill="#fff"/>' +
            '<rect x="276" y="84" width="22" height="18" rx="3" fill="#F5B731"/>',
      kitchen: '<rect width="320" height="120" fill="#FFE9EE"/><rect y="84" width="320" height="36" fill="#C9936A"/>' +
               '<rect x="20" y="30" width="110" height="6" rx="3" fill="#8B5E3C"/>' +
               '<rect x="150" y="38" width="56" height="58" rx="10" fill="#D6243E"/><rect x="146" y="30" width="64" height="12" rx="5" fill="#E8B84C"/>' +
               '<rect x="158" y="56" width="40" height="24" rx="4" fill="#fff"/><circle cx="178" cy="68" r="6" fill="#D6243E"/>' +
               '<rect x="40" y="62" width="68" height="34" rx="6" fill="#F2D7A0"/><rect x="40" y="62" width="68" height="8" rx="4" fill="#C9884A"/>' +
               '<rect x="48" y="70" width="52" height="14" rx="4" fill="#D6243E"/>' +
               '<path d="M236 50 h30 v46 a8 8 0 0 1 -8 8 h-14 a8 8 0 0 1 -8 -8z" fill="#5B9BEA"/><path d="M266 58 q16 4 0 28" stroke="#5B9BEA" stroke-width="6" fill="none"/>' +
               '<circle cx="292" cy="28" r="14" fill="#7CC36A"/><path d="M292 14 v-8" stroke="#8B5E3C" stroke-width="3"/>'
    }[w.tone] || '';
    return '<svg class="world-art' + (locked ? ' locked' : '') + '" viewBox="0 0 320 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + art + '</svg>';
  };

  /* Kept for older callers: the first chapter of each world. */
  S.SCREENING = S.WORLDS.map(function (w) {
    return Object.assign({ pairs: w.pairs, family: w.id, about: w.title }, w.chapters[0]);
  });

})(window.Spark);
