import type { APIRoute } from 'astro';
import { customAlphabet } from 'nanoid';
import { getProducto, addImagen } from '../../../../../lib/products';
import {
  putBlob,
  imageUrlForKey,
  isAllowedImageType,
  extForContentType,
} from '../../../../../lib/blobs';

export const prerender = false;

const newKey = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16);
const MAX_BYTES = 5 * 1024 * 1024;

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const slug = params.slug;
  if (!slug) return new Response('Bad request', { status: 400 });

  const existing = await getProducto(slug);
  if (!existing) return new Response('Not found', { status: 404 });

  const form = await request.formData();
  const file = form.get('imagen');
  if (!(file instanceof File)) {
    return redirect(`/admin/productos/${slug}?error=no-file`, 303);
  }

  const contentType = file.type || 'application/octet-stream';
  if (!isAllowedImageType(contentType)) {
    return redirect(`/admin/productos/${slug}?error=bad-type`, 303);
  }
  if (file.size > MAX_BYTES) {
    return redirect(`/admin/productos/${slug}?error=too-big`, 303);
  }

  const ext = extForContentType(contentType);
  const key = `${slug}/${newKey()}.${ext}`;
  const buf = new Uint8Array(await file.arrayBuffer());
  await putBlob({ key, data: buf, contentType });

  await addImagen(slug, { url: imageUrlForKey(key), blobKey: key });

  return redirect(`/admin/productos/${slug}?saved=1`, 303);
};
