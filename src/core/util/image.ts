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

export async function prepareCheckImage(file: File): Promise<PreparedImage> {
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
