import { db } from './db';

export type ProductLineColor = {
  id: number;
  productLineSlug: string;
  nombre: string;
  hex: string | null;
  orden: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductLine = {
  slug: string;
  nombre: string;
  orden: number;
  createdAt: string;
  updatedAt: string;
  colores: ProductLineColor[];
};

export type CreateProductLineInput = {
  slug: string;
  nombre: string;
  orden?: number;
};

export type UpdateProductLineInput = {
  nombre?: string;
  orden?: number;
};

export type CreateProductLineColorInput = {
  nombre: string;
  hex?: string | null;
  orden?: number;
  activo?: boolean;
};

export type UpdateProductLineColorInput = {
  nombre?: string;
  hex?: string | null;
  orden?: number;
  activo?: boolean;
};

function rowToColor(r: Record<string, unknown>): ProductLineColor {
  return {
    id: Number(r.id),
    productLineSlug: String(r.product_line_slug),
    nombre: String(r.nombre),
    hex: r.hex ? String(r.hex) : null,
    orden: Number(r.orden),
    activo: Number(r.activo) === 1,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function rowToProductLine(r: Record<string, unknown>, colores: ProductLineColor[] = []): ProductLine {
  return {
    slug: String(r.slug),
    nombre: String(r.nombre),
    orden: Number(r.orden),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    colores,
  };
}

export async function listProductLines(): Promise<ProductLine[]> {
  const res = await db().execute({
    sql: `SELECT slug, nombre, orden, created_at, updated_at
          FROM product_lines
          ORDER BY orden ASC, nombre ASC`,
    args: [],
  });
  if (res.rows.length === 0) return [];

  const slugs = res.rows.map((r) => String(r.slug));
  const placeholders = slugs.map(() => '?').join(',');
  const colorsRes = await db().execute({
    sql: `SELECT id, product_line_slug, nombre, hex, orden, activo, created_at, updated_at
          FROM product_line_colors
          WHERE product_line_slug IN (${placeholders})
          ORDER BY orden ASC, nombre ASC`,
    args: slugs,
  });

  const colorsByProductLine = new Map<string, ProductLineColor[]>();
  for (const r of colorsRes.rows) {
    const color = rowToColor(r);
    const arr = colorsByProductLine.get(color.productLineSlug) ?? [];
    arr.push(color);
    colorsByProductLine.set(color.productLineSlug, arr);
  }

  return res.rows.map((r) => rowToProductLine(r, colorsByProductLine.get(String(r.slug)) ?? []));
}

export async function getProductLine(slug: string): Promise<ProductLine | null> {
  const res = await db().execute({
    sql: `SELECT slug, nombre, orden, created_at, updated_at
          FROM product_lines WHERE slug = ?`,
    args: [slug],
  });
  const row = res.rows[0];
  if (!row) return null;
  return rowToProductLine(row, await listProductLineColors(slug, { includeInactive: true }));
}

export async function createProductLine(input: CreateProductLineInput): Promise<void> {
  const now = new Date().toISOString();
  await db().execute({
    sql: `INSERT INTO product_lines (slug, nombre, orden, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [input.slug, input.nombre, input.orden ?? 0, now, now],
  });
}

export async function updateProductLine(slug: string, input: UpdateProductLineInput): Promise<void> {
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (input.nombre !== undefined) { sets.push('nombre = ?'); args.push(input.nombre); }
  if (input.orden !== undefined) { sets.push('orden = ?'); args.push(input.orden); }
  if (sets.length === 0) return;
  sets.push('updated_at = ?');
  args.push(new Date().toISOString());
  args.push(slug);
  await db().execute({
    sql: `UPDATE product_lines SET ${sets.join(', ')} WHERE slug = ?`,
    args,
  });
}

export async function deleteProductLine(slug: string): Promise<void> {
  await db().execute({ sql: `DELETE FROM product_lines WHERE slug = ?`, args: [slug] });
}

export async function productLineSlugExists(slug: string): Promise<boolean> {
  const res = await db().execute({
    sql: `SELECT 1 FROM product_lines WHERE slug = ? LIMIT 1`,
    args: [slug],
  });
  return res.rows.length > 0;
}

export async function listProductLineColors(
  productLineSlug: string,
  opts: { includeInactive?: boolean } = {},
): Promise<ProductLineColor[]> {
  const where = opts.includeInactive ? '' : 'AND activo = 1';
  const res = await db().execute({
    sql: `SELECT id, product_line_slug, nombre, hex, orden, activo, created_at, updated_at
          FROM product_line_colors
          WHERE product_line_slug = ? ${where}
          ORDER BY orden ASC, nombre ASC`,
    args: [productLineSlug],
  });
  return res.rows.map(rowToColor);
}

export async function createProductLineColor(
  productLineSlug: string,
  input: CreateProductLineColorInput,
): Promise<number> {
  const now = new Date().toISOString();
  const res = await db().execute({
    sql: `INSERT INTO product_line_colors
          (product_line_slug, nombre, hex, orden, activo, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      productLineSlug,
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

export async function updateProductLineColor(
  id: number,
  input: UpdateProductLineColorInput,
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
    sql: `UPDATE product_line_colors SET ${sets.join(', ')} WHERE id = ?`,
    args,
  });
}

export async function deleteProductLineColor(id: number): Promise<void> {
  await db().execute({ sql: `DELETE FROM product_line_colors WHERE id = ?`, args: [id] });
}
