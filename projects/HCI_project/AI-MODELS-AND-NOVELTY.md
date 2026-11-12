> The full technical explanation (how each measure works, personalisation, voice check, novelty, limits) is in HOW-SPARK-WORKS.md.

# Spark: models used, where, and what is new

This file lists every model and signal-processing method in Spark, what each one is for, what its known weak
spots are, and what we do about them. It also lists what is novel. The weak spots are written down on purpose:
a reviewer will ask.

## 1. Every model, and where it is used

| # | Model / method | Purpose | Where it runs | Code |
|---|---|---|---|---|
| 1 | **Llama 3.3 70B** (Groq; fallbacks `gpt-oss-20b`, `llama-3.1-8b-instant`) | Word meaning **in its sentence**; how to pronounce it in that sentence (tense); what to search a picture for; syllable splits with a "say" respelling; comprehension questions; spelling explanations; Ask Spark chat | Cloudflare Worker `POST /` | `js/sense.js`, `js/lexicon.js`, `js/exercises.js`, `js/ai.js` |
| 1b | **Llama 3.3 70B** (same model, same Worker route) | Writes the **three specific questions for each picture story** from the facts known to be true of that picture; the answer goes into a sentence frame ("The cat is {orange}."). Output is validated; a hand-written set is used when the model is off or the answer is malformed | Worker `POST /` | `js/questions.js` |
| 2 | **Llama 4 Scout** (vision, Groq) | Looks at a candidate photograph and says whether it shows this meaning of the word **and** is fine for a 7-year-old | Worker `POST /judge-image` | `_server/spark-proxy-worker.js`, `js/pictures.js` |
| 3 | **Whisper large-v3** (Groq) | Second, accurate listen after reading: what the child actually said, with a time for every word | Worker `POST /transcribe` | `js/listen.js` |
| 4 | Browser **Web Speech API** (recognition + synthesis) | Live word-by-word following while reading; **all** of Spark's voices (free; Edge's neural voices preferred) | The browser | `js/speech.js`, `js/align.js` |
| 5 | **LanguageTool** | Spelling and grammar check for writing | Public API, from the browser | `js/spell.js` |
| 6 | **ARASAAC**, **Wikipedia**, bundled drawings | Picture sources, in that safety order (see 3.1) | Browser | `js/pictures.js` |
| 7 | **Voiceprint** (our own DSP: MFCC + LPC formants) | "Is it still the same reader?" and "is this a child or an adult?" | Browser, no audio leaves the device | `js/voiceprint.js`, `js/speaker.js` |
| 8 | **Pause classifier** (our own, prosody + phrasing + the child's own rhythm) | Natural pause versus difficulty | Browser | `js/analysis.js` |

Keys live only in the Worker as secrets. The browser never holds one.

## 2. Problems you reported, and how each is handled

### 2.1 Split words spoken wrongly ("ta" + "ble" read as two words)

The speech engine reads fragments as words. Fix: every syllable carries a **respelling** the model gives for how it
sounds inside the word (`ta` -> `tay`, `ble` -> `bull`). **Hear the parts** (in "Stuck on a word?" -> Split it)
says each part by its respelling, a beat apart, then the whole word. Parts and single words are sent to the voice
model in `mode: "word"`, which tells it to say only that, clearly, with no added expression.

Limit: a respelling is still approximate. The real fix, if it is not good enough, is phoneme input (IPA) to a TTS
that accepts it (Azure / ElevenLabs). The Worker is the only place to change.

### 2.2 Tense and meaning ("read" always said as present tense)

A word alone is ambiguous: *read*, *lead*, *wind*, *tear*, *live*. Single words were being sent to the voice with no
context. Now the **sentence** goes to the language model (`S.senseOf`), which returns `say`: the pronunciation for
that sentence (past-tense "read" -> `red`). `S.sayWord` speaks that. Whole passages were never affected, because
the voice model reads the full sentence and chooses the tense itself.

### 2.3 Wrong pictures ("back" gave a bare human back)

Cause: the app asked Wikipedia for the article called "back", which is the human back, and trusted it.
Three layers now:

1. **Meaning first.** The model reads the sentence and returns a search term for *that* meaning ("chair back", not
   "back") and `draw: false` when no suitable picture exists (feelings, grammar words, anything whose natural
   picture would show a body). No picture is better than a wrong one: the child gets the coloured word-shape.
2. **Safety order.** ARASAAC pictograms (drawn, no skin, built for learning support) come before Wikipedia photos.
   Body words (`back`, `chest`, `bottom`, `leg`...) never get a photograph at all.
3. **A vision model checks every photograph** (`/judge-image`): does it show this meaning, and is it fine for a
   7-year-old? If the check is unreachable the photo is **not** shown (fail closed). Approved results are cached.

Old cached pictures were chosen by the bare word; the cache key was bumped (`v4`) so they are discarded.

Limit: this needs the Worker redeployed (new `/judge-image` route) and `GROQ_API_KEY` set. Until then only layers 1
and 2 apply and no photographs are shown. Pictograms are not photographs but can still be abstract.

### 2.4 The voice

Spark uses the browser's own voices, so it is free and needs no key. Edge's neural voices (Ava, Andrew, Ana and others)
are chosen first; the old Windows desktop voices only if nothing better exists. There are **six** characters, each
asking for a different kind of voice by name (added: Nora, a calm storyteller, and Max, a big friendly storyteller).

Honest limit: browser voices cannot be steered for emotion, so all six sound fairly similar in tone, and none is a real
child. A hosted expressive voice would fix that, but every good one costs money, so it was left out on purpose.

### 2.5 Is it a child? Is it the same person? (the voice check)

Pitch (F0) was the main signal. You are right that it is a poor one: one person's pitch varies by a third of an
octave between a question and a statement, and a child can speak low. Now:

- **Vocal-tract length from formants** (F1-F3, by linear prediction). The tract is about 25-30% shorter in a child,
  so every formant is higher at *any* pitch. This is the standard acoustic way to separate child from adult.
- **Timbre**: the mean of 12 MFCCs against the reader's own voiceprint, measured in that reader's own spread.
- **Pitch** is one supporting vote and never decides alone unless it moves by more than three quarters of an octave.
- The verdict is a **vote**: two of three agree, or the vocal tract alone is clearly different.

Checked on synthetic voices (source-filter model, see `tests/voiceprint-synthetic.js`): the same adult at any
pitch scored 0.01 to 0.07 on tract; a child scored about 0.42, a child speaking in an adult's pitch about 0.40, an
adult woman about 0.31. Same-speaker pitch changes do not trip it.

Is there an AI model for this? Yes: neural **speaker embeddings** (WavLM-base-plus-sv, ECAPA-TDNN, pyannote)
are the state of the art for "same speaker?". They run in the browser through Transformers.js (a download of
roughly 100 MB) and could replace the MFCC part of `voiceprint.js` without changing anything else. We did not make
them the default because of the download size on a school connection and because the vocal-tract signal is the more
direct answer to "is this a child". They are the first upgrade if real-recording tests show the DSP is not enough.

Limit: validated on synthetic voices only. Thresholds must be checked on real recordings from the pilot before
anyone relies on the number. Two children of similar age cannot be told apart by either method, and this is not
security. The wording stays "that sounds like a different voice", with one tap for "it is still me".

### 2.6 Natural pause or struggle?

No off-the-shelf model labels "natural pause vs hesitation". What the research uses, and what we do, is combine:

1. **Where** the pause is: after a full stop or comma, at sentence start, or just before a joining word ("and",
   "because", "in") is phrasing.
2. **How the voice ended**: pitch falls at the end of a finished phrase; it stays level or trails off when
   somebody is stuck. Measured from the live microphone (`S.voiceCheck.endingTrend`).
3. **The child's own rhythm**: "long" is measured against that child's median gap, not a fixed number.
4. **Sounding out**: any partial word heard overrides everything (always decoding).
5. After reading, **Whisper's exact word times** are passed through the same classifier, so gaps are no longer
   all logged as "long-gap"; only difficulties are stored.

Limit: this is a transparent rule-and-prosody classifier, not a trained model, which is also why it can be
explained to teachers. A trained model would need labelled recordings of children reading; the session logs this
app now collects (pause + type + whether the child then continued) are exactly that data.

## 3. What is novel

1. **Sentence-aware help.** Pictures, pronunciation and meaning chosen for the sense of the word in *this
   sentence*, not the dictionary headword, with a vision model gating every photograph for child safety.
2. **Letter-confusion detection that stays visible.** Swaps such as b/d are detected even when a speech
   recogniser would "forgive" them, with self-correction within 2 seconds recorded separately.
3. **Help that is asked for, not pushed.** The child types or taps the word they are stuck on and chooses
   Picture / Hear it / Say it / Split it. Which tool is used is logged on a prompt -> cue -> supply scale, so the
   dashboard can show *how much help* each word needed, not only whether it was missed.
4. **Pause meaning from voice, not a stopwatch** (2.6), measured against the child's own rhythm.
5. **Voice change detected through vocal-tract length, not pitch** (2.5), so a child reading low or an adult
   reading high is not mistaken, and no audio leaves the device.
6. **Exposure-normalised error rates.** Errors per opportunity (how often the child met each letter pair in that
   session) against an ordinary-word baseline, so a hard passage is not mistaken for a weak child.
7. **Teacher view with no sign-in per student.** A shared database where each child registers under a name and age
   locked until "Start over", and a teacher password unlocks charts, auto-written insights and exports, with
   row-level security so the public key can only insert.
8. **Story worlds that carry the practice**: each letter-confusion family is a short illustrated story with a
   write-it step and a badge, rather than a drill list.
9. **Age-appropriate writing**: ages 7-11 get the one-gap picture-describing task; 12-14 also get free
   picture-story writing, with a spelling check that explains the rule.

## 4. What to do for better models (in order)

1. Redeploy the Worker (new `/judge-image` route). Set `GROQ_API_KEY`.
2. Real recordings: run the voice check on 5-10 children and 5 adults reading the same paragraph, then re-tune the
   five thresholds at the top of `js/speaker.js`.
3. If the voices still feel flat: use Edge on every device. A hosted voice is the only real fix, and all good ones cost money.
4. If the voice check is not accurate enough on real data: switch the MFCC part to a WavLM speaker-embedding model
   through Transformers.js.
5. If sense or pictures are still wrong on some words: raise the text model (a larger model on the same Worker) and
   keep the vision check.
