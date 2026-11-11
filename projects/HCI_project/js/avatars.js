/* ============================================================
   avatars.js - the animal faces a child picks at the start.
   Shared by the app, the login page and the teacher dashboard,
   so a student looks the same everywhere.
   ============================================================ */

window.Spark = window.Spark || {};

(function (S) {
  'use strict';

  /* ── avatars: friendly animal faces, drawn here ─────── */
  var AVATARS = {
    fox:   { name: 'Fox', bg: '#FFE3CC', svg:
      '<path d="M14 18 L22 6 L28 22 Z M50 18 L42 6 L36 22 Z" fill="#E8742A"/>' +
      '<path d="M17 17 L22 10 L25 20 Z M47 17 L42 10 L39 20 Z" fill="#3A2416"/>' +
      '<path d="M12 26 Q32 6 52 26 Q54 44 32 54 Q10 44 12 26Z" fill="#F08A3C"/>' +
      '<path d="M16 34 Q24 40 32 52 Q40 40 48 34 Q44 50 32 55 Q20 50 16 34Z" fill="#FFF6EC"/>' +
      '<circle cx="24" cy="31" r="3" fill="#2B2118"/><circle cx="40" cy="31" r="3" fill="#2B2118"/>' +
      '<circle cx="25" cy="30" r="1" fill="#fff"/><circle cx="41" cy="30" r="1" fill="#fff"/>' +
      '<ellipse cx="32" cy="42" rx="3.2" ry="2.4" fill="#2B2118"/>' },
    owl:   { name: 'Owl', bg: '#E6E1FF', svg:
      '<path d="M14 14 L22 20 L16 24Z M50 14 L42 20 L48 24Z" fill="#6E5BC7"/>' +
      '<ellipse cx="32" cy="36" rx="20" ry="20" fill="#8A78E0"/>' +
      '<ellipse cx="32" cy="44" rx="12" ry="10" fill="#D9D2FF"/>' +
      '<circle cx="24" cy="30" r="8" fill="#fff"/><circle cx="40" cy="30" r="8" fill="#fff"/>' +
      '<circle cx="24" cy="30" r="4" fill="#2B2118"/><circle cx="40" cy="30" r="4" fill="#2B2118"/>' +
      '<circle cx="25.5" cy="28.5" r="1.3" fill="#fff"/><circle cx="41.5" cy="28.5" r="1.3" fill="#fff"/>' +
      '<path d="M29 37 L35 37 L32 42Z" fill="#F5B731"/>' },
    bear:  { name: 'Bear', bg: '#F3E2CF', svg:
      '<circle cx="16" cy="16" r="8" fill="#9C6B43"/><circle cx="48" cy="16" r="8" fill="#9C6B43"/>' +
      '<circle cx="16" cy="16" r="4" fill="#E2B88F"/><circle cx="48" cy="16" r="4" fill="#E2B88F"/>' +
      '<circle cx="32" cy="34" r="21" fill="#B07A4A"/>' +
      '<ellipse cx="32" cy="42" rx="10" ry="8" fill="#E8C9A5"/>' +
      '<circle cx="24" cy="30" r="3" fill="#2B2118"/><circle cx="40" cy="30" r="3" fill="#2B2118"/>' +
      '<circle cx="25" cy="29" r="1" fill="#fff"/><circle cx="41" cy="29" r="1" fill="#fff"/>' +
      '<ellipse cx="32" cy="39" rx="3.5" ry="2.6" fill="#2B2118"/>' +
      '<path d="M28 45 Q32 48 36 45" stroke="#2B2118" stroke-width="1.6" fill="none" stroke-linecap="round"/>' },
    bunny: { name: 'Bunny', bg: '#FFE4EE', svg:
      '<ellipse cx="24" cy="14" rx="6" ry="14" fill="#F4F0F2"/><ellipse cx="40" cy="14" rx="6" ry="14" fill="#F4F0F2"/>' +
      '<ellipse cx="24" cy="15" rx="3" ry="10" fill="#F7A8C4"/><ellipse cx="40" cy="15" rx="3" ry="10" fill="#F7A8C4"/>' +
      '<circle cx="32" cy="38" r="19" fill="#FBF8F9"/>' +
      '<circle cx="25" cy="35" r="3" fill="#2B2118"/><circle cx="39" cy="35" r="3" fill="#2B2118"/>' +
      '<circle cx="26" cy="34" r="1" fill="#fff"/><circle cx="40" cy="34" r="1" fill="#fff"/>' +
      '<circle cx="20" cy="42" r="3" fill="#F7A8C4" opacity=".7"/><circle cx="44" cy="42" r="3" fill="#F7A8C4" opacity=".7"/>' +
      '<path d="M30 41 L34 41 L32 43.5Z" fill="#E0558B"/>' +
      '<path d="M29 46 Q32 48 35 46" stroke="#2B2118" stroke-width="1.5" fill="none" stroke-linecap="round"/>' },
    cat:   { name: 'Cat', bg: '#FFF0C9', svg:
      '<path d="M13 30 L14 8 L28 18Z M51 30 L50 8 L36 18Z" fill="#F5B731"/>' +
      '<path d="M17 24 L17 13 L25 18Z M47 24 L47 13 L39 18Z" fill="#F7A8C4"/>' +
      '<circle cx="32" cy="36" r="20" fill="#F7C44E"/>' +
      '<path d="M22 22 L24 28 M32 18 L32 25 M42 22 L40 28" stroke="#D99A1E" stroke-width="2.5" stroke-linecap="round"/>' +
      '<ellipse cx="25" cy="35" rx="3" ry="3.6" fill="#2B2118"/><ellipse cx="39" cy="35" rx="3" ry="3.6" fill="#2B2118"/>' +
      '<circle cx="26" cy="34" r="1" fill="#fff"/><circle cx="40" cy="34" r="1" fill="#fff"/>' +
      '<path d="M30 42 L34 42 L32 44.5Z" fill="#E0558B"/>' +
      '<path d="M14 42 L24 43 M14 46 L24 45 M50 42 L40 43 M50 46 L40 45" stroke="#8B6A2E" stroke-width="1.2"/>' },
    panda: { name: 'Panda', bg: '#DDF3E8', svg:
      '<circle cx="16" cy="17" r="8" fill="#2B2118"/><circle cx="48" cy="17" r="8" fill="#2B2118"/>' +
      '<circle cx="32" cy="35" r="21" fill="#FBFBF8"/>' +
      '<ellipse cx="24" cy="33" rx="6" ry="7.5" fill="#2B2118" transform="rotate(-20 24 33)"/>' +
      '<ellipse cx="40" cy="33" rx="6" ry="7.5" fill="#2B2118" transform="rotate(20 40 33)"/>' +
      '<circle cx="25" cy="32" r="2.2" fill="#fff"/><circle cx="39" cy="32" r="2.2" fill="#fff"/>' +
      '<ellipse cx="32" cy="42" rx="3.4" ry="2.4" fill="#2B2118"/>' +
      '<path d="M28 46 Q32 49 36 46" stroke="#2B2118" stroke-width="1.6" fill="none" stroke-linecap="round"/>' }
  };
  S.AVATARS = AVATARS;

  S.avatarSVG = function (key, size) {
    var a = AVATARS[key] || AVATARS.owl;
    var px = size || 48;
    return '<svg class="avatar" viewBox="0 0 64 64" width="' + px + '" height="' + px + '" role="img" aria-label="' +
           a.name + '"><circle cx="32" cy="32" r="32" fill="' + a.bg + '"/>' + a.svg + '</svg>';
  };

})(window.Spark);
