import { formatMXN } from './money';
import type { CartLine } from '../stores/cart';

export type WhatsappArgs = {
  phone: string;
  lines: CartLine[];
  total: number;
  ordenId: string;
  siteUrl: string;
};

export function buildWhatsappUrl({ phone, lines, total, ordenId, siteUrl }: WhatsappArgs): string {
  const lineas = lines
    .map((l) => `• ${l.nombre} ×${l.qty} — ${formatMXN(l.precio * l.qty)}`)
    .join('\n');

  const url = `${siteUrl.replace(/\/$/, '')}/pedido/${ordenId}`;

  const msg =
    `Hola ALUNA, me gustaría hacer este pedido:\n\n` +
    `${lineas}\n\n` +
    `Total: ${formatMXN(total)}\n\n` +
    `Seguimiento: ${url}`;

  const cleanPhone = phone.replace(/[^\d]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}
