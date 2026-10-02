/**
 * Capture a DOM section to PNG (local-only). Used for Threads-friendly layer shots.
 */
import { toBlob } from 'html-to-image';

export function sanitizeShareStem(raw: string): string {
  const s = raw
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return s || 'section';
}

export function sectionImageFilename(label: string, when = new Date()): string {
  const day = when.toISOString().slice(0, 10);
  return `originwise-${sanitizeShareStem(label)}-${day}.png`;
}

/** Full card box. Flex can shrink clientHeight below the content; scrollHeight still has it. */
export function sectionCaptureSize(input: {
  scrollWidth: number;
  scrollHeight: number;
  rectWidth: number;
  rectHeight: number;
}): { width: number; height: number } {
  const width = Math.ceil(Math.max(input.scrollWidth, input.rectWidth, 1));
  const height = Math.ceil(Math.max(input.scrollHeight, input.rectHeight, 1));
  return { width, height };
}

/** Paint a translucent layer color onto white so the PNG is not a see-through strip. */
export function flattenCssColor(color: string): string {
  const m = color
    .trim()
    .match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (!m) return color;
  const a = m[4] === undefined ? 1 : Number(m[4]);
  const blend = (channel: string) =>
    Math.round(Number(channel) * a + 255 * (1 - a));
  return `rgb(${blend(m[1])}, ${blend(m[2])}, ${blend(m[3])})`;
}

function pickBackground(el: HTMLElement): string {
  const fromEl = getComputedStyle(el).backgroundColor;
  if (fromEl && fromEl !== 'rgba(0, 0, 0, 0)' && fromEl !== 'transparent') {
    return flattenCssColor(fromEl);
  }
  const root = getComputedStyle(document.documentElement);
  const card = root.getPropertyValue('--bg-card').trim();
  const subtle = root.getPropertyValue('--bg-subtle').trim();
  return flattenCssColor(card || subtle || '#ffffff');
}

export async function captureElementPng(
  el: HTMLElement,
  opts?: { pixelRatio?: number }
): Promise<Blob> {
  const ratio = opts?.pixelRatio ?? Math.min(2.5, window.devicePixelRatio || 2);
  const rect = el.getBoundingClientRect();
  const { width, height } = sectionCaptureSize({
    scrollWidth: el.scrollWidth,
    scrollHeight: el.scrollHeight,
    rectWidth: rect.width,
    rectHeight: rect.height,
  });
  const blob = await toBlob(el, {
    pixelRatio: ratio,
    width,
    height,
    cacheBust: true,
    backgroundColor: pickBackground(el),
    style: { margin: '0', outline: 'none' },
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      return node.dataset.sectionShare !== 'ui';
    },
  });
  if (!blob) throw new Error('empty_png');
  return blob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function shareOrDownloadPng(
  blob: Blob,
  filename: string,
  title: string
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };
  if (typeof nav.share === 'function') {
    const data: ShareData = { files: [file], title };
    const can =
      typeof nav.canShare !== 'function' || nav.canShare(data);
    if (can) {
      try {
        await nav.share(data);
        return 'shared';
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        if (name === 'AbortError') return 'shared';
        /* fall through to download */
      }
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}
