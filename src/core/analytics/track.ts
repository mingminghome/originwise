/**
 * Privacy-safe GTM dataLayer events.
 *
 * Never send query text, photos, result titles, summaries, or free-form
 * error messages. GTM is a no-op when VITE_GTM_ID is unset.
 *
 * Events:
 *   virtual_page_view   screen change (page_path, page_title, page_location)
 *   disclaimer_accept
 *   check_start         input_type, force_refresh
 *   check_complete      relation_tier, has_photo, cached, force_refresh
 *   check_error         error_code, input_type
 *   history_open_result relation_tier, has_photo
 *   support_click       placement
 */

import type { RelationTier } from '../types';
import { getGtmId } from './gtm';

/** Mirrors App tabs — kept here so analytics does not import hooks. */
type ScreenId = 'check' | 'history' | 'settings' | 'about' | 'how';

export const VIRTUAL_PAGES: Record<
  ScreenId,
  { path: string; title: string }
> = {
  check: { path: '/', title: 'OriginWise — Check' },
  history: { path: '/history', title: 'OriginWise — History' },
  settings: { path: '/settings', title: 'OriginWise — Settings' },
  about: { path: '/about', title: 'OriginWise — About' },
  how: { path: '/how-it-works', title: 'OriginWise — How it works' },
};

export type CheckInputType = 'text' | 'photo' | 'text_and_photo';

export type AnalyticsEvent =
  | { event: 'disclaimer_accept' }
  | {
      event: 'check_start';
      input_type: CheckInputType;
      force_refresh: boolean;
    }
  | {
      event: 'check_complete';
      relation_tier: RelationTier;
      has_photo: boolean;
      cached: boolean;
      force_refresh: boolean;
    }
  | {
      event: 'check_error';
      error_code: string;
      input_type: CheckInputType;
    }
  | {
      event: 'history_open_result';
      relation_tier: RelationTier;
      has_photo: boolean;
    }
  | {
      event: 'support_click';
      placement: 'chip' | 'full';
    };

type Primitive = string | number | boolean;

function pushDataLayer(payload: Record<string, Primitive>): void {
  if (!getGtmId()) return;
  if (typeof window === 'undefined') return;
  const w = window as Window & { dataLayer?: Record<string, Primitive>[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push(payload);
}

export function checkInputType(
  hasText: boolean,
  hasPhoto: boolean
): CheckInputType {
  if (hasText && hasPhoto) return 'text_and_photo';
  if (hasPhoto) return 'photo';
  return 'text';
}

/** Allow-list style codes only (no user/server free text). */
export function safeErrorCode(code: string | undefined): string {
  if (!code) return 'unknown';
  const cleaned = code.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 64);
  return cleaned || 'unknown';
}

/**
 * Virtual page view for SPA tabs. Does not change the URL (no router),
 * so GTM must map `virtual_page_view` → GA4 `page_view`.
 */
export function trackPage(tab: ScreenId): void {
  const meta = VIRTUAL_PAGES[tab];
  if (!meta) return;
  if (typeof document !== 'undefined') {
    document.title = meta.title;
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  pushDataLayer({
    event: 'virtual_page_view',
    page_path: meta.path,
    page_title: meta.title,
    page_location: `${origin}${meta.path}`,
  });
}

export function trackEvent(payload: AnalyticsEvent): void {
  pushDataLayer({ ...payload });
}
