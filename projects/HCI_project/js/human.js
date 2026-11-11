/* ============================================================
   human.js - a person you can make: skin, hair, clothes and more.

   A human avatar is saved as a short text code, so it fits in the same
   "avatar" field as the animals and can be drawn anywhere (the app, the
   login page, the teacher's table):

        h:2.1.0.3.4.1.1.2
          | | | | | | | +-- background
          | | | | | | +---- gender (0 boy, 1 girl)
          | | | | | +------ glasses (0 no, 1 yes)
          | | | | +-------- clothes colour
          | | | +---------- clothes style
          | | +------------ hair colour
          | +-------------- hair style
          +---------------- skin tone

   S.avatarSVG() (avatars.js) hands any "h:..." code to S.humanSVG().
   S.avatarPicker() is the screen where a child makes theirs.
   ============================================================ */

(function (S) {
  'use strict';

  var SKIN   = ['#FFE0C7', '#F5C9A3', '#E0A878', '#C68642', '#9B6232', '#6B3F1D'];
  var HAIRC  = ['#2B2118', '#5A3A22', '#A9672B', '#E3B04B', '#C8453B', '#7B5BD6'];
  var TOPC   = ['#5B4BD6', '#E0558B', '#23835C', '#F08A3C', '#4A90C2', '#2B2540'];
  var BG     = ['#FFE3CC', '#E6E1FF', '#DDF3E8', '#FFE4EE', '#DCEBFA', '#FFF0C9'];
  var HAIRS  = ['Short', 'Long', 'Curly', 'Bun', 'Spiky', 'None'];
  var TOPS   = ['T-shirt', 'Hoodie', 'Stripes', 'Dress'];
  var NAMES  = {
    skin: ['Light', 'Fair', 'Tan', 'Brown', 'Dark brown', 'Deep'],
    hairc: ['Black', 'Brown', 'Ginger', 'Blond', 'Red', 'Purple'],
    topc: ['Violet', 'Pink', 'Green', 'Orange', 'Blue', 'Navy'],
    bg: ['Peach', 'Lilac', 'Mint', 'Rose', 'Sky', 'Sun']
  };

  var FIELDS = ['skin', 'hair', 'hairc', 'top', 'topc', 'glasses', 'gender', 'bg'];
  var LIMIT = { skin: 6, hair: 6, hairc: 6, top: 4, topc: 6, glasses: 2, gender: 2, bg: 6 };

  function parse(code) {
    var o = {};
    var bits = String(code || '').replace(/^h:/, '').split('.');
    FIELDS.forEach(function (f, i) {
      var n = parseInt(bits[i], 10);
      o[f] = (n >= 0 && n < LIMIT[f]) ? n : 0;
    });
    return o;
  }
  function pack(o) { return 'h:' + FIELDS.map(function (f) { return o[f] || 0; }).join('.'); }

  function shade(hex, amt) {                 /* a darker or lighter version of a colour */
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function c(v) { return Math.max(0, Math.min(255, Math.round(v + amt))); }
    return '#' + ((1 << 24) + (c(r) << 16) + (c(g) << 8) + c(b)).toString(16).slice(1);
  }

  /** Draw a person from a code (or an options object). */
  S.humanSVG = function (code, size) {
    var o = typeof code === 'string' ? parse(code) : code;
    var skin = SKIN[o.skin], hair = HAIRC[o.hairc], top = TOPC[o.topc], g = '';
    var dark = shade(skin, -28), ink = '#2B2118';

    /* hair that sits BEHIND the head */
    var back = '';
    if (o.hair === 1) back = '<path d="M17 30 C14 10 50 10 47 30 L49 52 L39 52 L39 34 L25 34 L25 52 L15 52 Z" fill="' + hair + '"/>';
    if (o.hair === 3) back = '';

    /* clothes */
    var body = '';
    var sh = 'M8 64 C8 49 19 45 32 45 C45 45 56 49 56 64 Z';
    if (o.top === 1) {
      body = '<ellipse cx="32" cy="47" rx="15" ry="6" fill="' + shade(top, -30) + '"/>' +
             '<path d="' + sh + '" fill="' + top + '"/>' +
             '<path d="M25 47 L24 58 M39 47 L40 58" stroke="' + shade(top, -45) + '" stroke-width="1.6" stroke-linecap="round"/>' +
             '<rect x="25" y="57" width="14" height="7" rx="2" fill="' + shade(top, -22) + '"/>';
    } else if (o.top === 2) {
      body = '<path d="' + sh + '" fill="' + top + '"/>' +
             '<path d="M10 54 H54 M9 59 H55" stroke="' + shade(top, 70) + '" stroke-width="2.4"/>' +
             '<path d="M27 45 L32 51 L37 45" fill="' + dark + '"/>';
    } else if (o.top === 3) {
      body = '<path d="' + sh + '" fill="' + top + '"/>' +
             '<path d="M22 46 C26 52 38 52 42 46 L40 45 C37 49 27 49 24 45 Z" fill="#FFFDF8"/>' +
             '<circle cx="32" cy="55" r="1.6" fill="#FFFDF8"/><circle cx="32" cy="60" r="1.6" fill="#FFFDF8"/>';
    } else {
      body = '<path d="' + sh + '" fill="' + top + '"/>' +
             '<path d="M26 45 L32 52 L38 45 Z" fill="' + dark + '"/>';
    }

    /* the front of the hair */
    var front = '';
    if (o.hair === 0) front = '<path d="M18.5 28 C16 9 48 9 45.5 28 C44 21 39 18 32 18 C25 18 20 21 18.5 28 Z" fill="' + hair + '"/>';
    if (o.hair === 1) front = '<path d="M18.5 27 C17 10 47 10 45.5 27 C43 20 38 17 32 17 C26 17 21 20 18.5 27 Z" fill="' + hair + '"/>';
    if (o.hair === 2) front = ['21,19', '27,15', '33,14', '39,16', '44,21', '18,25', '46,26'].map(function (p) {
      var a = p.split(','); return '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="6" fill="' + hair + '"/>';
    }).join('');
    if (o.hair === 3) front = '<path d="M18.5 28 C16 10 48 10 45.5 28 C44 21 39 18 32 18 C25 18 20 21 18.5 28 Z" fill="' + hair + '"/>' +
                              '<circle cx="32" cy="10" r="6.5" fill="' + hair + '"/>';
    if (o.hair === 4) front = '<path d="M18 27 L17 12 L24 19 L27 8 L32 18 L37 8 L40 19 L47 12 L46 27 C43 21 38 18 32 18 C26 18 21 21 18 27 Z" fill="' + hair + '"/>';

    /* face */
    var girl = o.gender === 1;
    var eyes = '<ellipse cx="26.5" cy="29" rx="1.9" ry="2.3" fill="' + ink + '"/><ellipse cx="37.5" cy="29" rx="1.9" ry="2.3" fill="' + ink + '"/>' +
               '<circle cx="27.1" cy="28.2" r=".7" fill="#fff"/><circle cx="38.1" cy="28.2" r=".7" fill="#fff"/>';
    var brows = '<path d="M23.5 24.6 Q26.5 23 29.5 24.6 M34.5 24.6 Q37.5 23 40.5 24.6" stroke="' + shade(hair, -10) + '" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
    var lashes = girl ? '<path d="M24.4 27.8 L22.8 26.8 M39.6 27.8 L41.2 26.8" stroke="' + ink + '" stroke-width="1.1" stroke-linecap="round"/>' : '';
    var mouth = '<path d="M27.5 36 Q32 40 36.5 36" stroke="' + shade(skin, -85) + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
    var nose = '<path d="M32 31 Q30.8 33.6 32.6 33.8" stroke="' + dark + '" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
    var cheeks = '<circle cx="23.5" cy="34" r="2.6" fill="#FF8FA3" opacity="' + (girl ? '.42' : '.28') + '"/><circle cx="40.5" cy="34" r="2.6" fill="#FF8FA3" opacity="' + (girl ? '.42' : '.28') + '"/>';
    var specs = o.glasses ? '<circle cx="26.5" cy="29" r="5" fill="rgba(255,255,255,.25)" stroke="' + ink + '" stroke-width="1.3"/>' +
                            '<circle cx="37.5" cy="29" r="5" fill="rgba(255,255,255,.25)" stroke="' + ink + '" stroke-width="1.3"/>' +
                            '<path d="M31.5 29 H32.5" stroke="' + ink + '" stroke-width="1.3"/>' : '';

    var px = size || 48;
    return '<svg class="avatar avatar-human" viewBox="0 0 64 64" width="' + px + '" height="' + px + '" role="img" aria-label="Me">' +
      '<defs><clipPath id="hc' + px + '"><circle cx="32" cy="32" r="32"/></clipPath></defs>' +
      '<circle cx="32" cy="32" r="32" fill="' + BG[o.bg] + '"/>' +
      '<g clip-path="url(#hc' + px + ')">' +
        back + body +
        '<rect x="27.5" y="38" width="9" height="9" rx="3" fill="' + dark + '"/>' +
        '<circle cx="18.6" cy="30" r="3" fill="' + skin + '"/><circle cx="45.4" cy="30" r="3" fill="' + skin + '"/>' +
        '<ellipse cx="32" cy="29" rx="13" ry="14.5" fill="' + skin + '"/>' +
        front + cheeks + brows + eyes + lashes + nose + mouth + specs +
      '</g></svg>';
  };

  S.randomHuman = function () {
    var o = {};
    FIELDS.forEach(function (f) { o[f] = Math.floor(Math.random() * LIMIT[f]); });
    o.glasses = Math.random() < 0.25 ? 1 : 0;
    return pack(o);
  };

  /* ── the picker ─────────────────────────────────────────
     Two tabs: "Make me" (a person you build, with a live preview) and
     "Animals". onChange(code) is called on every change. */
  S.avatarPicker = function (host, start, onChange) {
    var animal = (start && !/^h:/.test(start)) ? start : null;
    var o = parse(/^h:/.test(start || '') ? start : S.randomHuman());
    var tab = animal ? 'animals' : 'me';

    function emit() { onChange(tab === 'animals' ? animal : pack(o)); }

    function swatches(field, colours, names) {
      return '<div class="ap-row" role="group" aria-label="' + field + '">' + colours.map(function (c, i) {
        return '<button type="button" class="ap-sw" data-f="' + field + '" data-v="' + i + '" style="background:' + c + '"' +
          (o[field] === i ? ' data-on="1"' : '') + ' title="' + names[i] + '" aria-label="' + names[i] + '"></button>';
      }).join('') + '</div>';
    }
    function minis(field, names) {
      return '<div class="ap-row">' + names.map(function (n, i) {
        var t = Object.assign({}, o); t[field] = i;
        return '<button type="button" class="ap-mini" data-f="' + field + '" data-v="' + i + '"' + (o[field] === i ? ' data-on="1"' : '') + '>' +
          S.humanSVG(t, 46) + '<span>' + n + '</span></button>';
      }).join('') + '</div>';
    }

    function paint() {
      var me = tab === 'me';
      host.innerHTML =
        '<div class="ap-tabs" role="tablist">' +
          '<button type="button" role="tab" class="ap-tab" data-tab="me"' + (me ? ' data-on="1"' : '') + '>Make me</button>' +
          '<button type="button" role="tab" class="ap-tab" data-tab="animals"' + (!me ? ' data-on="1"' : '') + '>Animals</button>' +
        '</div>' +
        (me
          ? '<div class="ap-me">' +
              '<div class="ap-preview">' + S.humanSVG(o, 132) +
                '<button type="button" class="btn btn-sm" id="apRandom">' + S.Pictures.icon('refresh', 14) + ' Surprise me</button></div>' +
              '<div class="ap-controls">' +
                '<p class="ap-label">I am a</p>' +
                '<div class="ap-row">' + ['Boy', 'Girl'].map(function (n, i) {
                  return '<button type="button" class="ap-pill" data-f="gender" data-v="' + i + '"' + (o.gender === i ? ' data-on="1"' : '') + '>' + n + '</button>';
                }).join('') + '</div>' +
                '<p class="ap-label">Skin</p>' + swatches('skin', SKIN, NAMES.skin) +
                '<p class="ap-label">Hair</p>' + minis('hair', HAIRS) +
                '<p class="ap-label">Hair colour</p>' + swatches('hairc', HAIRC, NAMES.hairc) +
                '<p class="ap-label">Clothes</p>' + minis('top', TOPS) +
                '<p class="ap-label">Clothes colour</p>' + swatches('topc', TOPC, NAMES.topc) +
                '<p class="ap-label">Glasses</p>' +
                '<div class="ap-row">' + ['No glasses', 'Glasses'].map(function (n, i) {
                  return '<button type="button" class="ap-pill" data-f="glasses" data-v="' + i + '"' + (o.glasses === i ? ' data-on="1"' : '') + '>' + n + '</button>';
                }).join('') + '</div>' +
                '<p class="ap-label">Background</p>' + swatches('bg', BG, NAMES.bg) +
              '</div>' +
            '</div>'
          : '<div class="avatar-grid">' + Object.keys(S.AVATARS).map(function (k) {
              return '<button type="button" class="avatar-pick" data-animal="' + k + '"' + (animal === k ? ' data-on="1"' : '') + '>' +
                S.avatarSVG(k, 64) + '<span>' + S.AVATARS[k].name + '</span></button>';
            }).join('') + '</div>');
    }

    host.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tab]');
      if (t) { tab = t.dataset.tab; if (tab === 'animals' && !animal) animal = Object.keys(S.AVATARS)[0]; paint(); emit(); return; }
      var a = e.target.closest('[data-animal]');
      if (a) { animal = a.dataset.animal; paint(); emit(); return; }
      if (e.target.closest('#apRandom')) { o = parse(S.randomHuman()); paint(); emit(); return; }
      var b = e.target.closest('[data-f]');
      if (b) { o[b.dataset.f] = +b.dataset.v; paint(); emit(); }
    });

    paint();
    emit();
  };

})(window.Spark);
