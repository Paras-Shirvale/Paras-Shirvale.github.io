# Spark AI proxy (Cloudflare Worker)

This small server keeps Spark's API keys secret. The website
(`projects/HCI_project/`) sends requests to this Worker; the Worker adds the
key and forwards them to the model provider. No key ever appears in the
website's files, so visitors can't find it.

| Route         | Model                               | Used for                                         | Key               |
|---------------|-------------------------------------|--------------------------------------------------|-------------------|
| `/`           | Groq — Llama 3.3 70B                | word meanings, word parts, spelling explanations | `GROQ_API_KEY`    |
| `/transcribe` | Groq — Whisper large-v3             | double-checking what the child read aloud        | `GROQ_API_KEY`    |
| `/tts`        | OpenAI — gpt-4o-mini-tts (optional) | a natural, lively reading voice                  | `OPENAI_API_KEY`  |

**After changing the Worker code, paste it into Cloudflare again and Deploy** —
the website only gets the new routes once the Worker is redeployed.

This folder starts with `_`, so GitHub Pages does **not** publish it.

## One-time setup (≈ 5 minutes, free, no card)

1. Sign up / log in at **https://dash.cloudflare.com**.
2. Go to **Workers & Pages → Create → Create Worker** (start from "Hello World").
   Name it `spark-proxy` → **Deploy**.
3. Click **Edit code**, delete everything, paste the contents of
   [`spark-proxy-worker.js`](spark-proxy-worker.js), then **Deploy**.
4. Go to the Worker's **Settings → Variables and Secrets** and add:

   | Type   | Name              | Value                                   |
   |--------|-------------------|-----------------------------------------|
   | Secret | `GROQ_API_KEY`    | your key (`gsk_...`)                    |
   | Text   | `ALLOWED_ORIGINS` | `https://paras-shirvale.github.io`      |

   (To test locally too, use
   `https://paras-shirvale.github.io,http://localhost:8000`.)
   Click **Deploy** after adding them.
5. Copy the Worker's address, e.g. `https://spark-proxy.<you>.workers.dev`.
6. Paste it into `projects/HCI_project/js/config.js`:

   ```js
   ENDPOINT: 'https://spark-proxy.<you>.workers.dev',
   ```

7. Commit and push. Ask Spark now talks to the model directly — no key prompt,
   no model picker.

## Study database (Supabase)

Every session, letter mix-up, word timing, cue card and finished sentence is
logged as a row (`projects/HCI_project/js/db.js`). Rows always stay on the
device; with Supabase set up they are also collected centrally, and the
grown-ups' dashboard (`teacher.html`) can show every child, from any device.

1. Create a free project at **https://supabase.com**.
2. **SQL Editor → New query**, paste [`supabase-schema.sql`](supabase-schema.sql), **Run**.
   This creates the six tables, the security rules, and the trigger that
   rebuilds `confusion_profile` after every session.
3. **Authentication → Providers → Email**: turn off "Allow new users to sign up".
   Then **Authentication → Users → Add user** for each teacher / parent / researcher.
4. **Project Settings → API**: copy the Project URL and the `anon` public key into
   `projects/HCI_project/js/config.js`:

   ```js
   SUPABASE_URL: 'https://<project>.supabase.co',
   SUPABASE_ANON_KEY: 'eyJ...',
   ```

The anon key is safe to publish: the rules let it **insert** rows only — it
cannot read, change or delete anything. Reading needs a teacher login.

Without Supabase, the dashboard still works for the data on that one device,
behind a PIN. Either way, **Export** on the dashboard downloads the raw tables
as CSV or JSON for analysis.

## Natural voice (optional)

Without it, Spark uses the best voice the browser has (Edge's "Natural" voices
are good; Chrome's Google voices are fine). For a consistently lively,
correctly-pronounced voice everywhere, add a Secret `OPENAI_API_KEY`
(platform.openai.com — paid, but a few cents covers many hours of reading).
Spark detects it automatically; nothing in the website needs changing.

## Notes

- Using a different provider? Set `AI_PROVIDER` (e.g. `openrouter`) and add its
  key as a secret named in the Worker file (e.g. `OPENROUTER_API_KEY`).
- The model is chosen on the server; set `AI_MODEL` to force one.
- The Worker only answers requests from `ALLOWED_ORIGINS` and caps message size
  and reply length. Use a free-tier key (Groq needs no card) so there is never a bill.
- If the key ever leaks, revoke it at console.groq.com and replace the secret.
