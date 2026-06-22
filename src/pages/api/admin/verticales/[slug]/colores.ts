import type { APIRoute } from 'astro';
import { z } from 'astro:content';
import { createVerticalColor, getVertical } from '../../../../../lib/verticales';

export const prerender = false;

const Schema = z.object({
  nombre: z.string().min(1).max(120),
  hex: z.string().max(20).optional(),
  orden: z.coerce.number().int().optional(),
  activo: z.union([z.literal('on'), z.literal('true'), z.literal('false'), z.literal('')]).optional(),
});

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const slug = params.slug;
  if (!slug) return new Response('Bad request', { status: 400 });
  if (!(await getVertical(slug))) return new Response('Not found', { status: 404 });

  const form = await request.formData();
  const raw: Record<string, string> = {};
  for (const [k, v] of form.entries()) raw[k] = String(v);

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }

  await createVerticalColor(slug, {
    nombre: parsed.data.nombre.trim(),
    hex: parsed.data.hex?.trim() || null,
    orden: parsed.data.orden ?? 0,
    activo: parsed.data.activo !== 'false',
  });

  return redirect(`/admin/verticales/${slug}?saved=1#colores`, 303);
};
