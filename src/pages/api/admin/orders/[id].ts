import type { APIRoute } from 'astro';
import { z } from 'astro:content';
import { updateOrder } from '../../../../lib/orders';
import { ORDER_STATES } from '../../../../lib/db';
import { json, wantsJson } from '../../../../lib/admin-response';

export const prerender = false;

const Schema = z.object({
  estado: z.enum(ORDER_STATES).optional(),
  nota: z.string().max(2000).optional(),
  tracking: z.string().max(200).optional(),
});

export const POST: APIRoute = async ({ params, request, redirect }) => {
  const id = params.id;
  if (!id) return new Response('Bad request', { status: 400 });

  const form = await request.formData();
  const obj: Record<string, string> = {};
  for (const [k, v] of form.entries()) obj[k] = String(v);

  const parsed = Schema.safeParse(obj);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }

  const { estado, nota, tracking } = parsed.data;
  await updateOrder(id, {
    estado,
    nota: nota?.trim() ? nota.trim() : null,
    tracking: tracking?.trim() ? tracking.trim() : null,
  });

  if (wantsJson(request)) return json({ ok: true });
  return redirect(`/admin/pedidos/${id}?saved=1`);
};
