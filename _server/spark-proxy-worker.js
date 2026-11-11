/* ============================================================
   spark-proxy-worker.js — Cloudflare Worker for Spark's models

   Holds the API keys as Cloudflare SECRETS and forwards requests
   to the model providers. No key is ever sent to the browser.

   Four routes:
     POST /            text model (word meanings, word parts,
                       spelling explanations) — Groq Llama 3.3 70B
     POST /transcribe  speech-to-text — Groq Whisper large-v3, with
                       a time for every word. Used to double-check
                       what the child actually said while reading.
                       Uses the same GROQ_API_KEY.
     POST /judge-image does this picture really show this word, for a
                       child? — Groq Llama 4 Scout (vision). Same key.
     POST /tts         natural voice — OpenAI gpt-4o-mini-tts.
                       Optional: only on if OPENAI_API_KEY is set;
                       otherwise the app uses the browser's voices.

   Setup: see _server/README.md

   Variables (Worker → Settings → Variables and Secrets):
     GROQ_API_KEY    (Secret)  your key, e.g. gsk_...
     ALLOWED_ORIGINS (Text)    https://paras-shirvale.github.io
                               (comma-separate to add more, e.g.
                                http://localhost:8000 for testing)
   Optional:
     AI_PROVIDER     groq | openrouter | cerebras | mistral   (default groq)
     AI_MODEL        force one model; otherwise tries the list below
     WHISPER_MODEL   default whisper-large-v3
     OPENAI_API_KEY  (Secret) turns on the natural voice at /tts
     TTS_MODEL       default gpt-4o-mini-tts
   ============================================================ */

const PROVIDERS = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    keyEnv: 'GROQ_API_KEY',
    models: ['llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'],
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    keyEnv: 'OPENROUTER_API_KEY',
    models: ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemma-3-27b-it:free'],
  },
  cerebras: {
    url: 'https://api.cerebras.ai/v1/chat/completions',
    keyEnv: 'CEREBRAS_API_KEY',
    models: ['llama-3.3-70b', 'llama3.1-8b'],
  },
  mistral: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    keyEnv: 'MISTRAL_API_KEY',
    models: ['mistral-small-latest', 'open-mistral-nemo'],
  },
};

/* Caps so nobody can use this endpoint for big jobs. */
const MAX_TOKENS = 600;
const MAX_MESSAGES = 20;
const MAX_CHARS = 20000;

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
}

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function fail(message, status, origin) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...(origin ? cors(origin) : {}) },
  });
}

/* ── speech to text: Whisper on Groq ──────────────────── */
const MAX_AUDIO = 10 * 1024 * 1024;

async function transcribe(request, env, origin) {
  if (!env.GROQ_API_KEY) return fail('The server has no GROQ_API_KEY secret set.', 500, origin);
  let form;
  try { form = await request.formData(); } catch { return fail('Send the audio as form data.', 400, origin); }
  const file = form.get('file');
  if (!file || typeof file === 'string') return fail('No audio was sent.', 400, origin);
  if (file.size > MAX_AUDIO) return fail('That recording is too long.', 413, origin);

  const models = env.WHISPER_MODEL ? [env.WHISPER_MODEL] : ['whisper-large-v3', 'whisper-large-v3-turbo'];
  let last = 502;
  for (const model of models) {
    const up = new FormData();
    up.append('file', file, file.name || 'reading.webm');
    up.append('model', model);
    up.append('response_format', 'verbose_json');
    up.append('timestamp_granularities[]', 'word');
    up.append('language', 'en');
    up.append('temperature', '0');
    /* No prompt on purpose: giving Whisper the story would bias it
       towards hearing the right words — the opposite of the aim. */
    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` }, body: up,
    });
    if (r.ok) {
      const data = await r.json();
      const words = (data.words || []).map((w) => ({ word: w.word, start: w.start, end: w.end }));
      return new Response(JSON.stringify({ text: data.text || '', words, model }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(origin) },
      });
    }
    last = r.status;
    if (r.status !== 404 && r.status !== 400) break;
  }
  if (last === 429) return fail('Too many requests right now.', 429, origin);
  return fail(`The speech model replied ${last}.`, 502, origin);
}

/* ── text to speech: a natural, expressive voice ───────── */
const TTS_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'];

/* gpt-4o-mini-tts is steerable: "instructions" changes HOW it speaks
   (pace, warmth, emphasis, accent), not what. Flat delivery is the
   default when no style is given, so every request gets one. The
   browser sends only a short style KEY; the wording lives here so
   nobody can turn the endpoint into a general prompt box. */
const TTS_BASE =
  'You are reading aloud to a child of 7 to 14 who is learning to read and may have dyslexia. ' +
  'Never sound flat or bored. Use natural, varied intonation: let your pitch rise on questions ' +
  'and excitement, fall at the end of statements, and slow down a little for important or tricky words. ' +
  'Give dialogue its own voice and feeling. Leave a short, natural breath at commas and full stops. ' +
  'Say every word clearly and correctly, using the meaning of the sentence to choose the right ' +
  'pronunciation and tense (for example "read" as red when it is past tense). ';

const TTS_STYLES = {
  warm:     'Warm, bright and encouraging, like a favourite teacher. ',
  calm:     'Calm, gentle and unhurried, like a bedtime story. Soft and soothing. ',
  lively:   'Lively, cheerful and playful, like a friendly older kid telling an exciting story. ',
  steady:   'Steady, friendly and clear, a warm grown-up voice. Relaxed pace. ',
  story:    'A skilled storyteller: dramatic pauses, different feeling for each moment, big expression. ',
};
/* Single words and word-parts are not a story: say just that, clearly. */
const TTS_WORD =
  'The text is a single word, or a single part of a word, for a child to hear. Say ONLY that, slowly ' +
  'and very clearly, with no expression added, no extra words and no trailing sound. If it is part of ' +
  'a longer word, say it as that part sounds inside the word. ';

async function tts(request, env, origin) {
  if (!env.OPENAI_API_KEY) return fail('No voice model is set up.', 501, origin);
  let body;
  try { body = await request.json(); } catch { return fail('Unreadable request.', 400, origin); }
  const text = String(body.text || '').slice(0, 1500);
  if (!text.trim()) return fail('No text.', 400, origin);
  const voice = TTS_VOICES.includes(body.voice) ? body.voice : 'coral';
  const style = TTS_STYLES[body.style] || TTS_STYLES.warm;
  const instructions = body.mode === 'word' ? TTS_BASE + TTS_WORD : TTS_BASE + style;

  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: env.TTS_MODEL || 'gpt-4o-mini-tts',
      voice, input: text, instructions, response_format: 'mp3',
    }),
  });
  if (!r.ok) return fail(`The voice model replied ${r.status}.`, 502, origin);
  return new Response(r.body, {
    status: 200,
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=604800', ...cors(origin) },
  });
}

/* ── picture check: does this image really show this word? ──
   A vision model looks at the candidate image, with the word, the
   meaning chosen from the sentence, and a child-safety rule. This is
   what stops "back" (of a chair) turning into a bare human back.
   Uses the same Groq key. Replies { ok, why }. */
const VISION_MODELS = ['meta-llama/llama-4-scout-17b-16e-instruct', 'meta-llama/llama-4-maverick-17b-128e-instruct'];

async function judgeImage(request, env, origin) {
  if (!env.GROQ_API_KEY) return fail('The server has no GROQ_API_KEY secret set.', 500, origin);
  let body;
  try { body = await request.json(); } catch { return fail('Unreadable request.', 400, origin); }
  const url = String(body.url || '');
  if (!/^https:\/\/(upload\.wikimedia\.org|static\.arasaac\.org|[a-z0-9.-]*\.openverse\.org|live\.staticflickr\.com)\//i.test(url)) {
    return fail('That image address is not allowed.', 400, origin);
  }
  const word = String(body.word || '').slice(0, 40);
  const sense = String(body.sense || '').slice(0, 160);
  const prompt =
    'A children\'s reading app wants to show this picture beside the word "' + word + '"' +
    (sense ? ' meaning: ' + sense : '') + '.\n' +
    'Answer with only JSON: {"ok":boolean,"why":string}.\n' +
    'ok is true ONLY if (1) the picture clearly shows that exact meaning, not another meaning of the word, ' +
    'AND (2) it is suitable for a 7-year-old: no nudity or bare skin beyond a face and hands, no violence, ' +
    'no scary or adult content, no text-heavy diagrams. Otherwise ok is false. "why" is under 12 words.';
  for (const model of VISION_MODELS) {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model, temperature: 0, max_tokens: 80, response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt }, { type: 'image_url', image_url: { url } }] }],
      }),
    });
    if (!r.ok) continue;
    try {
      const out = JSON.parse((await r.json()).choices[0].message.content);
      return new Response(JSON.stringify({ ok: out.ok === true, why: String(out.why || ''), model }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(origin) },
      });
    } catch { /* try the next model */ }
  }
  return fail('The picture check is not available.', 502, origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = allowedOrigins(env);

    /* Only answer the website(s) listed in ALLOWED_ORIGINS. */
    if (!allowed.includes(origin)) {
      return fail('Not allowed.', 403, null);
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (request.method !== 'POST') return fail('Send a POST request.', 405, origin);

    const path = new URL(request.url).pathname.replace(/\/+$/, '');
    if (path === '/transcribe') return transcribe(request, env, origin);
    if (path === '/tts') return tts(request, env, origin);
    if (path === '/judge-image') return judgeImage(request, env, origin);

    const provider = String(env.AI_PROVIDER || 'groq').toLowerCase();
    const spec = PROVIDERS[provider];
    if (!spec) return fail(`Unknown AI_PROVIDER: ${provider}`, 500, origin);

    const key = env[spec.keyEnv];
    if (!key) return fail(`The server has no ${spec.keyEnv} secret set.`, 500, origin);

    let body;
    try { body = await request.json(); } catch { return fail('Unreadable request.', 400, origin); }

    const messages = Array.isArray(body.messages) ? body.messages : null;
    if (!messages || !messages.length) return fail('No messages were sent.', 400, origin);
    if (messages.length > MAX_MESSAGES) return fail('That conversation is too long.', 400, origin);
    const chars = messages.reduce((n, m) => n + String((m && m.content) || '').length, 0);
    if (chars > MAX_CHARS) return fail('That request is too large.', 400, origin);

    const maxTokens = Math.min(Number(body.max_tokens) || 400, MAX_TOKENS);
    const t = Number(body.temperature);
    const temperature = Math.min(Math.max(Number.isFinite(t) ? t : 0.6, 0), 1.5);
    const stream = body.stream !== false;

    /* The model is fixed on the server — whatever the browser asks for is ignored. */
    const candidates = env.AI_MODEL ? [env.AI_MODEL] : spec.models;
    let lastStatus = 502;
    let lastText = '';

    for (const model of candidates) {
      const upstream = await fetch(spec.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: messages.map((m) => ({ role: m.role, content: String(m.content || '') })),
          temperature,
          max_tokens: maxTokens,
          stream,
        }),
      });

      if (upstream.ok) {
        return new Response(upstream.body, {
          status: 200,
          headers: {
            'Content-Type': stream ? 'text/event-stream' : 'application/json',
            'Cache-Control': 'no-store',
            ...cors(origin),
          },
        });
      }
      lastStatus = upstream.status;
      lastText = await upstream.text().catch(() => '');
      /* 404 / 400 "model not found" → try the next model; anything else → stop */
      if (upstream.status !== 404 && !/model/i.test(lastText)) break;
    }

    if (lastStatus === 401 || lastStatus === 403) return fail('The server key was refused.', 502, origin);
    if (lastStatus === 429) return fail('Too many questions right now — try again in a minute.', 429, origin);
    return fail(`The model provider replied ${lastStatus}.`, 502, origin);
  },
};
