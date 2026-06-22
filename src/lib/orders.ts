import { customAlphabet } from 'nanoid';
import { db, ORDER_STATE_LABELS, type OrderState } from './db';

const newId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 12);

export type OrderItem = {
  slug: string;
  nombre: string;
  precio: number;
  qty: number;
  colorCombinationId?: number | null;
  colorCombinationNombre?: string | null;
};

export type CreateOrderInput = {
  items: OrderItem[];
  total: number;
  clienteNombre?: string;
  clienteTelefono?: string;
};

export type Order = {
  id: string;
  estado: OrderState;
  estadoLabel: string;
  nota: string | null;
  tracking: string | null;
  total: number;
  clienteNombre: string | null;
  clienteTelefono: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

export async function createOrder(input: CreateOrderInput): Promise<string> {
  const id = newId();
  const now = new Date().toISOString();

  const tx = await db().transaction('write');
  try {
    await tx.execute({
      sql: `INSERT INTO orders (id, estado, total, cliente_nombre, cliente_telefono, created_at, updated_at)
            VALUES (?, 'nuevo', ?, ?, ?, ?, ?)`,
      args: [
        id,
        input.total,
        input.clienteNombre ?? null,
        input.clienteTelefono ?? null,
        now,
        now,
      ],
    });

    for (const item of input.items) {
      await tx.execute({
        sql: `INSERT INTO order_items
              (order_id, slug, nombre, precio, qty, color_combination_id, color_combination_nombre)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          item.slug,
          item.nombre,
          item.precio,
          item.qty,
          item.colorCombinationId ?? null,
          item.colorCombinationNombre ?? null,
        ],
      });
    }

    await tx.execute({
      sql: `INSERT INTO order_status_history (order_id, estado, at) VALUES (?, 'nuevo', ?)`,
      args: [id, now],
    });

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  return id;
}

export async function getOrder(id: string): Promise<Order | null> {
  const orderRes = await db().execute({
    sql: `SELECT id, estado, nota, tracking, total, cliente_nombre, cliente_telefono, created_at, updated_at
          FROM orders WHERE id = ?`,
    args: [id],
  });
  const row = orderRes.rows[0];
  if (!row) return null;

  const itemsRes = await db().execute({
    sql: `SELECT slug, nombre, precio, qty, color_combination_id, color_combination_nombre
          FROM order_items WHERE order_id = ? ORDER BY rowid`,
    args: [id],
  });

  const items: OrderItem[] = itemsRes.rows.map((r) => ({
    slug: String(r.slug),
    nombre: String(r.nombre),
    precio: Number(r.precio),
    qty: Number(r.qty),
    colorCombinationId: r.color_combination_id ? Number(r.color_combination_id) : null,
    colorCombinationNombre: r.color_combination_nombre ? String(r.color_combination_nombre) : null,
  }));

  const estado = String(row.estado) as OrderState;

  return {
    id: String(row.id),
    estado,
    estadoLabel: ORDER_STATE_LABELS[estado] ?? estado,
    nota: row.nota ? String(row.nota) : null,
    tracking: row.tracking ? String(row.tracking) : null,
    total: Number(row.total),
    clienteNombre: row.cliente_nombre ? String(row.cliente_nombre) : null,
    clienteTelefono: row.cliente_telefono ? String(row.cliente_telefono) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    items,
  };
}

export async function listOrders(): Promise<Order[]> {
  const res = await db().execute({
    sql: `SELECT id FROM orders ORDER BY created_at DESC LIMIT 200`,
    args: [],
  });
  const orders = await Promise.all(res.rows.map((r) => getOrder(String(r.id))));
  return orders.filter((o): o is Order => o !== null);
}

export type UpdateOrderInput = {
  estado?: OrderState;
  nota?: string | null;
  tracking?: string | null;
};

export async function updateOrder(id: string, input: UpdateOrderInput): Promise<void> {
  const now = new Date().toISOString();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  if (input.estado !== undefined) { sets.push('estado = ?'); args.push(input.estado); }
  if (input.nota !== undefined) { sets.push('nota = ?'); args.push(input.nota); }
  if (input.tracking !== undefined) { sets.push('tracking = ?'); args.push(input.tracking); }
  sets.push('updated_at = ?'); args.push(now);
  args.push(id);

  await db().execute({
    sql: `UPDATE orders SET ${sets.join(', ')} WHERE id = ?`,
    args,
  });

  if (input.estado !== undefined) {
    await db().execute({
      sql: `INSERT INTO order_status_history (order_id, estado, at) VALUES (?, ?, ?)`,
      args: [id, input.estado, now],
    });
  }
}

export async function getStatusHistory(id: string): Promise<{ estado: OrderState; at: string }[]> {
  const res = await db().execute({
    sql: `SELECT estado, at FROM order_status_history WHERE order_id = ? ORDER BY at ASC`,
    args: [id],
  });
  return res.rows.map((r) => ({ estado: String(r.estado) as OrderState, at: String(r.at) }));
}
