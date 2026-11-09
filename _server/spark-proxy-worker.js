/* ============================================================
   spark-proxy-worker.js — Cloudflare Worker for Spark's "Ask Spark"

   Holds the API key as a Cloudflare SECRET and forwards chat
   requests to the model provider. The key is never sent to the
   browser and is not in any file on the website.

   Setup: see _server/README.md

   Variables (Worker → Settings → Variables and Secrets):
     GROQ_API_KEY    (Secret)  your key, e.g. gsk_...
     ALLOWED_ORIGINS (Text)    https://paras-shirvale.github.io
                               (comma-separate to add more, e.g.
                                http://localhost:8000 for testing)
   Optional:
     AI_PROVIDER     groq | openrouter | cerebras | mistral   (default groq)
     AI_MODEL        force one model; otherwise tries the list below
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
