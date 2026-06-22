import type { APIRoute } from 'astro';
import { z } from 'astro:content';
import { createVertical, verticalSlugExists } from '../../../lib/verticales';
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
    return redirect('/admin/verticales/nueva?error=slug-invalid', 303);
  }
  if (await verticalSlugExists(slug)) {
    return redirect('/admin/verticales/nueva?error=slug-taken', 303);
  }

  await createVertical({
    slug,
    nombre: parsed.data.nombre.trim(),
    orden: parsed.data.orden ?? 0,
  });

  return redirect(`/admin/verticales/${slug}?saved=1`, 303);
};
