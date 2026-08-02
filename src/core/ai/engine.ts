import type {
  CheckDimension,
  CheckResult,
  GeoScope,
  Locale,
} from '../types';
import {
  runCheckApiStream,
  type CheckImagePayload,
  type ProgressStep,
} from './client';

export type EngineInput = {
  question: string;
  locale: Locale;
  geoScope: GeoScope;
  dimensions: CheckDimension[];
  image?: CheckImagePayload;
  forceRefresh?: boolean;
  onProgress?: (step: ProgressStep) => void;
};

export type EngineResult =
  | {
      ok: true;
      result: CheckResult;
      provider?: string;
      jobId?: string;
      mode?: string;
      cached?: boolean;
    }
  | { ok: false; error: string; code?: string; jobId?: string };

export async function engineRunCheck(
  input: EngineInput
): Promise<EngineResult> {
  const text = input.question.trim().slice(0, 400);
  const hasImage = Boolean(input.image?.data);
  if (!text && !hasImage) {
    return { ok: false, error: 'empty', code: 'empty' };
  }

  const res = await runCheckApiStream(
    {
      locale: input.locale,
      text: text || undefined,
      image: hasImage ? input.image : undefined,
      geoScope: input.geoScope,
      dimensions: input.dimensions,
      forceRefresh: input.forceRefresh,
      stream: true,
    },
    (step) => input.onProgress?.(step)
  );

  if (!res.ok) {
    return {
      ok: false,
      error: res.error,
      code: res.code,
      jobId: res.jobId,
    };
  }
  return {
    ok: true,
    result: res.result,
    provider: res.provider,
    jobId: res.jobId,
    mode: res.mode,
    cached: res.cached,
  };
}
