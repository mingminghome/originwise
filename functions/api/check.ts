/**
 * POST /api/check
 * Multi-agent / dual / monolith origin check with optional SSE progress.
 */

import { listConfiguredProviders } from '../_lib/aiPool';
import {
  runCheckOrchestrator,
  type ProgressEvent,
} from '../_lib/orchestrator';
import { checkRateLimit, clientIp } from '../_lib/rateLimit';
import { getCachedResult, putCachedResult } from '../_lib/resultCache';
import { hashIp, originAllowed } from '../_lib/security';
import type { CheckDimension } from '../_lib/schema';
import type { GeoScope } from '../_lib/regions';
import type { LlmEnv, LlmImage } from '../_lib/llm';

type CheckImageBody = { mimeType?: string; data?: string };

type CheckBody = {
  locale?: string;
  text?: string;
  image?: CheckImageBody;
  geoScope?: string;
  dimensions?: string[];
  forceRefresh?: boolean;
  stream?: boolean;
};

type Env = LlmEnv & {
  CHECK_ALLOWED_ORIGINS?: string;
  ASK_ALLOWED_ORIGINS?: string;
  CHECK_MODE?: string;
  CHECK_RATE_PER_MINUTE?: string;
  CHECK_RATE_PER_DAY?: string;
  CHECK_CACHE_TTL_SEC?: string;
  LOG_IP_SALT?: string;
  POOL_DISABLE_PROVIDERS?: string;
};

const MAX_TEXT = 400;
const MAX_IMAGE_B64 = 1_400_000;
const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);
/** Public free-tier defaults (overridable via env). */
const DEFAULT_RATE_MIN = 5;
const DEFAULT_RATE_DAY = 30;
const ALL_DIMS: CheckDimension[] = [
  'origin',
  'manufacturer',
  'company_relations',
  'alt_brands',
  'alt_products',
];
const DEFAULT_DIMS: CheckDimension[] = [
  'origin',
  'manufacturer',
  'company_relations',
];

function json(
  data: unknown,
  status = 200,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

function sanitizeText(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, max);
}

function normalizeLocale(raw: unknown): 'en' | 'zh-Hant' {
  return String(raw ?? '').startsWith('zh') ? 'zh-Hant' : 'en';
}

function normalizeGeoScope(raw: unknown): GeoScope {
  return raw === 'greater_china' ? 'greater_china' : 'prc';
}

function normalizeDimensions(raw: unknown): CheckDimension[] {
  if (!Array.isArray(raw)) return [...DEFAULT_DIMS];
  const allowed = new Set<string>(ALL_DIMS);
  const next = raw
    .map(String)
    .filter((d): d is CheckDimension => allowed.has(d));
  return next.length ? next : [...DEFAULT_DIMS];
}

function parseImage(
  raw: CheckImageBody | undefined
): { ok: true; image: LlmImage | undefined } | { ok: false } {
  if (raw == null) return { ok: true, image: undefined };
  if (typeof raw !== 'object') return { ok: false };
  let mime = String(raw.mimeType ?? '')
    .toLowerCase()
    .trim();
  if (mime === 'image/jpg') mime = 'image/jpeg';
  if (!ALLOWED_IMAGE_MIME.has(mime)) return { ok: false };
  let data = typeof raw.data === 'string' ? raw.data.trim() : '';
  const dataUrl = /^data:image\/[a-zA-Z0-9.+-]+;base64,/i;
  if (dataUrl.test(data)) data = data.replace(dataUrl, '');
  if (!data || !/^[A-Za-z0-9+/]+=*$/.test(data.slice(0, 64))) return { ok: false };
  if (data.length > MAX_IMAGE_B64) return { ok: false };
  if (!/^[A-Za-z0-9+/=\s]+$/.test(data)) return { ok: false };
  data = data.replace(/\s+/g, '');
  return {
    ok: true,
    image: { mimeType: mime === 'image/jpg' ? 'image/jpeg' : mime, data },
  };
}

async function releaseInFlight(ip: string): Promise<void> {
  try {
    const cache = caches.default;
    const key = new Request(
      `https://originwise-rate-limit.internal/inflight/${encodeURIComponent(ip)}`
    );
    await cache.put(
      key,
      new Response('0', {
        headers: {
          'Cache-Control': 'public, max-age=1',
          'Content-Type': 'text/plain',
        },
      })
    );
  } catch {
    /* ignore */
  }
}

async function acquireInFlight(ip: string): Promise<boolean> {
  try {
    const cache = caches.default;
    const key = new Request(
      `https://originwise-rate-limit.internal/inflight/${encodeURIComponent(ip)}`
    );
    const hit = await cache.match(key);
    if (hit) {
      const n = parseInt(await hit.text(), 10);
      if (Number.isFinite(n) && n > 0) return false;
    }
    await cache.put(
      key,
      new Response('1', {
        headers: {
          'Cache-Control': 'public, max-age=90',
          'Content-Type': 'text/plain',
        },
      })
    );
    return true;
  } catch {
    // Cache API unavailable — allow the request
    return true;
  }
}

function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

type ParsedOk = {
  locale: 'en' | 'zh-Hant';
  text: string;
  image?: LlmImage;
  geoScope: GeoScope;
  dimensions: CheckDimension[];
  forceRefresh: boolean;
  stream: boolean;
};

async function parseBody(
  request: Request
): Promise<
  { ok: true; body: ParsedOk } | { ok: false; response: Response }
> {
  let raw: CheckBody;
  try {
    raw = (await request.json()) as CheckBody;
  } catch {
    return {
      ok: false,
      response: json(
        { ok: false, error: 'Invalid request.', code: 'bad_request' },
        400
      ),
    };
  }
  const locale = normalizeLocale(raw.locale);
  const text = sanitizeText(raw.text, MAX_TEXT);
  const geoScope = normalizeGeoScope(raw.geoScope);
  const dimensions = normalizeDimensions(raw.dimensions);
  const img = parseImage(raw.image);
  if (!img.ok) {
    return {
      ok: false,
      response: json(
        { ok: false, error: 'Invalid request.', code: 'bad_request' },
        400
      ),
    };
  }
  if (!text && !img.image) {
    return {
      ok: false,
      response: json(
        { ok: false, error: 'Invalid request.', code: 'bad_request' },
        400
      ),
    };
  }
  return {
    ok: true,
    body: {
      locale,
      text,
      image: img.image,
      geoScope,
      dimensions,
      forceRefresh: Boolean(raw.forceRefresh),
      stream: raw.stream === true,
    },
  };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const jobId = crypto.randomUUID();
  const ip = clientIp(request);
  let ipHash = 'unknown';
  try {
    ipHash = await hashIp(ip, env.LOG_IP_SALT);
  } catch {
    /* ignore */
  }

  let holdLock = false;

  try {
    if (!originAllowed(request, env)) {
      return json(
        {
          ok: false,
          error: 'Request not allowed from this origin.',
          code: 'forbidden_origin',
          jobId,
        },
        403
      );
    }

    // Fail fast if no AI keys (clearest UX)
    if (listConfiguredProviders(env).length === 0) {
      return json(
        {
          ok: false,
          error:
            'No AI provider configured. Add GEMINI_API_KEY (or OpenAI/xAI/Anthropic) in .dev.vars for pages:dev, or Cloudflare Pages secrets for production.',
          code: 'provider_not_configured',
          jobId,
        },
        503
      );
    }

    const rateMin = Number(env.CHECK_RATE_PER_MINUTE) || DEFAULT_RATE_MIN;
    const rateDay = Number(env.CHECK_RATE_PER_DAY) || DEFAULT_RATE_DAY;

    try {
      const minute = await checkRateLimit({
        key: ip,
        limit: rateMin,
        windowSec: 60,
        namespace: 'check-min',
      });
      if (!minute.ok) {
        return json(
          {
            ok: false,
            error: `Too many requests. Limit: ${rateMin} checks per minute. Please wait about ${minute.retryAfterSec}s.`,
            code: 'rate_limited',
            jobId,
            limit: rateMin,
            window: 'minute',
            retryAfterSec: minute.retryAfterSec,
          },
          429,
          { 'Retry-After': String(minute.retryAfterSec) }
        );
      }
      const day = await checkRateLimit({
        key: ip,
        limit: rateDay,
        windowSec: 86400,
        namespace: 'check-day',
      });
      if (!day.ok) {
        return json(
          {
            ok: false,
            error: `Daily limit reached (${rateDay} checks per day). Please try again tomorrow.`,
            code: 'rate_limited_day',
            jobId,
            limit: rateDay,
            window: 'day',
            retryAfterSec: day.retryAfterSec,
          },
          429,
          { 'Retry-After': String(day.retryAfterSec) }
        );
      }
    } catch {
      /* rate limit optional — continue */
    }

    const gotLock = await acquireInFlight(ip);
    if (!gotLock) {
      return json(
        {
          ok: false,
          error:
            'A check is already running (max 1 at a time). Please wait for it to finish.',
          code: 'rate_limited',
          jobId,
          limit: 1,
          window: 'inflight',
          retryAfterSec: 30,
        },
        429,
        { 'Retry-After': '30' }
      );
    }
    holdLock = true;

    const parsed = await parseBody(request);
    if (!parsed.ok) {
      return parsed.response;
    }
    const { body } = parsed;
    const accept = request.headers.get('Accept') || '';
    // Prefer JSON by default for reliability; stream only when client asks
    const wantStream =
      body.stream === true || accept.includes('text/event-stream');

    const ttl = Number(env.CHECK_CACHE_TTL_SEC) || 86400;

    const run = async (
      emit: (ev: ProgressEvent) => void
    ): Promise<Response | { ok: true; payload: unknown }> => {
      if (!body.forceRefresh && body.text && !body.image) {
        try {
          const cached = await getCachedResult({
            text: body.text,
            locale: body.locale,
            geoScope: body.geoScope,
            dimensions: body.dimensions,
          });
          if (cached) {
            const result = {
              ...cached.result,
              meta: {
                ...cached.result.meta,
                jobId,
                cached: true,
                cachedAt: cached.cachedAt,
              },
            };
            emit({
              type: 'progress',
              jobId,
              step: 'cache',
              status: 'done',
            });
            return {
              ok: true,
              payload: {
                ok: true,
                result,
                jobId,
                cached: true,
              },
            };
          }
        } catch {
          /* cache miss */
        }
      }

      const out = await runCheckOrchestrator(
        {
          jobId,
          locale: body.locale,
          text: body.text,
          image: body.image,
          geoScope: body.geoScope,
          dimensions: body.dimensions,
          env,
        },
        emit
      );

      if (!out.ok) {
        console.log(
          JSON.stringify({
            level: 'warn',
            jobId,
            ipHash,
            code: out.code,
          })
        );
        return json(
          {
            ok: false,
            error: out.error,
            code: out.code,
            jobId,
            agents: out.agents,
          },
          out.httpStatus
        );
      }

      if (body.text && !body.image) {
        try {
          await putCachedResult(
            {
              text: body.text,
              locale: body.locale,
              geoScope: body.geoScope,
              dimensions: body.dimensions,
            },
            out.result,
            ttl
          );
        } catch {
          /* ignore */
        }
      }

      console.log(
        JSON.stringify({
          level: 'info',
          jobId,
          ipHash,
          mode: out.mode,
          tier: out.result.relationTier,
          geoScope: body.geoScope,
        })
      );

      return {
        ok: true,
        payload: {
          ok: true,
          result: out.result,
          jobId,
          mode: out.mode,
          provider: out.agents[0]?.provider,
        },
      };
    };

    if (!wantStream) {
      const out = await run(() => undefined);
      if (out instanceof Response) return out;
      return json(out.payload);
    }

    const encoder = new TextEncoder();
    let closed = false;
    // Lock is released inside the stream; don't double-release in outer finally
    holdLock = false;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(sseEncode(event, data)));
          } catch {
            closed = true;
          }
        };

        send('progress', {
          type: 'progress',
          jobId,
          step: 'start',
          status: 'running',
        });

        const heartbeat = setInterval(() => {
          send('ping', { jobId, t: Date.now() });
        }, 12000);

        try {
          const out = await run((ev) => send('progress', ev));
          if (out instanceof Response) {
            const errBody = await out.json();
            send('error', errBody);
          } else {
            send('result', out.payload);
          }
        } catch (e) {
          console.log(
            JSON.stringify({
              level: 'error',
              jobId,
              ipHash,
              err: e instanceof Error ? e.message : 'unknown',
            })
          );
          send('error', {
            ok: false,
            error:
              e instanceof Error
                ? e.message
                : 'Something went wrong. Please try again.',
            code: 'server_error',
            jobId,
          });
        } finally {
          clearInterval(heartbeat);
          try {
            controller.close();
          } catch {
            /* ignore */
          }
          closed = true;
          await releaseInFlight(ip);
        }
      },
      cancel() {
        closed = true;
        void releaseInFlight(ip);
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store, no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (e) {
    console.log(
      JSON.stringify({
        level: 'error',
        jobId,
        ipHash,
        err: e instanceof Error ? e.message : 'unknown',
      })
    );
    return json(
      {
        ok: false,
        error:
          e instanceof Error
            ? e.message
            : 'Something went wrong. Please try again.',
        code: 'server_error',
        jobId,
      },
      500
    );
  } finally {
    if (holdLock) await releaseInFlight(ip);
  }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const available = listConfiguredProviders(context.env);
  return json({
    ok: true,
    service: 'originwise-check',
    available,
    default: available[0] ?? null,
    note:
      available.length === 0
        ? 'No provider keys configured on the server.'
        : undefined,
  });
};
