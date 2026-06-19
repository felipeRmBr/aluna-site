import type { APIRoute } from 'astro';
import { removeImagen } from '../../../../../../../lib/products';
import { deleteBlob } from '../../../../../../../lib/blobs';

export const prerender = false;

export const POST: APIRoute = async ({ params, redirect }) => {
  const slug = params.slug;
  const idRaw = params.id;
  if (!slug || !idRaw) return new Response('Bad request', { status: 400 });

  const id = Number(idRaw);
  if (!Number.isFinite(id)) return new Response('Bad request', { status: 400 });

  const blobKey = await removeImagen(slug, id);
  if (blobKey) await deleteBlob(blobKey);

  return redirect(`/admin/productos/${slug}?saved=1`, 303);
};
