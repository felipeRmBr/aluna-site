import { getStore } from '@netlify/blobs';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Wraps Netlify Blobs for the product-images store, with a local-filesystem
 * fallback used during `astro dev` (Netlify Blobs only resolves credentials
 * inside the Netlify runtime).
 */

const STORE_NAME = 'product-images';
const LOCAL_DIR = '.netlify-blobs-local';

type Backend =
  | { kind: 'netlify'; store: ReturnType<typeof getStore> }
  | { kind: 'local'; dir: string };

let _backend: Backend | null = null;

function backend(): Backend {
  if (_backend) return _backend;
  // In dev, Netlify's Vite emulator stores blobs in memory and wipes them
  // on restart. Force the on-disk fallback so uploads persist across reloads.
  if (import.meta.env.DEV) {
    _backend = { kind: 'local', dir: join(process.cwd(), LOCAL_DIR) };
    return _backend;
  }
  try {
    const store = getStore({ name: STORE_NAME, consistency: 'strong' });
    _backend = { kind: 'netlify', store };
  } catch {
    _backend = { kind: 'local', dir: join(process.cwd(), LOCAL_DIR) };
  }
  return _backend;
}

export type PutInput = {
  key: string;
  data: ArrayBuffer | Uint8Array | Buffer;
  contentType: string;
};

export async function putBlob({ key, data, contentType }: PutInput): Promise<void> {
  const b = backend();
  const buf = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
  if (b.kind === 'netlify') {
    await b.store.set(key, buf, { metadata: { contentType } });
    return;
  }
  const filePath = join(b.dir, key);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, buf);
  await writeFile(`${filePath}.meta.json`, JSON.stringify({ contentType }));
}

export type BlobResult = {
  body: ReadableStream<Uint8Array> | Uint8Array;
  contentType: string;
} | null;

export async function getBlob(key: string): Promise<BlobResult> {
  const b = backend();
  if (b.kind === 'netlify') {
    const result = await b.store.getWithMetadata(key, { type: 'stream' });
    if (!result) return null;
    const meta = result.metadata as { contentType?: string } | undefined;
    return {
      body: result.data as ReadableStream<Uint8Array>,
      contentType: meta?.contentType ?? 'application/octet-stream',
    };
  }
  const path = join(b.dir, key);
  if (!existsSync(path)) return null;
  const [body, metaRaw] = await Promise.all([
    readFile(path),
    readFile(join(b.dir, `${key}.meta.json`), 'utf8').catch(() => '{}'),
  ]);
  const meta = JSON.parse(metaRaw) as { contentType?: string };
  return { body, contentType: meta.contentType ?? 'application/octet-stream' };
}

export async function deleteBlob(key: string): Promise<void> {
  const b = backend();
  if (b.kind === 'netlify') {
    await b.store.delete(key);
    return;
  }
  const path = join(b.dir, key);
  if (existsSync(path)) await unlink(path);
  const metaPath = join(b.dir, `${key}.meta.json`);
  if (existsSync(metaPath)) await unlink(metaPath);
}

export function imageUrlForKey(key: string): string {
  return `/api/images/${encodeURIComponent(key)}`;
}

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

export function extForContentType(contentType: string): string {
  return EXT_BY_TYPE[contentType.toLowerCase()] ?? 'bin';
}

export function isAllowedImageType(contentType: string): boolean {
  return contentType.toLowerCase() in EXT_BY_TYPE;
}
