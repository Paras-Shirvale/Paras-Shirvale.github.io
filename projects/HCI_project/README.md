# Spark

A reading companion for children aged 9–14 with dyslexia.

Spark listens while the child reads aloud, notices where they get stuck, and
learns **which kind of help actually works for that particular child** — a
picture, hearing the word, or breaking it into parts. It then offers that kind
first, and builds homework out of the words they really struggled with.

---

## Running it

**1. Extract the zip first.** Right-click → *Extract All*. Opening `index.html`
from inside the zip copies out that one file and leaves its `css`, `js` and
`fonts` folders behind, and the page then loads as a bare document with no
styling. If that happens, Spark says so rather than just looking broken.

**2. Start it.**

| Your computer | Do this |
|---|---|
| Windows | double-click **`start.bat`** |
| macOS / Linux | run **`bash start.sh`** |

Your browser opens at `http://localhost:8000`. Leave the small black window
open — closing it stops the site.

**Why a server rather than double-clicking `index.html`?** The microphone. A
browser only allows microphone access on what it calls a *secure context*.
`http://localhost` counts; `file://` does not. So opening `index.html` directly
works for everything except reading aloud and dictation — which are the whole
point. The start script is just a two-line local web server; it sends nothing
anywhere.

It has nothing to do with the AI. Your API key is saved once and stays saved.

**3. Use Chrome or Edge.** Speech recognition only exists in those. Everything
else works in any modern browser.

By hand, if you prefer:

```bash
cd spark-ai
python3 -m http.server 8000
# then open http://localhost:8000
```

If `start.bat` complains about Python, install it from
[python.org](https://python.org) and tick **"Add Python to PATH"** during setup.

## What works without any setup

No account, no key, no server of your own:

- reading aloud with live word-following and words-per-minute
- **pause classification** — telling ordinary phrasing from real difficulty
- **letter-confusion detection** — b/d, p/q, m/w, n/u, reversals like was/saw
- the adaptive cue engine, which learns whether pictures, sound or word-parts
  work for this child and leads with that
- **voice check** — notices if somebody else takes over the reading
- word help on any word: syllables, how it sounds, a picture, read aloud
- hover any word for its syllables and picture
- four voices for Spark: woman, man, girl, boy
- comprehension questions and a sentence-ordering exercise, generated from
  whatever text is open
- **self-generating homework** — build / read aloud / write drills per word,
  plus letter-discrimination drills, built from what actually went wrong
- the writing help ladder, and spelling corrections that explain the rule
- teacher file upload (`.txt`) or pasted text, which opens in the full reader
- progress tracking, charts, reading-comfort settings, dark mode
- Ask Spark, answering from built-in rules

Everything is stored in the browser's `localStorage`. Nothing is uploaded
anywhere. Clearing site data or using Settings → Start over resets the child's
profile.

---

## What Ask Spark is for

It is the one part of the app that is open-ended, and it is deliberately narrow
in what it is *good* at. The rest of Spark is structured — a passage, a drill, a
writing prompt. Ask Spark is where a child goes with the question that does not
fit any of that, and the greeting says so instead of offering a blank box:

- **What a word means, in plain words.** The most common dead end in reading is
  decoding a word correctly and still not knowing it. Hovering a word gives
  phonics, parts and a picture; the chat gives a definition pitched at a child,
  and will answer the follow-up.
- **Saying a tricky sentence a simpler way.** Comprehension failure is often one
  clause, not the whole passage. A child can paste or say the sentence back and
  get it rephrased, which is something no lookup table can do.
- **Showing a picture of something.** Routed through `js/pictures.js`, so it
  reuses the drawn set and Wikipedia rather than inventing an image.
- **Just talking.** Left in on purpose. Reading difficulty is isolating, and a
  child who wants to chat about their dog should be able to.

What it is *not*: it does not assess, does not generate the homework (that comes
from measured reading, in `js/homework.js`), and does not replace the hover
tools, which work offline and answer faster. If the model is not connected the
panel says so plainly and still offers reading aloud, breaking words into parts
and pictures.

System prompt and the child-appropriate guardrails are at the top of
`js/chat.js`.

## Connecting Ask Spark to a real model

**Ask Spark only becomes a real conversation once a model is connected.** Until
then it falls back to a handful of built-in answers — fine for "what does this
word mean", obviously limited for anything else. If Spark keeps giving the same
stock phrases, that is what has happened: no key is set.

It talks to real APIs: Groq, Gemini, OpenRouter, Cerebras, Mistral, Together, or
Ollama running on your own machine.

### Get a free key (about a minute)

1. Open [console.groq.com](https://console.groq.com) and sign in with Google or
   GitHub. Free, no card.
2. **API Keys** → **Create API Key** → copy it. It starts with `gsk_`.

### Then either put it in the code…

Open **`js/config.js`** and paste it between the quotes:

```js
window.SPARK_CONFIG = {
  PROVIDER: 'groq',
  API_KEY:  'gsk_paste_your_key_here',    // ← the only line you must change
  MODEL:    '',                           // leave blank
  ENDPOINT: '',
  ALLOW_UI_OVERRIDE: true
};
```

Save, reload the page. Done — it stays set for everyone who uses that copy, and
nobody has to touch Settings.

Leave `MODEL` blank. Spark asks the service which models it actually has and
keeps one that works. A model name written down today becomes a "model not
found" error when the provider retires it, which they do without warning.

### …or paste it in the app

**Settings (⚙) → Thinking helper**, or press **Connect me** in the chat. Paste,
press **Connect**. Saved in that browser only, and it overrides `config.js`.

Set `ALLOW_UI_OVERRIDE: false` for a classroom or shared machine, and the key
box disappears from the app entirely — then `config.js` is the only way in.

### What you should see

> **Connected — Groq**
> Using openai/gpt-oss-20b.

If it says *Key saved, not tested yet*, press **Connect**. If it says the key
was refused, the key is wrong. If it reports that no models are available, it
will list the ones it tried.

Everything else — classifying pauses, spotting letter mix-ups, learning which
cue helps, building the drills, the reading tracker — is arithmetic in the app
and runs with no key at all.

> **Before publishing this anywhere public.** A key in a file the browser
> downloads can be read by anyone who opens the page. That is true of all
> browser code, not just this app. Fine on your own machine, for a demo, or for
> a submission; wrong for a public website, which needs a small server holding
> the key. Use a free key and revoke it when you are done.

## Putting it on the internet

The short version: it must be **https** (the microphone will not work on
`http://`), and the API key **cannot** stay in `js/config.js` on a public site,
because every visitor downloads that file.

Both are solved by `api/chat.js`, a small server function already in the
project. Set `PROVIDER: 'proxy'` in `config.js`, leave `API_KEY` empty, and put
the key in the host's environment variables instead. The browser then never
holds it.

Drag-and-drop to Netlify takes about three minutes and needs no command line.
**[DEPLOY.md](DEPLOY.md)** walks through that and the GitHub route, plus which
hosts can keep a secret (Netlify, Vercel, Cloudflare) and which cannot (GitHub
Pages — still fine if you do not need Ask Spark).

## Keeping up with the voice

Two positions, not one. `js/align.js` holds a **cursor**, moved only by
results the browser has marked final, and a **lead**, moved by the interim
speech that arrives in between.

This matters because of how Chrome actually behaves: it does not finalise a
result until it hears a clear break, which can be a second or three into the
next phrase. Driving the highlight from finals alone — the previous design —
left it trailing whole clauses behind a child reading fluently, which is
useless as a place-keeper and looks like Spark has stopped listening. Driving
it from interim alone was the original bug: interim text is re-sent and
revised constantly, so the cursor ran ahead and drifted.

So the lead moves the highlight and nothing else. It never goes backwards,
never falls behind the cursor, and never runs more than seven words past it.
Everything recorded about the child — misreadings, repeats, skipped words,
stall timing — comes from the confirmed cursor only. The worst a bad guess can
do is light the wrong word for a moment before a final pulls it back.

The reading band follows the same lead, so it tracks the child's own voice
while they read, not just Spark's while it reads to them.

## Voices and voice calibration

Four characters in Settings — **Sarah** (woman), **Tom** (man), **Mia** (girl)
and **Ravi** (boy). Browsers expose whatever voices the operating system has,
and none of them are real children, so Mia and Ravi are the closest adult voice
with the pitch raised. It is a decent impression, not a real child, and the
Settings panel says so rather than pretending. `S.voiceVariety()` reports how
many genuinely distinct system voices sit behind the four; on a machine with a
single English voice they differ only in pitch, and the panel says that too.

**Who is reading** is a short activity, not a meter. The child reads one of the
three sentences in `S.CALIBRATION` aloud — about 22 words each, deliberately
mixing high vowels (ee, i) with low ones (o, u), because the pitch estimate is
taken on vowels and a sentence weighted to one end gives a lopsided print. It
runs in three stages (`intro` → `listening` → `done`) and finishes with a
sentence the child can actually read: *"Got it — that is your voice. Spark heard
a bright, high voice…"* rather than a number. The result lands in
`S.P.voicePrint`.

After that, `js/speaker.js` watches pitch and spectral centroid during reading
and flags a likely change of speaker. Thresholds and their reasoning are in that
file. It is a soft signal, not an identity check — see **Honest limits**.

## What the letter check stores, and what it is for

Four things are written, at four different lifetimes:

| Where | What | Lifetime |
|---|---|---|
| `P.letters[pair]` | `{count, examples[]}` — how often this pair was confused and **up to six real words it happened on** | forever |
| `P.events[]` | one row per slip: word, what was said instead, the pair, the sentence, the passage | last 400 |
| `P.misreads[]` | a lighter log: date, heard, expected, kind | last 300 |
| `P.screening[id]` | per set: date read, and which of that set's pairs actually tripped | forever |

The `examples` array is the part that earns its place. A pair on its own —
"b/d" — is an abstraction a child can do nothing with. `bed`, `door`, `dug`
are things they can look at again, and they are what the letter drill in
`js/homework.js` is built from: practice comes from words this child actually
got wrong, not from a generic b/d worksheet. The report under the letter check
shows the same words, so the child can see the evidence rather than a verdict.

Pairs are extracted in `js/analysis.js` by aligning what was heard against
what was expected with an edit matrix, then reading the substitutions out of
the alignment — so `dig` for `big` yields `b/d`, and a word read backwards is
classified as a reversal rather than six unrelated letter errors.

Deliberately **not** stored: a score, a total, or anything shaped like a
diagnosis. Spark records what happened and what it did about it.

## The letter check

Six short passages, above the stories in **Read**, about five minutes in total.

They are not stories. Each one is loaded with a family of letters that readers
with dyslexia commonly swap, so that if a child has that difficulty it surfaces
in the first few minutes rather than in week three:

| Set | Letters | Why they confuse |
|---|---|---|
| b and d | b/d | the same shape turned around |
| p, q and b | p/q, b/p | tails and circles pointing different ways |
| m, w, n and u | m/w, n/u | each other upside down |
| c, s and soft sounds | c/s | c is sometimes k, sometimes s |
| g, j and d | g/j, d/g | sounds that sit close together |
| Short vowels | a/e, e/i, a/o | the vowels that blur into one another |

The sentences are deliberately plain — the point is the letters, so nothing else
should get in the way. They run through the same tracker and the same analysis as
any passage, but skip the comprehension and ordering steps, because plot is
beside the point. The result is a baseline: which pairs actually caught this
child, recorded before any teaching has happened, and compared against later
reading.

## How the adaptive part actually works

This is the part worth explaining, because it's the idea behind the project.

### Following along — `js/align.js`

Browser speech recognition fires `onresult` many times for the same speech, and
*revises* interim guesses. Acting on every event is what makes a highlight run
ahead of the reader. So the aligner separates the two kinds of result: **final**
results are never revised and are the only thing that moves the cursor; interim
results are used only to spot a child who has started a word and frozen partway
through it. The cursor only moves forward, looks at most a few words ahead, and
ignores anything it can't place rather than guessing.

It reports four things: `advance`, `misread`, `repeat` (self-correction), and
`unplaced` (ignored).

### Telling a real pause from an ordinary one — `js/analysis.js`

**This is the core idea.** Everyone pauses while reading. A fluent reader pauses
at full stops, at commas, to breathe. A reader with dyslexia *also* pauses where
a fluent reader never would. Treating both the same produces nonsense — you end
up "teaching" the child the word they happened to stop after.

So every stall is classified before it's allowed to affect anything:

| Verdict | When |
|---|---|
| `sentence-break` | the previous word ended in `. ! ?` — that's how reading should sound |
| `clause-break` | the previous word ended in a comma |
| `planning` | first word of a new sentence |
| `breath` | under ~1.8× *this child's own* median gap between words |
| `decoding` | **struggle** — they started sounding the word out and froze |
| `word-specific` | **struggle** — they've stalled on this exact word before |
| `complex-word` | **struggle** — a demanding word, and a long pause |
| `struggle` | **struggle** — mid-phrase, nowhere near punctuation, well past their rhythm |

**Before any of that, one question comes first: is the child still having a
go?** Speech recognition sends interim results continuously while somebody is
making sounds — "l… li… ligh…" — and those arrive without ever matching a word.
An earlier version treated that as a pause and cut in mid-attempt, which is the
most discouraging moment it could possibly pick. Now a stall is only considered
after **1.4 seconds of actual silence**, with the full wait at least 2.2
seconds. Sounding a word out is the work, not a pause.

"Long" is always measured against a rolling median of that child's own
inter-word gaps, never a fixed number. Only the struggle verdicts feed the
difficulty profile, and the Progress page shows the split so you can see the
judgement being made.

### Catching letter confusions — `js/analysis.js`

When a word is misread but close enough to know which word was meant, the two
are aligned through an edit matrix and the actual substitutions pulled out.
Pairs like **b/d, p/q, m/w, n/u, a/o, f/t, v/w** are counted, with the words
they happened in. Whole-word reversals (`was`/`saw`) and transpositions
(`form`/`from`) are detected separately.

### Choosing the kind of help — `js/reader.js`

Spark keeps two numbers for each kind of help: how often it was *shown*, and how
often the child *carried on reading right afterwards*. It ranks them with a
smoothed success rate, `(worked + 1) / (shown + 2)`, so one lucky hit doesn't win
outright. Once there's enough evidence it marks that button "Works for you" and
leads with it everywhere, including the writing ladder.

### Adapting patience

How long Spark waits before stepping in starts at 4.5 seconds and moves: up when
the child recovers alone, down when they needed help. Clamped to 2.5–9 seconds.

### Is it still the same reader? — `js/speaker.js`

The profile only means anything if the voice it was built from is the child's.
While the microphone is open, the audio also goes to a Web Audio analyser that
measures pitch (autocorrelation) and spectral centroid several times a second.
The first few seconds become a baseline; a sustained shift in *both* features
raises a banner the child can dismiss or accept.

This is a sanity check, not biometric security. It's far better at "that is a
different person" than at "that is definitely this person", and the wording in
the interface claims only the former.

### Turning all of it into homework — `js/homework.js`

Nothing in Homework is a fixed worksheet:

- struggle words → a three-stage drill: **build** it from shuffled syllables,
  **read** it aloud into the microphone (Spark checks what it heard), then
  **write** it from hearing alone, with the wrong letters marked
- letter confusions → spot-every-`d` among `b`s, plus a minimal-pair listening
  test (`big`/`dig`) where English provides one
- repeated reversals → a note about reading left to right with a finger

That's why Homework starts empty. It cannot exist before the reading does.

### The writing ladder — `js/write.js`

The boxes have **no placeholders**. A greyed-out model answer *is* the answer,
and a child who finds writing hard will copy it. They try first; "Stuck?" gives
a little more each press:

1. the question asked a different way
2. a cue — picture or spoken, whichever the cue engine has learned suits them
3. a choice of three
4. the answer, at last

Which rung got them writing is recorded, exactly as the reading cues are.

---

## Project layout

```
spark-ai/
├── index.html           all the markup
├── DEPLOY.md            putting it online, and keeping the key off the browser
├── api/chat.js          the server function that holds the key when published
├── netlify.toml         Netlify settings (no build step)
├── vercel.json          Vercel settings
├── start.sh             serve on localhost (macOS/Linux)
├── start.bat            serve on localhost (Windows)
├── css/
│   ├── tokens.css       colours and type, light + dark
│   ├── base.css         reset, typography, buttons, inputs
│   ├── layout.css       shell, grids, responsive rules
│   ├── components.css   word card, chat, sheet, toast, charts
│   └── pages.css        per-page styles
└── js/
    ├── config.js        ← the only file you edit: the API key
    ├── store.js         the child's profile + derived views
    ├── lexicon.js       syllables, phonetics, fuzzy matching
    ├── pictures.js      drawn SVG illustrations + icons + ARASAAC
    ├── analysis.js      pause classifier + letter-confusion detection ← the idea
    ├── align.js         matching speech to the page without drifting
    ├── speech.js        speech out (two voices) and in (recognition)
    ├── speaker.js       is it still the same person reading?
    ├── ai.js            8 pluggable providers + offline fallback
    ├── content.js       reading library and prompts with help ladders
    ├── ui.js            navigation, word card, hover help, dictation
    ├── exercises.js     question + ordering generation
    ├── reader.js        reading engine and cue engine  ← the core
    ├── write.js         scaffolded writing + spelling with reasons
    ├── homework.js      self-generating drills + teacher files
    ├── progress.js      charts, measured stats, the detail review
    ├── chat.js          Ask Spark
    ├── settings.js      reading comfort, voices, AI status
    └── app.js           home page, reward picture, boot
```

No build step and no dependencies. Plain HTML, CSS and JavaScript — open a file,
edit it, reload.

---

## Changing things

**Add a reading passage.** Append to `S.LIBRARY` in `js/content.js`:

```js
{
  id: 'volcano', level: 2, emoji: '🌋',
  title: 'Inside a Volcano',
  blurb: 'What is actually down there.',
  text: 'Deep below the surface… '   // two or more sentences
}
```

Questions, the ordering exercise, word tracking and the help engine all work off
the text, so nothing else needs touching.

**Change the look.** Every colour and font is a token in `css/tokens.css`.

**Change the reward picture.** `S.paintScene` in `js/app.js` draws an inline SVG;
`SPARKS_PER_PART` sets the pace.

---

## Typography: what the evidence actually says

Worth stating plainly, because it is easy to assume a "dyslexia font" is doing
more than it is.

### Spacing works

This is the part with real support behind it. Zorzi et al. (PNAS, 2012) gave 94
dyslexic children aged 8–14 the same text with extra letter and word spacing.
They read about **20% faster and made half as many errors** — with no training
and no practice, purely from the spacing.

So Spark treats spacing as the important control. The **Wider letters** switch
in Settings is the single most useful thing on that panel, and spacing is set as
a *proportion* of the text size rather than a fixed number of pixels, so it
grows when the text does.

### The special font, less so

OpenDyslexic has not held up in controlled trials:

- **Wery & Diliberto (2017)**, *Annals of Dyslexia* — compared OpenDyslexic with
  Arial and Times New Roman in children with dyslexia. **No improvement** in
  reading rate or accuracy.
  [PMC5629233](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5629233/)
- **Rello & Baeza-Yates (2013)** — eye-tracking with 48 dyslexic readers.
  OpenDyslexic did not improve readability or speed; plain sans-serifs
  (Helvetica, Arial, Verdana) performed best, and readers preferred them.
  [Summary](https://blog.dyslexia.com/?p=872)
- **Kuster et al. (2018)** — the same null result for the Dyslexie typeface.
- **Marinus et al. (2016)** — found Dyslexie's apparent advantage disappeared
  once letter spacing was equalised. The spacing was doing the work, not the
  letterforms.

OpenDyslexic is still the default here, because you asked for it, because some
readers genuinely prefer it, and because preference matters for whether a child
keeps going. But it is a preference, not a treatment, so the app does not decide
it on the child's behalf. **The first-run setup asks.** It shows the same
sentence set in both faces and the child picks the one that reads more easily;
tapping either one switches the whole sheet to it, so the choice is made on real
text rather than on a swatch. Whatever they pick is stored in
`settings.font` and can be swapped again in Settings at any time.

That is the honest design answer to "does OpenDyslexic really help?" — the
literature says the letterforms do nothing on average, but averages do not read
books. Some individual children prefer it and read more willingly in it, and
that preference is worth something that a group mean cannot see. So Spark
applies the intervention the evidence does support (spacing, always on and
proportional), and lets the child own the one it does not.

If you are writing this up, that distinction is worth making: the app applies
the evidence-backed intervention (spacing) and offers the popular-but-unproven
one (the typeface) as a choice.

### The exact values used

Three sizes, each with spacing proportional to the type size. The proportions
follow the British Dyslexia Association style guide — letter spacing about 35%
of average character width, word spacing at least 3.5x letter spacing, line
height 1.5 or more.

| Setting | Type size | Letter spacing | Word spacing | Line height |
|---|---|---|---|---|
| Normal | 18px | 0.045em | 0.17em | 1.65 |
| Large | 22px | 0.060em | 0.22em | 1.80 |
| Largest | 27px | 0.075em | 0.28em | 1.95 |

**Wider letters** multiplies letter and word spacing by 1.6 — so Largest with it
on gives 0.12em letter spacing and 0.45em word spacing, which is roughly the
Zorzi condition.

Also: left-aligned, never justified (uneven word gaps create "rivers" that are
hard to track); the reading column is capped near 62 characters; and the one
thing Rello found actively harmful — italics — is not used for body text
anywhere.

## Hovering a word

Every word, always something. The old behaviour bailed out on anything under
three letters or without a picture, so hovering `cat` did nothing at all —
which a child reads as the feature being broken, not as the word being easy.

The tip now carries whichever of these apply: a picture, the word split into
its parts (or a respelling when it is one syllable), and a **Hear it** button
that works on every word. They are ordered by whichever kind of help has been
working for this child — the adaptive part, kept silent: no badge, no
"recommended", just order. Tapping Hear it also tells the cue engine that
sound is what this child reaches for.

### Respellings refuse to guess

A respelling is only worth showing if it is right. Showing a dyslexic child a
wrong one is worse than showing nothing — they cannot tell it is wrong, and
the reason they are looking is that they do not already know.

The old rule set mapped every `ough` to "uff": correct for *rough* and
*tough*, wrong for *brought*, *through*, *though*, *cough* and *plough*. It is
the most irregular string in English and it turns up in exactly the words
children get stuck on. `js/lexicon.js` now has a dictionary for the
irregulars, and after the regular rules run it checks for any spelling that
could still go several ways — if one survives, it returns nothing and the
picture and Hear it carry the tip instead.

### Syllable splitting

`DIGRAPH` and `BLEND` used to be one list. A digraph (`ch`, `th`, `ck`) is one
sound and must never be split; a blend (`st`, `tr`, `pl`) is two sounds and
usually should be. Treating blends as unsplittable produced *si-ster*, whose
open first syllable tells the child to say a long "i" — the opposite of the
help intended. With two consonants between vowels it now splits between them,
the pattern taught first in structured phonics, so the first syllable is
closed and its vowel short.

Suffixes come off first (*jump-ing*, not *jum-ping*), with doubled consonants
handled (*run-ning*). `-er` is deliberately excluded: *teacher* is teach-er but
*water* is not wat-er, and nothing in the spelling separates them.

Measured against 31 common words with known-correct splits: 30 right. The one
miss is *teacher*, for the reason above.

## Navigation

Five sections, and all five are reachable in one tap from anywhere.

The top-right button is a menu, not a cog. A cog says "settings" and nothing
else, so everything that was not reading settings — voices, the model,
starting over — ended up buried a level inside a panel about letter spacing.
The menu names each destination in words.

On a wide screen the sections sit in the top bar as words. On a phone (≤560px) they move
to a **fixed bar along the bottom** — five equal columns, each with a line icon
and its label, each at least 48px tall. The earlier version let the tab strip
scroll sideways, which quietly hid Write, Homework and Progress off the right
edge; a child has no reason to suspect there is more there. The bottom bar shows
everything at once. Ask Spark becomes a circle above the bar so it covers
nothing.

## Accessibility notes

**No emoji anywhere.** Word pictures come from three places in order: drawn SVG
illustrations bundled with the project, then the lead photograph from the word's
Wikipedia article, then an [ARASAAC](https://arasaac.org) pictogram. Interface
controls are line icons. Emoji render differently on every device, many are faces
or symbols rather than pictures of the thing, and at the size a picture clue
needs to be they turn to mush.

The order is set by `PICTURE_SOURCES` in `js/config.js`. Wikipedia's lead image
is used rather than a keyword image search because every article has exactly one,
chosen by editors to show the subject plainly — a search returns whatever happens
to match. ARASAAC covers the verbs and abstract words that have no photograph.

Also:

- text size, letter spacing and line spacing adjust **the entire interface**,
  not just the passage, with a live sample in Settings
- a reading band that follows the word being spoken while Spark reads
  aloud, and disappears on its own when it stops — it is no longer a switch
  to find, because a ruler the child has to turn on is a ruler that stays off
- left-aligned, never justified; reading column capped near 62 characters
- full dark mode, and `prefers-reduced-motion` respected
- every control reachable by keyboard with a visible focus ring
- speech output on every piece of text, including questions and prompts

## Honest limits

Worth knowing before you present this.

- **Syllable splitting is a heuristic**, not a dictionary. It is right most of
  the time and always produces something decodable, but compound words like
  *lighthouse* can split oddly. A real deployment would use a pronunciation
  dictionary such as CMUdict.
- **Speech recognition is browser-dependent** and struggles with strong accents
  and child voices. The aligner is built to be conservative about this — it
  ignores what it cannot place rather than guessing — but words will be missed.
- **Letter-confusion detection depends on the recogniser.** It can only see a
  swap if the recogniser heard the wrong word clearly. A child who reads *bad*
  as *dad* is caught; one who mumbles is not.
- **The voice check is a sanity check, not security.** It compares pitch and
  timbre against a baseline learned from the first few seconds of each session.
  It reliably notices an adult reading in place of a child; it cannot verify
  identity, and it will occasionally flag the same child with a cold. There is a
  live meter in **Settings → Voices** so you can watch it work rather than
  taking it on trust.
- **Spark does not diagnose anything.** It records reading behaviour to adapt
  its help. It is not a screening tool and must not be presented as one.
- **The profile lives in one browser.** No accounts, no sync between devices.

### Where a backend would help

Everything runs in the browser so that one command starts it. If you take this
further, these are the parts that would genuinely improve with a server:

| Now (browser) | Upgrade (server) |
|---|---|
| Web Speech recognition | Whisper with word timestamps — far better with child voices |
| heuristic syllables | CMUdict for real pronunciation and syllable boundaries |
| word-list spell check | SymSpell against a full dictionary |
| pitch/centroid voice check | a speaker-embedding model (ECAPA, x-vector) |
| API key in the browser | key held server-side, which is what makes publishing safe |

---

## Credits

- **OpenDyslexic** by Abelardo Gonzalez — bundled in `/fonts`, SIL Open Font
  License. <https://opendyslexic.org>
- **Wikipedia** article lead images, fetched on demand through the public REST
  API. Each is one editor-chosen photograph of the subject, which is why it
  beats a keyword image search.
- **ARASAAC** pictograms © Government of Aragón (Spain), author Sergio Palao,
  licensed CC BY-NC-SA. The fallback for verbs and abstract words that have no
  photograph. <https://arasaac.org>
- Everything else — the illustrations, icons, passages and code — was written
  for this project.
