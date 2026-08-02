/**
 * Multi-provider LLM calls for Ask (Gemini, OpenAI, Grok/xAI, Claude).
 * Secrets stay on the server — never accept client API keys.
 *
 * Auto model selection: when *_MODEL is unset / "auto" / "free", each provider
 * walks a free-tier-biased chain and falls back on model/quota/upstream errors.
 * Pin a model id to try it first (still falls back to the rest of the chain).
 */

export type AskProviderId = 'gemini' | 'openai' | 'grok' | 'claude';

export type LlmEnv = {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  /** xAI Grok */
  XAI_API_KEY?: string;
  XAI_MODEL?: string;
  /** Alias accepted for convenience */
  GROK_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
};

export type AskErrorCode =
  | 'provider_not_configured'
  | 'gemini_not_configured'
  | 'upstream_error'
  | 'upstream_quota'
  | 'upstream_unavailable'
  | 'empty_response';

export const ASK_PROVIDERS: AskProviderId[] = [
  'gemini',
  'openai',
  'grok',
  'claude',
];

/**
 * Free-tier / cost-biased model chains (tried in order until one succeeds).
 * Order: higher free caps / cheaper first, then quality fallbacks, then legacy ids.
 *
 * OpenAI Free tier (usage tiers): prefer high-limit mini models.
 *   Typical Free: ~50 RPD shared, mini e.g. gpt-5.4-mini ~100k TPM / 10 RPM / 200k TPD
 *   Flagship (gpt-5.5 etc.) is worse for free (3 RPM / 10k TPM) — avoid first.
 * Gemini: Flash-Lite free RPD is typically higher than Flash.
 * Claude: Haiku is the low-cost tier (trial credits go furthest).
 * Grok: credits apply to any model; start with current flagship, then cheaper ids.
 */
export const FREE_TIER_MODEL_CHAINS: Record<AskProviderId, readonly string[]> = {
  gemini: [
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
  ],
  openai: [
    // Free-tier friendly (higher TPM/RPM on Free org limits)
    'gpt-5.4-mini',
    'gpt-5.6-luna',
    // Legacy free/data-share mini ids (if still enabled on the org)
    'gpt-5-mini',
    'gpt-4.1-mini',
    'gpt-4.1-nano',
    'gpt-4o-mini',
    // Last resort — low Free RPM/TPM
    'gpt-5.5',
  ],
  grok: [
    'grok-4.5',
    'grok-4.3',
    'grok-4.20-0309-non-reasoning',
    'grok-4',
  ],
  claude: [
    'claude-haiku-4-5',
    'claude-haiku-4-5-20251001',
  ],
};

/** @deprecated use FREE_TIER_MODEL_CHAINS — kept for older imports */
export const DEFAULT_MODELS: Record<Exclude<AskProviderId, 'gemini'>, string> = {
  openai: FREE_TIER_MODEL_CHAINS.openai[0]!,
  grok: FREE_TIER_MODEL_CHAINS.grok[0]!,
  claude: FREE_TIER_MODEL_CHAINS.claude[0]!,
};

/** Higher when multi-item label breakdown is needed. */
const MAX_OUTPUT_TOKENS = 1400;

export function normalizeProvider(raw: unknown): AskProviderId {
  const s = String(raw ?? '')
    .toLowerCase()
    .trim();
  if (s === 'openai' || s === 'gpt') return 'openai';
  if (s === 'grok' || s === 'xai' || s === 'x-ai') return 'grok';
  if (s === 'claude' || s === 'anthropic') return 'claude';
  return 'gemini';
}

export function providerConfigured(
  provider: AskProviderId,
  env: LlmEnv
): boolean {
  return Boolean(apiKeyFor(provider, env));
}

function apiKeyFor(provider: AskProviderId, env: LlmEnv): string {
  if (provider === 'gemini') return env.GEMINI_API_KEY?.trim() || '';
  if (provider === 'openai') return env.OPENAI_API_KEY?.trim() || '';
  if (provider === 'grok')
    return env.XAI_API_KEY?.trim() || env.GROK_API_KEY?.trim() || '';
  return env.ANTHROPIC_API_KEY?.trim() || '';
}

function envModelOverride(
  provider: AskProviderId,
  env: LlmEnv
): string | undefined {
  let raw: string | undefined;
  if (provider === 'gemini') raw = env.GEMINI_MODEL;
  else if (provider === 'openai') raw = env.OPENAI_MODEL;
  else if (provider === 'grok') raw = env.XAI_MODEL;
  else raw = env.ANTHROPIC_MODEL;

  const s = raw?.trim().replace(/^models\//, '') || '';
  if (!s) return undefined;
  const lower = s.toLowerCase();
  // auto / free → walk free-tier chain only
  if (lower === 'auto' || lower === 'free' || lower === 'default') {
    return undefined;
  }
  return s;
}

/**
 * Resolve model try-order for a provider.
 * - unset / auto / free → free-tier chain
 * - explicit id → that id first, then remaining free-tier models as fallback
 */
export function modelChain(provider: AskProviderId, env: LlmEnv): string[] {
  const chain = [...FREE_TIER_MODEL_CHAINS[provider]];
  const preferred = envModelOverride(provider, env);
  if (!preferred) return chain;
  return [preferred, ...chain.filter((m) => m !== preferred)];
}

/** First model that would be attempted (for diagnostics / docs). */
export function modelFor(provider: AskProviderId, env: LlmEnv): string {
  return modelChain(provider, env)[0]!;
}

export type LlmCallError = Error & {
  code: AskErrorCode;
  httpStatus: number;
};

function llmFail(code: AskErrorCode, httpStatus: number): LlmCallError {
  return Object.assign(new Error(code), { code, httpStatus });
}

type CallOnce =
  | { ok: true; text: string }
  | { ok: false; kind: AskErrorCode };

function mapHttpError(status: number, bodyText: string): AskErrorCode {
  const msg = bodyText.toLowerCase();
  if (status === 429 || /quota|rate limit|resource exhausted|insufficient_quota|billing/.test(msg)) {
    return 'upstream_quota';
  }
  if (status === 503 || status === 504) return 'upstream_unavailable';
  return 'upstream_error';
}

/** True when the failure is worth trying the next model in the free-tier chain. */
function shouldTryNextModel(kind: AskErrorCode): boolean {
  return (
    kind === 'upstream_error' ||
    kind === 'upstream_quota' ||
    kind === 'upstream_unavailable' ||
    kind === 'empty_response'
  );
}

/** Optional vision attachment (base64, no data: prefix). */
export type LlmImage = {
  mimeType: string;
  data: string;
};

function geminiParts(prompt: string, image?: LlmImage) {
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (image?.data) {
    parts.push({
      inline_data: {
        mime_type: image.mimeType,
        data: image.data,
      },
    });
  }
  return parts;
}

async function callGeminiOnce(
  apiKey: string,
  model: string,
  prompt: string,
  image?: LlmImage
): Promise<CallOnce> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: geminiParts(prompt, image) }],
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          responseMimeType: 'application/json',
        },
      }),
    });
  } catch {
    return { ok: false, kind: 'upstream_unavailable' };
  }

  let data: {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return { ok: false, kind: 'upstream_error' };
  }

  if (!res.ok) {
    return {
      ok: false,
      kind: mapHttpError(res.status, data.error?.message || ''),
    };
  }

  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
  if (!text.trim()) return { ok: false, kind: 'empty_response' };
  return { ok: true, text };
}

function openAiUserContent(
  prompt: string,
  image?: LlmImage
): string | Array<Record<string, unknown>> {
  if (!image?.data) return prompt;
  return [
    { type: 'text', text: prompt },
    {
      type: 'image_url',
      image_url: {
        url: `data:${image.mimeType};base64,${image.data}`,
      },
    },
  ];
}

/** GPT-5+ chat models often want max_completion_tokens and omit temperature. */
function isOpenAiGpt5Family(model: string): boolean {
  return /^gpt-5/i.test(model.trim());
}

async function callOpenAiCompatible(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  image?: LlmImage;
  /** OpenAI supports json_object; xAI often does too */
  jsonMode?: boolean;
  /** OpenAI GPT-5 path vs classic max_tokens (xAI stays classic) */
  openAiStyle?: boolean;
}): Promise<CallOnce> {
  const openAi = opts.openAiStyle !== false && opts.baseUrl.includes('api.openai.com');
  const gpt5 = openAi && isOpenAiGpt5Family(opts.model);

  const body: Record<string, unknown> = {
    model: opts.model,
    messages: [
      { role: 'user', content: openAiUserContent(opts.prompt, opts.image) },
    ],
  };
  if (gpt5) {
    // Reasoning/chat GPT-5 family: use max_completion_tokens; default temperature
    body.max_completion_tokens = MAX_OUTPUT_TOKENS;
  } else {
    body.temperature = 0.15;
    body.max_tokens = MAX_OUTPUT_TOKENS;
  }
  if (opts.jsonMode !== false) {
    body.response_format = { type: 'json_object' };
  }

  let res: Response;
  try {
    res = await fetch(`${opts.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, kind: 'upstream_unavailable' };
  }

  let data: {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const raw = await res.text();
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    return {
      ok: false,
      kind: res.ok ? 'upstream_error' : mapHttpError(res.status, raw),
    };
  }

  if (!res.ok) {
    // Some models reject response_format — caller may retry without json mode
    return {
      ok: false,
      kind: mapHttpError(res.status, data.error?.message || raw),
    };
  }

  const text = data.choices?.[0]?.message?.content ?? '';
  if (!String(text).trim()) return { ok: false, kind: 'empty_response' };
  return { ok: true, text: String(text) };
}

function claudeUserContent(
  prompt: string,
  image?: LlmImage
): string | Array<Record<string, unknown>> {
  if (!image?.data) return prompt;
  return [
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: image.mimeType,
        data: image.data,
      },
    },
    { type: 'text', text: prompt },
  ];
}

async function callClaude(
  apiKey: string,
  model: string,
  prompt: string,
  image?: LlmImage
): Promise<CallOnce> {
  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.15,
        messages: [{ role: 'user', content: claudeUserContent(prompt, image) }],
      }),
    });
  } catch {
    return { ok: false, kind: 'upstream_unavailable' };
  }

  let data: {
    error?: { message?: string; type?: string };
    content?: Array<{ type?: string; text?: string }>;
  };
  const raw = await res.text();
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    return {
      ok: false,
      kind: res.ok ? 'upstream_error' : mapHttpError(res.status, raw),
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      kind: mapHttpError(res.status, data.error?.message || raw),
    };
  }

  const text = (data.content ?? [])
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text)
    .join('');
  if (!text.trim()) return { ok: false, kind: 'empty_response' };
  return { ok: true, text };
}

/** OpenAI / xAI: try json_object, then plain chat if the model rejects it. */
async function callOpenAiCompatibleWithJsonFallback(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  image?: LlmImage;
}): Promise<CallOnce> {
  let out = await callOpenAiCompatible({ ...opts, jsonMode: true });
  if (!out.ok && out.kind === 'upstream_error') {
    out = await callOpenAiCompatible({ ...opts, jsonMode: false });
  }
  return out;
}

/**
 * Call the selected provider. Throws LlmCallError on hard failure.
 * Walks the free-tier model chain automatically until one model succeeds.
 * Optional image enables multimodal (vision) on supporting models.
 */
export async function callProvider(
  provider: AskProviderId,
  prompt: string,
  env: LlmEnv,
  image?: LlmImage
): Promise<string> {
  const key = apiKeyFor(provider, env);
  if (!key) {
    // Keep gemini_not_configured for older clients when default missing
    const code: AskErrorCode =
      provider === 'gemini' ? 'gemini_not_configured' : 'provider_not_configured';
    throw llmFail(code, 503);
  }

  const models = modelChain(provider, env);
  let last: AskErrorCode = 'upstream_error';

  for (const model of models) {
    let out: CallOnce;

    if (provider === 'gemini') {
      out = await callGeminiOnce(key, model, prompt, image);
    } else if (provider === 'openai') {
      out = await callOpenAiCompatibleWithJsonFallback({
        baseUrl: 'https://api.openai.com/v1',
        apiKey: key,
        model,
        prompt,
        image,
      });
    } else if (provider === 'grok') {
      out = await callOpenAiCompatibleWithJsonFallback({
        baseUrl: 'https://api.x.ai/v1',
        apiKey: key,
        model,
        prompt,
        image,
      });
    } else {
      out = await callClaude(key, model, prompt, image);
    }

    if (out.ok) return out.text;
    last = out.kind;
    if (shouldTryNextModel(out.kind)) continue;
    break;
  }

  throw llmFail(last, last === 'upstream_quota' ? 429 : 502);
}
