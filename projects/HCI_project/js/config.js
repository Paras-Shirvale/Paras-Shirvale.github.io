/* ============================================================
   config.js — SET THIS UP ONCE, AS THE DEVELOPER.

   This is the only file you need to edit to give Spark a brain.
   The child and the teacher never see a key or a settings form;
   they just open the app and it works.

   ─── HOW TO SET IT UP ──────────────────────────────────────

   1. Get a free key (60 seconds, no card needed):

        Groq    →  https://console.groq.com     ... API Keys
        Gemini  →  https://aistudio.google.com  ... Get API key

   2. Put it in API_KEY below, and set PROVIDER to match.

   3. Save the file and reload the page. Done.

   Leave API_KEY empty and the app still runs — Spark falls back
   to its built-in answers. Everything that makes this project
   what it is (pause classification, letter-confusion detection,
   the cue engine, the drills) is arithmetic and needs no model
   at all. A model only improves four things:

        · Ask Spark becomes a real conversation
        · word cards get a plain-English meaning
        · comprehension questions get better
        · spelling corrections explain the rule

   ─── PLEASE READ THIS BEFORE YOU PUBLISH ───────────────────

   A key written into a file the browser downloads can be read by
   anyone who opens the page and looks. That is a property of all
   browser code, not of this app.

   So this arrangement is right for:
     · running on your own machine
     · a demo or a class presentation
     · a project submission

   It is NOT safe for a site on the open internet. For that, the
   key has to live on a small server that forwards the requests —
   the browser then never holds it. The README explains what that
   looks like.

   If you are handing this in, use a free key, and revoke it in
   the provider's dashboard when you are finished.
   ============================================================ */

window.SPARK_CONFIG = {

  /* Which service.

     'groq' is the easiest free one for running on your own machine.

     Use 'proxy' when the site is PUBLISHED on the internet. The
     browser then holds no key at all — it posts to this site's own
     /api/chat, and the key sits on the server as an environment
     variable where visitors cannot read it. See DEPLOY.md.

     'proxy' | 'groq' | 'gemini' | 'openrouter' | 'cerebras'
     | 'mistral' | 'together' | 'ollama' | 'custom' | ''        */
  PROVIDER: 'groq',

  /* ⬇  PASTE YOUR KEY BETWEEN THESE QUOTES  ⬇
     It looks like  gsk_AbC123...  for Groq.
     Leave it empty to run Spark without a model.

     LEAVE THIS EMPTY IF YOU PUBLISH THE SITE. A key written here
     is downloaded by every visitor and can be read by any of them.
     Set PROVIDER to 'proxy' instead and put the key on the server. */
  API_KEY: '',

  /* LEAVE THIS BLANK. Spark asks the service which models it has
     and picks a working one, then remembers it. Providers retire
     model names without warning, so a name written here today is
     a "model not found" error in six months.
     Only fill it in to force one specific model.               */
  MODEL: '',

  /* Only for PROVIDER: 'custom' or 'ollama' on another machine. */
  ENDPOINT: '',

  /* ── where word pictures come from ──────────────────────────
     Tried in order, first hit wins. All are free and need no key.

       'drawn'      the illustrations bundled with this project.
                    Instant, themed, works offline. Covers the
                    reading library's vocabulary.
       'wikipedia'  the lead photograph from the word's Wikipedia
                    article — one picture per subject, chosen by
                    editors to show the thing plainly. Much better
                    than a keyword image search, which returns
                    whatever happens to match.
       'arasaac'    pictograms drawn for communication and learning
                    support. Cover the verbs and abstract words that
                    have no photograph.
       'openverse'  openly licensed photos, keyword search, mature
                    filter on.
       'wikimedia'  Wikimedia Commons, keyword search.

     Worth knowing before changing this: everything except 'drawn'
     fetches from the open internet. The words looked up come from
     the app's own passages and the child's tracked words, never
     from anything they type, so they are ordinary vocabulary. The
     two keyword-search sources are the loosest; ['drawn',
     'wikipedia', 'arasaac'] is both the best-looking and the most
     predictable, which is why it is the default.                */
  PICTURE_SOURCES: ['drawn', 'wikipedia', 'arasaac'],

  /* Allow an adult to paste a key from inside the app, under
     Settings → Thinking helper, instead of editing this file.

     Left ON so the app can be connected without opening an editor.
     A key entered that way is kept in that browser only and
     overrides whatever this file says.

     Set it to false for a classroom or shared machine, where
     nobody using the app should meet an API key at all — then
     API_KEY above is the only way in.                           */
  ALLOW_UI_OVERRIDE: true
};
