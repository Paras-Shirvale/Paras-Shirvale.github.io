/* ============================================================
   pictures.js — a picture for a word, not an emoji.

   Emoji are the wrong tool here. They render differently on every
   device, many are faces or symbols rather than pictures of the
   thing, and at the size a picture clue needs to be they turn into
   a blur. A child looking for "what does *condenses* mean" is not
   helped by a droplet glyph.

   So there are two real sources, in order:

   1. A drawn set, below. Flat SVG illustrations of the words that
      actually appear in the reading library. They ship with the
      project, so they work with no network, they scale to any
      size, and they follow the light/dark theme.

   2. ARASAAC, for anything else. A free, open pictogram library
      built for exactly this — communication and learning support.
      No key, no sign-up. Pictograms are cached in the browser
      after the first fetch, so a word is only fetched once.

   If neither has anything, the card says so rather than showing a
   shrug emoji. "No picture for this one" is honest and the child
   can still hear it and see its parts.

   ARASAAC pictograms: © ARASAAC, Government of Aragón (Spain),
   by Sergio Palao, licensed CC BY-NC-SA.  https://arasaac.org
   ============================================================ */

(function (S) {
  'use strict';

  var P = S.Pictures = {};

  /* ── the drawn set ──────────────────────────────────────
     Each entry is the inner markup of a 48x48 SVG. Colours are
     literal because these are illustrations, not interface — but
     the few structural strokes use currentColor so outlines stay
     visible in both themes. */
  var DRAWN = {

    cat: '<ellipse cx="24" cy="31" rx="12" ry="9" fill="#E8894A"/>' +
         '<circle cx="24" cy="19" r="9" fill="#F09C5C"/>' +
         '<path d="M16 13 L15 6 L21 10 Z" fill="#E8894A"/>' +
         '<path d="M32 13 L33 6 L27 10 Z" fill="#E8894A"/>' +
         '<circle cx="20.5" cy="18" r="1.6" fill="#2B2118"/>' +
         '<circle cx="27.5" cy="18" r="1.6" fill="#2B2118"/>' +
         '<path d="M24 21 l-2 2 h4 z" fill="#C25A47"/>' +
         '<path d="M35 33 q6 -2 6 -8" stroke="#E8894A" stroke-width="3.5" fill="none" stroke-linecap="round"/>',

    dog: '<ellipse cx="24" cy="32" rx="12" ry="8" fill="#B07A4A"/>' +
         '<circle cx="24" cy="19" r="9" fill="#C68A55"/>' +
         '<ellipse cx="13" cy="19" rx="4" ry="7" fill="#8E5F38"/>' +
         '<ellipse cx="35" cy="19" rx="4" ry="7" fill="#8E5F38"/>' +
         '<circle cx="21" cy="18" r="1.6" fill="#2B2118"/>' +
         '<circle cx="27" cy="18" r="1.6" fill="#2B2118"/>' +
         '<ellipse cx="24" cy="23" rx="2.6" ry="2" fill="#2B2118"/>',

    sofa: '<rect x="5" y="22" width="38" height="14" rx="3" fill="#5B7FC7"/>' +
          '<rect x="8" y="14" width="32" height="12" rx="3" fill="#7496D8"/>' +
          '<rect x="3" y="18" width="7" height="16" rx="3" fill="#44639F"/>' +
          '<rect x="38" y="18" width="7" height="16" rx="3" fill="#44639F"/>' +
          '<rect x="8" y="36" width="3" height="5" fill="#3A4D6B"/>' +
          '<rect x="37" y="36" width="3" height="5" fill="#3A4D6B"/>',

    sun: '<circle cx="24" cy="24" r="10" fill="#F5B731"/>' +
         '<g stroke="#F5B731" stroke-width="3" stroke-linecap="round">' +
         '<path d="M24 5v5M24 38v5M5 24h5M38 24h5M11 11l3.5 3.5M33.5 33.5L37 37M37 11l-3.5 3.5M14.5 33.5L11 37"/></g>',

    cloud: '<ellipse cx="18" cy="28" rx="10" ry="8" fill="#CBD8E8"/>' +
           '<ellipse cx="29" cy="26" rx="11" ry="9" fill="#DCE6F2"/>' +
           '<ellipse cx="24" cy="21" rx="9" ry="8" fill="#EDF3F9"/>',

    rain: '<ellipse cx="22" cy="18" rx="12" ry="8" fill="#B8C7DA"/>' +
          '<ellipse cx="30" cy="16" rx="9" ry="7" fill="#CBD8E8"/>' +
          '<g fill="#4A90C2"><path d="M15 30 l-2 6 2 2 2-2z"/>' +
          '<path d="M24 32 l-2 6 2 2 2-2z"/><path d="M33 30 l-2 6 2 2 2-2z"/></g>',

    water: '<path d="M24 6 C16 18 11 24 11 30 a13 13 0 0 0 26 0 C37 24 32 18 24 6z" fill="#4A90C2"/>' +
           '<path d="M24 12 C19 20 16 25 16 29" stroke="#8FC4E8" stroke-width="2.5" fill="none" stroke-linecap="round"/>',

    sea: '<rect x="3" y="20" width="42" height="22" rx="2" fill="#2B6E8C"/>' +
         '<path d="M3 24 q6 -4 11 0 t11 0 t11 0 t9 0 v5 H3z" fill="#3C87A6"/>' +
         '<path d="M3 31 q6 -4 11 0 t11 0 t11 0 t9 0 v5 H3z" fill="#4E9BBB" opacity=".7"/>',

    tree: '<rect x="21" y="27" width="6" height="15" fill="#8B5E3C"/>' +
          '<circle cx="24" cy="19" r="12" fill="#3F9E5E"/>' +
          '<circle cx="16" cy="24" r="7" fill="#4FB06D"/>' +
          '<circle cx="32" cy="24" r="7" fill="#4FB06D"/>',

    house: '<path d="M24 6 L43 22 H5z" fill="#C2503F"/>' +
           '<rect x="10" y="22" width="28" height="20" fill="#E8D8BC"/>' +
           '<rect x="21" y="30" width="7" height="12" fill="#8B5E3C"/>' +
           '<rect x="13" y="26" width="6" height="6" fill="#7FB3D5"/>' +
           '<rect x="29" y="26" width="6" height="6" fill="#7FB3D5"/>',

    window: '<rect x="8" y="8" width="32" height="32" rx="2" fill="#8B5E3C"/>' +
            '<rect x="11" y="11" width="26" height="26" fill="#9FD0EC"/>' +
            '<rect x="22.5" y="11" width="3" height="26" fill="#8B5E3C"/>' +
            '<rect x="11" y="22.5" width="26" height="3" fill="#8B5E3C"/>',

    book: '<path d="M6 10 h16 a3 3 0 0 1 2 2 v26 a3 3 0 0 0 -2 -2 H6z" fill="#C2503F"/>' +
          '<path d="M42 10 H26 a3 3 0 0 0 -2 2 v26 a3 3 0 0 1 2 -2 h16z" fill="#E06A52"/>' +
          '<g stroke="#fff" stroke-width="1.5" opacity=".55">' +
          '<path d="M9 18h11M9 23h11M29 18h11M29 23h11"/></g>',

    ball: '<circle cx="24" cy="24" r="15" fill="#F2F0EA"/>' +
          '<path d="M24 11 l6 4 -2 7 h-8 l-2 -7z" fill="#2B2118"/>' +
          '<path d="M24 11 V6M30 15 l5 -3M18 15 l-5 -3M20 22 l-5 6M28 22 l5 6" ' +
          'stroke="#2B2118" stroke-width="1.6" fill="none"/>' +
          '<circle cx="24" cy="24" r="15" fill="none" stroke="currentColor" stroke-width="1" opacity=".35"/>',

    boat: '<path d="M7 29 h34 l-5 9 H12z" fill="#C2503F"/>' +
          '<rect x="23" y="9" width="2.5" height="20" fill="#8B5E3C"/>' +
          '<path d="M26 11 l10 15 H26z" fill="#F2F0EA"/>' +
          '<path d="M22 13 l-8 13 h8z" fill="#E8D8BC"/>',

    lighthouse: '<path d="M18 40 L21 12 h6 l3 28z" fill="#F2F0EA"/>' +
                '<path d="M19.5 26 h9 l.7 7 h-10.4z" fill="#C2503F"/>' +
                '<rect x="20" y="6" width="8" height="7" rx="1.5" fill="#44639F"/>' +
                '<circle cx="24" cy="9.5" r="2.4" fill="#FFD75E"/>' +
                '<path d="M30 9 L44 3 v13z" fill="#FFD75E" opacity=".35"/>' +
                '<rect x="13" y="40" width="22" height="4" rx="1" fill="#8E8778"/>',

    rocket: '<path d="M24 4 C31 11 33 20 33 27 H15 C15 20 17 11 24 4z" fill="#F2F0EA"/>' +
            '<circle cx="24" cy="17" r="4" fill="#4A90C2"/>' +
            '<path d="M15 24 l-6 8 h6z" fill="#C2503F"/>' +
            '<path d="M33 24 l6 8 h-6z" fill="#C2503F"/>' +
            '<path d="M20 27 h8 l-4 12z" fill="#F5B731"/>',

    bee: '<ellipse cx="24" cy="27" rx="10" ry="8" fill="#F5B731"/>' +
         '<path d="M19 20.5 q5 -2 10 0 v3 q-5 -2 -10 0z M18.5 27 q5.5 -2 11 0 v3 q-5.5 -2 -11 0z" fill="#2B2118"/>' +
         '<circle cx="24" cy="16" r="5" fill="#2B2118"/>' +
         '<ellipse cx="16" cy="20" rx="6" ry="4" fill="#CBE4F2" opacity=".85" transform="rotate(-25 16 20)"/>' +
         '<ellipse cx="32" cy="20" rx="6" ry="4" fill="#CBE4F2" opacity=".85" transform="rotate(25 32 20)"/>',

    flower: '<circle cx="24" cy="18" r="5" fill="#F5B731"/>' +
            '<g fill="#E0558B"><ellipse cx="24" cy="9" rx="4" ry="6"/>' +
            '<ellipse cx="24" cy="27" rx="4" ry="6"/>' +
            '<ellipse cx="15" cy="18" rx="6" ry="4"/>' +
            '<ellipse cx="33" cy="18" rx="6" ry="4"/></g>' +
            '<circle cx="24" cy="18" r="4" fill="#F5B731"/>' +
            '<path d="M24 29 v13" stroke="#3F9E5E" stroke-width="2.5" stroke-linecap="round"/>' +
            '<path d="M24 36 q6 -1 7 -6 q-6 0 -7 6z" fill="#4FB06D"/>',

    bird: '<ellipse cx="22" cy="26" rx="11" ry="8" fill="#4A90C2"/>' +
          '<circle cx="31" cy="19" r="6" fill="#5BA3D6"/>' +
          '<path d="M36 18 l6 2 -6 2z" fill="#F5B731"/>' +
          '<circle cx="32.5" cy="18" r="1.4" fill="#2B2118"/>' +
          '<path d="M18 24 q6 -5 11 1 q-6 4 -11 -1z" fill="#8FC4E8"/>' +
          '<path d="M11 28 l-6 4 7 0z" fill="#44639F"/>',

    fish: '<ellipse cx="22" cy="24" rx="13" ry="9" fill="#E8894A"/>' +
          '<path d="M35 24 l8 -6 v12z" fill="#D4753A"/>' +
          '<circle cx="15" cy="22" r="1.8" fill="#2B2118"/>' +
          '<path d="M22 16 q3 4 0 8" stroke="#D4753A" stroke-width="2" fill="none"/>',

    mountain: '<path d="M4 40 L18 14 L27 29 L33 20 L44 40z" fill="#6E7E8C"/>' +
              '<path d="M18 14 L13 24 h10z" fill="#F2F0EA"/>' +
              '<path d="M33 20 L29.5 26 h7z" fill="#F2F0EA"/>',

    star: '<path d="M24 5 l5.5 12 13 1.5 -9.7 8.8 2.8 12.9 L24 33 l-11.6 7.2 ' +
          '2.8 -12.9 -9.7 -8.8 13 -1.5z" fill="#F5B731"/>',

    moon: '<path d="M30 6 a18 18 0 1 0 12 28 A15 15 0 0 1 30 6z" fill="#F5E2A0"/>' +
          '<circle cx="26" cy="20" r="2.5" fill="#E0CB86" opacity=".7"/>' +
          '<circle cx="33" cy="29" r="1.8" fill="#E0CB86" opacity=".7"/>',

    lake: '<rect x="3" y="4" width="42" height="18" fill="#9FD0EC"/>' +
          '<path d="M3 22 L16 10 L26 22z" fill="#6E7E8C"/>' +
          '<path d="M22 22 L33 12 L44 22z" fill="#8894A1"/>' +
          '<ellipse cx="24" cy="33" rx="21" ry="10" fill="#4A90C2"/>' +
          '<path d="M8 32 q5 -2 9 0 t9 0 t9 0" stroke="#8FC4E8" stroke-width="1.6" fill="none"/>',

    goal: '<rect x="6" y="12" width="36" height="24" fill="none" stroke="#E2DED4" stroke-width="3"/>' +
          '<g stroke="#E2DED4" stroke-width="1" opacity=".75">' +
          '<path d="M12 12v24M18 12v24M24 12v24M30 12v24M36 12v24M6 18h36M6 24h36M6 30h36"/></g>' +
          '<circle cx="34" cy="31" r="5" fill="#F2F0EA" stroke="#2B2118" stroke-width="1"/>',

    bed: '<rect x="5" y="24" width="38" height="12" rx="2" fill="#B07A4A"/>' +
         '<rect x="8" y="18" width="16" height="8" rx="2" fill="#F2F0EA"/>' +
         '<path d="M22 20 h20 a2 2 0 0 1 2 2 v4 H22z" fill="#5B7FC7"/>' +
         '<rect x="4" y="14" width="4" height="26" rx="1.5" fill="#8B5E3C"/>' +
         '<rect x="40" y="20" width="4" height="20" rx="1.5" fill="#8B5E3C"/>',

    apple: '<path d="M24 14 C18 10 9 13 9 23 c0 9 7 18 11 18 1.5 0 2.5 -1 4 -1 s2.5 1 4 1 ' +
           'c4 0 11 -9 11 -18 0 -10 -9 -13 -15 -9z" fill="#C2503F"/>' +
           '<path d="M24 14 v-5" stroke="#8B5E3C" stroke-width="2.5" stroke-linecap="round"/>' +
           '<path d="M25 10 q6 -5 9 0 q-6 4 -9 0z" fill="#3F9E5E"/>',

    stairs: '<path d="M6 42 V30 h9 V22 h9 V14 h9 V6 h9 v36z" fill="#B07A4A"/>' +
            '<path d="M6 30 h9 M15 22 h9 M24 14 h9 M33 6 h9" stroke="#8B5E3C" stroke-width="2"/>',

    storm: '<ellipse cx="20" cy="17" rx="12" ry="8" fill="#6E7E8C"/>' +
           '<ellipse cx="30" cy="15" rx="9" ry="7" fill="#8894A1"/>' +
           '<path d="M24 26 l-6 10 h5 l-3 8 10 -12 h-5 l4 -6z" fill="#F5B731"/>',

    snow: '<ellipse cx="22" cy="16" rx="12" ry="8" fill="#CBD8E8"/>' +
          '<ellipse cx="30" cy="14" rx="9" ry="7" fill="#DCE6F2"/>' +
          '<g fill="#9FD0EC"><circle cx="15" cy="32" r="3"/><circle cx="24" cy="37" r="3"/>' +
          '<circle cx="33" cy="32" r="3"/></g>'
  };

  /* Pieces only used inside composed scenes. */
  var SCENE_ONLY = {
    /* the cat from above, curled up, eyes shut */
    catnap: '<ellipse cx="24" cy="31" rx="15" ry="9" fill="#E8894A"/>' +
            '<circle cx="14" cy="26" r="8" fill="#F09C5C"/>' +
            '<path d="M8 21 L7 14 L12 18 Z" fill="#E8894A"/>' +
            '<path d="M19 20 L21 13 L15 17 Z" fill="#E8894A"/>' +
            '<path d="M10 26 q2 2 4 0 M15 26 q2 2 4 0" stroke="#2B2118" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
            '<path d="M38 33 q7 -1 5 -9" stroke="#E8894A" stroke-width="4" fill="none" stroke-linecap="round"/>',
    zzz: '<g fill="none" stroke="#5B4BD6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
         '<path d="M6 34 h10 l-10 10 h10"/><path d="M22 18 h8 l-8 8 h8"/><path d="M34 6 h6 l-6 6 h6"/></g>',
    whoosh: '<g stroke="#8E8778" stroke-width="3" stroke-linecap="round">' +
            '<path d="M4 16 h28"/><path d="M10 26 h30"/><path d="M4 36 h24"/></g>',
    snowflakes: '<g fill="#FFFFFF" opacity=".9"><circle cx="10" cy="8" r="1.6"/><circle cx="34" cy="20" r="1.2"/>' +
                '<circle cx="60" cy="10" r="1.8"/><circle cx="88" cy="24" r="1.3"/><circle cx="118" cy="9" r="1.7"/>' +
                '<circle cx="146" cy="22" r="1.4"/><circle cx="20" cy="40" r="1.2"/><circle cx="130" cy="44" r="1.5"/>' +
                '<circle cx="76" cy="38" r="1.1"/><circle cx="104" cy="52" r="1.3"/></g>'
  };

  var SCENE_BG = {
    room:       '<rect width="160" height="100" fill="#F3E3C7"/><rect y="74" width="160" height="26" fill="#C9A47A"/>' +
                '<rect x="12" y="12" width="30" height="24" rx="2" fill="#9FD0EC" stroke="#8B5E3C" stroke-width="2.5"/>',
    'night-sea':'<rect width="160" height="100" fill="#1E3059"/><rect y="70" width="160" height="30" fill="#2B6E8C"/>' +
                '<path d="M0 74 q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 v6 H0z" fill="#3C87A6"/>',
    night:      '<rect width="160" height="100" fill="#1E3059"/><rect y="86" width="160" height="14" fill="#3A4D6B"/>',
    garden:     '<rect width="160" height="100" fill="#CFE8F7"/><rect y="78" width="160" height="22" fill="#6CBF6A"/>',
    pitch:      '<rect width="160" height="100" fill="#CFE8F7"/><rect y="64" width="160" height="36" fill="#4FB06D"/>' +
                '<path d="M0 82 h160" stroke="#fff" stroke-width="1.5" opacity=".7"/>',
    snow:       '<rect width="160" height="100" fill="#AFC3D6"/><path d="M0 78 q40 -10 80 0 t80 0 V100 H0z" fill="#F7FAFD"/>'
  };

  /**
   * A whole scene built from several drawings, so a picture can show
   * a cat ON a sofa, or a boat PASSING a lighthouse — whatever the
   * questions about it ask.
   */
  P.scene = function (scene) {
    if (!scene) return '';
    var body = (SCENE_BG[scene.bg] || '') + scene.parts.map(function (p) {
      var d = SCENE_ONLY[p.k] || DRAWN[p.k] || '';
      if (p.k === 'snowflakes') return d;
      return '<g transform="translate(' + p.x + ' ' + p.y + ') scale(' + (p.s || 1) + ')">' + d + '</g>';
    }).join('');
    return '<svg class="pic scene" viewBox="0 0 160 100" role="img" aria-label="picture">' + body + '</svg>';
  };

  /* Words that map onto a drawing we already have. */
  var ALIASES = {
    couch: 'sofa', sunny: 'sun', sunlight: 'sun', clouds: 'cloud',
    droplet: 'water', droplets: 'water', vapour: 'cloud', vapor: 'cloud',
    evaporates: 'sun', evaporate: 'sun', condenses: 'water', condense: 'water',
    precipitation: 'rain', raining: 'rain', ocean: 'sea', waves: 'sea', wave: 'sea',
    river: 'lake', forest: 'tree', trees: 'tree', flowers: 'flower',
    home: 'house', room: 'bed', asleep: 'bed', sleeping: 'bed', sleep: 'bed',
    books: 'book', reading: 'book', read: 'book',
    football: 'ball', match: 'goal', net: 'goal',
    bees: 'bee', honeybee: 'bee', birds: 'bird', fishing: 'fish',
    stars: 'star', night: 'moon', mountains: 'mountain', hill: 'mountain',
    space: 'rocket', ship: 'boat', sailing: 'boat', food: 'apple',
    lamp: 'lighthouse', beam: 'lighthouse', climbed: 'stairs', climb: 'stairs',
    windows: 'window', purred: 'cat', kitten: 'cat'
  };

  function drawnKey(word) {
    var w = S.norm(word);
    if (!w) return null;
    if (DRAWN[w]) return w;
    if (ALIASES[w] && DRAWN[ALIASES[w]]) return ALIASES[w];
    var stem = w.replace(/(ing|ed|es|s)$/, '');
    if (DRAWN[stem]) return stem;
    if (ALIASES[stem] && DRAWN[ALIASES[stem]]) return ALIASES[stem];
    return null;
  }

  /** The drawn illustration for a word, as an <svg> string, or ''. */
  P.drawn = function (word, size) {
    var key = drawnKey(word);
    if (!key) return '';
    var px = size || 88;
    return '<svg class="pic" viewBox="0 0 48 48" width="' + px + '" height="' + px +
           '" role="img" aria-label="' + S.esc(word) + '">' + DRAWN[key] + '</svg>';
  };

  P.hasDrawn = function (word) { return !!drawnKey(word); };

  /* ── interface icons ────────────────────────────────────
     Line icons rather than emoji, for the same reason as above:
     emoji render differently on every machine, and a row of
     controls drawn in four different illustration styles looks
     like an accident. These inherit the text colour, so they work
     in both themes and inside coloured buttons. */
  var ICONS = {
    speaker: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>' +
             '<path d="M19 6a9 9 0 0 1 0 12"/>',
    ear:     '<path d="M8 20a3 3 0 0 0 3-3c0-2 1-2.5 2.2-3.4A5.5 5.5 0 1 0 6.5 9"/>' +
             '<path d="M10 9a2 2 0 0 1 4 0c0 1.2-1 1.6-1.6 2.3"/>',
    mic:     '<rect x="9" y="3" width="6" height="11" rx="3"/>' +
             '<path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/><path d="M9 21h6"/>',
    picture: '<rect x="3" y="4" width="18" height="16" rx="2"/>' +
             '<circle cx="8.5" cy="9.5" r="1.5"/><path d="M4 17l5-5 4 4 3-3 4 4"/>',
    parts:   '<circle cx="6" cy="7" r="2.5"/><circle cx="6" cy="17" r="2.5"/>' +
             '<path d="M8 8.5L20 17"/><path d="M8 15.5L20 7"/>',
    idea:    '<path d="M9 18h6"/><path d="M10 21h4"/>' +
             '<path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.2.9 1.9V16h5.2v-.2c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 3z"/>',
    clip:    '<path d="M20 11.5L11 20a5 5 0 0 1-7-7l9-8.5a3.5 3.5 0 0 1 5 5L9.5 18a2 2 0 0 1-3-3L15 7"/>',
    spark:   '<path d="M12 2l2.2 6.2L20.5 10l-5.3 2.1L12 19l-2.2-6.9L4.5 10l6.3-1.8z"/>',
    stop:    '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    send:    '<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-1.3 5.4"/><path d="M20 5v6h-6"/>',
    check:   '<path d="M4 12.5l5 5L20 6"/>',
    close:   '<path d="M6 6l12 12M18 6L6 18"/>',
    menu:    '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
    gear:    '<circle cx="12" cy="12" r="3.2"/>' +
             '<path d="M12 2.5l1.3 2.6 2.9-.5.6 2.9 2.6 1.3-1.4 2.6 1.4 2.6-2.6 1.3-.6 2.9-2.9-.5L12 21.5' +
             'l-1.3-2.6-2.9.5-.6-2.9-2.6-1.3L6 12.6 4.6 10l2.6-1.3.6-2.9 2.9.5z"/>',
    book:    '<path d="M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2z"/>' +
             '<path d="M20 5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2z"/>',
    pencil:  '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14.5 6.5l3 3"/>',
    stack:   '<path d="M12 3l9 4.5-9 4.5-9-4.5z"/><path d="M3 12l9 4.5 9-4.5"/>' +
             '<path d="M3 16.5L12 21l9-4.5"/>',
    trophy:  '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3"/>' +
             '<path d="M17 6h3v1a3 3 0 0 1-3 3"/><path d="M12 14v4"/><path d="M8.5 21h7"/>',
    home:    '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>',
    lock:    '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    clock:   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pause:   '<path d="M9 5v14M15 5v14"/>',
    list:    '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/>' +
             '<circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    updown:  '<path d="M8 7l-3-3-3 3"/><path d="M5 4v16"/>' +
             '<path d="M16 17l3 3 3-3"/><path d="M19 20V4"/>'
  };

  /** An interface icon, as an inline SVG that follows the text colour. */
  P.icon = function (name, size) {
    var d = ICONS[name];
    if (!d) return '';
    var px = size || 18;
    return '<svg class="icon" viewBox="0 0 24 24" width="' + px + '" height="' + px +
           '" fill="none" stroke="currentColor" stroke-width="1.9" ' +
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
           d + '</svg>';
  };

  /** Swap every [data-icon] placeholder in a container for its icon. */
  P.paintIcons = function (root) {
    S.$$('[data-icon]', root || document).forEach(function (el) {
      if (el.dataset.painted === '1') return;
      el.innerHTML = P.icon(el.dataset.icon, Number(el.dataset.iconSize) || 18) +
                     (el.dataset.label ? '<span>' + S.esc(el.dataset.label) + '</span>' : '');
      el.dataset.painted = '1';
    });
  };

  /* ── fetched pictures ───────────────────────────────────
     A flat drawing is clear but abstract. For a child meeting a word
     like "lighthouse" or "vapour", a photograph of the real thing
     does more work.

     Wikipedia's article image is the best source for this. Every
     article has one lead image, chosen by editors to show the
     subject plainly — which is exactly what is wanted, and far
     better than a keyword search through a photo library, which
     returns whatever happens to match. Articles redirect sensibly
     too: "evaporates" lands on Evaporation, "purred" on Purr.

     ARASAAC pictograms are the fallback, because they cover the
     verbs and abstract words that have no photograph.

     Which sources are used, and in what order, is set in config.js.
     All of them are free and need no key.                        */

  var CACHE_KEY = 'spark.pictures.v4';
  var cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (e) { cache = {}; }

  function remember(word, entry) {
    cache[word] = entry || 0;        /* 0 means "looked, found nothing" */
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) {}
  }

  function sources() {
    var c = (window.SPARK_CONFIG && window.SPARK_CONFIG.PICTURE_SOURCES);
    return (c && c.length) ? c : ['drawn', 'wikipedia', 'arasaac'];
  }

  /* Wikipedia's lead image — one editor-chosen picture per subject. */
  async function fromWikipedia(word) {
    var res = await fetch(
      'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(word),
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    var d = await res.json();

    /* a disambiguation page's image means nothing */
    if (d.type && d.type.indexOf('disambiguation') > -1) return null;

    var url = (d.thumbnail && d.thumbnail.source) || null;
    /* the generic icons Wikipedia puts on stubs are not pictures */
    if (url && /Question_book|Commons-logo|Disambig|Wiki_letter|Ambox/i.test(url)) return null;
    if (!url) return null;

    return { url: url, credit: 'Wikipedia', kind: 'photo' };
  }

  /* ARASAAC — pictograms drawn for communication and learning support. */
  async function fromArasaac(word) {
    var r = await fetch('https://api.arasaac.org/v1/pictograms/en/bestsearch/' +
                        encodeURIComponent(word), { mode: 'cors' });
    if (!r.ok) return null;
    var list = await r.json();
    if (!Array.isArray(list) || !list.length) return null;
    var id = list[0]._id || list[0].id;
    if (!id) return null;
    return {
      url: 'https://static.arasaac.org/pictograms/' + id + '/' + id + '_300.png',
      credit: 'ARASAAC', kind: 'pictogram'
    };
  }

  /* Openverse — openly licensed photographs, mature filter on. */
  async function fromOpenverse(word) {
    var r = await fetch('https://api.openverse.org/v1/images/?q=' +
      encodeURIComponent(word) + '&page_size=3&mature=false&size=small',
      { headers: { Accept: 'application/json' } });
    if (!r.ok) return null;
    var d = await r.json();
    var hit = (d.results || [])[0];
    if (!hit) return null;
    return {
      url: hit.thumbnail || hit.url,
      credit: hit.creator ? hit.creator + ' (Openverse)' : 'Openverse',
      kind: 'photo'
    };
  }

  /* Wikimedia Commons keyword search. origin=* makes it browser-readable. */
  async function fromWikimedia(word) {
    var r = await fetch('https://commons.wikimedia.org/w/api.php?action=query&format=json' +
      '&generator=search&gsrnamespace=6&gsrlimit=3&origin=*' +
      '&prop=imageinfo&iiprop=url&iiurlwidth=320&gsrsearch=' + encodeURIComponent(word));
    if (!r.ok) return null;
    var d = await r.json();
    var pages = d.query && d.query.pages;
    if (!pages) return null;
    var keys = Object.keys(pages);
    for (var i = 0; i < keys.length; i++) {
      var info = pages[keys[i]].imageinfo && pages[keys[i]].imageinfo[0];
      if (info && info.thumburl && !/\.svg$/i.test(info.thumburl)) {
        return { url: info.thumburl, credit: 'Wikimedia Commons', kind: 'photo' };
      }
    }
    return null;
  }

  var FETCHERS = {
    wikipedia: fromWikipedia,
    arasaac:   fromArasaac,
    openverse: fromOpenverse,
    wikimedia: fromWikimedia
  };

  /**
   * Find a picture for a word, working down the configured sources.
   * Resolves { url, credit, kind } or null. Each word is fetched
   * once per browser — successes and failures alike, so a word with
   * no picture is not looked up again and again.
   */
  /* Words whose obvious photograph is of a person's body. A photo of
     "back", "chest" or "bottom" is never what a child needs, however the
     word is used, so these never get a photograph. */
  var BODY = {};
  ('back body skin bare naked chest breast bottom belly tummy stomach leg legs arm arms ' +
   'thigh hip hips neck shoulder shoulders waist bra bikini underwear swimsuit lap ' +
   'nipple private kiss kissing').split(' ').forEach(function (w) { BODY[w] = 1; });

  /* Photographs are only shown when a vision model has looked at the
     image, with the word, the meaning chosen from the sentence, and the
     rule "fine for a 7-year-old". Results are remembered. */
  var judged = {};
  async function photoIsRight(hit, word, sense) {
    if (!S.AI || !S.AI.ready || !S.serverURL) return false;
    var base = S.serverURL('/judge-image');
    if (!base) return false;
    var k = word + '|' + hit.url;
    if (k in judged) return judged[k];
    try {
      var r = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: hit.url, word: word, sense: sense || '' }) });
      if (!r.ok) return false;                       /* no check → no photograph */
      var out = await r.json();
      judged[k] = out.ok === true;
    } catch (e) { return false; }
    return judged[k];
  }

  /**
   * Find a picture for a word, working down the configured sources.
   * Resolves { url, credit, kind } or null.
   *
   * ctx.sentence is the sentence the word is in. With it, the model
   * decides WHICH meaning is meant and what to search for, so "back"
   * in "the back of the chair" looks for a chair back. A word whose
   * picture would not be suitable (or helpful) gets none, and the
   * child sees the coloured shape of the word instead.
   *
   * Each word (in its sentence) is fetched once per browser.
   */
  P.lookup = async function (word, ctx) {
    var w = S.norm(word);
    if (!w || w.length < 2) return null;
    if (S.P.settings.pictures === 'off') return null;
    if (P.SKIP[w]) return null;

    var sentence = ctx && ctx.sentence;
    var sense = null;
    var ck = w;
    if (sentence && S.senseOf) {
      sense = await S.senseOf(w, sentence);
      if (sense) {
        ck = S.senseKey(w, sentence);
        if (!sense.draw) return null;               /* nothing suitable to show */
      }
    }
    if (Object.prototype.hasOwnProperty.call(cache, ck)) return cache[ck] || null;

    var term = (sense && sense.query) || w;
    var order = sources();
    var reachedOne = false;

    for (var i = 0; i < order.length; i++) {
      var name = order[i], fetcher = FETCHERS[name];
      if (!fetcher || name === 'drawn') continue;
      var isPhoto = name !== 'arasaac';
      /* no photographs of bodies, and none at all for an unresolved
         word that has several meanings: a pictogram is safer */
      if (isPhoto && (BODY[w] || BODY[term])) continue;
      try {
        var hit = await fetcher(term);
        reachedOne = true;
        if (!hit || !hit.url) continue;
        if (isPhoto) {
          var okPhoto = await photoIsRight(hit, w, sense && sense.meaning);
          if (!okPhoto) continue;
        }
        remember(ck, hit);
        return hit;
      } catch (e) {
        /* offline or blocked — try the next source */
      }
    }

    /* only record "nothing found" if something actually answered;
       otherwise this is an offline moment, worth retrying later */
    if (reachedOne) remember(ck, null);
    return null;
  };

  /**
   * Put the best available picture for a word into an element.
   *
   * The bundled drawing goes in immediately where there is one, so
   * there is no waiting and no flicker. Otherwise it shows a spinner
   * and works down the source list from config.js.
   *
   * Resolves true if a picture was found.
   */
  P.render = async function (el, word, opts) {
    if (!el) return false;
    opts = opts || {};

    var svg = P.drawn(word);

    if (S.P.settings.pictures === 'off') {
      if (svg) { el.innerHTML = svg; el.dataset.state = 'drawn'; return true; }
      el.innerHTML = '<span class="pic-none">pictures are turned off</span>';
      el.dataset.state = 'off';
      return false;
    }

    /* a drawing we already have beats waiting on the network */
    if (svg && sources()[0] === 'drawn') {
      el.innerHTML = svg;
      el.dataset.state = 'drawn';
      return true;
    }

    el.innerHTML = '<span class="pic-wait"></span>';
    el.dataset.state = 'looking';

    var hit = await P.lookup(word, opts.sentence ? { sentence: opts.sentence } : null);
    if (hit && hit.url) {
      el.innerHTML =
        '<img class="pic" src="' + hit.url + '" alt="' + S.esc(word) + '" loading="lazy">' +
        (opts.credit !== false && hit.credit
          ? '<span class="pic-credit">' + S.esc(hit.credit) + '</span>' : '');
      /* if the image itself fails to load, fall back rather than
         leaving a broken-image icon in front of a child */
      var img = el.querySelector('img');
      img.onerror = function () {
        el.innerHTML = svg || P.wordVisual(word);
        el.dataset.state = svg ? 'drawn' : 'shape';
      };
      el.dataset.state = hit.kind || 'photo';
      return true;
    }

    if (svg) { el.innerHTML = svg; el.dataset.state = 'drawn'; return true; }

    /* no picture exists — show the shape of the word instead, so
       there is still something to look at */
    el.innerHTML = opts.noShape ? '<span class="pic-none">no picture for this one</span>'
                                : P.wordVisual(word);
    el.dataset.state = opts.noShape ? 'none' : 'shape';
    return false;
  };

  /* ── a visual for EVERY word ────────────────────────────
     Only nouns have pictures. "was", "because", "through" never
     will, and those are exactly the words a dyslexic reader trips
     on. So every word also gets a visual of its own SHAPE:

       · each sound chunk in its own colour, so the parts stand out
       · the letters that are easy to flip (b d p q, m w, n u)
         each in a fixed colour with a mark under it, so b and d
         never look like the same letter

     This is what shows when there is no picture, so no word is
     ever left with nothing to look at. */
  var FLIPPY = { b: 'lb', d: 'ld', p: 'lp', q: 'lq', m: 'lm', w: 'lw', n: 'ln', u: 'lu' };

  P.wordVisual = function (word, opts) {
    opts = opts || {};
    var shown = String(word || '').replace(/[^A-Za-z'-]/g, '');
    if (!shown) return '';
    var parts = S.syllables(shown);
    return '<span class="wv' + (opts.small ? ' wv-sm' : '') + '" aria-label="' + S.esc(shown) + '">' +
      parts.map(function (part, i) {
        return '<span class="wv-chunk wv-c' + (i % 3) + '">' +
          part.split('').map(function (ch) {
            var cls = FLIPPY[ch.toLowerCase()];
            return cls ? '<i class="wv-l ' + cls + '">' + S.esc(ch) + '</i>' : S.esc(ch);
          }).join('') +
        '</span>';
      }).join('') +
    '</span>';
  };

  /** True if the word has letters that are easy to flip. */
  P.hasFlippy = function (word) {
    return /[bdpqmwnu]/i.test(String(word || ''));
  };

  /**
   * Fetch pictures for a whole passage in the background, a few at
   * a time, so hovering any word later shows its picture at once.
   */
  var warming = {};
  P.warm = function (words) {
    if (S.P.settings.pictures === 'off') return;
    var queue = [];
    (words || []).forEach(function (w) {
      var n = S.norm(w);
      if (n.length < 3 || warming[n] || drawnKey(n) ||
          Object.prototype.hasOwnProperty.call(cache, n)) return;
      if (P.SKIP[n]) return;
      warming[n] = 1;
      queue.push(n);
    });
    var running = 0;
    function next() {
      while (running < 3 && queue.length) {
        running++;
        P.lookup(queue.shift()).catch(function () {}).then(function () {
          running--; next();
        });
      }
    }
    next();
  };

  /* Little words no picture can show. Looking them up only returns
     something random and misleading, so they get the shape visual. */
  P.SKIP = {};
  ('the and was were are for but not you your they them their there then than ' +
   'this that these those with from into onto what when where which who whom why how ' +
   'have has had been being will would could should can may might must shall ' +
   'his her him she its our out off over under very just also only some any every ' +
   'each all both more most much many such too again once here because about after ' +
   'before while until though through then down did does done said says one two ' +
   'got get let put saw see own way still even ever never always often soon yet')
    .split(' ').forEach(function (w) { P.SKIP[w] = 1; });

  /**
   * A picture we can show with no network wait — the drawn set, or
   * one already fetched before. Used by the hover preview, where an
   * async gap would read as the app being broken.
   */
  P.instant = function (word, size, sentence) {
    var w = S.norm(word);
    var sense = sentence && S.senseCached ? S.senseCached(w, sentence) : null;
    if (sense && !sense.draw) return '';
    /* a drawing is made for one meaning; use it unless the sentence
       says the word means something else */
    var svg = (!sense || sense.query === w) ? P.drawn(word, size) : '';
    if (svg) return svg;
    /* with a sentence and a model, only a result for THIS sense counts;
       the bare-word cache is where wrong-meaning pictures came from */
    if (sentence && !sense && S.AI && S.AI.ready) return '';
    var hit = cache[sense ? S.senseKey(w, sentence) : w];
    if (hit && hit.url) {
      return '<img class="pic" src="' + hit.url + '" alt="' + S.esc(word) +
             '" width="' + (size || 44) + '">';
    }
    return '';
  };

})(window.Spark);
