import type { APIRoute } from 'astro';
import { z } from 'astro:content';
import { createProductLine, productLineSlugExists } from '../../../lib/productLines';
import { isValidSlug } from '../../../lib/slug';

export const prerender = false;

const Schema = z.object({
  slug: z.string(),
  nombre: z.string().min(1).max(120),
  orden: z.coerce.number().int().optional(),
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
    return redirect('/admin/product-lines/nueva?error=slug-invalid', 303);
  }
  if (await productLineSlugExists(slug)) {
    return redirect('/admin/product-lines/nueva?error=slug-taken', 303);
  }

  await createProductLine({
    slug,
    nombre: parsed.data.nombre.trim(),
    orden: parsed.data.orden ?? 0,
  });

  return redirect(`/admin/product-lines/${slug}?saved=1`, 303);
};
