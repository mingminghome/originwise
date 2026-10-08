/**
 * Minimal Cloudflare Pages / Workers ambient types for `npm run typecheck`
 * (tsconfig.functions.json). Only what functions/ uses; the runtime provides
 * the real objects.
 */
interface CacheStorage {
  /** Workers: the zone's default cache. */
  readonly default: Cache;
}

interface PagesEventContext<Env> {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  data: Record<string, unknown>;
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
  next(input?: Request | string, init?: RequestInit): Promise<Response>;
}

type PagesFunction<Env = unknown> = (context: PagesEventContext<Env>) => Response | Promise<Response>;
