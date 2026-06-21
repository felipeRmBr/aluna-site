import { getStore } from '@netlify/blobs';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Wraps Netlify Blobs for the product-images store.
 *
 * In dev we keep writes on disk so uploads persist across restarts and local
 * testing does not mutate production blobs. Reads first check disk, then fall
 * back to Netlify Blobs when local credentials are configured.
 */

const STORE_NAME = 'product-images';
const LOCAL_DIR = '.netlify-blobs-local';

type Backend =
  | { kind: 'netlify'; store: ReturnType<typeof getStore> }
  | { kind: 'local'; dir: string }
  | { kind: 'hybrid'; dir: string; store: ReturnType<typeof getStore> | null };

let _backend: Backend | null = null;

function backend(): Backend {
  if (_backend) return _backend;
  if (import.meta.env.DEV) {
    _backend = {
      kind: 'hybrid',
      dir: join(process.cwd(), LOCAL_DIR),
      store: createNetlifyStore(),
    };
    return _backend;
  }
  const store = createNetlifyStore();
  if (store) {
    _backend = { kind: 'netlify', store };
    return _backend;
  }
  _backend = { kind: 'local', dir: join(process.cwd(), LOCAL_DIR) };
  return _backend;
}

function createNetlifyStore(): ReturnType<typeof getStore> | null {
  try {
    const siteID = env('NETLIFY_SITE_ID');
    const token = env('NETLIFY_AUTH_TOKEN');
    if (siteID && token) {
      return getStore({ name: STORE_NAME, consistency: 'strong', siteID, token });
    }
    return getStore({ name: STORE_NAME, consistency: 'strong' });
  } catch {
    return null;
  }
}

function env(name: string): string | undefined {
  return process.env[name] || (import.meta.env[name] as string | undefined);
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
  await putLocalBlob(b.dir, key, buf, contentType);
}

async function putLocalBlob(
  dir: string,
  key: string,
  data: Uint8Array,
  contentType: string,
): Promise<void> {
  const filePath = join(dir, key);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
  await writeFile(`${filePath}.meta.json`, JSON.stringify({ contentType }));
}

export type BlobResult = {
  body: ReadableStream<Uint8Array> | Uint8Array;
  contentType: string;
} | null;

export async function getBlob(key: string): Promise<BlobResult> {
  const b = backend();
  if (b.kind === 'netlify') {
    return getNetlifyBlob(b.store, key);
  }
  const local = await getLocalBlob(b.dir, key);
  if (local || b.kind === 'local') return local;
  return b.store ? getNetlifyBlob(b.store, key) : null;
}

async function getNetlifyBlob(
  store: ReturnType<typeof getStore>,
  key: string,
): Promise<BlobResult> {
  try {
    const result = await store.getWithMetadata(key, { type: 'stream' });
    if (!result) return null;
    const meta = result.metadata as { contentType?: string } | undefined;
    return {
      body: result.data as ReadableStream<Uint8Array>,
      contentType: meta?.contentType ?? 'application/octet-stream',
    };
  } catch {
    return null;
  }
}

async function getLocalBlob(dir: string, key: string): Promise<BlobResult> {
  const path = join(dir, key);
  if (!existsSync(path)) return null;
  const [body, metaRaw] = await Promise.all([
    readFile(path),
    readFile(join(dir, `${key}.meta.json`), 'utf8').catch(() => '{}'),
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
  await deleteLocalBlob(b.dir, key);
}

async function deleteLocalBlob(dir: string, key: string): Promise<void> {
  const path = join(dir, key);
  if (existsSync(path)) await unlink(path);
  const metaPath = join(dir, `${key}.meta.json`);
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
