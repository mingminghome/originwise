/**
 * Capture a DOM section to PNG (local-only). Used for Threads-friendly layer shots.
 *
 * The on-screen page is left alone. Save/Share clones the section into a hidden
 * iframe at phone width so viewport @media rules match a phone, then renders
 * that clone. Narrowing the live element would not switch those queries.
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

/**
 * Phone portrait capture.
 * 390 CSS px sits in the default phone band: above the 380px small-phone sheet
 * tweak and below the 420px large-phone tweaks. 520px is the two-column ask
 * grid; 720px is the tablet/desktop sheet breakpoint. pixelRatio is 2, not 1
 * and not devicePixelRatio (that was up to 2.5).
 */
export const sectionShareCapture = {
  pixelRatio: 2,
  phoneCssPx: 390,
  /**
   * Min CSS height for share PNGs. Threads carousel feed tiles crop short
   * images tall (~empty dark strip for a ~118px Final COO card). At
   * phoneCssPx 390 × pixelRatio 2 this is ~780×580 — same pad Tester used.
   */
  minCssHeight: 290,
  /** PNG only. Live page theme is not changed. */
  theme: 'dark',
} as const;

/** Alias kept next to phoneCssPx for call sites / tests. */
export const SECTION_SHARE_MIN_CSS_HEIGHT = sectionShareCapture.minCssHeight;

/**
 * Pad short section captures for Threads feed tiles.
 * Centers the card with equal top/bottom pad on the flatten background;
 * does not stretch or distort the section.
 */
export function sectionSharePaddedSize(input: {
  width: number;
  height: number;
  minHeight?: number;
}): { width: number; height: number; padTop: number; padBottom: number } {
  const minH = input.minHeight ?? SECTION_SHARE_MIN_CSS_HEIGHT;
  const width = Math.ceil(Math.max(input.width, 1));
  const contentH = Math.ceil(Math.max(input.height, 1));
  if (contentH >= minH) {
    return { width, height: contentH, padTop: 0, padBottom: 0 };
  }
  const height = minH;
  const padTop = Math.floor((height - contentH) / 2);
  const padBottom = height - contentH - padTop;
  return { width, height, padTop, padBottom };
}

/** Initial iframe height only. The frame grows to the section after layout. */
const PHONE_VIEWPORT_CSS_HEIGHT = 844;

export type RgbTuple = readonly [number, number, number];

/** Default opaque backdrop (light). Dark capture passes the dark card color. */
export const FLATTEN_ONTO_LIGHT: RgbTuple = [255, 255, 255];
export const FLATTEN_ONTO_DARK: RgbTuple = [22, 22, 22]; // --bg-card dark #161616

/**
 * Neutral page backdrop for Threads pad margins.
 * Not the section card tint from pickBackground (e.g. COO teal wash rgb(21,30,29)).
 * Dark = #161616; light = white — matches hand pads / opaque flatten.
 */
export function sectionSharePadBackground(
  theme: 'dark' | 'light' = sectionShareCapture.theme
): string {
  const onto = theme === 'dark' ? FLATTEN_ONTO_DARK : FLATTEN_ONTO_LIGHT;
  return `rgb(${onto[0]}, ${onto[1]}, ${onto[2]})`;
}

/** Paint a translucent layer color onto an opaque backdrop so the PNG is not see-through. */
export function flattenCssColor(
  color: string,
  onto: RgbTuple = FLATTEN_ONTO_LIGHT
): string {
  const m = color
    .trim()
    .match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (!m) return color;
  const a = m[4] === undefined ? 1 : Number(m[4]);
  const blend = (channel: string, i: number) =>
    Math.round(Number(channel) * a + onto[i] * (1 - a));
  return `rgb(${blend(m[1], 0)}, ${blend(m[2], 1)}, ${blend(m[3], 2)})`;
}

function parseHexRgb(hex: string): RgbTuple | null {
  const h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return [r, g, b];
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return [r, g, b];
  }
  return null;
}

function cssVar(el: HTMLElement, name: string): string {
  const own = getComputedStyle(el.ownerDocument.documentElement)
    .getPropertyValue(name)
    .trim();
  if (own) return own;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function pickBackground(el: HTMLElement): string {
  const theme =
    el.ownerDocument.documentElement.getAttribute('data-theme') ||
    sectionShareCapture.theme;
  const onto =
    theme === 'dark'
      ? parseHexRgb(cssVar(el, '--bg-card')) || FLATTEN_ONTO_DARK
      : FLATTEN_ONTO_LIGHT;
  const fromEl = getComputedStyle(el).backgroundColor;
  if (fromEl && fromEl !== 'rgba(0, 0, 0, 0)' && fromEl !== 'transparent') {
    return flattenCssColor(fromEl, onto);
  }
  const card = cssVar(el, '--bg-card');
  const subtle = cssVar(el, '--bg-subtle');
  const raw = card || subtle || (theme === 'dark' ? '#161616' : '#ffffff');
  if (raw.startsWith('#')) {
    const rgb = parseHexRgb(raw);
    if (rgb) return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }
  return flattenCssColor(raw, onto);
}

function settle(p: Promise<unknown>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, ms);
    p.then(
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      () => {
        window.clearTimeout(timer);
        resolve();
      }
    );
  });
}

function nextFrames(win: Window, frames: number): Promise<void> {
  return new Promise((resolve) => {
    const step = (left: number) => {
      if (left <= 0) {
        resolve();
        return;
      }
      win.requestAnimationFrame(() => step(left - 1));
    };
    step(frames);
  });
}

/** App CSS locks html/body to the viewport. Undo that inside the frame only. */
function frameResetCss(cssWidth: number): string {
  return [
    'html,body{',
    'height:auto!important;',
    'min-height:0!important;',
    'max-height:none!important;',
    'overflow:visible!important;',
    `width:${cssWidth}px!important;`,
    'margin:0!important;',
    '}',
  ].join('');
}

function copyStyles(from: Document, to: Document, cssWidth: number): Promise<void> {
  const base = to.createElement('base');
  base.href = from.baseURI;
  to.head.appendChild(base);

  // Inline every readable sheet as <style> so the frame is styled the moment
  // the clone mounts. Waiting on <link> loads raced the capture (4s settle)
  // and left later saves unstyled: serif fallback, dark text on #161616.
  const waits: Promise<unknown>[] = [];
  for (const sheet of Array.from(from.styleSheets)) {
    let text = '';
    try {
      text = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n');
    } catch {
      text = '';
    }
    if (text) {
      const style = to.createElement('style');
      if (sheet.media?.mediaText) style.media = sheet.media.mediaText;
      style.textContent = text;
      to.head.appendChild(style);
      continue;
    }
    // Cross-origin or unreadable: fall back to the link and wait for it.
    const owner = sheet.ownerNode as Element | null;
    const href = sheet.href || (owner as HTMLLinkElement | null)?.href;
    if (owner && owner.nodeName === 'STYLE') {
      to.head.appendChild(owner.cloneNode(true));
      continue;
    }
    if (!href) continue;
    const copy = to.createElement('link');
    copy.rel = 'stylesheet';
    if (sheet.media?.mediaText) copy.media = sheet.media.mediaText;
    const loaded = new Promise<void>((resolve) => {
      copy.addEventListener('load', () => resolve(), { once: true });
      copy.addEventListener('error', () => resolve(), { once: true });
    });
    copy.href = href;
    to.head.appendChild(copy);
    waits.push(loaded);
  }

  const sheets = from.adoptedStyleSheets;
  const view = to.defaultView;
  if (sheets?.length && view) {
    const copies: CSSStyleSheet[] = [];
    for (const sheet of sheets) {
      try {
        const next = new view.CSSStyleSheet();
        const text = [...sheet.cssRules].map((rule) => rule.cssText).join('\n');
        next.replaceSync(text);
        copies.push(next);
      } catch {
        /* constructed sheet was not readable */
      }
    }
    if (copies.length) {
      try {
        to.adoptedStyleSheets = copies;
      } catch {
        /* this document will not adopt them */
      }
    }
  }

  const reset = to.createElement('style');
  reset.dataset.sectionShare = 'frame';
  reset.textContent = frameResetCss(cssWidth);
  to.head.appendChild(reset);

  return Promise.all(waits).then(() => undefined);
}

/**
 * Hidden phone viewport. Media queries follow the iframe, not the parent window
 * and not the element's CSS width.
 */
async function mountPhoneCapture(
  source: HTMLElement,
  cssWidth: number
): Promise<{ iframe: HTMLIFrameElement; clone: HTMLElement }> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  iframe.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    `width:${cssWidth}px`,
    `height:${PHONE_VIEWPORT_CSS_HEIGHT}px`,
    'border:0',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc?.body || !win) throw new Error('phone_frame');

    const root = source.ownerDocument.documentElement;
    // Threads shots are always dark. Do not copy the live page theme.
    doc.documentElement.setAttribute('data-theme', sectionShareCapture.theme);
    doc.documentElement.lang = root.lang;
    doc.documentElement.className = root.className;

    await settle(copyStyles(source.ownerDocument, doc, cssWidth), 4000);
    const box = [
      'height:auto',
      'min-height:0',
      'max-height:none',
      'overflow:visible',
      `width:${cssWidth}px`,
      'margin:0',
    ].join(';');
    doc.documentElement.style.cssText = box;
    doc.body.style.cssText = box;

    const clone = source.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-section-share="ui"]').forEach((node) => {
      node.remove();
    });
    doc.body.appendChild(clone);
    if (doc.fonts?.ready) await settle(doc.fonts.ready, 2000);

    const images = [...clone.querySelectorAll('img')].map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
    });
    await settle(Promise.all(images), 4000);
    await nextFrames(win, 2);

    const height = Math.ceil(
      Math.max(clone.scrollHeight, clone.getBoundingClientRect().height, 1)
    );
    iframe.style.height = `${height}px`;
    await nextFrames(win, 1);
    return { iframe, clone };
  } catch (err) {
    iframe.remove();
    throw err;
  }
}

export async function captureElementPng(
  el: HTMLElement,
  opts?: { pixelRatio?: number }
): Promise<Blob> {
  const ratio = opts?.pixelRatio ?? sectionShareCapture.pixelRatio;
  const frame = await mountPhoneCapture(el, sectionShareCapture.phoneCssPx);
  try {
    const rect = frame.clone.getBoundingClientRect();
    const measured = sectionCaptureSize({
      scrollWidth: frame.clone.scrollWidth,
      scrollHeight: frame.clone.scrollHeight,
      rectWidth: rect.width,
      rectHeight: rect.height,
    });
    const padded = sectionSharePaddedSize(measured);
    const needsPad = padded.padTop > 0 || padded.padBottom > 0;
    // Pad margins use neutral page flatten, not the card's tinted fill.
    const backgroundColor = needsPad
      ? sectionSharePadBackground(sectionShareCapture.theme)
      : pickBackground(frame.clone);
    let target: HTMLElement = frame.clone;
    if (needsPad) {
      const doc = frame.clone.ownerDocument;
      const wrap = doc.createElement('div');
      wrap.dataset.sectionShare = 'pad';
      wrap.style.cssText = [
        `width:${padded.width}px`,
        `height:${padded.height}px`,
        'box-sizing:border-box',
        `padding:${padded.padTop}px 0 ${padded.padBottom}px`,
        `background-color:${backgroundColor}`,
        'margin:0',
      ].join(';');
      frame.clone.parentElement?.insertBefore(wrap, frame.clone);
      wrap.appendChild(frame.clone);
      target = wrap;
      frame.iframe.style.height = `${padded.height}px`;
    }
    const blob = await toBlob(target, {
      pixelRatio: ratio,
      width: padded.width,
      height: padded.height,
      cacheBust: true,
      backgroundColor,
      style: { margin: '0', outline: 'none' },
      filter: (node) => {
        // Iframe nodes fail `instanceof HTMLElement` from the parent window.
        if (node.nodeType !== Node.ELEMENT_NODE) return true;
        return (node as HTMLElement).dataset?.sectionShare !== 'ui';
      },
    });
    if (!blob) throw new Error('empty_png');
    return blob;
  } finally {
    frame.iframe.remove();
  }
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
