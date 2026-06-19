import type { APIRoute } from 'astro';
import { getProducto, setDisponible } from '../../../../../lib/products';
import { json, wantsJson } from '../../../../../lib/admin-response';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const slug = params.slug;
  if (!slug) return new Response('Bad request', { status: 400 });

  const existing = await getProducto(slug);
  if (!existing) return new Response('Not found', { status: 404 });

  const next = !existing.disponible;
  await setDisponible(slug, next);

  if (wantsJson(request)) return json({ ok: true, disponible: next });
  return redirect('/admin/productos', 303);
};
