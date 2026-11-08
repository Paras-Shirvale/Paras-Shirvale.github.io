/* ============================================================
   align.js — matching what was heard against what is on the page.

   This is the piece that was drifting.

   The bug: browser speech recognition fires `onresult` many times
   for the same stretch of speech. Interim results are REVISED and
   re-sent over and over. Processing every event's words meant one
   spoken word advanced the cursor several times, so the highlight
   ran ahead of the reader.

   The fix is to separate the two kinds of result:

     final  — never revised again. These own the real cursor, and
              everything that gets recorded about the child comes
              from them: misreadings, repeats, skipped words.
     interim— a guess that will change. It moves the HIGHLIGHT only.

   Why both. Chrome does not finalise a result until it hears a
   clear break, which can be a second or three into the next phrase.
   Driving the highlight from finals alone — the previous design —
   left it trailing whole clauses behind a child who was reading
   fluently, which is useless as a place-keeper and makes Spark look
   like it has stopped listening. Driving it from interim alone was
   the original bug: interim text is re-sent and revised constantly,
   so the cursor ran ahead and drifted.

   So there are two positions:

     cursor — confirmed. Only finals move it. All analysis uses it.
     lead   — provisional. Interim speech moves it, it can never go
              backwards, never fall behind the cursor, and never run
              more than MAX_LEAD words past it. The highlight follows
              this one, so it keeps up with the voice in real time,
              and the worst a bad guess can do is light the wrong
              word for a moment before a final pulls it back.

   On top of that the matching is deliberately conservative:
   it only ever moves forward, only looks a few words ahead, and
   ignores anything it cannot place rather than guessing.
   ============================================================ */

(function (S) {
  'use strict';

  /* How far ahead of the cursor we will look for a match. Speech
     recognition drops short words constantly ("the", "a", "of"), so
     some lookahead is necessary — but a wide window lets the cursor
     jump over whole phrases, which is exactly the drift we are fixing. */
  var LOOKAHEAD = 4;

  /* How far BEHIND the cursor we check, to notice a child re-reading
     a word they have already said. Repetition is a dyslexia marker
     worth recording, not an error to correct. */
  var LOOKBEHIND = 3;

  /* How far the provisional highlight may run ahead of confirmed
     speech. Enough to cover the gap before Chrome finalises a phrase,
     small enough that a recogniser hallucinating a sentence cannot
     throw the highlight to the end of the paragraph. */
  var MAX_LEAD = 7;

  /**
   * tokens: the array from the reader — [{raw, clean, el, si}, …]
   */
  S.makeAligner = function (tokens) {
    var cursor = 0;          /* next word we expect to hear (finals only) */
    var lead = 0;            /* provisional position, for the highlight */
    var consumed = 0;        /* how many FINAL words we have already used */
    var finalWords = [];     /* every finalised word, in order */
    var lastInterim = '';    /* the most recent interim fragment */
    var interimWords = [];   /* the whole current interim phrase */

    function tokenAt(i) { return (i >= 0 && i < tokens.length) ? tokens[i] : null; }

    /** Does this heard word plausibly belong before the cursor? */
    function looksLikeRepeat(heard) {
      for (var k = 1; k <= LOOKBEHIND; k++) {
        var t = tokenAt(cursor - k);
        if (t && t.clean && S.soundsLike(heard, t.clean)) return t;
      }
      return null;
    }

    /** Close enough to be a misreading of this word rather than noise? */
    function plausibleMisreading(heard, expected) {
      if (!heard || !expected) return false;
      if (Math.abs(heard.length - expected.length) > 3) return false;
      var d = S.distance(heard, expected);
      var allow = expected.length <= 4 ? 1 : (expected.length <= 7 ? 2 : 3);
      return d > 0 && d <= allow;
    }

    /**
     * Walk the current interim phrase forward from the confirmed
     * cursor and work out how far through the line the child has
     * most likely got. Nothing here is recorded — it only decides
     * which word is lit.
     */
    function provisional() {
      var at = cursor;
      for (var i = 0; i < interimWords.length; i++) {
        var heard = interimWords[i];
        if (!heard) continue;
        for (var k = 0; k < LOOKAHEAD && at + k < tokens.length; k++) {
          var t = tokenAt(at + k);
          if (t && t.clean && S.soundsLike(heard, t.clean)) { at = at + k + 1; break; }
        }
        if (at >= cursor + MAX_LEAD) break;
      }
      return Math.min(at, cursor + MAX_LEAD, tokens.length);
    }

    return {
      get cursor() { return cursor; },
      get lead() { return lead; },
      get total() { return tokens.length; },
      get lastInterim() { return lastInterim; },
      get interim() { return interimWords.join(' '); },

      /**
       * Feed one `onresult` event. Returns a list of events for the
       * reader to act on. Safe to call as often as the browser fires.
       */
      feed: function (resultList) {
        var events = [];
        var finals = [];
        var interim = '';

        /* split the whole result list — not just the new tail, because
           the browser may finalise something it previously sent as interim */
        for (var i = 0; i < resultList.length; i++) {
          var r = resultList[i];
          var text = r[0] ? r[0].transcript : '';
          if (r.isFinal) finals.push(text); else interim += ' ' + text;
        }

        /* rebuild the full list of finalised words */
        finalWords = finals.join(' ').trim().split(/\s+/).map(S.norm).filter(Boolean);
        interimWords = interim.trim().split(/\s+/).map(S.norm).filter(Boolean);
        lastInterim = interimWords.length ? interimWords[interimWords.length - 1] : '';

        /* only words we have never processed before can move the cursor */
        if (consumed > finalWords.length) consumed = finalWords.length;  /* recogniser reset */
        var fresh = finalWords.slice(consumed);
        consumed = finalWords.length;

        for (var w = 0; w < fresh.length; w++) {
          var heard = fresh[w];
          if (!heard) continue;

          /* 1 — does it match something just ahead? */
          var matched = -1;
          for (var k = 0; k < LOOKAHEAD && cursor + k < tokens.length; k++) {
            var t = tokenAt(cursor + k);
            if (t && t.clean && S.soundsLike(heard, t.clean)) { matched = k; break; }
          }

          if (matched > -1) {
            var skipped = [];
            for (var j = 0; j < matched; j++) {
              var sk = tokenAt(cursor + j);
              if (sk && sk.clean) skipped.push(sk);
            }
            var from = cursor;
            cursor = cursor + matched + 1;
            events.push({ type: 'advance', from: from, to: cursor, skipped: skipped });
            continue;
          }

          /* 2 — are they saying a word they already read? */
          var rep = looksLikeRepeat(heard);
          if (rep) { events.push({ type: 'repeat', word: rep.clean }); continue; }

          /* 3 — close to the expected word, but wrong: a real misreading */
          var expect = tokenAt(cursor);
          if (expect && expect.clean && plausibleMisreading(heard, expect.clean)) {
            events.push({ type: 'misread', heard: heard, expected: expect.clean, token: expect });
            continue;
          }

          /* 4 — unplaceable. A filler, a cough, the recogniser guessing.
                 Ignoring it is the whole point: guessing is what drifts. */
          events.push({ type: 'unplaced', heard: heard });
        }

        /* Confirmed speech always wins: if finals have overtaken the
           provisional guess, or corrected it backwards, the guess is
           abandoned rather than argued with. */
        if (lead < cursor) lead = cursor;

        /* Now let the half-heard phrase carry the highlight the rest
           of the way, so it sits on the word being spoken instead of
           the last one Chrome got round to confirming. */
        var ahead = provisional();
        if (ahead > lead) {
          lead = ahead;
          events.push({ type: 'track', to: lead });
        }

        return events;
      },

      /**
       * Has the child started the word they are stuck on?
       * A partial fragment that is a prefix of the expected word means
       * they got into it and froze — the strongest signal there is
       * that this particular word is the problem.
       */
      startedCurrentWord: function () {
        /* the word they are ON, which is where the provisional
           highlight stopped — not the last one Chrome confirmed */
        var t = tokenAt(lead);
        if (!t || !t.clean || !lastInterim) return null;
        if (lastInterim.length < 2) return null;
        if (lastInterim.length >= t.clean.length) return null;
        return t.clean.indexOf(lastInterim) === 0 ? lastInterim : null;
      },

      /** Jump the cursor (used by "Done reading" and by skipping). */
      moveTo: function (i) {
        cursor = S.clamp(i, 0, tokens.length);
        lead = cursor;
        interimWords = [];
        lastInterim = '';
      },

      expected: function () { return tokenAt(cursor); }
    };
  };

})(window.Spark);
