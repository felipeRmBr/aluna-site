/**
 * Browser-only: resize an image File to fit within `maxDim` on its longest
 * edge and re-encode as WebP. SVGs and GIFs are passed through unchanged
 * (vector / animated — Canvas re-encode would lose info). Any failure
 * silently falls back to the original file.
 */

const SKIP_TYPES = new Set(['image/svg+xml', 'image/gif']);
const MIN_BYTES_TO_COMPRESS = 100 * 1024;

export type CompressOptions = {
  maxDim?: number;
  quality?: number;
  mime?: string;
};

export async function compressImage(
  file: File,
  { maxDim = 1920, quality = 0.85, mime = 'image/webp' }: CompressOptions = {},
): Promise<File> {
  if (SKIP_TYPES.has(file.type)) return file;
  if (file.size < MIN_BYTES_TO_COMPRESS) return file;

  try {
    const bitmap = await loadBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxDim);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    if ('close' in bitmap) (bitmap as ImageBitmap).close();

    const blob = await canvasToBlob(canvas, mime, quality);
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], newName, { type: blob.type });
  } catch {
    return file;
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through to HTMLImageElement path
    }
  }
  return await loadHtmlImage(file);
}

function loadHtmlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image load failed'));
    };
    img.src = url;
  });
}

function fitWithin(w: number, h: number, maxDim: number): { width: number; height: number } {
  const ratio = Math.min(maxDim / w, maxDim / h, 1);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}
