# How Spark works: the technical questions, answered plainly

This is written for you and for anyone who reviews the project. It says what the code actually does, including where it
is simpler than it sounds, because a reviewer will find those places. Every claim here points at a file.

Contents: 1 Reading live · 2 Letter mix-ups · 3 Pauses · 4 Speed · 5 Help and "which cue worked" · 6 Visual or audio
learner? · 7 Is it personalised? · 8 Live correction · 9 Voice change · 10 Pictures, meanings, pronunciation ·
11 Writing · 12 Streak and last active · 13 What the teacher's numbers mean · 14 Privacy · 15 Every model · 16 Novelty ·
17 What is not proven

---

## 1. How does Spark follow a child reading?

The browser's Web Speech API (Chrome and Edge) turns the microphone into text. It sends two kinds of result
(`js/align.js`):

- **Interim** results are a guess that is revised again and again. They move the highlight only.
- **Final** results are never revised. They move the real cursor, and everything that is recorded comes from them.

The first version let interim results move the cursor, so one spoken word advanced it several times and the highlight
ran ahead of the child. Keeping two positions (a confirmed `cursor` and a provisional `lead` that can never run more
than a few words ahead) fixed that. Matching only moves forward, looks a few words ahead (speech engines drop "the" and
"a"), and ignores what it cannot place rather than guessing.

After the child finishes, the recording is sent to **Whisper large-v3** for a second, more accurate listen with a time
for every word (`js/listen.js`, Worker `/transcribe`). It is deliberately given **no prompt**: telling Whisper the story
would bias it towards hearing the right words, the opposite of what is wanted.

## 2. How is a letter mix-up detected?

`js/analysis.js` `analyseMisread(heard, expected)`:

1. Reject it if the two words are too far apart (the child said a different word entirely).
2. Whole-word reversal (`was`/`saw`) and transposition (`form`/`from`) are named as such.
3. Otherwise the two words are aligned letter by letter (an edit-distance walk) and each substitution is looked up in a
   table of pairs that readers with dyslexia swap: b/d, p/q, b/p, d/q, m/w, n/u, f/t and so on. A match is a
   **letter-confusion** event for that pair.
4. Anything else is a substitution, an omission or an insertion.

**The catch with speech recognition:** it corrects toward real words. A child who says "bog" for "dog" can come back
as "dog", so the mistake vanishes. `align.js` therefore has `confusionSlip()`, which flags a swapped letter even when the
tolerant matcher `soundsLike()` would forgive it, and the Whisper second pass catches more.

**Self-correction:** if the child says the word correctly within 2 seconds of the slip, the event is recorded as
`self_corrected = true`. This is separate from errors on purpose: catching your own slip is a sign the skill is
becoming automatic.

**Exposure:** how often a child slips depends on how many b/d words the passage had. Each session records how many
words it contained for each pair (`exposures`), so the dashboard can show mix-ups **per 100 words that contained the
letters** instead of a raw count.

## 3. How does it decide which pauses are difficulty and which are natural?

Everybody pauses. Treating all pauses as trouble produces nonsense, so `Analysis.classifyPause()` asks, in order:

1. **Is the child still making sounds?** If any speech (even interim "l... li... ligh...") arrived in the last 1.4 s, it
   is not a pause, it is sounding out. Spark waits.
2. **Where is it?** After a full stop or comma, at the start of a sentence, or just before a joining word ("and",
   "because", "in", "with") is **phrasing**. These are natural unless extremely long.
3. **How did the voice end?** The microphone also measures pitch. Pitch **falls** at the end of a finished phrase, so a
   falling voice followed by silence is a phrase end. A voice that trails off **level or rising** and then stops is
   hesitation (`speaker.js` `endingTrend()`).
4. **Relative to this child.** "Long" is measured against the median gap between this child's own words (last 40
   gaps, 120 ms to 6 s; 600 ms until there is enough data), not a fixed number. A slow reader's normal rhythm is not
   flagged.
5. **Sounding out.** If the child said the start of the word and stopped, that is always **decoding difficulty**, whatever
   else is true.
6. **History.** A word the child has stalled on before is a **word-specific** difficulty. A demanding word (many
   syllables, an irregular word, a long consonant cluster) plus a clearly long pause is a **complex word**.

The verdict has a type and a reason. Only difficulty pauses feed the child's profile and the teacher's table; natural
ones are counted separately (so the teacher can see "12 pauses, 9 were ordinary phrasing").

After reading, Whisper's exact word times go through the same classifier.

**Honest note:** this is a transparent rule-and-prosody classifier, not a trained model. There is no off-the-shelf model
that labels "natural pause versus struggle". It is explainable to a teacher, which was the point, and the logged data
(pause, type, and whether the child then continued) is exactly the labelled data a trained model would need.

## 4. How is reading speed measured?

- **During reading:** words advanced by the confirmed cursor, divided by the minutes the microphone was actually listening
  (the clock stops when reading is paused).
- **At the end:** the same, if there were at least 9 words and 4 seconds. This number is shown only as context.
- **After the recording:** if Whisper ran, words heard divided by the time from the first heard word to the last. This
  replaces the first number because it uses real word times.

This is **words per minute including pauses**, a fluency measure, not decoding speed. It is deliberately not the
headline on the dashboard: a child who slows down to get a b/d right is doing the right thing.

## 5. How does it decide a help (cue) "worked"?

In **Let's read** the child types, or taps, the word they are stuck on and chooses what helps (`js/reader.js`):

| Tool | What it does | Logged as | Rung |
|---|---|---|---|
| Split it | shows the word in chunks | `split` | prompt (lightest) |
| Picture | shows what it is | `picture` | cue |
| Say it | the child says it, Spark listens | `speak` | cue |
| Hear it | Spark says the word | `audio` | supply (the most: the word is given) |

Every use is one row in `help_events` (word, rung, kind, whether it helped). It counts as **helped** if the child
**carries on reading straight afterwards**: the next word is matched by the aligner while that help is open. It is **not
helped** if they swap to another tool, or finish without moving on.

Be clear about what that proves: it shows the child got moving again, not that they understood. It is a behavioural
signal. A child who would have moved on anyway is also counted. With enough uses the proportion is still informative,
and the dashboard only draws conclusions from five or more uses of a kind.

The same use also updates the child's own tally in the browser: `shown` is incremented, and `worked` if they carried on.

## 6. How does it say a child is a visual or an audio learner?

**It doesn't, and it shouldn't.** The "learning styles" idea (that children learn better in their preferred modality)
has weak research support. What Spark measures is narrower and honest:

- **Preference:** which help the child reaches for (how often).
- **Effectiveness:** for each kind of help, the share of uses after which they carried on reading.

The dashboard says "Picture help got them moving again 70% of the time, against 40% for hearing it", which is a
fact about this child's behaviour, not a diagnosis. Wording elsewhere should say "tends to" and never "is a visual
learner".

## 7. Is the learning really personalised?

**Partly, and in specific ways. It is not an adaptive curriculum.** What actually adapts:

| What | How | File |
|---|---|---|
| Which help appears first | Each kind of help is ranked by a smoothed success rate `(worked + 1) / (shown + 2)`; once the child has used help at least 4 times, the best one is highlighted in the tool box, shown first in the hover tip, and offered first in the writing clues | `store.js` `cueRank`, `favourite` |
| "Long pause" | Measured against the child's own median gap, not a global value | `reader.js` `baselineGap` |
| Error rates | Normalised by the words that child met containing each pair | `db.js`, `teacher.js` |
| Voice check | Compared against the child's own enrolled voice | `speaker.js` |
| Starting settings | Larger text under age 10; the letter shapes the child chose | `profile.js` |
| The teacher's "Recommended" line | Rules over this child's data (explore every world, then the pair with the highest rate, noting the trend) | `teacher.js` `recommend` |

What does **not** adapt: the passages are fixed, there is no per-child difficulty engine, and no model is trained per
child. The earlier "wait longer before offering help" adjustment (`S.P.patience`) now only changes when Spark *checks* for
a stall, because help no longer pops up on its own; it is a leftover, and the honest answer is that it adapts nothing a
child can see.

## 8. Is there live correction? How?

There is live **detection**, not live **correction**, and that is by design.

- Live: the highlight follows the voice, and slips, repeats, skipped words and pauses are detected and logged as they
  happen.
- Not live: Spark does **not** interrupt to correct, and no card pops up mid-sentence. A child with dyslexia who is
  interrupted mid-word is the most discouraging moment possible, and a pop-up was distracting. Help is there when the
  child asks for it (the box, or hovering a word).
- After: a Whisper second pass; in writing, spelling is checked when the child asks, and answers are judged on Save.

## 9. How is a voice change detected? Child or adult?

(`js/voiceprint.js`, `js/speaker.js`; no audio leaves the device.)

Pitch is a poor signal: one person's pitch swings by a third of an octave between a question and a statement, and a
child can speak low. So pitch is one weak vote. The main evidence is the **shape of the vocal tract**, which doesn't
change when the speaker changes pitch:

- **Formants F1-F3**, found by linear prediction. A child's vocal tract is roughly 25-30% shorter than a man's, so every
  formant sits that much higher at any pitch.
- **MFCCs** (12 numbers summarising the spectral envelope), compared with the child's own voiceprint in units of that
  child's own spread.
- **Pitch** counts as one vote only; it decides alone only if it moves by more than three quarters of an octave.

The verdict is a **vote**: two of three agree, or the vocal tract alone is clearly different. The first seconds of voiced
speech become the voiceprint; afterwards a rolling window is compared. The wording is "that sounds like a different
voice", with one tap for "it is still me".

On synthetic voices (`tests/voiceprint-synthetic.js`) the same adult at any pitch scored 0.01 to 0.07 on vocal-tract
difference, and a child scored about 0.42, including a child speaking at an adult's pitch (about 0.40).
**Real recordings have not been tested yet**, and two children of similar age cannot be told apart by this method. A
neural speaker-embedding model (WavLM, ECAPA-TDNN) is the first upgrade if real data shows the signal-processing version
is not enough.

## 10. Pictures, meanings and pronunciation

A word on its own is ambiguous ("back", "read", "lead"). `js/sense.js` sends the **sentence** to the language model, which
returns the meaning in that sentence, how a speech engine should pronounce it there (past-tense "read" becomes "red"),
what to search a picture library for ("chair back", not "back"), and whether a picture would be suitable at all. Pictures
then come from drawings, ARASAAC pictograms, then Wikipedia, and **every photograph is checked by a vision model** (Llama 4
Scout) for "shows this meaning, fine for a 7-year-old" before it is shown; if the check cannot run, no photograph is shown.
Anatomy words never get photographs. Word parts are spoken from a respelling (`ta` + `ble` is spoken as "tay" + "bull"),
then the whole word.

## 11. Writing

- **Describe a picture:** one word per sentence from a small bank, put in the right gap, then listen, then look-cover-write
  the sentence with word-by-word feedback.
- **Picture story:** three questions specific to each picture (`js/questions.js`), written by the language model from the
  facts known to be true of that picture, with a hand-written set as a fallback. **Save** spell-checks each answer
  (LanguageTool, spelling only for short answers), then judges each answer: first locally (does it contain the expected
  answer or a known alternative, ignoring filler words), then by the language model for anything left, which accepts any
  fair description of that picture in any wording. With no model it says "not sure", never "wrong".

## 12. Streak and "last active"

- **Streak** (`store.js` `bumpStreak`): increases once per calendar day, in the child's own time zone, the first time that
  day they **finish** something: a reading, a chapter's reading or writing step, a "describe a picture", or a picture
  story. Starting without finishing does not count. If they were active yesterday the streak goes up by one; if they
  missed a day it restarts at 1. (It used to roll over at UTC midnight, which is 05:30 in India; that was a bug and is
  fixed.)
- **Last active** (teacher's table): the last time the student's device was **used at all**: a tap, a key press, or the
  page coming back, reported at most once a minute (`touch_child`). It is the later of that and the last finished session,
  so a child who only opened the app still shows as recently active.

## 13. What the teacher's numbers mean

- **Per 100 words:** mix-ups for a letter pair divided by the words with those letters the child met, times 100. It
  removes the effect of an easy or hard passage. Lower is better.
- **Caught it themselves:** the share of mix-ups fixed within 2 seconds without help.
- **Trend:** first half of the chapters against the second half. *Improving* if the second half is at least 25% lower,
  *rising* if at least 25% higher, otherwise *steady*; fewer than three chapters is "not enough data".
- **Help needed**, lightest to most: **prompt** (a nudge to look again, such as the word split into chunks), **cue** (a
  clue to work it out: a picture, or saying it), **choice** (pick between options), **supply** (the answer is given, such as
  hearing the word read).

## 14. Privacy and security

Names and ages go only to the study database. Keys live only in the Cloudflare Worker, never in the web page. The web
page's database key can **only insert**; row-level security stops it reading anything. Teachers read through
password-checked database functions. Removing a student never deletes: it flags the student as removed, keeps their history
on the teacher's Removed page, and the student's device wipes itself. Spark stores no audio; a recording is sent for
transcription only when a model reading check is used.

## 15. Every model

| # | Model or method | What it does | Runs |
|---|---|---|---|
| 1 | Web Speech API recognition | Live word-by-word following | Browser |
| 2 | **Whisper large-v3** (Groq) | Accurate second listen with word times | Worker `/transcribe` |
| 3 | **Llama 3.3 70B** (Groq; fallbacks `gpt-oss-20b`, `llama-3.1-8b`) | Meaning and pronunciation in context; picture search term; syllable respellings; the three picture-story questions; judging answers; comprehension questions; spelling explanations; Ask Spark | Worker `/` |
| 4 | **Llama 4 Scout** vision (Groq) | Checks each photograph | Worker `/judge-image` |
| 5 | **gpt-4o-mini-tts** (OpenAI) | Expressive voice (styled warm, calm, lively, storyteller; isolated words in a "say only this" mode) | Worker `/tts` |
| 6 | Browser speech synthesis | Fallback voices | Browser |
| 7 | **LanguageTool** | Spelling check | Public API |
| 8 | Voiceprint (formants + MFCC) | Same reader? Child or adult? | Browser |
| 9 | Pause classifier (rules + prosody) | Natural or difficulty | Browser |
| 10 | Letter-confusion analysis and answer matching | Detect slips; recognise right answers | Browser |

Only models 2, 3, 4, 5 and 7 are AI services. Items 8, 9 and 10 are our own signal-processing and rules; they are
described as such and not dressed up as AI.

## 16. Novelty

1. **Help that is asked for, and measured.** The child chooses Picture, Hear it, Say it or Split it for the word they are
   stuck on. Each use is logged on a prompt, cue, supply scale and credited if reading resumed, so the teacher sees *how
   much help each word needed*, not just whether it was missed.
2. **Letter-confusion detection that survives the recogniser.** Swaps like b/d are caught even when speech recognition
   silently corrects them, with self-correction within 2 seconds recorded separately, and rates normalised by exposure.
3. **Pause meaning from the voice, the phrasing and the child's own rhythm,** not a stopwatch.
4. **Voice change detected through vocal-tract length,** not pitch, on-device.
5. **Sentence-aware help.** Pictures, pronunciation and meaning chosen for the sense of the word in this sentence, with a
   vision model gating every photograph for child safety.
6. **Answer judging that accepts any fair wording,** over picture-specific questions, with a safe offline fallback.
7. **Teacher view with no per-student sign-in,** a shared database with insert-only student access, and removal that keeps
   history.
8. **Story worlds that carry the practice:** each letter-confusion family is a short story with a write-it step.

## 17. What is not proven

- The voice check and its thresholds have only been tested on synthetic voices, not real children.
- "Helped" means the child carried on reading, not that they understood.
- The pause classifier is a set of sensible rules, not a validated clinical measure.
- There is no per-child curriculum adaptation, and no claim is made about learning styles.
- Nothing here is a diagnosis of dyslexia. The numbers are observations for a teacher or parent to interpret.
- The models above run through free or low-cost tiers; availability and quality can change without notice.
