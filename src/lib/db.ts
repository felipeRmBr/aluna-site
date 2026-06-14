import { createClient, type Client } from '@libsql/client';

let _client: Client | null = null;

export function db(): Client {
  if (_client) return _client;

  const url = import.meta.env.TURSO_DATABASE_URL;
  const authToken = import.meta.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('TURSO_DATABASE_URL is not set. See README for setup.');
  }

  _client = createClient({ url, authToken });
  return _client;
}

export const ORDER_STATES = [
  'nuevo',
  'confirmado',
  'preparando',
  'enviado',
  'entregado',
  'cancelado',
] as const;

export type OrderState = (typeof ORDER_STATES)[number];

export const ORDER_STATE_LABELS: Record<OrderState, string> = {
  nuevo: 'Nuevo',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};
