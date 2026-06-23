import type { APIRoute } from 'astro';
import { z } from 'astro:content';
import { getProducto, updateProducto } from '../../../../lib/products';
import { json, wantsJson } from '../../../../lib/admin-response';

export const prerender = false;

const Schema = z.object({
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

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const slug = params.slug;
  if (!slug) return new Response('Bad request', { status: 400 });

  const existing = await getProducto(slug);
  if (!existing) return new Response('Not found', { status: 404 });

  const form = await request.formData();
  const raw: Record<string, string> = {};
  for (const [k, v] of form.entries()) raw[k] = String(v);

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }

  const colecciones = (parsed.data.colecciones ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const colorCombinaciones = parsed.data.colorCombinaciones
    ? ColorCombinationSchema.parse(JSON.parse(parsed.data.colorCombinaciones))
    : [];

  await updateProducto(slug, {
    nombre: parsed.data.nombre.trim(),
    precio: parsed.data.precio,
    descripcionCorta: parsed.data.descripcionCorta.trim(),
    descripcionMd: parsed.data.descripcionMd?.trim() || null,
    disponible: parsed.data.disponible === 'on' || parsed.data.disponible === 'true',
    orden: parsed.data.orden ?? 0,
    sku: parsed.data.sku?.trim() || null,
    colecciones,
    productLineSlug: parsed.data.productLineSlug?.trim() || null,
    colorCombinaciones,
  });

  if (wantsJson(request)) return json({ ok: true });
  return redirect(`/admin/productos/${slug}?saved=1`, 303);
};
