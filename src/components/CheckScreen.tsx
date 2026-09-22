import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Gauge,
  Globe2,
  ImagePlus,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import type { ProgressStep, RateLimitMeta } from '../core/ai/client';
import { engineRunCheck } from '../core/ai/engine';
import {
  checkInputType,
  safeErrorCode,
  trackEvent,
} from '../core/analytics/track';
import {
  imageFileFromTransfer,
  imageFileFromTransferAsync,
  prepareCheckImage,
  transferMayContainImage,
  type PreparedImage,
} from '../core/util/image';
import type { AppState } from '../hooks/useAppState';
import type { CheckResult } from '../core/types';
import { ProgressSteps } from './ProgressSteps';
import { ResultPanel } from './ResultPanel';

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

export function CheckScreen({
  state,
  resetToken = 0,
}: {
  state: AppState;
  /** When this increments (brand click), return to empty landing. */
  resetToken?: number;
}) {
  const {
    t,
    settings,
    activeResult,
    setActiveResult,
    pushCheckHistory,
    setTab,
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
  const [dropping, setDropping] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const dropLeaveTimerRef = useRef(0);
  const runCheckRef = useRef<(opts?: { forceRefresh?: boolean }) => Promise<void>>(
    async () => undefined
  );
  /** Keep last successful/attempted inputs for re-check after composer is cleared */
  const lastInputRef = useRef<{ question: string; photo: PreparedImage | null }>({
    question: '',
    photo: null,
  });

  const canSubmit = Boolean(text.trim() || photo);
  const display = result ?? activeResult?.result ?? null;
  const autoRetrying = autoRetryLeft != null;
  const showLanding = !display && !loading;
  const canRecheck = Boolean(display);

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

  const onPickPhoto = useCallback(
    async (file: File | null | undefined) => {
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
    },
    [t]
  );

  const clearComposer = () => {
    setText('');
    setPhoto(null);
  };

  const clearToLanding = () => {
    setResult(null);
    setActiveResult(null);
    setError(null);
    setRateHit(null);
    setAutoRetryLeft(null);
    setProgress([]);
    setLastProvider(null);
    setCached(false);
    clearComposer();
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

  const runCheck = useCallback(
    async (opts?: { forceRefresh?: boolean }) => {
      const forceRefresh = Boolean(opts?.forceRefresh);
      setError(null);
      setRateHit(null);
      setAutoRetryLeft(null);
      setResult(null);
      setActiveResult(null);
      setLastProvider(null);
      setCached(false);
      setProgress([]);

      let question = text.trim();
      let attached = photo;
      // Re-check after composer cleared: reuse last attempt (or result title)
      if (!question && !attached) {
        question = lastInputRef.current.question;
        attached = lastInputRef.current.photo;
      }
      if (!question && !attached) {
        const fallbackTitle = (result ?? activeResult?.result)?.title?.trim();
        if (fallbackTitle) question = fallbackTitle;
      }
      if (!question && !attached) {
        setError(t('check.needInput'));
        return;
      }
      lastInputRef.current = { question, photo: attached };
      const inputType = checkInputType(Boolean(question), Boolean(attached));
      trackEvent({
        event: 'check_start',
        input_type: inputType,
        force_refresh: forceRefresh,
      });
      setLoading(true);
      try {
        const out = await engineRunCheck({
          question,
          locale: settings.locale,
          geoScope: settings.geoScope,
          dimensions: settings.defaultDimensions,
          forceRefresh,
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
          trackEvent({
            event: 'check_error',
            error_code: safeErrorCode(out.code),
            input_type: inputType,
          });
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
        trackEvent({
          event: 'check_complete',
          relation_tier: out.result.relationTier,
          has_photo: Boolean(attached),
          cached: Boolean(out.cached),
          force_refresh: forceRefresh,
        });
        clearComposer();
        const queryLabel =
          question ||
          out.result.title ||
          t('check.unnamedPhoto');
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
    },
    [
      text,
      photo,
      result,
      activeResult?.result,
      settings.locale,
      settings.geoScope,
      settings.defaultDimensions,
      t,
      setActiveResult,
      pushCheckHistory,
    ]
  );

  runCheckRef.current = (opts) => runCheck(opts);

  // Drop (Google-style) and paste (Gemini-style) attach a package photo.
  useEffect(() => {
    const clearLeaveTimer = () => {
      if (dropLeaveTimerRef.current) {
        window.clearTimeout(dropLeaveTimerRef.current);
        dropLeaveTimerRef.current = 0;
      }
    };

    const onDragOver = (e: DragEvent) => {
      if (loading || autoRetrying) return;
      if (!transferMayContainImage(e.dataTransfer)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      clearLeaveTimer();
      setDropping(true);
    };

    const onDragLeave = () => {
      clearLeaveTimer();
      dropLeaveTimerRef.current = window.setTimeout(() => {
        setDropping(false);
        dropLeaveTimerRef.current = 0;
      }, 80);
    };

    const onDrop = (e: DragEvent) => {
      const dt = e.dataTransfer;
      const lookedLikeImage = transferMayContainImage(dt);
      if (!lookedLikeImage) return;
      e.preventDefault();
      clearLeaveTimer();
      setDropping(false);
      if (loading || autoRetrying) return;
      void imageFileFromTransferAsync(dt).then((file) => {
        if (!file) setError(t('check.photoInvalid'));
        else void onPickPhoto(file);
      });
    };

    const onPaste = (e: ClipboardEvent) => {
      if (loading || autoRetrying) return;
      const target = e.target;
      if (target instanceof HTMLElement) {
        const field = target.closest(
          'input, textarea, [contenteditable="true"]'
        );
        if (field && field.id !== 'check-input') return;
      }
      const file = imageFileFromTransfer(e.clipboardData);
      if (!file) return;
      e.preventDefault();
      void onPickPhoto(file);
    };

    window.addEventListener('dragenter', onDragOver);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    window.addEventListener('paste', onPaste);
    return () => {
      clearLeaveTimer();
      setDropping(false);
      window.removeEventListener('dragenter', onDragOver);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('paste', onPaste);
    };
  }, [loading, autoRetrying, onPickPhoto, t]);

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

  // History item selected while on another tab → show that result
  useEffect(() => {
    if (activeResult?.result) {
      setResult(null);
      setError(null);
      setRateHit(null);
      setAutoRetryLeft(null);
      setProgress([]);
    }
  }, [activeResult]);

  // Brand / home: force empty front page
  useEffect(() => {
    if (resetToken <= 0) return;
    setResult(null);
    setActiveResult(null);
    setError(null);
    setRateHit(null);
    setAutoRetryLeft(null);
    setProgress([]);
    setLastProvider(null);
    setCached(false);
    setText('');
    setPhoto(null);
  }, [resetToken, setActiveResult]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit && !loading && !autoRetrying) void runCheck();
    }
  };

  return (
    <div className={showLanding ? 'check-google' : 'check-with-result'}>
      <div
        className={
          showLanding ? 'check-hero' : 'check-hero check-hero--compact'
        }
      >
        {showLanding ? (
          <>
            <div className="check-logo" aria-hidden>
              <Globe2 size={36} strokeWidth={2} />
            </div>
            <h1 className="check-hero-title">{t('appName')}</h1>
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

          <div
            className={
              dropping
                ? 'check-search-row check-search-row--drop'
                : 'check-search-row'
            }
          >
            {dropping ? (
              <div className="check-drop-overlay" aria-hidden>
                <ImagePlus size={18} strokeWidth={2} />
                <span>{t('check.dropPhoto')}</span>
              </div>
            ) : null}
            <Sparkles
              size={18}
              className="check-search-icon"
              strokeWidth={2}
              aria-hidden
            />
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
              disabled={loading || autoRetrying}
              autoComplete="off"
              autoFocus
              enterKeyHint="search"
              aria-label={t('check.title')}
            />
            {text.trim() || photo ? (
              <button
                type="button"
                className="check-icon-btn"
                aria-label={t('common.cancel')}
                disabled={loading || autoRetrying}
                onClick={() => {
                  setText('');
                  setPhoto(null);
                }}
              >
                <X size={18} />
              </button>
            ) : null}
            <div className="check-search-tools">
              <button
                type="button"
                className="check-icon-btn"
                disabled={loading || autoRetrying}
                aria-label={t('check.photo')}
                title={t('check.photo')}
                onClick={() => cameraRef.current?.click()}
              >
                <Camera size={18} />
              </button>
              <button
                type="button"
                className="check-icon-btn"
                disabled={loading || autoRetrying}
                aria-label={t('check.gallery')}
                title={t('check.gallery')}
                onClick={() => galleryRef.current?.click()}
              >
                <ImagePlus size={18} />
              </button>
              <button
                type="button"
                className="check-icon-btn check-go"
                disabled={loading || !canSubmit || autoRetrying}
                aria-label={t('check.submit')}
                title={t('check.submit')}
                onClick={() => void runCheck()}
              >
                <Sparkles size={18} />
              </button>
            </div>
          </div>

          {showLanding ? (
            <div className="check-hero-actions">
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
              <button
                type="button"
                className="linkish"
                onClick={() => setTab('how')}
              >
                {t('check.howLink')}
              </button>
            </div>
          ) : (
            <div className="check-compact-actions">
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
              <button
                type="button"
                className="linkish"
                onClick={clearToLanding}
              >
                {t('check.newCheck')}
              </button>
            </div>
          )}

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

      {loading ? (
        <div className="check-body">
          <div className="card progress-card check-progress">
            <ProgressSteps steps={progress} t={t} />
          </div>
        </div>
      ) : null}

      {display && !loading ? (
        <section className="card check-result-card check-body">
          <ResultPanel
            result={display}
            provider={lastProvider}
            cached={cached}
            t={t}
          />
          {canRecheck ? (
            <div className="check-recheck-row">
              <button
                type="button"
                className="btn btn-ghost check-recheck-btn"
                disabled={loading || autoRetrying}
                onClick={() => void runCheck({ forceRefresh: true })}
              >
                {t('check.forceRefresh')}
              </button>
              {cached ? (
                <p className="muted check-recheck-hint">
                  {t('check.forceRefreshHint')}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
