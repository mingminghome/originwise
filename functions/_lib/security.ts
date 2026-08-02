/**
 * Shared request guards for OriginWise Pages Functions.
 */

export type OriginEnv = {
  /** Comma-separated extra allowed Origins */
  CHECK_ALLOWED_ORIGINS?: string;
  ASK_ALLOWED_ORIGINS?: string;
};

/** Block cross-site browser calls; allow same-origin and common local dev. */
export function originAllowed(request: Request, env: OriginEnv): boolean {
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  const hostOrigin = new URL(request.url).origin;

  const extras = [
    ...(env.CHECK_ALLOWED_ORIGINS ?? '').split(','),
    ...(env.ASK_ALLOWED_ORIGINS ?? '').split(','),
  ]
    .map((s) => s.trim())
    .filter(Boolean);

  const allow = new Set<string>([
    hostOrigin,
    'http://localhost:8788',
    'http://localhost:5173',
    'http://127.0.0.1:8788',
    'http://127.0.0.1:5173',
    ...extras,
  ]);

  if (origin) return allow.has(origin);

  if (referer) {
    try {
      return allow.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  // No Origin/Referer (curl/scripts): allow but rely on rate limits
  return true;
}

/** Daily rotating salt hash for logs — never log raw IPs. */
export async function hashIp(
  ip: string,
  salt: string | undefined
): Promise<string> {
  const day = new Date().toISOString().slice(0, 10);
  const material = `${salt ?? 'originwise'}:${day}:${ip}`;
  const data = new TextEncoder().encode(material);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < 8; i++) {
    hex += bytes[i]!.toString(16).padStart(2, '0');
  }
  return hex;
}

/** AbortSignal that fires after `ms` (for per-LLM timeouts). */
export function timeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}
