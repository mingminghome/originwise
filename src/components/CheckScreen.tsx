import { useRef, useState } from 'react';
import { Camera, ImagePlus, Sparkles, X } from 'lucide-react';
import type { ProgressStep } from '../core/ai/client';
import { engineRunCheck } from '../core/ai/engine';
import { prepareCheckImage, type PreparedImage } from '../core/util/image';
import type { AppState } from '../hooks/useAppState';
import type { CheckResult } from '../core/types';
import { ProgressSteps } from './ProgressSteps';
import { ResultPanel } from './ResultPanel';
import { TopNavIcons } from './TopNavIcons';

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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [progress, setProgress] = useState<ProgressStep[]>([]);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const canSubmit = Boolean(text.trim() || photo);
  const display = result ?? activeResult?.result ?? null;
  const showLanding = !display && !loading;

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

  const runCheck = async () => {
    setError(null);
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
        const byCode: Record<string, string> = {
          provider_not_configured: t('check.providerNotConfigured'),
          gemini_not_configured: t('check.providerNotConfigured'),
          rate_limited: t('check.rateLimited'),
          rate_limited_day: t('check.rateLimitedDay'),
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
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit && !loading) void runCheck();
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

          <button
            type="button"
            className="btn btn-primary check-search-submit"
            disabled={loading || !canSubmit}
            onClick={() => void runCheck()}
          >
            <Sparkles size={16} />
            {loading ? t('check.submitting') : t('check.submit')}
          </button>

          {loading ? <ProgressSteps steps={progress} t={t} /> : null}

          {error ? (
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
