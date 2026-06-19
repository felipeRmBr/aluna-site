import { db } from './db';

export type ProductoImagen = {
  id: number;
  url: string;
  blobKey: string | null;
  orden: number;
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
  createdAt: string;
  updatedAt: string;
  imagenes: ProductoImagen[];
  colecciones: string[];
};

export type ProductoSummary = Omit<Producto, 'descripcionMd' | 'imagenes' | 'colecciones'> & {
  imagen: string | null;
  colecciones: string[];
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
    sql: `SELECT id, url, blob_key, orden FROM producto_imagenes
          WHERE producto_slug = ? ORDER BY orden ASC, id ASC`,
    args: [slug],
  });
  return res.rows.map(rowToImagen);
}

async function loadColecciones(slug: string): Promise<string[]> {
  const res = await db().execute({
    sql: `SELECT coleccion_slug FROM producto_colecciones WHERE producto_slug = ?`,
    args: [slug],
  });
  return res.rows.map((r) => String(r.coleccion_slug));
}

function rowToProducto(
  r: Record<string, unknown>,
  imagenes: ProductoImagen[],
  colecciones: string[],
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
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    imagenes,
    colecciones,
  };
}

export async function getProducto(slug: string): Promise<Producto | null> {
  const res = await db().execute({
    sql: `SELECT slug, nombre, precio, descripcion_corta, descripcion_md, disponible, orden, sku,
                 created_at, updated_at
          FROM productos WHERE slug = ?`,
    args: [slug],
  });
  const row = res.rows[0];
  if (!row) return null;

  const [imagenes, colecciones] = await Promise.all([
    loadImagenes(slug),
    loadColecciones(slug),
  ]);
  return rowToProducto(row, imagenes, colecciones);
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
    where.push(`p.slug IN (SELECT producto_slug FROM producto_colecciones WHERE coleccion_slug = ?)`);
    args.push(opts.coleccion);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const res = await db().execute({
    sql: `SELECT p.slug, p.nombre, p.precio, p.descripcion_corta, p.descripcion_md,
                 p.disponible, p.orden, p.sku, p.created_at, p.updated_at
          FROM productos p
          ${whereSql}
          ORDER BY p.orden ASC, p.created_at DESC`,
    args,
  });

  if (res.rows.length === 0) return [];
  const slugs = res.rows.map((r) => String(r.slug));

  const placeholders = slugs.map(() => '?').join(',');
  const [imgsRes, colsRes] = await Promise.all([
    db().execute({
      sql: `SELECT producto_slug, id, url, blob_key, orden
            FROM producto_imagenes
            WHERE producto_slug IN (${placeholders})
            ORDER BY orden ASC, id ASC`,
      args: slugs,
    }),
    db().execute({
      sql: `SELECT producto_slug, coleccion_slug
            FROM producto_colecciones
            WHERE producto_slug IN (${placeholders})`,
      args: slugs,
    }),
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
    rowToProducto(r, imgsBySlug.get(String(r.slug)) ?? [], colsBySlug.get(String(r.slug)) ?? []),
  );
}

export async function createProducto(input: CreateProductoInput): Promise<void> {
  const now = new Date().toISOString();
  const tx = await db().transaction('write');
  try {
    await tx.execute({
      sql: `INSERT INTO productos
            (slug, nombre, precio, descripcion_corta, descripcion_md,
             disponible, orden, sku, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        input.slug,
        input.nombre,
        input.precio,
        input.descripcionCorta,
        input.descripcionMd ?? null,
        input.disponible === false ? 0 : 1,
        input.orden ?? 0,
        input.sku ?? null,
        now,
        now,
      ],
    });

    for (const c of input.colecciones ?? []) {
      await tx.execute({
        sql: `INSERT INTO producto_colecciones (producto_slug, coleccion_slug) VALUES (?, ?)`,
        args: [input.slug, c],
      });
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

  const tx = await db().transaction('write');
  try {
    if (sets.length > 0) {
      sets.push('updated_at = ?');
      args.push(now);
      args.push(slug);
      await tx.execute({
        sql: `UPDATE productos SET ${sets.join(', ')} WHERE slug = ?`,
        args,
      });
    }

    if (input.colecciones !== undefined) {
      await tx.execute({
        sql: `DELETE FROM producto_colecciones WHERE producto_slug = ?`,
        args: [slug],
      });
      for (const c of input.colecciones) {
        await tx.execute({
          sql: `INSERT INTO producto_colecciones (producto_slug, coleccion_slug) VALUES (?, ?)`,
          args: [slug, c],
        });
      }
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
    sql: `SELECT COALESCE(MAX(orden), -1) AS max_orden FROM producto_imagenes WHERE producto_slug = ?`,
    args: [slug],
  });
  const nextOrden = Number(maxRes.rows[0]?.max_orden ?? -1) + 1;
  const res = await db().execute({
    sql: `INSERT INTO producto_imagenes (producto_slug, url, blob_key, orden) VALUES (?, ?, ?, ?)`,
    args: [slug, input.url, input.blobKey ?? null, nextOrden],
  });
  return Number(res.lastInsertRowid);
}

export async function removeImagen(slug: string, imagenId: number): Promise<string | null> {
  const res = await db().execute({
    sql: `SELECT blob_key FROM producto_imagenes WHERE id = ? AND producto_slug = ?`,
    args: [imagenId, slug],
  });
  const blobKey = res.rows[0]?.blob_key ? String(res.rows[0].blob_key) : null;
  await db().execute({
    sql: `DELETE FROM producto_imagenes WHERE id = ? AND producto_slug = ?`,
    args: [imagenId, slug],
  });
  return blobKey;
}

export async function reorderImagenes(slug: string, orderedIds: number[]): Promise<void> {
  const tx = await db().transaction('write');
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.execute({
        sql: `UPDATE producto_imagenes SET orden = ? WHERE id = ? AND producto_slug = ?`,
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
    sql: `SELECT 1 FROM productos WHERE slug = ? LIMIT 1`,
    args: [slug],
  });
  return res.rows.length > 0;
}
