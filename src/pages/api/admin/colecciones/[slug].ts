import type { APIRoute } from 'astro';
import { z } from 'astro:content';
import { getColeccion, updateColeccion } from '../../../../lib/colecciones';
import { json, wantsJson } from '../../../../lib/admin-response';

export const prerender = false;

const Schema = z.object({
  nombre: z.string().min(1).max(120),
  descripcion: z.string().min(1).max(500),
  descripcionMd: z.string().max(20_000).optional(),
  hero: z.string().max(500).optional(),
  orden: z.coerce.number().int().optional(),
  destacada: z.union([z.literal('on'), z.literal('true'), z.literal('false'), z.literal('')]).optional(),
});

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const slug = params.slug;
  if (!slug) return new Response('Bad request', { status: 400 });

  const existing = await getColeccion(slug);
  if (!existing) return new Response('Not found', { status: 404 });

  const form = await request.formData();
  const raw: Record<string, string> = {};
  for (const [k, v] of form.entries()) raw[k] = String(v);

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }

  await updateColeccion(slug, {
    nombre: parsed.data.nombre.trim(),
    descripcion: parsed.data.descripcion.trim(),
    descripcionMd: parsed.data.descripcionMd?.trim() || null,
    hero: parsed.data.hero?.trim() || null,
    orden: parsed.data.orden ?? 0,
    destacada: parsed.data.destacada === 'on' || parsed.data.destacada === 'true',
  });

  if (wantsJson(request)) return json({ ok: true });
  return redirect(`/admin/colecciones/${slug}?saved=1`, 303);
};
