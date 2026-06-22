import type { APIRoute } from 'astro';
import { z } from 'astro:content';
import { deleteVertical, getVertical, updateVertical } from '../../../../lib/verticales';

export const prerender = false;

const Schema = z.object({
  nombre: z.string().min(1).max(120),
  orden: z.coerce.number().int().optional(),
  intent: z.enum(['save', 'delete']).optional(),
});

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const slug = params.slug;
  if (!slug) return new Response('Bad request', { status: 400 });

  const existing = await getVertical(slug);
  if (!existing) return new Response('Not found', { status: 404 });

  const form = await request.formData();
  const raw: Record<string, string> = {};
  for (const [k, v] of form.entries()) raw[k] = String(v);

  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }

  if (parsed.data.intent === 'delete') {
    await deleteVertical(slug);
    return redirect('/admin/verticales', 303);
  }

  await updateVertical(slug, {
    nombre: parsed.data.nombre.trim(),
    orden: parsed.data.orden ?? 0,
  });

  return redirect(`/admin/verticales/${slug}?saved=1`, 303);
};
