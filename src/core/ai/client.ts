import type {
  CheckDimension,
  CheckResult,
  GeoScope,
  Locale,
} from '../types';

export type CheckImagePayload = {
  mimeType: string;
  data: string;
};

export type CheckRequest = {
  locale: Locale;
  text?: string;
  image?: CheckImagePayload;
  geoScope: GeoScope;
  dimensions: CheckDimension[];
  forceRefresh?: boolean;
  stream?: boolean;
};

export type ProgressStep = {
  step: string;
  status: 'running' | 'done' | 'skipped' | 'error';
  detail?: string;
};

export type RateLimitMeta = {
  limit?: number;
  window?: 'short' | 'long' | 'minute' | 'day' | 'inflight' | string;
  windowSec?: number;
  retryAfterSec?: number;
};

export type CheckResponse =
  | {
      ok: true;
      result: CheckResult;
      provider?: string;
      jobId?: string;
      mode?: string;
      cached?: boolean;
    }
  | {
      ok: false;
      error: string;
      code?: string;
      jobId?: string;
      rateLimit?: RateLimitMeta;
    };

function parseJsonPayload(data: Record<string, unknown>): CheckResponse {
  if (data.ok === true && data.result) {
    return {
      ok: true,
      result: data.result as CheckResult,
      provider: typeof data.provider === 'string' ? data.provider : undefined,
      jobId: typeof data.jobId === 'string' ? data.jobId : undefined,
      mode: typeof data.mode === 'string' ? data.mode : undefined,
      cached: Boolean(data.cached),
    };
  }
  const rateLimit: RateLimitMeta | undefined =
    data.limit != null || data.window != null || data.retryAfterSec != null
      ? {
          limit:
            typeof data.limit === 'number' ? data.limit : undefined,
          window:
            typeof data.window === 'string' ? data.window : undefined,
          windowSec:
            typeof data.windowSec === 'number' ? data.windowSec : undefined,
          retryAfterSec:
            typeof data.retryAfterSec === 'number'
              ? data.retryAfterSec
              : undefined,
        }
      : undefined;
  return {
    ok: false,
    error: typeof data.error === 'string' ? data.error : 'Request failed',
    code: typeof data.code === 'string' ? data.code : 'server_error',
    jobId: typeof data.jobId === 'string' ? data.jobId : undefined,
    rateLimit,
  };
}

async function readJsonSafe(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) {
    return {
      ok: false,
      error: `Empty response from server (HTTP ${res.status}).`,
      code: 'server_error',
    };
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      error:
        res.status === 404
          ? 'Check API not found. Use `npm run pages:dev` (not plain `npm run dev`) so /api/check is available.'
          : `Invalid server response (HTTP ${res.status}).`,
      code: res.status === 404 ? 'provider_not_configured' : 'server_error',
    };
  }
}

/** Non-streaming JSON POST — preferred path for reliability */
export async function runCheckApi(
  req: CheckRequest
): Promise<CheckResponse> {
  try {
    const res = await fetch('/api/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        locale: req.locale,
        text: req.text,
        image: req.image,
        geoScope: req.geoScope,
        dimensions: req.dimensions,
        forceRefresh: req.forceRefresh,
        stream: false,
      }),
    });
    const data = await readJsonSafe(res);
    return parseJsonPayload(data);
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : 'Network error — is the app running via npm run pages:dev?',
      code: 'server_error',
    };
  }
}

/**
 * SSE streaming check. Falls back to JSON on stall or failure.
 */
export async function runCheckApiStream(
  req: CheckRequest,
  onProgress: (step: ProgressStep) => void
): Promise<CheckResponse> {
  const controller = new AbortController();
  const stallMs = 90000;
  let lastEventAt = Date.now();
  let stallTimer: ReturnType<typeof setInterval> | undefined;

  try {
    const res = await fetch('/api/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/json',
      },
      body: JSON.stringify({
        locale: req.locale,
        text: req.text,
        image: req.image,
        geoScope: req.geoScope,
        dimensions: req.dimensions,
        forceRefresh: req.forceRefresh,
        stream: true,
      }),
      signal: controller.signal,
    });

    const ct = res.headers.get('Content-Type') || '';
    if (!ct.includes('text/event-stream')) {
      const data = await readJsonSafe(res);
      return parseJsonPayload(data);
    }

    if (!res.body) {
      return runCheckApi({ ...req, stream: false });
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let final: CheckResponse | null = null;

    stallTimer = setInterval(() => {
      if (Date.now() - lastEventAt > stallMs) {
        controller.abort();
      }
    }, 5000);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      lastEventAt = Date.now();
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';
      for (const chunk of chunks) {
        const lines = chunk.split('\n');
        let event = 'message';
        let dataLine = '';
        for (const line of lines) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          if (line.startsWith('data:')) {
            dataLine = (dataLine ? dataLine + '\n' : '') + line.slice(5).trim();
          }
        }
        if (!dataLine) continue;
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(dataLine) as Record<string, unknown>;
        } catch {
          continue;
        }
        if (event === 'progress' || data.type === 'progress') {
          onProgress({
            step: String(data.step ?? 'progress'),
            status: (data.status as ProgressStep['status']) || 'running',
            detail:
              typeof data.detail === 'string' ? data.detail : undefined,
          });
        } else if (event === 'result') {
          final = parseJsonPayload(data);
        } else if (event === 'error') {
          final = parseJsonPayload(data);
        }
      }
    }

    if (final) return final;
    return runCheckApi({ ...req, stream: false });
  } catch {
    return runCheckApi({ ...req, stream: false });
  } finally {
    if (stallTimer) clearInterval(stallTimer);
  }
}

export async function fetchCheckProviders(): Promise<{
  available: string[];
  default: string | null;
} | null> {
  try {
    const res = await fetch('/api/check');
    if (!res.ok) return null;
    const data = (await res.json()) as {
      available?: string[];
      default?: string | null;
    };
    return {
      available: data.available ?? [],
      default: data.default ?? null,
    };
  } catch {
    return null;
  }
}
