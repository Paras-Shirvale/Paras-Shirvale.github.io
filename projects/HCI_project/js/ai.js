/* ============================================================
   ai.js — Spark's thinking, from whichever model is available.

   The app is useful with no model at all. Syllables, pictures,
   speech, pause classification, letter-confusion detection,
   tracking, drills and locally-generated questions are all
   arithmetic and run offline. A model adds four things:

     · a real conversation in Ask Spark
     · plain-English word meanings
     · better comprehension questions
     · spelling corrections that explain the rule

   PROVIDERS. Everything in the list below has a free tier you can
   sign up for today, plus Ollama for running a model on your own
   machine with no account at all. All of them accept requests
   straight from a browser, which is why they work here with no
   backend.

   ABOUT THE KEY. It is stored in this browser and sent directly to
   the provider. That is fine on your own computer. It is NOT safe
   on a public website: anything the browser holds, a visitor can
   read. Publishing this needs a small server that keeps the key.
   ============================================================ */

(function (S) {
  'use strict';

  var AI = S.AI = {
    mode: 'none',
    ready: false,
    claudeFn: null,
    streams: false        /* whether the active provider streams tokens */
  };

  /* ── the providers ──────────────────────────────────── */
  var PROVIDERS = {
    claude: {
      label: 'Claude',
      free: 'Already here — no key needed',
      where: 'Available because this page is open inside claude.ai.',
      shape: 'claude',
      models: [],
      needsKey: false
    },
    groq: {
      label: 'Groq',
      free: 'Free tier, very fast',
      where: 'console.groq.com → API Keys',
      shape: 'openai',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      models: [
        ['llama-3.3-70b-versatile', 'Llama 3.3 70B — best answers'],
        ['llama-3.1-8b-instant',    'Llama 3.1 8B — fastest'],
        ['gemma2-9b-it',            'Gemma 2 9B']
      ],
      needsKey: true
    },
    gemini: {
      label: 'Google Gemini',
      free: 'Generous free tier',
      where: 'aistudio.google.com → Get API key',
      shape: 'gemini',
      models: [
        ['gemini-2.0-flash',      'Gemini 2.0 Flash — recommended'],
        ['gemini-2.0-flash-lite', 'Flash Lite — cheapest'],
        ['gemini-1.5-flash',      'Gemini 1.5 Flash']
      ],
      needsKey: true
    },
    openrouter: {
      label: 'OpenRouter',
      free: 'Several models free',
      where: 'openrouter.ai → Keys',
      shape: 'openai',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      models: [
        ['meta-llama/llama-3.3-70b-instruct:free', 'Llama 3.3 70B (free)'],
        ['google/gemma-3-27b-it:free',             'Gemma 3 27B (free)'],
        ['mistralai/mistral-small-3.2-24b-instruct:free', 'Mistral Small (free)']
      ],
      needsKey: true
    },
    cerebras: {
      label: 'Cerebras',
      free: 'Free tier, extremely fast',
      where: 'cloud.cerebras.ai → API Keys',
      shape: 'openai',
      endpoint: 'https://api.cerebras.ai/v1/chat/completions',
      models: [
        ['llama-3.3-70b', 'Llama 3.3 70B'],
        ['llama3.1-8b',   'Llama 3.1 8B — fastest']
      ],
      needsKey: true
    },
    mistral: {
      label: 'Mistral',
      free: 'Free tier',
      where: 'console.mistral.ai → API Keys',
      shape: 'openai',
      endpoint: 'https://api.mistral.ai/v1/chat/completions',
      models: [
        ['mistral-small-latest', 'Mistral Small'],
        ['open-mistral-nemo',    'Mistral Nemo']
      ],
      needsKey: true
    },
    together: {
      label: 'Together AI',
      free: 'Free credit to start',
      where: 'api.together.xyz → API Keys',
      shape: 'openai',
      endpoint: 'https://api.together.xyz/v1/chat/completions',
      models: [
        ['meta-llama/Llama-3.3-70B-Instruct-Turbo-Free', 'Llama 3.3 70B (free)']
      ],
      needsKey: true
    },
    ollama: {
      label: 'Ollama (your own computer)',
      free: 'Completely free, nothing leaves your machine',
      where: 'Install from ollama.com, then run:  ollama pull llama3.2',
      shape: 'openai',
      endpoint: 'http://localhost:11434/v1/chat/completions',
      models: [
        ['llama3.2',  'Llama 3.2 3B — light'],
        ['llama3.1',  'Llama 3.1 8B'],
        ['gemma3',    'Gemma 3'],
        ['qwen2.5',   'Qwen 2.5']
      ],
      needsKey: false
    },
    proxy: {
      label: 'This site\'s own server',
      free: 'The key stays on the server',
      where: 'Set up when the site was deployed. See DEPLOY.md.',
      shape: 'openai',
      endpoint: '',          /* comes from config.js ENDPOINT (the Worker URL) */
      models: [],
      needsKey: false        /* the server holds it, not the browser */
    },
    custom: {
      label: 'Something else (OpenAI-compatible)',
      free: 'Depends on the service',
      where: 'Paste the full chat-completions URL and your key.',
      shape: 'openai',
      endpoint: '',
      models: [],
      needsKey: true
    }
  };

  AI.PROVIDERS = PROVIDERS;
  AI.providerOrder = ['proxy', 'groq', 'gemini', 'openrouter', 'cerebras',
                      'mistral', 'together', 'ollama', 'custom'];

  /* ── where the settings come from ───────────────────────
     config.js is the developer's answer and normally wins, so the
     child and the teacher never meet an API key. Only if that file
     sets ALLOW_UI_OVERRIDE does anything typed in the app matter. */
  var FILE = window.SPARK_CONFIG || {};

  AI.uiAllowed = function () { return !!FILE.ALLOW_UI_OVERRIDE; };
  AI.configured = function () {
    return !!(FILE.API_KEY || FILE.PROVIDER === 'ollama' ||
              (FILE.PROVIDER === 'proxy' && FILE.ENDPOINT));
  };

  /** The live settings: config.js, unless the app is allowed to override. */
  AI.settings = function () {
    var ui = S.P.ai || {};
    var allowOverride = AI.uiAllowed() && ui.key;
    if (allowOverride) {
      return { provider: ui.provider || 'groq', key: ui.key,
               model: ui.model || '', endpoint: ui.endpoint || '' };
    }
    return { provider: FILE.PROVIDER || '', key: FILE.API_KEY || '',
             model: FILE.MODEL || '', endpoint: FILE.ENDPOINT || '' };
  };

  function usable(name) {
    var p = PROVIDERS[name];
    if (!p) return false;
    if (name === 'claude') return !!AI.claudeFn;
    if (name === 'proxy') return !!AI.endpointFor('proxy');   /* needs the Worker URL */
    if (!p.needsKey) return true;                 /* Ollama needs no key */
    return !!AI.settings().key;
  }

  function resolve() {
    var cfg = AI.settings();
    if (cfg.provider && cfg.provider !== 'auto') {
      return usable(cfg.provider) ? cfg.provider : (AI.claudeFn ? 'claude' : 'none');
    }
    if (AI.claudeFn) return 'claude';
    if (cfg.key) return 'groq';
    return 'none';
  }

  AI.refresh = function () {
    var was = AI.mode + '|' + (AI.settings().key || '').slice(-6);
    AI.mode = resolve();
    AI.ready = AI.mode !== 'none';
    /* a different provider or key has not been proved to work yet */
    if (was !== AI.mode + '|' + (AI.settings().key || '').slice(-6)) AI.verified = false;
    var p = PROVIDERS[AI.mode];
    AI.streams = !!(p && (p.shape === 'openai' || p.shape === 'claude'));
    if (S.paintAIStatus) S.paintAIStatus();
    return AI.mode;
  };

  AI.label = function () {
    var p = PROVIDERS[AI.mode];
    return p ? p.label : 'offline';
  };

  AI.defaultModel = function (name) {
    var p = PROVIDERS[name];
    return (p && p.models.length) ? p.models[0][0] : '';
  };

  AI.endpointFor = function (name) {
    var cfg = AI.settings();
    if (name === 'custom' || name === 'proxy') return cfg.endpoint || '';
    return (PROVIDERS[name] && PROVIDERS[name].endpoint) || '';
  };

  /* ── find Claude, if this page is inside an artifact ─── */
  (function detectClaude() {
    var p = null;
    try { p = (window.claude && window.claude.use) ? window.claude.use('sample') : null; }
    catch (e) { p = null; }
    if (p && typeof p.then === 'function') {
      p.then(function (fn) { AI.claudeFn = fn || null; AI.refresh(); })
       .catch(function () { AI.refresh(); });
    }
  })();

  /* ── calls ──────────────────────────────────────────── */

  function toMessages(input) {
    return typeof input === 'string' ? [{ role: 'user', content: input }] : input;
  }

  /** OpenAI-shaped, with real token streaming when asked for. */
  async function callOpenAIShape(messages, opts) {
    var cfg = AI.settings();
    var url = AI.endpointFor(AI.mode) || PROVIDERS.custom.endpoint;
    if (!url) throw { code: 'config', message: 'No endpoint set for this provider.' };

    var headers = { 'Content-Type': 'application/json' };
    if (cfg.key) headers.Authorization = 'Bearer ' + cfg.key;
    if (AI.mode === 'openrouter') headers['X-Title'] = 'Spark Reading';

    var wantStream = !!opts.onText;

    var res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: cfg.model || AI.defaultModel(AI.mode),
        messages: messages,
        temperature: opts.temperature != null ? opts.temperature : 0.6,
        max_tokens: opts.maxTokens || 500,
        stream: wantStream
      }),
      signal: opts.signal
    });
    if (!res.ok) throw await describe(res);

    if (!wantStream) {
      var data = await res.json();
      var text = data && data.choices && data.choices[0] &&
                 data.choices[0].message && data.choices[0].message.content;
      if (!text) throw { code: 'empty', message: 'No answer came back.' };
      return text.trim();
    }
    return await readSSE(res, opts.onText);
  }

  /** Server-sent events: pull the deltas out as they arrive. */
  async function readSSE(res, onText) {
    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '', full = '';

    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });

      var lines = buffer.split('\n');
      buffer = lines.pop();

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line || line.indexOf('data:') !== 0) continue;
        var payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          var json = JSON.parse(payload);
          var delta = json.choices && json.choices[0] &&
                      json.choices[0].delta && json.choices[0].delta.content;
          if (delta) { full += delta; onText(full); }
        } catch (e) { /* a partial frame; the next chunk completes it */ }
      }
    }
    if (!full) throw { code: 'empty', message: 'No answer came back.' };
    return full.trim();
  }

  /** Google Gemini has its own request shape. */
  async function callGemini(messages, opts) {
    var cfg = AI.settings();
    var model = cfg.model || AI.defaultModel('gemini');
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
              encodeURIComponent(model) + ':generateContent?key=' +
              encodeURIComponent(cfg.key);

    /* Gemini has no system role — the leading instructions are just
       the first user turn, which is how these messages are built. */
    var contents = messages.map(function (m) {
      return { role: m.role === 'assistant' ? 'model' : 'user',
               parts: [{ text: m.content }] };
    });

    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: opts.temperature != null ? opts.temperature : 0.6,
          maxOutputTokens: opts.maxTokens || 500
        }
      }),
      signal: opts.signal
    });
    if (!res.ok) throw await describe(res);

    var data = await res.json();
    var cand = data && data.candidates && data.candidates[0];
    var text = cand && cand.content && cand.content.parts &&
               cand.content.parts.map(function (p) { return p.text || ''; }).join('');
    if (!text) throw { code: 'empty', message: 'No answer came back.' };
    text = text.trim();
    if (opts.onText) opts.onText(text);        /* no stream: deliver in one go */
    return text;
  }

  /** The Claude artifact helper, which streams natively. */
  async function callClaude(messages, opts) {
    var r = await AI.claudeFn(messages, {
      modelTier: 'quick',
      cache: opts.cache === undefined ? true : opts.cache,
      signal: opts.signal,
      onText: opts.onText ? function (u) { opts.onText(u.text); } : undefined
    });
    return (r.text || '').trim();
  }

  async function describe(res) {
    var body = '';
    try { body = await res.text(); } catch (e) {}

    var fixItIn = AI.uiAllowed() ? 'Settings' : 'js/config.js';

    var detail = '';
    try {
      var j = JSON.parse(body);
      detail = (j.error && (j.error.message || j.error.code || j.error)) || '';
      if (typeof detail !== 'string') detail = JSON.stringify(detail);
    } catch (e) { detail = body.slice(0, 200); }

    if (res.status === 401 || res.status === 403)
      return { code: 'auth', message: 'That key was refused. ' +
               (AI.uiAllowed() ? 'Check it and try again.' : 'Check API_KEY in ' + fixItIn + '.') };

    if (res.status === 429)
      return { code: 'rate', message: 'The free limit is used up for now. Try again shortly.' };

    /* A retired or misspelled model comes back as 404 from some
       providers and 400 from others, so go by what it says too.
       The model name sits between the two words, and names get
       long, hence the generous gap. */
    if (res.status === 404 ||
        /model[\s\S]{0,90}?(not found|does not exist|decommission|deprecat|no longer (?:supported|available)|unsupported|invalid|unavailable)/i.test(detail) ||
        /(not found|invalid|unknown|unsupported)[\s\S]{0,40}?model/i.test(detail) ||
        /model_(?:not_found|decommissioned|deprecated)/i.test(detail)) {
      return { code: 'model', message: 'That model is no longer available. ' +
               'Spark will look for one that is.', detail: detail };
    }

    return { code: 'http', message: 'The helper replied with an error (' +
                                    res.status + '). ' + detail };
  }

  /* ── the two calls the rest of the app makes ────────── */

  /**
   * Ask for prose. `input` is a prompt string or {role, content} turns.
   * Pass opts.onText to stream. Rejects with {code, message}.
   */
  AI.ask = async function (input, opts) {
    opts = opts || {};
    if (!AI.ready) throw { code: 'off', message: 'No AI helper is set up.' };
    var messages = toMessages(input);
    var shape = PROVIDERS[AI.mode].shape;

    try {
      if (shape === 'claude') return await callClaude(messages, opts);
      if (shape === 'gemini') return await callGemini(messages, opts);
      return await callOpenAIShape(messages, opts);
    } catch (e) {
      if (e && e.name === 'AbortError') throw { code: 'cancelled', message: '' };
      if (e && e.code) throw e;
      /* fetch() throws a bare TypeError when the network or CORS blocks it */
      var hint = AI.mode === 'ollama'
        ? 'Is Ollama running? Start it with: OLLAMA_ORIGINS=* ollama serve'
        : 'Check the connection and the key.';
      throw { code: 'network', message: 'Couldn\'t reach the helper. ' + hint };
    }
  };

  /** Ask for JSON. Tolerant of fences and stray words around the value. */
  AI.askJSON = async function (input, opts) {
    opts = opts || {};
    var text = await AI.ask(input, Object.assign({ temperature: 0.3 }, opts, { onText: null }));
    return parseJSON(text);
  };

  function parseJSON(text) {
    var tries = [text];
    var fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) tries.push(fence[1]);
    var first = text.search(/[[{]/);
    var last = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
    if (first > -1 && last > first) tries.push(text.slice(first, last + 1));

    for (var i = 0; i < tries.length; i++) {
      try { return JSON.parse(tries[i].trim()); } catch (e) {}
    }
    throw { code: 'badjson', message: 'The helper\'s answer wasn\'t readable.' };
  }

  /** Turn an error into something safe to show a child. */
  AI.friendly = function (e) {
    var c = e && e.code;
    if (c === 'cancelled') return '';
    if (c === 'off')       return '';
    if (c === 'auth')      return 'My thinking helper isn\'t connected properly. ' +
                                  'An adult needs to check the setup.';
    if (c === 'rate')      return 'I need a short rest — try me again in a minute.';
    if (c === 'model')     return 'My thinking helper needs setting up again.';
    return 'I couldn\'t think that through just now. Ask me again?';
  };

  /* ── asking the provider what it actually has ───────────
     Hardcoding model names does not survive contact with time:
     providers retire and rename them every few months, and a list
     written today produces "model not found" six months later. So
     Spark asks. The names below are only a starting guess and a
     ranking preference — the live list always wins. */

  /** Fetch the model ids this key can actually use. */
  AI.listModels = async function () {
    var cfg = AI.settings();
    var mode = AI.mode;

    try {
      if (mode === 'gemini') {
        var gres = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models?key=' +
          encodeURIComponent(cfg.key));
        if (!gres.ok) return [];
        var gdata = await gres.json();
        return (gdata.models || [])
          .filter(function (m) {
            return (m.supportedGenerationMethods || []).indexOf('generateContent') > -1;
          })
          .map(function (m) { return String(m.name).replace(/^models\//, ''); });
      }

      /* every OpenAI-compatible provider exposes /models */
      var base = AI.endpointFor(mode).replace(/\/chat\/completions.*$/, '');
      if (!base) return [];
      var res = await fetch(base + '/models', {
        headers: cfg.key ? { Authorization: 'Bearer ' + cfg.key } : {}
      });
      if (!res.ok) return [];
      var data = await res.json();
      return (data.data || data.models || [])
        .map(function (m) { return m.id || m.name; })
        .filter(Boolean);
    } catch (e) {
      return [];
    }
  };

  /* Models that cannot hold a conversation, whatever they are called. */
  var NOT_CHAT = /whisper|tts|embed|embedding|moderation|guard|rerank|vision-only|audio|image|dall|stable|sora/i;

  /**
   * Score a model for this job: a warm, quick reading buddy for a
   * child. Prefers instruction-tuned general chat models, mid-to-large,
   * and avoids anything specialised.
   */
  function scoreModel(id) {
    var s = 0, n = String(id).toLowerCase();
    if (NOT_CHAT.test(n)) return -100;

    /* families that follow instructions well */
    if (/llama/.test(n)) s += 30;
    if (/gemma/.test(n)) s += 26;
    if (/qwen/.test(n)) s += 24;
    if (/mistral|mixtral|ministral/.test(n)) s += 22;
    if (/gpt|claude|deepseek/.test(n)) s += 20;

    /* newer generations, when the name says so */
    var ver = n.match(/(\d+)\.(\d+)/);
    if (ver) s += Math.min(12, parseInt(ver[1], 10) * 2 + parseInt(ver[2], 10));

    /* size: big enough to talk well, not so big it is slow */
    if (/70b|72b/.test(n)) s += 14;
    else if (/27b|32b|30b/.test(n)) s += 12;
    else if (/8b|9b|7b|12b/.test(n)) s += 8;

    if (/instruct|versatile|chat|it\b/.test(n)) s += 6;
    if (/instant|flash|turbo|fast|lite|mini|small/.test(n)) s += 4;

    /* avoid experimental builds where a stable one exists */
    if (/preview|experimental|exp-|alpha|beta|deprecated/.test(n)) s -= 10;
    if (/free/.test(n)) s += 3;   /* OpenRouter's free tier */

    return s;
  }

  /**
   * Pick the best model this key can actually use and remember it.
   * Returns the id, or null when the list could not be fetched.
   */
  AI.autoPickModel = async function () {
    var ids = await AI.listModels();
    if (!ids.length) return null;

    var ranked = ids
      .map(function (id) { return { id: id, score: scoreModel(id) }; })
      .filter(function (m) { return m.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });

    if (!ranked.length) return null;

    AI.availableModels = ranked.map(function (m) { return m.id; });
    var chosen = ranked[0].id;
    S.P.ai.model = chosen;
    S.save();
    AI.refresh();
    return chosen;
  };

  /**
   * Used by the Connect / Test button.
   * If the saved model has been retired, this finds a live one and
   * retries once, rather than leaving the person stuck on an error
   * about a name they never chose.
   */
  /* Models to try when the provider will not tell us what it has.
     Providers retire names without notice, so this is deliberately a
     list to work down rather than a single default — and the probing
     below runs against the chat endpoint itself, which is the only
     thing guaranteed to be reachable from a browser. */
  var CANDIDATES = {
    groq: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'openai/gpt-oss-20b',
      'openai/gpt-oss-120b',
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'meta-llama/llama-4-maverick-17b-128e-instruct',
      'qwen/qwen3-32b',
      'gemma2-9b-it'
    ],
    gemini: [
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash'
    ],
    cerebras: ['llama-3.3-70b', 'llama3.1-8b', 'qwen-3-32b'],
    mistral: ['mistral-small-latest', 'open-mistral-nemo', 'ministral-8b-latest'],
    together: [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
      'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'
    ],
    openrouter: [
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemma-3-27b-it:free',
      'mistralai/mistral-small-3.2-24b-instruct:free',
      'deepseek/deepseek-chat-v3.1:free'
    ],
    ollama: ['llama3.2', 'llama3.1', 'gemma3', 'qwen2.5', 'mistral']
  };

  /** Does this model answer? Saves it and reports back if so. */
  async function probe(model) {
    S.P.ai.model = model;
    S.save();
    var reply = await AI.ask('Reply with exactly: ok', { maxTokens: 10, cache: false });
    return reply;
  }

  /**
   * Connect for real: find a model that actually answers, keep it.
   *
   * Order of attack:
   *   1. whatever is configured, if anything
   *   2. whatever the provider's /models endpoint lists (when the
   *      browser is allowed to ask — Groq, for one, is not)
   *   3. a built-in candidate list, probed one at a time
   *
   * Resolves { model, reply, tried }. Rejects with {code, message}.
   */
  AI.connect = async function () {
    if (!AI.ready) throw { code: 'off', message: 'No key is set yet.' };

    /* Behind a proxy the server chooses the model, so there is
       nothing to probe — just check that it answers. */
    if (AI.mode === 'proxy') {
      var r = await AI.ask('Reply with exactly: ok', { maxTokens: 10, cache: false });
      AI.verified = true;
      AI.refresh();
      return { ok: true, model: 'chosen by the server', reply: r, tried: [] };
    }

    var configured = AI.settings().model;
    var order = [];
    var seen = {};
    function add(m) { if (m && !seen[m]) { seen[m] = 1; order.push(m); } }

    add(configured);

    /* ask the provider, if it will say */
    var listed = [];
    try { listed = await AI.listModels(); } catch (e) { listed = []; }
    if (listed.length) {
      AI.availableModels = listed
        .filter(function (id) { return scoreModel(id) > 0; })
        .sort(function (a, b) { return scoreModel(b) - scoreModel(a); });
      AI.availableModels.slice(0, 5).forEach(add);
    }

    (CANDIDATES[AI.mode] || []).forEach(add);
    (PROVIDERS[AI.mode].models || []).forEach(function (m) { add(m[0]); });

    var tried = [];
    var lastError = null;

    for (var i = 0; i < order.length && i < 9; i++) {
      tried.push(order[i]);
      try {
        var reply = await probe(order[i]);
        AI.verified = true;
        if (!AI.availableModels.length) AI.availableModels = [order[i]];
        AI.refresh();
        return {
          ok: true,
          model: order[i],
          reply: reply,
          tried: tried,
          /* true when the configured model had to be abandoned */
          switched: !!(configured && order[i] !== configured)
        };
      } catch (e) {
        lastError = e;
        /* a wrong model name is worth trying the next one for.
           A bad key, a rate limit or no network is not. */
        if (e.code !== 'model' && e.code !== 'http') break;
      }
    }

    AI.verified = false;
    /* leave the configured model as it was rather than a failed probe */
    S.P.ai.model = configured || '';
    S.save();

    if (lastError && (lastError.code === 'model' || lastError.code === 'http')) {
      throw {
        code: 'model',
        message: 'Your key works, but none of the models I know about are ' +
                 'available on this account. Tried: ' + tried.slice(0, 4).join(', ') + '.'
      };
    }
    throw lastError || { code: 'model', message: 'Could not find a working model.' };
  };

  AI.availableModels = [];
  AI.verified = false;

  /** Used by the Test button in Settings. */
  AI.test = function () { return AI.connect(); };

  AI.refresh();

})(window.Spark);
