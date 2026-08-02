import {
  ALL_DIMENSIONS,
  DEFAULT_DIMENSIONS,
  type AppSettings,
  type CheckDimension,
  type CheckHistoryItem,
  type DataCategory,
  type GeoScope,
  type Locale,
  type ThemeMode,
} from '../types';
import { STORAGE_KEYS, STORAGE_PREFIX } from './keys';

const DEFAULT_SETTINGS: AppSettings = {
  locale: 'en',
  theme: 'system',
  geoScope: 'prc',
  defaultDimensions: [...DEFAULT_DIMENSIONS],
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('OriginWise storage write failed:', e);
  }
}

function normalizeLocale(raw: unknown): Locale {
  const s = String(raw ?? '');
  return s.startsWith('zh') ? 'zh-Hant' : 'en';
}

function normalizeTheme(raw: unknown): ThemeMode {
  const s = String(raw ?? '');
  if (s === 'light' || s === 'dark' || s === 'system') return s;
  if (s === 'warm-light') return 'light';
  if (s === 'warm-dark') return 'dark';
  return 'system';
}

function normalizeGeoScope(raw: unknown): GeoScope {
  return raw === 'greater_china' ? 'greater_china' : 'prc';
}

function normalizeDimensions(raw: unknown): CheckDimension[] {
  if (!Array.isArray(raw)) return [...DEFAULT_DIMENSIONS];
  const allowed = new Set<string>(ALL_DIMENSIONS);
  const next = raw
    .map(String)
    .filter((d): d is CheckDimension => allowed.has(d));
  return next.length ? next : [...DEFAULT_DIMENSIONS];
}

export function getDefaultSettings(): AppSettings {
  return structuredClone(DEFAULT_SETTINGS);
}

export function getSettings(): AppSettings {
  const stored = readJson<Partial<AppSettings> | null>(
    STORAGE_KEYS.settings,
    null
  );
  if (!stored) return getDefaultSettings();
  return {
    ...getDefaultSettings(),
    ...stored,
    locale: normalizeLocale(stored.locale),
    theme: normalizeTheme(stored.theme),
    geoScope: normalizeGeoScope(stored.geoScope),
    defaultDimensions: normalizeDimensions(stored.defaultDimensions),
  };
}

export function saveSettings(settings: AppSettings): void {
  writeJson(STORAGE_KEYS.settings, settings);
}

export function getCheckHistory(): CheckHistoryItem[] {
  return readJson<CheckHistoryItem[]>(STORAGE_KEYS.checkHistory, []);
}

export function saveCheckHistory(items: CheckHistoryItem[]): void {
  writeJson(STORAGE_KEYS.checkHistory, items.slice(0, 30));
}

/** List every originwise_v1_* key currently in localStorage. */
export function listOriginwiseKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(STORAGE_PREFIX)) keys.push(k);
  }
  return keys.sort();
}

/**
 * Clean local data. Selective categories or full wipe of all originwise keys.
 */
export function clearLocalData(category: DataCategory = 'all'): string[] {
  const removed: string[] = [];

  const removeKey = (key: string) => {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      removed.push(key);
    }
  };

  switch (category) {
    case 'settings':
      removeKey(STORAGE_KEYS.settings);
      break;
    case 'checkHistory':
      removeKey(STORAGE_KEYS.checkHistory);
      break;
    case 'disclaimer':
      removeKey(STORAGE_KEYS.disclaimerAck);
      break;
    case 'all':
    default: {
      for (const key of listOriginwiseKeys()) {
        localStorage.removeItem(key);
        removed.push(key);
      }
      break;
    }
  }

  return removed;
}

export function hasDisclaimerAck(): boolean {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEYS.disclaimerAck));
  } catch {
    return false;
  }
}

export function saveDisclaimerAck(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.disclaimerAck, new Date().toISOString());
  } catch (e) {
    console.warn('OriginWise disclaimer ack failed:', e);
  }
}

export function summarizeLocalData(): {
  checkCount: number;
  hasCustomSettings: boolean;
  hasDisclaimer: boolean;
  keyCount: number;
} {
  return {
    checkCount: getCheckHistory().length,
    hasCustomSettings: localStorage.getItem(STORAGE_KEYS.settings) !== null,
    hasDisclaimer: hasDisclaimerAck(),
    keyCount: listOriginwiseKeys().length,
  };
}

export { STORAGE_KEYS, STORAGE_PREFIX };
