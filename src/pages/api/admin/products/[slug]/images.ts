import type { APIRoute } from 'astro';
import { customAlphabet } from 'nanoid';
import { getProducto, addImagen } from '../../../../../lib/products';
import {
  putBlob,
  imageUrlForKey,
  isAllowedImageType,
  extForContentType,
} from '../../../../../lib/blobs';
import { json, jsonError, wantsJson } from '../../../../../lib/admin-response';

export const prerender = false;

const newKey = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16);
const MAX_BYTES = 5 * 1024 * 1024;

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const slug = params.slug;
  if (!slug) return new Response('Bad request', { status: 400 });

  const existing = await getProducto(slug);
  if (!existing) return new Response('Not found', { status: 404 });

  const wantJson = wantsJson(request);
  const fail = (code: string) =>
    wantJson
      ? jsonError(code, 400)
      : redirect(`/admin/productos/${slug}?error=${code}#imagenes`, 303);

  const form = await request.formData();
  const file = form.get('imagen');
  if (!(file instanceof File)) return fail('no-file');

  const contentType = file.type || 'application/octet-stream';
  if (!isAllowedImageType(contentType)) return fail('bad-type');
  if (file.size > MAX_BYTES) return fail('too-big');

  const ext = extForContentType(contentType);
  const key = `${slug}/${newKey()}.${ext}`;
  const buf = new Uint8Array(await file.arrayBuffer());

  try {
    await putBlob({ key, data: buf, contentType });
  } catch (err) {
    console.error('[images/upload] putBlob failed:', err);
    const msg = err instanceof Error ? err.message : 'storage-failed';
    return wantJson
      ? jsonError(`storage: ${msg}`, 500)
      : redirect(`/admin/productos/${slug}?error=storage#imagenes`, 303);
  }

  const url = imageUrlForKey(key);
  const id = await addImagen(slug, { url, blobKey: key });

  if (wantJson) return json({ ok: true, image: { id, url, blobKey: key } });
  return redirect(`/admin/productos/${slug}?saved=1#imagenes`, 303);
};
