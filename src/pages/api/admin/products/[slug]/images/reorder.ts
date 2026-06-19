import type { APIRoute } from 'astro';
import { reorderImagenes } from '../../../../../../lib/products';
import { json, wantsJson } from '../../../../../../lib/admin-response';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const slug = params.slug;
  if (!slug) return new Response('Bad request', { status: 400 });

  const form = await request.formData();
  const idsRaw = String(form.get('ids') ?? '');
  const ids = idsRaw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (ids.length === 0) return new Response('Bad request', { status: 400 });

  await reorderImagenes(slug, ids);

  if (wantsJson(request)) return json({ ok: true });
  return redirect(`/admin/productos/${slug}?saved=1#imagenes`, 303);
};
