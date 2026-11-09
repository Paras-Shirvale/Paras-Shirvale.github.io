/* ============================================================
   config.js — Spark on paras-shirvale.github.io

   The AI model is FIXED and connected through a small server
   (a Cloudflare Worker — see /_server/README.md in the website
   repo). The API key lives ONLY on that server as a secret, so
   it is never in any file a visitor downloads. Children and
   guardians never see a key, a model list or a "connect" button.
   ============================================================ */

window.SPARK_CONFIG = {

  /* Always go through the server — the browser never holds a key. */
  PROVIDER: 'proxy',

  /* NEVER put a key here. This file is public. */
  API_KEY: '',

  /* The server picks the model. Leave blank. */
  MODEL: '',

  /* ⬇ The address of your Cloudflare Worker, e.g.
       'https://spark-proxy.your-name.workers.dev'
     Until this is filled in, Ask Spark uses its built-in answers. */
  ENDPOINT: 'https://spark-proxy.parasshirvale10b62.workers.dev',

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
  ALLOW_UI_OVERRIDE: false
};
