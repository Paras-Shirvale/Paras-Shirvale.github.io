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

> **Already made the worker? Don't make another.** Open your existing
> `spark-proxy` worker → **Edit code** → replace everything with
> [`spark-proxy-worker.js`](spark-proxy-worker.js) → **Deploy**. Your existing
> `GROQ_API_KEY` and `ALLOWED_ORIGINS` settings stay as they are; nothing new is
> needed for the Whisper route. Skipping this is safe: word meanings keep
> working, and the app simply doesn't use the extra Whisper re-listen or the
> lively voice.
>
> **The student data and teacher dashboard (Supabase) don't use the worker at
> all.** They are set up separately, in "Study database" below.

The numbered steps below are only for someone setting the worker up from scratch.

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

## Study database (Supabase) — many students, one teacher

Every student gets **one profile**: the name and age they give on the first
screen. That profile is locked until they press **Start over**. Everything
they do (sessions, letter mix-ups, word timings, pauses, cue cards, sentences)
is logged as rows tagged with their own id and name, kept on their device, and
sent to one shared database. A teacher or parent opens the dashboard
(`teacher.html`) from **any computer**, enters the teacher password, and sees
**every student**, whichever device they used.

1. Create a free project at **https://supabase.com**.
2. **SQL Editor -> New query**, paste [`supabase-schema.sql`](supabase-schema.sql), **Run**.
   (Safe to run again whenever the file changes.)
3. **Project Settings -> API**: copy the Project URL and the `anon` public key into
   `projects/HCI_project/js/config.js`:

   ```js
   SUPABASE_URL: 'https://<project>.supabase.co',
   SUPABASE_ANON_KEY: 'eyJ...',
   ```
4. Commit and push. Done: no sign-up screens, no Supabase accounts to create.

**Teacher password** is `hci123`. To change it, run in the SQL Editor:
`update app_settings set value = 'newpassword' where key = 'teacher_password';`

**How it stays safe.** The public key in `config.js` can only **add** rows. It
cannot read, change or delete anything. The teacher dashboard reads through
three functions (`teacher_children`, `teacher_child_data`, `teacher_export`)
that check the password on the server, so the tables are never open to the
public. **Start over** calls `reset_child`, which deletes only that one
student's rows. If the device is offline at that moment, the request is kept
and sent the next time the page opens.

**Before using real children's data**, check what consent or ethics approval
your study needs: the database holds each child's first name and age.

Without Supabase the dashboard still works for the students who used Spark in
that same browser (the password is the same), with a notice saying so.

### Exporting for analysis
On the dashboard: **Class summary (CSV)**, **All data (JSON)**, **any table as
CSV for all students**, and the same for a single student.

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

## Updating the database for "remove student" (one-time)

The login page, removing students and the Removed students page need two new database functions. In Supabase:
SQL Editor -> New query -> paste the whole of `_server/supabase-schema.sql` -> Run. It is safe to run again; it only adds
what is missing (a `removed_at` column on `children`, `teacher_remove_child`, `child_status`). Until you do, everything
else keeps working and the Remove button says the database needs updating.

How removal works: the teacher presses **Remove student** on that student's page. Nothing is deleted. The student moves
to **Removed students** with all their history. Their own device asks the server about itself (when the page opens,
when the tab comes back, and every minute), clears itself, and goes to the login page, where they have to make a new
account (a new id, so none of the old details follow them).
