import { formatMXN } from './money';

export type WhatsappLine = {
  nombre: string;
  precio: number;
  qty: number;
  colorCombinationNombre?: string | null;
};

export type WhatsappArgs = {
  phone: string;
  lines: WhatsappLine[];
  total: number;
  ordenId: string;
  siteUrl: string;
};

export function buildWhatsappUrl({ phone, lines, total, ordenId, siteUrl }: WhatsappArgs): string {
  const lineas = lines
    .map((l) => {
      const color = l.colorCombinationNombre ? ` (${l.colorCombinationNombre})` : '';
      return `• ${l.nombre}${color} ×${l.qty} — ${formatMXN(l.precio * l.qty)}`;
    })
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
