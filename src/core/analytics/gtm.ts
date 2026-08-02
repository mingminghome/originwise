/**
 * Google Tag Manager — container ID from env only (never hardcode).
 *
 * Set at build time:
 *   VITE_GTM_ID=GTM-XXXXXXX
 *
 * Cloudflare Pages: Environment variables → Build → VITE_GTM_ID
 * Local: .env or .env.local (gitignored)
 *
 * When unset / empty, GTM is not loaded.
 */

const GTM_ID_RE = /^GTM-[A-Z0-9]+$/i;

function resolveGtmId(): string | null {
  const raw = String(import.meta.env.VITE_GTM_ID ?? '')
    .trim()
    .toUpperCase();
  if (!raw || !GTM_ID_RE.test(raw)) return null;
  return raw;
}

/**
 * Install GTM script + noscript iframe when VITE_GTM_ID is configured.
 * Safe to call once at app bootstrap.
 */
export function installGtm(): string | null {
  const id = resolveGtmId();
  if (!id) return null;
  if (typeof document === 'undefined') return null;

  // Avoid double-inject (e.g. React StrictMode remount in dev)
  if (document.documentElement.dataset.gtmId === id) return id;
  document.documentElement.dataset.gtmId = id;

  const w = window as Window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  const first = document.getElementsByTagName('script')[0];
  if (first?.parentNode) {
    first.parentNode.insertBefore(script, first);
  } else {
    document.head.appendChild(script);
  }

  // noscript fallback for users without JS (rare for SPA; still complete)
  if (!document.getElementById('gtm-noscript')) {
    const ns = document.createElement('noscript');
    ns.id = 'gtm-noscript';
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(id)}`;
    iframe.height = '0';
    iframe.width = '0';
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    iframe.title = 'Google Tag Manager';
    ns.appendChild(iframe);
    document.body.insertBefore(ns, document.body.firstChild);
  }

  return id;
}

export function getGtmId(): string | null {
  return resolveGtmId();
}
