/**
 * “Buy me a pint” support link — URL from env only (never hardcode).
 *
 * Set at build time:
 *   VITE_BUY_ME_A_PINT_URL=https://buymeacoffee.com/your-slug
 *   VITE_BUY_ME_A_PINT_IMG=…   (optional; official BMC button image)
 *
 * Cloudflare Pages: Environment variables → Build → VITE_BUY_ME_A_PINT_URL
 * Local: .env or .env.local (gitignored)
 *
 * When URL is unset / empty, the UI is hidden.
 */

export type BuyMeAPintConfig = {
  url: string;
  /** Official button image, or null → text-only full link */
  img: string | null;
};

function isHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Default Buy Me a Coffee button image for a profile slug. */
function defaultBmcButtonImg(slug: string): string {
  const q = new URLSearchParams({
    text: 'Buy me a pint',
    emoji: '🍺',
    slug,
    button_colour: '5B6CF0',
    font_colour: 'ffffff',
    font_family: 'Cookie',
    outline_colour: '000000',
    coffee_colour: 'FFDD00',
  });
  return `https://img.buymeacoffee.com/button-api/?${q.toString()}`;
}

/**
 * Resolve support link from Vite env. Returns null when disabled.
 */
export function resolveBuyMeAPint(): BuyMeAPintConfig | null {
  const url = String(import.meta.env.VITE_BUY_ME_A_PINT_URL ?? '').trim();
  if (!url || !isHttpUrl(url)) return null;

  const imgRaw = String(import.meta.env.VITE_BUY_ME_A_PINT_IMG ?? '').trim();
  if (imgRaw && isHttpUrl(imgRaw)) {
    return { url, img: imgRaw };
  }

  // Derive BMC button when URL is buymeacoffee.com/<slug>
  try {
    const u = new URL(url);
    if (/(^|\.)buymeacoffee\.com$/i.test(u.hostname)) {
      const slug = u.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
      if (slug && !/^(cdn|button-api|about|help)$/i.test(slug)) {
        return { url, img: defaultBmcButtonImg(slug) };
      }
    }
  } catch {
    /* ignore */
  }

  return { url, img: null };
}

/** True when a support URL is configured for this build. */
export function isBuyMeAPintEnabled(): boolean {
  return resolveBuyMeAPint() !== null;
}
