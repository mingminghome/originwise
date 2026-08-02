import { useRef, useState } from 'react';
import { Camera, ImagePlus, RefreshCw, Sparkles, X } from 'lucide-react';
import type { ProgressStep } from '../core/ai/client';
import { engineRunCheck } from '../core/ai/engine';
import { prepareCheckImage, type PreparedImage } from '../core/util/image';
import type { AppState } from '../hooks/useAppState';
import type { CheckResult } from '../core/types';
import { ProgressSteps } from './ProgressSteps';
import { ResultPanel } from './ResultPanel';

export function CheckScreen({ state }: { state: AppState }) {
  const {
    t,
    settings,
    activeResult,
    setActiveResult,
    pushCheckHistory,
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

  const runCheck = async (forceRefresh = false) => {
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
        // Prefer server message when it is more specific than the generic map
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

  return (
    <>
      <header className="app-header">
        <div>
          <h1>{t('check.title')}</h1>
          <p className="subtitle">{t('check.subtitle')}</p>
        </div>
      </header>

      <section className="card stack ask-composer">
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
          <div className="ask-photo-wrap">
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
            <p className="ask-photo-caption muted">{t('check.photoLabelHint')}</p>
          </div>
        ) : null}

        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="check-input">
            {photo ? t('check.noteOptional') : t('check.placeholder')}
          </label>
          <textarea
            id="check-input"
            value={text}
            placeholder={
              photo
                ? t('check.placeholderWithPhoto')
                : t('check.placeholder')
            }
            onChange={(e) => setText(e.target.value)}
            rows={photo ? 2 : 3}
            disabled={loading}
          />
        </div>

        {!photo ? (
          <div className="ask-photo-actions">
            <button
              type="button"
              className="btn btn-ghost ask-photo-action"
              disabled={loading}
              onClick={() => cameraRef.current?.click()}
            >
              <Camera size={16} />
              {t('check.photo')}
            </button>
            <button
              type="button"
              className="btn btn-ghost ask-photo-action"
              disabled={loading}
              onClick={() => galleryRef.current?.click()}
            >
              <ImagePlus size={16} />
              {t('check.gallery')}
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={loading || !canSubmit}
          onClick={() => void runCheck(false)}
        >
          <Sparkles size={16} />
          {loading ? t('check.submitting') : t('check.submit')}
        </button>

        {display && !loading ? (
          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={() => void runCheck(true)}
          >
            <RefreshCw size={16} />
            {t('check.forceRefresh')}
          </button>
        ) : null}

        {loading ? <ProgressSteps steps={progress} t={t} /> : null}

        <p className="muted" style={{ fontSize: '0.8rem' }}>
          {settings.geoScope === 'greater_china'
            ? t('settings.geoScopeGreater')
            : t('settings.geoScopePrc')}
        </p>

        {error ? (
          <p className="ask-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {display && !loading ? (
        <section className="card">
          <ResultPanel
            result={display}
            provider={lastProvider}
            cached={cached}
            t={t}
          />
        </section>
      ) : null}
    </>
  );
}
