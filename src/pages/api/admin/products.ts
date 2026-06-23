import type { APIRoute } from 'astro';
import { z } from 'astro:content';
import { createProducto, slugExists } from '../../../lib/products';
import { isValidSlug } from '../../../lib/slug';

export const prerender = false;

const Schema = z.object({
  slug: z.string(),
  nombre: z.string().min(1).max(120),
  precio: z.coerce.number().nonnegative().max(1_000_000),
  descripcionCorta: z.string().min(1).max(500),
  descripcionMd: z.string().max(20_000).optional(),
  disponible: z.union([z.literal('on'), z.literal('true'), z.literal('false'), z.literal('')]).optional(),
  orden: z.coerce.number().int().optional(),
  sku: z.string().max(60).optional(),
  colecciones: z.string().optional(),
  productLineSlug: z.string().max(60).optional(),
  colorCombinaciones: z.string().optional(),
});

const ColorCombinationSchema = z.array(z.object({
  nombre: z.string().min(1).max(200),
  colorIds: z.array(z.number().int().positive()).min(1).max(4),
  orden: z.number().int().optional(),
  activo: z.boolean().optional(),
}));

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
    return redirect('/admin/productos/nuevo?error=slug-invalid', 303);
  }
  if (await slugExists(slug)) {
    return redirect('/admin/productos/nuevo?error=slug-taken', 303);
  }

  const colecciones = (parsed.data.colecciones ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const colorCombinaciones = parsed.data.colorCombinaciones
    ? ColorCombinationSchema.parse(JSON.parse(parsed.data.colorCombinaciones))
    : [];

  await createProducto({
    slug,
    nombre: parsed.data.nombre.trim(),
    precio: parsed.data.precio,
    descripcionCorta: parsed.data.descripcionCorta.trim(),
    descripcionMd: parsed.data.descripcionMd?.trim() || null,
    disponible: parsed.data.disponible !== 'false',
    orden: parsed.data.orden ?? 0,
    sku: parsed.data.sku?.trim() || null,
    colecciones,
    productLineSlug: parsed.data.productLineSlug?.trim() || null,
    colorCombinaciones,
  });

  return redirect(`/admin/productos/${slug}?saved=1`, 303);
};
