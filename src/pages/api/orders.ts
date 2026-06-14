import type { APIRoute } from 'astro';
import { z } from 'astro:content';
import { createOrder } from '../../lib/orders';
import { buildWhatsappUrl } from '../../lib/whatsapp';

export const prerender = false;

const ItemSchema = z.object({
  slug: z.string().min(1).max(120),
  nombre: z.string().min(1).max(200),
  precio: z.number().positive(),
  qty: z.number().int().positive().max(99),
});

const BodySchema = z.object({
  items: z.array(ItemSchema).min(1).max(50),
  total: z.number().positive(),
  clienteNombre: z.string().max(120).optional(),
  clienteTelefono: z.string().max(40).optional(),
});

export const POST: APIRoute = async ({ request, site }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'invalid_body', issues: parsed.error.flatten() }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  const { items, total, clienteNombre, clienteTelefono } = parsed.data;

  const computed = items.reduce((s, i) => s + i.precio * i.qty, 0);
  if (Math.abs(computed - total) > 0.5) {
    return new Response(JSON.stringify({ error: 'total_mismatch' }), { status: 400 });
  }

  let id: string;
  try {
    id = await createOrder({ items, total, clienteNombre, clienteTelefono });
  } catch (err) {
    console.error('createOrder failed', err);
    return new Response(JSON.stringify({ error: 'db_error' }), { status: 500 });
  }

  const phone = import.meta.env.WHATSAPP_PHONE ?? '';
  const siteUrl = site?.toString() ?? new URL(request.url).origin;
  const whatsappUrl = buildWhatsappUrl({
    phone,
    lines: items.map((i) => ({ ...i, imagen: undefined })),
    total,
    ordenId: id,
    siteUrl,
  });

  const orderUrl = `${siteUrl.replace(/\/$/, '')}/pedido/${id}`;

  return new Response(JSON.stringify({ id, whatsappUrl, orderUrl }), {
    status: 201,
    headers: { 'content-type': 'application/json' },
  });
};
