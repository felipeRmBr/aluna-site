import type { APIRoute } from 'astro';
import { getProducto, setDisponible } from '../../../../../lib/products';

export const prerender = false;

export const POST: APIRoute = async ({ params, redirect }) => {
  const slug = params.slug;
  if (!slug) return new Response('Bad request', { status: 400 });

  const existing = await getProducto(slug);
  if (!existing) return new Response('Not found', { status: 404 });

  await setDisponible(slug, !existing.disponible);
  return redirect('/admin/productos', 303);
};
