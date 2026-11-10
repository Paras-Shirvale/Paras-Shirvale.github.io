/* ============================================================
   families.js — the six story worlds.

   Every world is secretly built around ONE pair of letters that
   readers with dyslexia commonly confuse. The child never sees
   that: they are on "Deep Sea Signal", not "the b/d world". The
   pair only appears on the teacher/parent dashboard.

     Deep Sea Signal     b / d        Night Market Run   n / u
     Pyramid Puzzle      p / q        Glitch Lab         c / s
     Storm Chaser        m / w        Jungle Expedition  g / j

   Each world has three chapters. A chapter is read aloud, then
   written: the child hears three sentences from the chapter and
   writes them. Finishing all three chapters earns the world's
   badge. The next world unlocks when a chapter of this one is done.

   For older code, each world also answers to the shape the app
   used before (S.FAMILIES, .stories, .dictation, .bank).
   ============================================================ */

(function (S) {
  'use strict';

  S.WORLDS = [
    {
      id: 'bd', pair: 'bd', letters: ['b', 'd'], pairs: ['bd'], swap: { b: 'd', d: 'b' },
      title: 'Deep Sea Signal', genre: 'Mystery', badge: 'Signal Decoded', tone: 'sea',
      blurb: 'A crew aboard submarine BD-7 picks up a signal no one can decode. You\'re the only one who can read it.',
      chapters: [
        { id: 'scr-bd', title: 'The Signal',
          text: 'Deep below the waves, the submarine BD-7 drifted in the dark. Dina sat by the radio and listened. ' +
                'A beep came, then a buzz, then a dull drum beat. "Bob, did you hear that?" she called. ' +
                'Bob dropped his book and dashed to the dials.',
          write: ['Dina heard a beep.', 'Bob dropped his book.', 'The sub drifted in the dark.'] },
        { id: 'w-bd-2', title: 'Down to the Sea Bed',
          text: 'The signal came from the sea bed, far below. Bob steered the sub down, past big blue fish and bubbling vents. ' +
                'Dina pointed to a dim box buried in the sand. A bright badge glowed on the lid. ' +
                '"Somebody left this here," said Bob.',
          write: ['Bob steered the sub down.', 'A box was buried in the sand.', 'The badge was bright.'] },
        { id: 'w-bd-3', title: 'Signal Decoded',
          text: 'Back on board, Dina opened the box with a bang. Inside was a tiny device blinking red and blue. ' +
                'Bob studied the dots and dashes on the side. "It\'s a diver\'s beacon," he said. "We can bring the diver back!" ' +
                'The crew cheered as BD-7 rose to the surface.',
          write: ['Dina opened the box.', 'The device blinked red and blue.', 'The crew cheered.'] }
      ]
    },
    {
      id: 'pq', pair: 'pq', letters: ['p', 'q'], pairs: ['pq', 'bp'], swap: { p: 'q', q: 'p' },
      title: 'Pyramid Puzzle', genre: 'Adventure', badge: 'Pyramid Unlocked', tone: 'sand',
      blurb: 'Ancient carvings, hidden passages, a queen\'s secret. Only the right words will open the next door.',
      chapters: [
        { id: 'scr-pq', title: 'The Hidden Passage',
          text: 'Pia and her pal Quin stood at the foot of the pyramid. A painted panel showed a queen with a pet parrot. ' +
                'Pia pressed a pebble in the panel and it popped open. A narrow passage sloped deep into the stone. ' +
                '"Quick, bring the lamp," Quin whispered.',
          write: ['Pia pressed a pebble.', 'The panel popped open.', 'Quin was quick.'] },
        { id: 'w-pq-2', title: 'The Queen\'s Riddle',
          text: 'In a quiet room they found a pool of pale sand. Carved on the wall was a question about a pyramid with no peak. ' +
                'Pia picked up a pointed pin from the floor. Quin spotted a pattern of pearls around a square plate. ' +
                'Together they placed the pin in the plate.',
          write: ['They found a quiet room.', 'Pia picked up a pin.', 'Quin spotted a pattern.'] },
        { id: 'w-pq-3', title: 'Pyramid Unlocked',
          text: 'With a deep rumble, a stone door opened upward. Behind it was the queen\'s purple cape and a pot of gold pennies. ' +
                'A painted map showed the path back to the palace. "The queen hid her secret to keep it safe," said Pia. ' +
                'They put everything back and promised to keep the puzzle quiet.',
          write: ['A stone door opened.', 'The queen had a purple cape.', 'They kept the secret quiet.'] }
      ]
    },
    {
      id: 'mw', pair: 'mw', letters: ['m', 'w'], pairs: ['mw'], swap: { m: 'w', w: 'm' },
      title: 'Storm Chaser', genre: 'Science', badge: 'Storm Tracked', tone: 'storm',
      blurb: 'You\'re part of a weather research team tracking a monster cyclone. Every word in your report could save lives.',
      chapters: [
        { id: 'scr-mw', title: 'The Warning',
          text: 'The weather van was parked at the edge of the meadow. Max watched the clouds swirl into a wide white wall. ' +
                '"The wind is moving west," said Mum, checking the map. Warm rain began to whip the windows. ' +
                '"We must warn the town," Max said.',
          write: ['Max watched the clouds.', 'The wind was warm.', 'We must warn the town.'] },
        { id: 'w-mw-2', title: 'Into the Wind',
          text: 'Mum drove the van down the muddy road. Wild winds made the trees wave and moan. ' +
                'Max held the weather meter out of the window. The numbers went up and up. ' +
                '"This storm is massive," he whispered.',
          write: ['Mum drove the van.', 'The trees waved in the wind.', 'Max held the meter.'] },
        { id: 'w-mw-3', title: 'Storm Tracked',
          text: 'At midnight the storm moved away from the town. Max wrote the last numbers in his report. ' +
                'Mum sent the warning to the mayor, and everyone stayed safe. In the morning the sky was calm and the meadow was wet. ' +
                '"We made it," said Max with a wide smile.',
          write: ['Max wrote the report.', 'The storm moved away.', 'The morning was calm.'] }
      ]
    },
    {
      id: 'nu', pair: 'nu', letters: ['n', 'u'], pairs: ['nu'], swap: { n: 'u', u: 'n' },
      title: 'Night Market Run', genre: 'Chase', badge: 'Market Mystery Solved', tone: 'market',
      blurb: 'Someone left a note at the night market. You have one hour to follow the clues before the market closes.',
      chapters: [
        { id: 'w-nu-1', title: 'The Note',
          text: 'Nina found a note under a bun at the night market. It said: run to the blue tent before the sun comes up. ' +
                'Lanterns hung over the stalls like round orange moons. Nina tucked the note in her pocket and began to run. ' +
                'Somewhere, a drum began to thump.',
          write: ['Nina found a note.', 'She began to run.', 'The lanterns were round.'] },
        { id: 'w-nu-2', title: 'Under the Lanterns',
          text: 'At the blue tent, a man was selling hot nuts and buns. "Nobody leaves a note for no reason," he said. ' +
                'He pointed to a number painted on a tub. Nina turned the tub and found a second note. ' +
                'It said: find the drum under the bridge.',
          write: ['The man sold hot nuts.', 'Nina turned the tub.', 'Run under the bridge.'] },
        { id: 'w-nu-3', title: 'The Last Clue',
          text: 'Under the bridge, Nina found the drummer. It was her uncle Nuno! He had planned a fun hunt for her birthday. ' +
                'Inside his drum was a new sun hat and a bag of buns. Nina laughed and hugged him as the market began to close. ' +
                'It was the best night run ever.',
          write: ['Nina found her uncle.', 'The hunt was fun.', 'She got a new sun hat.'] }
      ]
    },
    {
      id: 'cs', pair: 'cs', letters: ['c', 's'], pairs: ['cs', 'sz'], swap: { c: 's', s: 'c' },
      title: 'Glitch Lab', genre: 'Sci-fi', badge: 'System Fixed', tone: 'lab',
      blurb: 'An AI in a research lab is sending garbled messages. Only someone who can read between the errors can fix it.',
      chapters: [
        { id: 'scr-cs', title: 'Strange Messages',
          text: 'In the science lab, the computer screen flickered. Cass saw a strange message: send help, the circuit is sick. ' +
                'Sam checked the cables and the socket. "Something is causing a glitch," he said. ' +
                'The fans in the case began to hiss.',
          write: ['Cass saw a message.', 'Sam checked the cables.', 'The fans began to hiss.'] },
        { id: 'w-cs-2', title: 'Inside the Circuit',
          text: 'Cass opened the case carefully. A small spider sat on a silver circuit. ' +
                'Its web was crossing two wires and making sparks. Sam slid a cup over the spider and carried it outside. ' +
                '"Sorry, little scientist," said Cass.',
          write: ['Cass opened the case.', 'A spider sat on the circuit.', 'Sam carried it outside.'] },
        { id: 'w-cs-3', title: 'System Fixed',
          text: 'The screen came back to life with a soft click. The message said: thank you, the system is safe. ' +
                'Cass and Sam cleaned the circuit and closed the case. The messages were clear and correct at last. ' +
                '"Science is so cool," said Sam.',
          write: ['The screen came back.', 'The system was safe.', 'Science is so cool.'] }
      ]
    },
    {
      id: 'gj', pair: 'gj', letters: ['g', 'j'], pairs: ['gj', 'dg'], swap: { g: 'j', j: 'g' },
      title: 'Jungle Expedition', genre: 'Explorer', badge: 'Discovery Logged', tone: 'jungle',
      blurb: 'Your field journal is the only record of a species no one has seen before. Write it right — or lose the discovery.',
      chapters: [
        { id: 'scr-gj', title: 'Into the Jungle',
          text: 'Jess and Gus jumped off the jeep at the edge of the jungle. Giant green leaves hung over the path like umbrellas. ' +
                'Gus carried the journal and Jess carried the jar. "Keep your eyes open for anything strange," said Jess. ' +
                'Something jiggled in the grass.',
          write: ['Jess jumped off the jeep.', 'Gus carried the journal.', 'The leaves were giant.'] },
        { id: 'w-gj-2', title: 'The Glowing Frog',
          text: 'By a gentle stream, they saw a frog that glowed like a jewel. Its legs were gold and its back was bright orange. ' +
                'Gus began to draw it in the journal. Jess gently guided it into the jar to get a good look. ' +
                '"Nobody has ever seen this," she gasped.',
          write: ['The frog glowed like a jewel.', 'Gus began to draw it.', 'Jess was gentle.'] },
        { id: 'w-gj-3', title: 'Discovery Logged',
          text: 'Jess let the frog go back into the jungle. Gus wrote every detail in the journal: the glow, the gold legs, the gentle stream. ' +
                'Back at camp, they gave the journal to the expedition leader. "This is a giant discovery," she said. ' +
                'Jess and Gus grinned all the way home.',
          write: ['Jess let the frog go.', 'Gus wrote in the journal.', 'It was a giant discovery.'] }
      ]
    }
  ];

  /* Word banks for free practice, one per world, full of its letters. */
  var BANKS = {
    bd: { starters: ['The big dog', 'Dina had a', 'Bob saw', 'Down below'],
          who: ['Dina', 'Bob', 'the diver', 'a big fish', 'the crew'],
          doing: ['dived', 'dashed', 'grabbed', 'found', 'decoded', 'drifted'],
          what: ['a box', 'a badge', 'a beacon', 'some bubbles', 'a book'],
          where: ['by the door', 'on the sea bed', 'in the dark', 'below the boat'],
          describe: ['big', 'blue', 'bright', 'deep', 'dim'],
          glue: ['the', 'a', 'and', 'was', 'his', 'her', '.', '!'] },
    pq: { starters: ['The queen', 'Pia put', 'A quiet', 'Quickly,'],
          who: ['Pia', 'Quin', 'the queen', 'a parrot', 'my pal'],
          doing: ['pressed', 'picked up', 'peeped', 'pushed', 'played', 'popped'],
          what: ['a pebble', 'a pin', 'a pot', 'a puzzle', 'a purple cape'],
          where: ['in the pyramid', 'up the path', 'past the pool', 'at the palace'],
          describe: ['quick', 'quiet', 'pale', 'painted', 'purple'],
          glue: ['the', 'a', 'and', 'was', 'with', 'her', '.', '?'] },
    mw: { starters: ['The wind', 'Mum went', 'We watched', 'In the morning'],
          who: ['Max', 'Mum', 'we', 'the team', 'the mayor'],
          doing: ['watched', 'warned', 'moved', 'made', 'waved', 'wrote'],
          what: ['a map', 'the meter', 'some water', 'a warning', 'a window'],
          where: ['in the meadow', 'down the road', 'near the window', 'in the van'],
          describe: ['warm', 'wet', 'wild', 'massive', 'muddy'],
          glue: ['the', 'a', 'and', 'went', 'was', 'into', '.', '!'] },
    nu: { starters: ['Nina found', 'Under the', 'The man', 'At night'],
          who: ['Nina', 'uncle Nuno', 'the man', 'a dog', 'nobody'],
          doing: ['ran', 'found', 'turned', 'hunted', 'jumped', 'hugged'],
          what: ['a note', 'a bun', 'some nuts', 'a drum', 'a sun hat'],
          where: ['under the bridge', 'in the market', 'by the tent', 'up the hill'],
          describe: ['new', 'fun', 'round', 'hot', 'blue'],
          glue: ['the', 'a', 'and', 'in', 'on', 'was', '.', '!'] },
    cs: { starters: ['Cass saw', 'The screen', 'In the lab', 'Six cables'],
          who: ['Cass', 'Sam', 'the scientist', 'a spider', 'the computer'],
          doing: ['saw', 'sent', 'cycled', 'checked', 'cleaned', 'closed'],
          what: ['a circuit', 'a message', 'a cable', 'a cup', 'a socket'],
          where: ['in the lab', 'on the screen', 'in the case', 'outside'],
          describe: ['strange', 'small', 'silver', 'safe', 'cool'],
          glue: ['the', 'a', 'and', 'was', 'so', '.', '!'] },
    gj: { starters: ['Jess got', 'The giant', 'A green frog', 'Go and'],
          who: ['Jess', 'Gus', 'a frog', 'a giant', 'the guide'],
          doing: ['jumped', 'got', 'glowed', 'grinned', 'gave', 'jiggled'],
          what: ['a jar', 'a journal', 'a jewel', 'a jeep', 'a gift'],
          where: ['in the jungle', 'by the gate', 'in the grass', 'on the jeep'],
          describe: ['giant', 'green', 'gentle', 'gold', 'jolly'],
          glue: ['the', 'a', 'and', 'was', 'got', '.', '!'] }
  };

  /* Memory tips for the letters — used as cues, never as titles. */
  var TIPS = {
    bd: 'Make a "bed" with your hands. Your left fist is b, your right fist is d.',
    pq: 'p has its tail on the left. q always comes with u, like in queen.',
    mw: 'm has mountains on top. w has waves at the bottom.',
    nu: 'n is a bridge you walk over. u is a cup that holds water.',
    cs: 'c says "k" in cat, but "s" in city, cycle and ice.',
    gj: 'g says "g" in goat, but "j" in giant and gentle. j wears a dot like a hat.'
  };

  /* ── compatibility: the shape older code expects ──────── */
  S.WORLDS.forEach(function (w, i) {
    w.index = i;
    w.tip = TIPS[w.id];
    w.bank = BANKS[w.id];
    w.stories = w.chapters;
    w.dictation = w.chapters.reduce(function (all, c) { return all.concat(c.write); }, []);
    w.pic = { sea: 'fish', sand: 'star', storm: 'storm', market: 'moon', lab: 'rocket', jungle: 'tree' }[w.tone];
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
     The six cells of the teacher's heatmap. Related pairs fold
     into their world's class: b/p counts as p/q, s/z as c/s,
     d/g as g/j. Anything else keeps its own key. */
  S.CLASSES = ['bd', 'pq', 'mw', 'nu', 'cs', 'gj'];
  var FOLD = { bp: 'pq', sz: 'cs', dg: 'gj' };
  S.classOfPair = function (key) { return FOLD[key] || key; };

  S.familyOfPair = function (key) {
    var k = S.classOfPair(key);
    return S.WORLDS.filter(function (w) { return w.pair === k; })[0] || null;
  };

  /** Which confusion class a word belongs to, preferring one class. */
  S.classOfWord = function (word, prefer) {
    var w = S.norm(word);
    if (!w) return null;
    function has(cls) { var a = cls[0], b = cls[1]; return w.indexOf(a) > -1 || w.indexOf(b) > -1; }
    if (prefer && has(prefer)) return prefer;
    for (var i = 0; i < S.CLASSES.length; i++) if (has(S.CLASSES[i])) return S.CLASSES[i];
    return null;
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

  /** A story banner for each world — the picture on its card. */
  S.worldArt = function (w, locked) {
    var art = {
      sea: '<rect width="320" height="120" fill="#0E2A4D"/><path d="M0 98 Q80 76 160 92 T320 88 V120 H0Z" fill="#0A2240"/>' +
           '<ellipse cx="150" cy="62" rx="52" ry="20" fill="#2C6FD1"/><rect x="164" y="34" width="9" height="22" rx="4" fill="#4A8BEA"/>' +
           '<circle cx="128" cy="62" r="7" fill="#7FB2FF"/><path d="M188 52 q16 -12 32 2 M192 58 q12 -9 24 1" stroke="#A9C9F5" stroke-width="3" fill="none"/>' +
           '<circle cx="236" cy="36" r="5" fill="none" stroke="#7FB2FF" stroke-width="2"/><circle cx="252" cy="22" r="3.5" fill="none" stroke="#7FB2FF" stroke-width="2"/>',
      sand: '<rect width="320" height="120" fill="#2A1A05"/><circle cx="40" cy="20" r="2" fill="#E9B44C"/><circle cx="270" cy="16" r="2" fill="#E9B44C"/><circle cx="200" cy="30" r="1.5" fill="#E9B44C"/>' +
            '<path d="M80 104 L170 24 L260 104Z" fill="#5A3A10"/><path d="M170 24 L260 104 H205Z" fill="#4A300C"/>' +
            '<rect x="158" y="80" width="24" height="24" fill="#C8963C"/><rect x="164" y="86" width="12" height="18" fill="#3A2408"/>' +
            '<rect y="104" width="320" height="16" fill="#3A2408"/>',
      storm: '<rect width="320" height="120" fill="#0B2B24"/><ellipse cx="120" cy="34" rx="76" ry="22" fill="#14524A"/><ellipse cx="200" cy="26" rx="70" ry="22" fill="#1B6A5E"/>' +
             '<path d="M196 30 L180 64 H194 L184 92" stroke="#7DE0C4" stroke-width="4" fill="none" stroke-linejoin="round"/>' +
             '<g stroke="#2E8C7A" stroke-width="2"><path d="M30 70 L70 86"/><path d="M40 90 L80 104"/><path d="M250 70 L290 84"/></g>' +
             '<rect x="232" y="88" width="64" height="20" rx="5" fill="#1F7A68"/><circle cx="244" cy="110" r="6" fill="#0E3D35"/><circle cx="284" cy="110" r="6" fill="#0E3D35"/>',
      market: '<rect width="320" height="120" fill="#2A0E0A"/><path d="M30 18 Q100 36 160 22 T290 20" stroke="#8C3A22" stroke-width="2" fill="none"/>' +
              '<circle cx="70" cy="30" r="9" fill="#E59A7A"/><circle cx="130" cy="28" r="8" fill="#E8B862"/><circle cx="190" cy="26" r="9" fill="#E59A7A"/><circle cx="250" cy="22" r="7" fill="#E8B862"/>' +
              '<rect x="0" y="60" width="44" height="60" fill="#3A140E"/><rect x="250" y="56" width="70" height="64" fill="#3A140E"/>' +
              '<rect x="78" y="76" width="44" height="44" fill="#6A2414"/><rect x="132" y="72" width="44" height="48" fill="#6A2414"/><rect x="186" y="80" width="40" height="40" fill="#6A2414"/>' +
              '<circle cx="56" cy="78" r="6" fill="#F3C1A8"/><path d="M56 84 V98 M56 98 l-6 8 M56 98 l6 8 M48 90 h16" stroke="#E07A4A" stroke-width="3"/>',
      lab: '<rect width="320" height="120" fill="#120F33"/><g stroke="#221E52" stroke-width="1"><path d="M0 40 H320 M0 80 H320 M80 0 V120 M160 0 V120 M240 0 V120"/></g>' +
           '<rect x="104" y="40" width="104" height="66" rx="8" fill="#2A2470"/><rect x="112" y="48" width="88" height="50" rx="4" fill="#15123A"/>' +
           '<rect x="120" y="56" width="60" height="5" rx="2" fill="#8C7DF0"/><rect x="120" y="66" width="44" height="5" rx="2" fill="#8C7DF0"/><rect x="120" y="76" width="66" height="5" rx="2" fill="#6A5BD6"/>' +
           '<rect x="96" y="22" width="56" height="10" rx="4" fill="#6A5BD6"/><circle cx="236" cy="52" r="20" fill="#2A2470"/><circle cx="236" cy="52" r="8" fill="#B9AEF8"/>',
      jungle: '<rect width="320" height="120" fill="#1F4510"/><ellipse cx="60" cy="10" rx="80" ry="40" fill="#2D5E18"/><ellipse cx="260" cy="14" rx="90" ry="44" fill="#2D5E18"/>' +
              '<ellipse cx="80" cy="68" rx="46" ry="26" fill="#386F1C"/><ellipse cx="240" cy="62" rx="52" ry="24" fill="#386F1C"/>' +
              '<circle cx="96" cy="60" r="3" fill="#C8E6A0"/><circle cx="256" cy="56" r="3" fill="#C8E6A0"/><rect y="94" width="320" height="26" fill="#2D5E18"/>' +
              '<circle cx="160" cy="80" r="7" fill="#F3C1A8"/><path d="M150 74 h20 l-4 -6 h-12z" fill="#8C5A2A"/><rect x="154" y="88" width="12" height="16" rx="3" fill="#5E8C2A"/>'
    }[w.tone] || '';
    return '<svg class="world-art' + (locked ? ' locked' : '') + '" viewBox="0 0 320 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + art + '</svg>';
  };

  /* Kept for the old letter-check list: the first chapter of each world. */
  S.SCREENING = S.WORLDS.map(function (w) {
    return Object.assign({ pairs: w.pairs, family: w.id, about: w.title }, w.chapters[0]);
  });

})(window.Spark);
