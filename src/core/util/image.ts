/**
 * Client-side image prep for Check (resize + JPEG compress).
 * Resize + JPEG compress before upload.
 */

export type PreparedImage = {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  data: string;
  dataUrl: string;
  width: number;
  height: number;
  byteLength: number;
};

const MAX_EDGE = 1280;
const TARGET_BYTES = 750_000;
export const MAX_IMAGE_BYTES = 1_000_000;

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i;

export type TransferItemLike = {
  kind: string;
  type: string;
  getAsFile: () => File | null;
};

/** Duck-typed DataTransfer / clipboard for drop + paste. */
export type TransferLike = {
  files?: ArrayLike<File> | null;
  items?: ArrayLike<TransferItemLike> | null;
  types?: ArrayLike<string> | null;
  getData?: (format: string) => string;
};

export function isLikelyImageFile(file: File | Blob): boolean {
  const type = file.type?.toLowerCase() ?? '';
  if (type.startsWith('image/')) return true;
  if (type && type !== 'application/octet-stream') return false;
  return file instanceof File && IMAGE_EXT.test(file.name);
}

export function transferMayContainImage(
  dt: TransferLike | null | undefined
): boolean {
  if (!dt) return false;
  const types = dt.types ? Array.from(dt.types) : [];
  if (types.includes('Files') || types.includes('text/uri-list')) return true;
  if (dt.files) {
    for (let i = 0; i < dt.files.length; i++) {
      if (isLikelyImageFile(dt.files[i])) return true;
    }
  }
  return false;
}

export function imageFileFromTransfer(
  dt: TransferLike | null | undefined
): File | null {
  if (!dt) return null;
  if (dt.files) {
    for (let i = 0; i < dt.files.length; i++) {
      const file = dt.files[i];
      if (file && isLikelyImageFile(file)) return file;
    }
  }
  const items = dt.items;
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item?.kind !== 'file') continue;
      const file = item.getAsFile?.();
      if (file && isLikelyImageFile(file)) return file;
    }
  }
  return null;
}

function firstImageUrl(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  for (const line of lines) {
    if (/^data:image\//i.test(line)) return line;
    if (/^https?:\/\//i.test(line)) return line;
  }
  return null;
}

export function imageUrlFromTransfer(
  dt: TransferLike | null | undefined
): string | null {
  if (!dt?.getData) return null;
  try {
    const uriList = dt.getData('text/uri-list');
    const fromUri = uriList ? firstImageUrl(uriList) : null;
    if (fromUri) return fromUri;
  } catch {
    /* some browsers throw when a type is missing */
  }
  try {
    const html = dt.getData('text/html');
    if (html) {
      const match = html.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
      const src = match?.[1];
      if (src && /^(https?:|data:image\/)/i.test(src)) return src;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function fileFromImageUrl(url: string): Promise<File> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { mode: 'cors', signal: ctrl.signal });
    if (!res.ok) throw new Error('not_image');
    const blob = await res.blob();
    if (!isLikelyImageFile(blob)) throw new Error('not_image');
    const mime = blob.type || 'image/jpeg';
    const ext = mime.split('/')[1]?.split(';')[0]?.split('+')[0] || 'jpg';
    return new File([blob], `dropped-image.${ext}`, { type: mime });
  } finally {
    clearTimeout(timer);
  }
}

export async function imageFileFromTransferAsync(
  dt: TransferLike | null | undefined
): Promise<File | null> {
  const direct = imageFileFromTransfer(dt);
  if (direct) return direct;
  const url = imageUrlFromTransfer(dt);
  if (!url) return null;
  try {
    return await fileFromImageUrl(url);
  } catch {
    return null;
  }
}

function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image_load_failed'));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('image_encode_failed'));
        else resolve(blob);
      },
      type,
      quality
    );
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function prepareCheckImage(
  file: File | Blob
): Promise<PreparedImage> {
  if (!file || (!file.type.startsWith('image/') && file.type)) {
    if (file?.type && !ALLOWED.has(file.type) && !file.type.startsWith('image/')) {
      throw new Error('not_image');
    }
  }

  const img = await loadImage(file);
  let { width, height } = img;
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('image_encode_failed');
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.85;
  let blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  while (blob.size > TARGET_BYTES && quality > 0.45) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  }
  if (blob.size > MAX_IMAGE_BYTES) throw new Error('image_too_large');

  const data = await blobToBase64(blob);
  const dataUrl = `data:image/jpeg;base64,${data}`;
  return {
    mimeType: 'image/jpeg',
    data,
    dataUrl,
    width,
    height,
    byteLength: blob.size,
  };
}
