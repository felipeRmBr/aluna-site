import type { APIRoute } from 'astro';
import { customAlphabet } from 'nanoid';
import { getColeccion, updateColeccion } from '../../../../../lib/colecciones';
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

  const existing = await getColeccion(slug);
  if (!existing) return new Response('Not found', { status: 404 });

  const wantJson = wantsJson(request);
  const fail = (code: string) =>
    wantJson
      ? jsonError(code, 400)
      : redirect(`/admin/colecciones/${slug}?error=${code}`, 303);

  const form = await request.formData();
  const file = form.get('hero');
  if (!(file instanceof File)) return fail('no-file');

  const contentType = file.type || 'application/octet-stream';
  if (!isAllowedImageType(contentType)) return fail('bad-type');
  if (file.size > MAX_BYTES) return fail('too-big');

  const ext = extForContentType(contentType);
  const key = `colecciones/${slug}/${newKey()}.${ext}`;
  const buf = new Uint8Array(await file.arrayBuffer());

  try {
    await putBlob({ key, data: buf, contentType });
  } catch (err) {
    console.error('[colecciones/hero] putBlob failed:', err);
    const msg = err instanceof Error ? err.message : 'storage-failed';
    return wantJson
      ? jsonError(`storage: ${msg}`, 500)
      : redirect(`/admin/colecciones/${slug}?error=storage`, 303);
  }

  const url = imageUrlForKey(key);
  await updateColeccion(slug, { hero: url });

  if (wantJson) return json({ ok: true, url });
  return redirect(`/admin/colecciones/${slug}?saved=1`, 303);
};
