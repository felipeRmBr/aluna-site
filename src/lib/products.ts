import { db } from './db';
import type { VerticalColor } from './verticales';

export type ProductoImagen = {
  id: number;
  url: string;
  blobKey: string | null;
  orden: number;
};

export type ProductoColorCombinacion = {
  id: number;
  nombre: string;
  orden: number;
  activo: boolean;
  colores: VerticalColor[];
};

export type Producto = {
  slug: string;
  nombre: string;
  precio: number;
  descripcionCorta: string;
  descripcionMd: string | null;
  disponible: boolean;
  orden: number;
  sku: string | null;
  verticalSlug: string | null;
  createdAt: string;
  updatedAt: string;
  imagenes: ProductoImagen[];
  colecciones: string[];
  colorCombinaciones: ProductoColorCombinacion[];
};

export type ProductoSummary = Omit<Producto, 'descripcionMd' | 'imagenes' | 'colecciones' | 'colorCombinaciones'> & {
  imagen: string | null;
  colecciones: string[];
  colorCombinaciones: ProductoColorCombinacion[];
};

export type ProductoColorCombinacionInput = {
  nombre: string;
  colorIds: number[];
  orden?: number;
  activo?: boolean;
};

export type CreateProductoInput = {
  slug: string;
  nombre: string;
  precio: number;
  descripcionCorta: string;
  descripcionMd?: string | null;
  disponible?: boolean;
  orden?: number;
  sku?: string | null;
  colecciones?: string[];
  verticalSlug?: string | null;
  colorCombinaciones?: ProductoColorCombinacionInput[];
};

export type UpdateProductoInput = {
  nombre?: string;
  precio?: number;
  descripcionCorta?: string;
  descripcionMd?: string | null;
  disponible?: boolean;
  orden?: number;
  sku?: string | null;
  colecciones?: string[];
  verticalSlug?: string | null;
  colorCombinaciones?: ProductoColorCombinacionInput[];
};

function rowToImagen(r: Record<string, unknown>): ProductoImagen {
  return {
    id: Number(r.id),
    url: String(r.url),
    blobKey: r.blob_key ? String(r.blob_key) : null,
    orden: Number(r.orden),
  };
}

async function loadImagenes(slug: string): Promise<ProductoImagen[]> {
  const res = await db().execute({
    sql: `SELECT id, url, blob_key, orden FROM product_images
          WHERE producto_slug = ? ORDER BY orden ASC, id ASC`,
    args: [slug],
  });
  return res.rows.map(rowToImagen);
}

async function loadColecciones(slug: string): Promise<string[]> {
  const res = await db().execute({
    sql: `SELECT coleccion_slug FROM product_collections WHERE producto_slug = ?`,
    args: [slug],
  });
  return res.rows.map((r) => String(r.coleccion_slug));
}

async function loadColorCombinaciones(slug: string): Promise<ProductoColorCombinacion[]> {
  const combosRes = await db().execute({
    sql: `SELECT id, nombre, orden, activo
          FROM product_color_combinations
          WHERE producto_slug = ?
          ORDER BY orden ASC, id ASC`,
    args: [slug],
  });
  if (combosRes.rows.length === 0) return [];

  const ids = combosRes.rows.map((r) => Number(r.id));
  const placeholders = ids.map(() => '?').join(',');
  const colorsRes = await db().execute({
    sql: `SELECT pccc.combinacion_id, vc.id, vc.vertical_slug, vc.nombre, vc.hex, vc.orden,
                 vc.activo, vc.created_at, vc.updated_at, pccc.orden AS color_orden
          FROM product_color_combination_colors pccc
          JOIN vertical_colors vc ON vc.id = pccc.color_id
          WHERE pccc.combinacion_id IN (${placeholders})
          ORDER BY pccc.orden ASC, vc.orden ASC, vc.nombre ASC`,
    args: ids,
  });

  const colorsByCombo = new Map<number, VerticalColor[]>();
  for (const r of colorsRes.rows) {
    const comboId = Number(r.combinacion_id);
    const arr = colorsByCombo.get(comboId) ?? [];
    arr.push({
      id: Number(r.id),
      verticalSlug: String(r.vertical_slug),
      nombre: String(r.nombre),
      hex: r.hex ? String(r.hex) : null,
      orden: Number(r.orden),
      activo: Number(r.activo) === 1,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    });
    colorsByCombo.set(comboId, arr);
  }

  return combosRes.rows.map((r) => ({
    id: Number(r.id),
    nombre: String(r.nombre),
    orden: Number(r.orden),
    activo: Number(r.activo) === 1,
    colores: colorsByCombo.get(Number(r.id)) ?? [],
  }));
}

async function loadColorCombinacionesForSlugs(slugs: string[]): Promise<Map<string, ProductoColorCombinacion[]>> {
  const combosBySlug = new Map<string, ProductoColorCombinacion[]>();
  if (slugs.length === 0) return combosBySlug;

  const placeholders = slugs.map(() => '?').join(',');
  const combosRes = await db().execute({
    sql: `SELECT id, producto_slug, nombre, orden, activo
          FROM product_color_combinations
          WHERE producto_slug IN (${placeholders})
          ORDER BY orden ASC, id ASC`,
    args: slugs,
  });
  if (combosRes.rows.length === 0) return combosBySlug;

  const ids = combosRes.rows.map((r) => Number(r.id));
  const colorPlaceholders = ids.map(() => '?').join(',');
  const colorsRes = await db().execute({
    sql: `SELECT pccc.combinacion_id, vc.id, vc.vertical_slug, vc.nombre, vc.hex, vc.orden,
                 vc.activo, vc.created_at, vc.updated_at, pccc.orden AS color_orden
          FROM product_color_combination_colors pccc
          JOIN vertical_colors vc ON vc.id = pccc.color_id
          WHERE pccc.combinacion_id IN (${colorPlaceholders})
          ORDER BY pccc.orden ASC, vc.orden ASC, vc.nombre ASC`,
    args: ids,
  });

  const colorsByCombo = new Map<number, VerticalColor[]>();
  for (const r of colorsRes.rows) {
    const comboId = Number(r.combinacion_id);
    const arr = colorsByCombo.get(comboId) ?? [];
    arr.push({
      id: Number(r.id),
      verticalSlug: String(r.vertical_slug),
      nombre: String(r.nombre),
      hex: r.hex ? String(r.hex) : null,
      orden: Number(r.orden),
      activo: Number(r.activo) === 1,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    });
    colorsByCombo.set(comboId, arr);
  }

  for (const r of combosRes.rows) {
    const slug = String(r.producto_slug);
    const arr = combosBySlug.get(slug) ?? [];
    arr.push({
      id: Number(r.id),
      nombre: String(r.nombre),
      orden: Number(r.orden),
      activo: Number(r.activo) === 1,
      colores: colorsByCombo.get(Number(r.id)) ?? [],
    });
    combosBySlug.set(slug, arr);
  }

  return combosBySlug;
}

function rowToProducto(
  r: Record<string, unknown>,
  imagenes: ProductoImagen[],
  colecciones: string[],
  colorCombinaciones: ProductoColorCombinacion[] = [],
): Producto {
  return {
    slug: String(r.slug),
    nombre: String(r.nombre),
    precio: Number(r.precio),
    descripcionCorta: String(r.descripcion_corta),
    descripcionMd: r.descripcion_md ? String(r.descripcion_md) : null,
    disponible: Number(r.disponible) === 1,
    orden: Number(r.orden),
    sku: r.sku ? String(r.sku) : null,
    verticalSlug: r.vertical_slug ? String(r.vertical_slug) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    imagenes,
    colecciones,
    colorCombinaciones,
  };
}

export async function getProducto(slug: string): Promise<Producto | null> {
  const res = await db().execute({
    sql: `SELECT slug, nombre, precio, descripcion_corta, descripcion_md, disponible, orden, sku,
                 vertical_slug,
                 created_at, updated_at
          FROM products WHERE slug = ?`,
    args: [slug],
  });
  const row = res.rows[0];
  if (!row) return null;

  const [imagenes, colecciones, colorCombinaciones] = await Promise.all([
    loadImagenes(slug),
    loadColecciones(slug),
    loadColorCombinaciones(slug),
  ]);
  return rowToProducto(row, imagenes, colecciones, colorCombinaciones);
}

export type ListProductosOptions = {
  includeUnavailable?: boolean;
  coleccion?: string;
};

export async function listProductos(opts: ListProductosOptions = {}): Promise<Producto[]> {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (!opts.includeUnavailable) where.push('p.disponible = 1');
  if (opts.coleccion) {
    where.push(`p.slug IN (SELECT producto_slug FROM product_collections WHERE coleccion_slug = ?)`);
    args.push(opts.coleccion);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const res = await db().execute({
    sql: `SELECT p.slug, p.nombre, p.precio, p.descripcion_corta, p.descripcion_md,
                 p.disponible, p.orden, p.sku, p.vertical_slug, p.created_at, p.updated_at
          FROM products p
          ${whereSql}
          ORDER BY p.orden ASC, p.created_at DESC`,
    args,
  });

  if (res.rows.length === 0) return [];
  const slugs = res.rows.map((r) => String(r.slug));

  const placeholders = slugs.map(() => '?').join(',');
  const [imgsRes, colsRes, combosBySlug] = await Promise.all([
    db().execute({
      sql: `SELECT producto_slug, id, url, blob_key, orden
            FROM product_images
            WHERE producto_slug IN (${placeholders})
            ORDER BY orden ASC, id ASC`,
      args: slugs,
    }),
    db().execute({
      sql: `SELECT producto_slug, coleccion_slug
            FROM product_collections
            WHERE producto_slug IN (${placeholders})`,
      args: slugs,
    }),
    loadColorCombinacionesForSlugs(slugs),
  ]);

  const imgsBySlug = new Map<string, ProductoImagen[]>();
  for (const r of imgsRes.rows) {
    const s = String(r.producto_slug);
    const arr = imgsBySlug.get(s) ?? [];
    arr.push(rowToImagen(r));
    imgsBySlug.set(s, arr);
  }
  const colsBySlug = new Map<string, string[]>();
  for (const r of colsRes.rows) {
    const s = String(r.producto_slug);
    const arr = colsBySlug.get(s) ?? [];
    arr.push(String(r.coleccion_slug));
    colsBySlug.set(s, arr);
  }

  return res.rows.map((r) =>
    rowToProducto(
      r,
      imgsBySlug.get(String(r.slug)) ?? [],
      colsBySlug.get(String(r.slug)) ?? [],
      combosBySlug.get(String(r.slug)) ?? [],
    ),
  );
}

async function assertValidColorCombinaciones(
  verticalSlug: string | null | undefined,
  colorCombinaciones: ProductoColorCombinacionInput[],
): Promise<void> {
  if (colorCombinaciones.length === 0) return;
  if (!verticalSlug) throw new Error('color_combinations_require_vertical');

  const colorsRes = await db().execute({
    sql: `SELECT id FROM vertical_colors WHERE vertical_slug = ?`,
    args: [verticalSlug],
  });
  const allowed = new Set(colorsRes.rows.map((r) => Number(r.id)));
  for (const combo of colorCombinaciones) {
    const ids = combo.colorIds.filter((id) => Number.isInteger(id));
    if (ids.length < 1 || ids.length > 4) throw new Error('invalid_color_combination_size');
    for (const id of ids) {
      if (!allowed.has(id)) throw new Error('invalid_color_for_vertical');
    }
  }
}

async function replaceColorCombinaciones(
  tx: { execute: (stmt: { sql: string; args: unknown[] }) => Promise<{ lastInsertRowid?: bigint | number | null }> },
  slug: string,
  verticalSlug: string | null | undefined,
  colorCombinaciones: ProductoColorCombinacionInput[],
): Promise<void> {
  await assertValidColorCombinaciones(verticalSlug, colorCombinaciones);
  const now = new Date().toISOString();
  await tx.execute({
    sql: `DELETE FROM product_color_combinations WHERE producto_slug = ?`,
    args: [slug],
  });
  for (let i = 0; i < colorCombinaciones.length; i++) {
    const combo = colorCombinaciones[i];
    const cleanColorIds = combo.colorIds
      .map((id) => Number(id))
      .filter((id, index, arr) => Number.isInteger(id) && arr.indexOf(id) === index)
      .slice(0, 4);
    if (cleanColorIds.length === 0) continue;
    const res = await tx.execute({
      sql: `INSERT INTO product_color_combinations
            (producto_slug, nombre, orden, activo, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        slug,
        combo.nombre.trim() || cleanColorIds.join(' + '),
        combo.orden ?? i,
        combo.activo === false ? 0 : 1,
        now,
        now,
      ],
    });
    const comboId = Number(res.lastInsertRowid);
    for (let j = 0; j < cleanColorIds.length; j++) {
      await tx.execute({
        sql: `INSERT INTO product_color_combination_colors
              (combinacion_id, color_id, orden)
              VALUES (?, ?, ?)`,
        args: [comboId, cleanColorIds[j], j],
      });
    }
  }
}

export async function createProducto(input: CreateProductoInput): Promise<void> {
  const now = new Date().toISOString();
  const tx = await db().transaction('write');
  try {
    await tx.execute({
      sql: `INSERT INTO products
            (slug, nombre, precio, descripcion_corta, descripcion_md,
             disponible, orden, sku, vertical_slug, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        input.slug,
        input.nombre,
        input.precio,
        input.descripcionCorta,
        input.descripcionMd ?? null,
        input.disponible === false ? 0 : 1,
        input.orden ?? 0,
        input.sku ?? null,
        input.verticalSlug ?? null,
        now,
        now,
      ],
    });

    for (const c of input.colecciones ?? []) {
      await tx.execute({
        sql: `INSERT INTO product_collections (producto_slug, coleccion_slug) VALUES (?, ?)`,
        args: [input.slug, c],
      });
    }

    if (input.colorCombinaciones !== undefined) {
      await replaceColorCombinaciones(
        tx,
        input.slug,
        input.verticalSlug ?? null,
        input.colorCombinaciones,
      );
    }

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function updateProducto(slug: string, input: UpdateProductoInput): Promise<void> {
  const now = new Date().toISOString();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  if (input.nombre !== undefined) { sets.push('nombre = ?'); args.push(input.nombre); }
  if (input.precio !== undefined) { sets.push('precio = ?'); args.push(input.precio); }
  if (input.descripcionCorta !== undefined) { sets.push('descripcion_corta = ?'); args.push(input.descripcionCorta); }
  if (input.descripcionMd !== undefined) { sets.push('descripcion_md = ?'); args.push(input.descripcionMd); }
  if (input.disponible !== undefined) { sets.push('disponible = ?'); args.push(input.disponible ? 1 : 0); }
  if (input.orden !== undefined) { sets.push('orden = ?'); args.push(input.orden); }
  if (input.sku !== undefined) { sets.push('sku = ?'); args.push(input.sku); }
  if (input.verticalSlug !== undefined) { sets.push('vertical_slug = ?'); args.push(input.verticalSlug); }

  const tx = await db().transaction('write');
  try {
    if (sets.length > 0) {
      sets.push('updated_at = ?');
      args.push(now);
      args.push(slug);
      await tx.execute({
        sql: `UPDATE products SET ${sets.join(', ')} WHERE slug = ?`,
        args,
      });
    }

    if (input.colecciones !== undefined) {
      await tx.execute({
        sql: `DELETE FROM product_collections WHERE producto_slug = ?`,
        args: [slug],
      });
      for (const c of input.colecciones) {
        await tx.execute({
          sql: `INSERT INTO product_collections (producto_slug, coleccion_slug) VALUES (?, ?)`,
          args: [slug, c],
        });
      }
    }

    if (input.colorCombinaciones !== undefined) {
      const verticalSlug = input.verticalSlug !== undefined
        ? input.verticalSlug
        : (await getProducto(slug))?.verticalSlug ?? null;
      await replaceColorCombinaciones(tx, slug, verticalSlug, input.colorCombinaciones);
    }

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function setDisponible(slug: string, disponible: boolean): Promise<void> {
  await updateProducto(slug, { disponible });
}

export async function addImagen(
  slug: string,
  input: { url: string; blobKey?: string | null },
): Promise<number> {
  const maxRes = await db().execute({
    sql: `SELECT COALESCE(MAX(orden), -1) AS max_orden FROM product_images WHERE producto_slug = ?`,
    args: [slug],
  });
  const nextOrden = Number(maxRes.rows[0]?.max_orden ?? -1) + 1;
  const res = await db().execute({
    sql: `INSERT INTO product_images (producto_slug, url, blob_key, orden) VALUES (?, ?, ?, ?)`,
    args: [slug, input.url, input.blobKey ?? null, nextOrden],
  });
  return Number(res.lastInsertRowid);
}

export async function removeImagen(slug: string, imagenId: number): Promise<string | null> {
  const res = await db().execute({
    sql: `SELECT blob_key FROM product_images WHERE id = ? AND producto_slug = ?`,
    args: [imagenId, slug],
  });
  const blobKey = res.rows[0]?.blob_key ? String(res.rows[0].blob_key) : null;
  await db().execute({
    sql: `DELETE FROM product_images WHERE id = ? AND producto_slug = ?`,
    args: [imagenId, slug],
  });
  return blobKey;
}

export async function reorderImagenes(slug: string, orderedIds: number[]): Promise<void> {
  const tx = await db().transaction('write');
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.execute({
        sql: `UPDATE product_images SET orden = ? WHERE id = ? AND producto_slug = ?`,
        args: [i, orderedIds[i], slug],
      });
    }
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function slugExists(slug: string): Promise<boolean> {
  const res = await db().execute({
    sql: `SELECT 1 FROM products WHERE slug = ? LIMIT 1`,
    args: [slug],
  });
  return res.rows.length > 0;
}
