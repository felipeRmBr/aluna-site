import { db } from './db';

export type VerticalColor = {
  id: number;
  verticalSlug: string;
  nombre: string;
  hex: string | null;
  orden: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Vertical = {
  slug: string;
  nombre: string;
  orden: number;
  createdAt: string;
  updatedAt: string;
  colores: VerticalColor[];
};

export type CreateVerticalInput = {
  slug: string;
  nombre: string;
  orden?: number;
};

export type UpdateVerticalInput = {
  nombre?: string;
  orden?: number;
};

export type CreateVerticalColorInput = {
  nombre: string;
  hex?: string | null;
  orden?: number;
  activo?: boolean;
};

export type UpdateVerticalColorInput = {
  nombre?: string;
  hex?: string | null;
  orden?: number;
  activo?: boolean;
};

function rowToColor(r: Record<string, unknown>): VerticalColor {
  return {
    id: Number(r.id),
    verticalSlug: String(r.vertical_slug),
    nombre: String(r.nombre),
    hex: r.hex ? String(r.hex) : null,
    orden: Number(r.orden),
    activo: Number(r.activo) === 1,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function rowToVertical(r: Record<string, unknown>, colores: VerticalColor[] = []): Vertical {
  return {
    slug: String(r.slug),
    nombre: String(r.nombre),
    orden: Number(r.orden),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    colores,
  };
}

export async function listVerticales(): Promise<Vertical[]> {
  const res = await db().execute({
    sql: `SELECT slug, nombre, orden, created_at, updated_at
          FROM product_verticals
          ORDER BY orden ASC, nombre ASC`,
    args: [],
  });
  if (res.rows.length === 0) return [];

  const slugs = res.rows.map((r) => String(r.slug));
  const placeholders = slugs.map(() => '?').join(',');
  const colorsRes = await db().execute({
    sql: `SELECT id, vertical_slug, nombre, hex, orden, activo, created_at, updated_at
          FROM vertical_colors
          WHERE vertical_slug IN (${placeholders})
          ORDER BY orden ASC, nombre ASC`,
    args: slugs,
  });

  const colorsByVertical = new Map<string, VerticalColor[]>();
  for (const r of colorsRes.rows) {
    const color = rowToColor(r);
    const arr = colorsByVertical.get(color.verticalSlug) ?? [];
    arr.push(color);
    colorsByVertical.set(color.verticalSlug, arr);
  }

  return res.rows.map((r) => rowToVertical(r, colorsByVertical.get(String(r.slug)) ?? []));
}

export async function getVertical(slug: string): Promise<Vertical | null> {
  const res = await db().execute({
    sql: `SELECT slug, nombre, orden, created_at, updated_at
          FROM product_verticals WHERE slug = ?`,
    args: [slug],
  });
  const row = res.rows[0];
  if (!row) return null;
  return rowToVertical(row, await listVerticalColors(slug, { includeInactive: true }));
}

export async function createVertical(input: CreateVerticalInput): Promise<void> {
  const now = new Date().toISOString();
  await db().execute({
    sql: `INSERT INTO product_verticals (slug, nombre, orden, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [input.slug, input.nombre, input.orden ?? 0, now, now],
  });
}

export async function updateVertical(slug: string, input: UpdateVerticalInput): Promise<void> {
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (input.nombre !== undefined) { sets.push('nombre = ?'); args.push(input.nombre); }
  if (input.orden !== undefined) { sets.push('orden = ?'); args.push(input.orden); }
  if (sets.length === 0) return;
  sets.push('updated_at = ?');
  args.push(new Date().toISOString());
  args.push(slug);
  await db().execute({
    sql: `UPDATE product_verticals SET ${sets.join(', ')} WHERE slug = ?`,
    args,
  });
}

export async function deleteVertical(slug: string): Promise<void> {
  await db().execute({ sql: `DELETE FROM product_verticals WHERE slug = ?`, args: [slug] });
}

export async function verticalSlugExists(slug: string): Promise<boolean> {
  const res = await db().execute({
    sql: `SELECT 1 FROM product_verticals WHERE slug = ? LIMIT 1`,
    args: [slug],
  });
  return res.rows.length > 0;
}

export async function listVerticalColors(
  verticalSlug: string,
  opts: { includeInactive?: boolean } = {},
): Promise<VerticalColor[]> {
  const where = opts.includeInactive ? '' : 'AND activo = 1';
  const res = await db().execute({
    sql: `SELECT id, vertical_slug, nombre, hex, orden, activo, created_at, updated_at
          FROM vertical_colors
          WHERE vertical_slug = ? ${where}
          ORDER BY orden ASC, nombre ASC`,
    args: [verticalSlug],
  });
  return res.rows.map(rowToColor);
}

export async function createVerticalColor(
  verticalSlug: string,
  input: CreateVerticalColorInput,
): Promise<number> {
  const now = new Date().toISOString();
  const res = await db().execute({
    sql: `INSERT INTO vertical_colors
          (vertical_slug, nombre, hex, orden, activo, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      verticalSlug,
      input.nombre,
      input.hex ?? null,
      input.orden ?? 0,
      input.activo === false ? 0 : 1,
      now,
      now,
    ],
  });
  return Number(res.lastInsertRowid);
}

export async function updateVerticalColor(
  id: number,
  input: UpdateVerticalColorInput,
): Promise<void> {
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  if (input.nombre !== undefined) { sets.push('nombre = ?'); args.push(input.nombre); }
  if (input.hex !== undefined) { sets.push('hex = ?'); args.push(input.hex); }
  if (input.orden !== undefined) { sets.push('orden = ?'); args.push(input.orden); }
  if (input.activo !== undefined) { sets.push('activo = ?'); args.push(input.activo ? 1 : 0); }
  if (sets.length === 0) return;
  sets.push('updated_at = ?');
  args.push(new Date().toISOString());
  args.push(id);
  await db().execute({
    sql: `UPDATE vertical_colors SET ${sets.join(', ')} WHERE id = ?`,
    args,
  });
}

export async function deleteVerticalColor(id: number): Promise<void> {
  await db().execute({ sql: `DELETE FROM vertical_colors WHERE id = ?`, args: [id] });
}
