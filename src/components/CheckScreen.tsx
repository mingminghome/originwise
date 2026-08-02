import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Gauge, ImagePlus, Sparkles, Square, X } from 'lucide-react';
import type { ProgressStep, RateLimitMeta } from '../core/ai/client';
import { engineRunCheck } from '../core/ai/engine';
import { prepareCheckImage, type PreparedImage } from '../core/util/image';
import type { AppState } from '../hooks/useAppState';
import type { CheckResult } from '../core/types';
import { ProgressSteps } from './ProgressSteps';
import { ResultPanel } from './ResultPanel';
import { TopNavIcons } from './TopNavIcons';

type RateHit = {
  code: 'rate_limited' | 'rate_limited_day';
  meta?: RateLimitMeta;
};

/** Auto-retry only for short / inflight waits (not multi-hour caps). */
function autoRetrySeconds(hit: RateHit): number | null {
  const w = hit.meta?.window;
  if (hit.code === 'rate_limited_day' || w === 'long' || w === 'day') {
    return null;
  }
  const fallback = w === 'inflight' ? 15 : 30;
  const s = hit.meta?.retryAfterSec ?? fallback;
  return Math.max(1, Math.min(Math.ceil(s), 120));
}

export function CheckScreen({ state }: { state: AppState }) {
  const {
    t,
    settings,
    activeResult,
    setActiveResult,
    pushCheckHistory,
    setTab,
    tab,
  } = state;
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<PreparedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateHit, setRateHit] = useState<RateHit | null>(null);
  /** Seconds left until auto re-submit; null = not auto-retrying */
  const [autoRetryLeft, setAutoRetryLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [progress, setProgress] = useState<ProgressStep[]>([]);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const runCheckRef = useRef<() => Promise<void>>(async () => undefined);

  const canSubmit = Boolean(text.trim() || photo);
  const display = result ?? activeResult?.result ?? null;
  const autoRetrying = autoRetryLeft != null;
  const showLanding = !display && !loading;

  const cancelAutoRetry = useCallback(
    (opts?: { quiet?: boolean }) => {
      setAutoRetryLeft(null);
      setRateHit(null);
      if (!opts?.quiet) {
        setError(t('check.rateLimitAutoCancelled'));
      } else {
        setError(null);
      }
    },
    [t]
  );

  const onPickPhoto = async (file: File | null | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const prepared = await prepareCheckImage(file);
      setPhoto(prepared);
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      if (code === 'image_too_large') setError(t('check.photoTooLarge'));
      else setError(t('check.photoInvalid'));
      setPhoto(null);
    } finally {
      if (cameraRef.current) cameraRef.current.value = '';
      if (galleryRef.current) galleryRef.current.value = '';
    }
  };

  const clearComposer = () => {
    setText('');
    setPhoto(null);
  };

  const rateLimitMessage = (hit: RateHit): string => {
    const w = hit.meta?.window;
    const n = hit.meta?.limit;
    const s = hit.meta?.retryAfterSec ?? 30;
    const winSec = hit.meta?.windowSec;
    if (hit.code === 'rate_limited_day' || w === 'long' || w === 'day') {
      const hours = winSec
        ? Math.max(1, Math.round(winSec / 3600))
        : 6;
      const waitMin = Math.max(1, Math.ceil(s / 60));
      return t('check.rateLimitLongDetail', {
        n: n ?? 10,
        h: hours,
        m: waitMin,
      });
    }
    if (w === 'inflight') {
      return t('check.rateLimitInflightDetail');
    }
    // short / 30s RPM-style limit
    return t('check.rateLimitShortDetail', {
      n: n ?? 1,
      w: winSec ?? 30,
      s,
    });
  };

  const runCheck = useCallback(async () => {
    setError(null);
    setRateHit(null);
    setAutoRetryLeft(null);
    setResult(null);
    setActiveResult(null);
    setLastProvider(null);
    setCached(false);
    setProgress([]);
    if (!text.trim() && !photo) {
      setError(t('check.needInput'));
      return;
    }
    const question = text.trim();
    const attached = photo;
    setLoading(true);
    try {
      const out = await engineRunCheck({
        question,
        locale: settings.locale,
        geoScope: settings.geoScope,
        dimensions: settings.defaultDimensions,
        forceRefresh: false,
        image: attached
          ? { mimeType: attached.mimeType, data: attached.data }
          : undefined,
        onProgress: (step) => {
          setProgress((prev) => {
            const next = prev.filter((p) => p.step !== step.step);
            return [...next, step];
          });
        },
      });
      if (!out.ok) {
        if (
          out.code === 'rate_limited' ||
          out.code === 'rate_limited_day'
        ) {
          const hit: RateHit = {
            code: out.code,
            meta: out.rateLimit,
          };
          setRateHit(hit);
          setError(rateLimitMessage(hit));
          const wait = autoRetrySeconds(hit);
          if (wait != null) setAutoRetryLeft(wait);
          return;
        }
        const byCode: Record<string, string> = {
          provider_not_configured: t('check.providerNotConfigured'),
          gemini_not_configured: t('check.providerNotConfigured'),
          forbidden_origin: t('check.forbiddenOrigin'),
          bad_request: t('check.badRequest'),
          parse_error: t('check.parseError'),
          upstream_error: t('check.upstreamError'),
          upstream_quota: t('check.upstreamQuota'),
          upstream_unavailable: t('check.upstreamUnavailable'),
          empty_response: t('check.emptyResponse'),
          server_error: t('check.serverError'),
          empty: t('check.needInput'),
        };
        const mapped = out.code ? byCode[out.code] : undefined;
        const serverMsg = out.error?.trim();
        if (
          serverMsg &&
          (out.code === 'provider_not_configured' ||
            out.code === 'server_error' ||
            !mapped)
        ) {
          setError(serverMsg);
        } else {
          setError(mapped || serverMsg || t('check.serverError'));
        }
        return;
      }
      setLastProvider(out.provider ?? null);
      setCached(Boolean(out.cached));
      setResult(out.result);
      clearComposer();
      const queryLabel =
        question ||
        out.result.title ||
        (settings.locale === 'zh-Hant' ? '（照片）' : '(photo)');
      pushCheckHistory({
        id: crypto.randomUUID(),
        query: queryLabel.slice(0, 120),
        hadImage: Boolean(attached),
        result: out.result,
        at: new Date().toISOString(),
        geoScope: settings.geoScope,
      });
    } finally {
      setLoading(false);
    }
    // rateLimitMessage uses t; intentional deps
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable enough for submit flow
  }, [
    text,
    photo,
    settings.locale,
    settings.geoScope,
    settings.defaultDimensions,
    t,
    setActiveResult,
    pushCheckHistory,
  ]);

  runCheckRef.current = () => runCheck();

  // Countdown → auto-submit when free-server short/inflight limit clears
  useEffect(() => {
    if (autoRetryLeft == null) return;
    if (autoRetryLeft <= 0) {
      setAutoRetryLeft(null);
      void runCheckRef.current();
      return;
    }
    const id = window.setTimeout(() => {
      setAutoRetryLeft((n) => (n == null ? null : n - 1));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [autoRetryLeft]);

  // Unmount: drop pending auto-submit
  useEffect(() => {
    return () => {
      setAutoRetryLeft(null);
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit && !loading && !autoRetrying) void runCheck();
    }
  };

  return (
    <div className={showLanding ? 'check-google' : 'check-with-result'}>
      {/* Top bar: brand + icons (Google-style chrome) */}
      <div className="check-topbar">
        <button
          type="button"
          className="check-brand"
          onClick={() => {
            setResult(null);
            setActiveResult(null);
            setError(null);
            setRateHit(null);
            setAutoRetryLeft(null);
          }}
        >
          OriginWise
        </button>
        <TopNavIcons tab={tab} onChange={setTab} t={t} />
      </div>

      <div className={showLanding ? 'check-hero' : 'check-hero check-hero--compact'}>
        {showLanding ? (
          <>
            <h1 className="check-hero-title">{t('check.title')}</h1>
            <p className="check-hero-sub muted">{t('check.subtitle')}</p>
          </>
        ) : null}

        <section className="check-search-card">
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={(e) => void onPickPhoto(e.target.files?.[0])}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={(e) => void onPickPhoto(e.target.files?.[0])}
          />

          {photo ? (
            <div className="ask-photo-wrap check-photo">
              <div className="ask-photo-frame">
                <img src={photo.dataUrl} alt="" className="photo-preview" />
                <button
                  type="button"
                  className="ask-photo-x"
                  aria-label={t('check.removePhoto')}
                  onClick={() => setPhoto(null)}
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          ) : null}

          <div className="check-search-row">
            <input
              id="check-input"
              className="check-search-input"
              value={text}
              placeholder={
                photo
                  ? t('check.placeholderWithPhoto')
                  : t('check.placeholder')
              }
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
              autoComplete="off"
              enterKeyHint="search"
            />
            <div className="check-search-tools">
              <button
                type="button"
                className="check-icon-btn"
                disabled={loading}
                aria-label={t('check.photo')}
                title={t('check.photo')}
                onClick={() => cameraRef.current?.click()}
              >
                <Camera size={18} />
              </button>
              <button
                type="button"
                className="check-icon-btn"
                disabled={loading}
                aria-label={t('check.gallery')}
                title={t('check.gallery')}
                onClick={() => galleryRef.current?.click()}
              >
                <ImagePlus size={18} />
              </button>
            </div>
          </div>

          <div className="check-submit-row">
            <button
              type="button"
              className="btn btn-primary check-search-submit"
              disabled={loading || !canSubmit || autoRetrying}
              onClick={() => void runCheck()}
            >
              <Sparkles size={16} />
              {loading
                ? t('check.submitting')
                : autoRetrying
                  ? t('check.rateLimitAutoIn', { s: autoRetryLeft ?? 0 })
                  : t('check.submit')}
            </button>
            {autoRetrying ? (
              <button
                type="button"
                className="btn btn-ghost check-auto-stop"
                onClick={() => cancelAutoRetry()}
                aria-label={t('check.rateLimitAutoStop')}
              >
                <Square size={14} fill="currentColor" />
                {t('check.rateLimitAutoStop')}
              </button>
            ) : null}
          </div>

          <p className="check-free-note muted">
            <Gauge size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
            {t('check.rateLimitFreeNote')}
          </p>

          {loading ? <ProgressSteps steps={progress} t={t} /> : null}

          {rateHit ? (
            <div className="rate-limit-banner" role="alert">
              <div className="rate-limit-banner-top">
                <span className="rate-limit-badge">
                  {t('check.rateLimitBadge')}
                </span>
                <strong className="rate-limit-title">
                  {rateHit.code === 'rate_limited_day' ||
                  rateHit.meta?.window === 'long' ||
                  rateHit.meta?.window === 'day'
                    ? t('check.rateLimitedLongTitle')
                    : rateHit.meta?.window === 'inflight'
                      ? t('check.rateLimitInflightTitle')
                      : t('check.rateLimitRpmTitle')}
                </strong>
              </div>
              <p className="rate-limit-detail">{rateLimitMessage(rateHit)}</p>
              {autoRetrying ? (
                <div className="rate-limit-auto-row">
                  <p className="rate-limit-auto">
                    {t('check.rateLimitAutoHint', { s: autoRetryLeft ?? 0 })}
                  </p>
                  <button
                    type="button"
                    className="btn btn-ghost rate-limit-stop-btn"
                    onClick={() => cancelAutoRetry()}
                  >
                    <Square size={12} fill="currentColor" />
                    {t('check.rateLimitAutoStop')}
                  </button>
                </div>
              ) : null}
              <p className="rate-limit-policy muted">
                {t('check.rateLimitFreeNote')}
              </p>
            </div>
          ) : null}

          {error && !rateHit ? (
            <p className="ask-error" role="alert">
              {error}
            </p>
          ) : null}
        </section>
      </div>

      {display && !loading ? (
        <section className="card check-result-card">
          <ResultPanel
            result={display}
            provider={lastProvider}
            cached={cached}
            t={t}
          />
        </section>
      ) : null}
    </div>
  );
}
