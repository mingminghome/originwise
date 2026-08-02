/**
 * Multi-provider LLM calls for Ask (Gemini, OpenAI, Grok/xAI, Claude).
 * Secrets stay on the server — never accept client API keys.
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

const DEFAULT_GEMINI_CHAIN = [
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
] as const;

const DEFAULT_MODELS: Record<Exclude<AskProviderId, 'gemini'>, string> = {
  openai: 'gpt-4o-mini',
  grok: 'grok-3-mini',
  claude: 'claude-3-5-haiku-latest',
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

function modelFor(provider: AskProviderId, env: LlmEnv): string {
  if (provider === 'gemini') {
    return (
      env.GEMINI_MODEL?.trim().replace(/^models\//, '') ||
      DEFAULT_GEMINI_CHAIN[0]
    );
  }
  if (provider === 'openai')
    return env.OPENAI_MODEL?.trim() || DEFAULT_MODELS.openai;
  if (provider === 'grok') return env.XAI_MODEL?.trim() || DEFAULT_MODELS.grok;
  return env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODELS.claude;
}

function geminiChain(env: LlmEnv): string[] {
  const preferred = env.GEMINI_MODEL?.trim().replace(/^models\//, '');
  if (!preferred) return [...DEFAULT_GEMINI_CHAIN];
  return [
    preferred,
    ...DEFAULT_GEMINI_CHAIN.filter((m) => m !== preferred),
  ];
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
  if (status === 429 || /quota|rate limit|resource exhausted/.test(msg)) {
    return 'upstream_quota';
  }
  if (status === 503 || status === 504) return 'upstream_unavailable';
  return 'upstream_error';
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

async function callOpenAiCompatible(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  image?: LlmImage;
  /** OpenAI supports json_object; xAI often does too */
  jsonMode?: boolean;
}): Promise<CallOnce> {
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: [
      { role: 'user', content: openAiUserContent(opts.prompt, opts.image) },
    ],
    temperature: 0.15,
    max_tokens: MAX_OUTPUT_TOKENS,
  };
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

/**
 * Call the selected provider. Throws LlmCallError on hard failure.
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

  if (provider === 'gemini') {
    let last: AskErrorCode = 'upstream_error';
    for (const model of geminiChain(env)) {
      const out = await callGeminiOnce(key, model, prompt, image);
      if (out.ok) return out.text;
      last = out.kind;
      if (
        out.kind === 'upstream_quota' ||
        out.kind === 'upstream_error' ||
        out.kind === 'empty_response' ||
        out.kind === 'upstream_unavailable'
      ) {
        continue;
      }
    }
    throw llmFail(last, last === 'upstream_quota' ? 429 : 502);
  }

  if (provider === 'openai') {
    const model = modelFor('openai', env);
    let out = await callOpenAiCompatible({
      baseUrl: 'https://api.openai.com/v1',
      apiKey: key,
      model,
      prompt,
      image,
      jsonMode: true,
    });
    if (!out.ok && out.kind === 'upstream_error') {
      out = await callOpenAiCompatible({
        baseUrl: 'https://api.openai.com/v1',
        apiKey: key,
        model,
        prompt,
        image,
        jsonMode: false,
      });
    }
    if (out.ok) return out.text;
    throw llmFail(out.kind, out.kind === 'upstream_quota' ? 429 : 502);
  }

  if (provider === 'grok') {
    const model = modelFor('grok', env);
    let out = await callOpenAiCompatible({
      baseUrl: 'https://api.x.ai/v1',
      apiKey: key,
      model,
      prompt,
      image,
      jsonMode: true,
    });
    if (!out.ok && out.kind === 'upstream_error') {
      out = await callOpenAiCompatible({
        baseUrl: 'https://api.x.ai/v1',
        apiKey: key,
        model,
        prompt,
        image,
        jsonMode: false,
      });
    }
    if (out.ok) return out.text;
    throw llmFail(out.kind, out.kind === 'upstream_quota' ? 429 : 502);
  }

  // claude
  const model = modelFor('claude', env);
  const out = await callClaude(key, model, prompt, image);
  if (out.ok) return out.text;
  throw llmFail(out.kind, out.kind === 'upstream_quota' ? 429 : 502);
}
