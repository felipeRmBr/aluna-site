import type { APIRoute } from 'astro';
import { z } from 'astro:content';
import { createColeccion, coleccionSlugExists } from '../../../lib/colecciones';
import { isValidSlug } from '../../../lib/slug';

export const prerender = false;

const Schema = z.object({
  slug: z.string(),
  nombre: z.string().min(1).max(120),
  descripcion: z.string().min(1).max(500),
  descripcionMd: z.string().max(20_000).optional(),
  hero: z.string().max(500).optional(),
  orden: z.coerce.number().int().optional(),
  destacada: z.union([z.literal('on'), z.literal('true'), z.literal('false'), z.literal('')]).optional(),
});

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const raw: Record<string, string> = {};
  for (const [k, v] of form.entries()) raw[k] = String(v);

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }

  const slug = parsed.data.slug.trim();
  if (!isValidSlug(slug)) {
    return redirect('/admin/colecciones/nueva?error=slug-invalid', 303);
  }
  if (await coleccionSlugExists(slug)) {
    return redirect('/admin/colecciones/nueva?error=slug-taken', 303);
  }

  await createColeccion({
    slug,
    nombre: parsed.data.nombre.trim(),
    descripcion: parsed.data.descripcion.trim(),
    descripcionMd: parsed.data.descripcionMd?.trim() || null,
    hero: parsed.data.hero?.trim() || null,
    orden: parsed.data.orden ?? 0,
    destacada: parsed.data.destacada === 'on' || parsed.data.destacada === 'true',
  });

  return redirect(`/admin/colecciones/${slug}?saved=1`, 303);
};
