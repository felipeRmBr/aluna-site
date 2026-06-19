import { db } from './db';

export type Coleccion = {
  slug: string;
  nombre: string;
  descripcion: string;
  descripcionMd: string | null;
  hero: string | null;
  orden: number;
  destacada: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateColeccionInput = {
  slug: string;
  nombre: string;
  descripcion: string;
  descripcionMd?: string | null;
  hero?: string | null;
  orden?: number;
  destacada?: boolean;
};

export type UpdateColeccionInput = {
  nombre?: string;
  descripcion?: string;
  descripcionMd?: string | null;
  hero?: string | null;
  orden?: number;
  destacada?: boolean;
};

function rowToColeccion(r: Record<string, unknown>): Coleccion {
  return {
    slug: String(r.slug),
    nombre: String(r.nombre),
    descripcion: String(r.descripcion),
    descripcionMd: r.descripcion_md ? String(r.descripcion_md) : null,
    hero: r.hero ? String(r.hero) : null,
    orden: Number(r.orden),
    destacada: Number(r.destacada) === 1,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export async function listColecciones(opts: { destacadasOnly?: boolean } = {}): Promise<Coleccion[]> {
  const where = opts.destacadasOnly ? 'WHERE destacada = 1' : '';
  const res = await db().execute({
    sql: `SELECT slug, nombre, descripcion, descripcion_md, hero, orden, destacada,
                 created_at, updated_at
          FROM colecciones
          ${where}
          ORDER BY orden ASC, nombre ASC`,
    args: [],
  });
  return res.rows.map(rowToColeccion);
}

export async function getColeccion(slug: string): Promise<Coleccion | null> {
  const res = await db().execute({
    sql: `SELECT slug, nombre, descripcion, descripcion_md, hero, orden, destacada,
                 created_at, updated_at
          FROM colecciones WHERE slug = ?`,
    args: [slug],
  });
  const row = res.rows[0];
  return row ? rowToColeccion(row) : null;
}

export async function createColeccion(input: CreateColeccionInput): Promise<void> {
  const now = new Date().toISOString();
  await db().execute({
    sql: `INSERT INTO colecciones
          (slug, nombre, descripcion, descripcion_md, hero, orden, destacada, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.slug,
      input.nombre,
      input.descripcion,
      input.descripcionMd ?? null,
      input.hero ?? null,
      input.orden ?? 0,
      input.destacada ? 1 : 0,
      now,
      now,
    ],
  });
}

export async function updateColeccion(slug: string, input: UpdateColeccionInput): Promise<void> {
  const now = new Date().toISOString();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  if (input.nombre !== undefined) { sets.push('nombre = ?'); args.push(input.nombre); }
  if (input.descripcion !== undefined) { sets.push('descripcion = ?'); args.push(input.descripcion); }
  if (input.descripcionMd !== undefined) { sets.push('descripcion_md = ?'); args.push(input.descripcionMd); }
  if (input.hero !== undefined) { sets.push('hero = ?'); args.push(input.hero); }
  if (input.orden !== undefined) { sets.push('orden = ?'); args.push(input.orden); }
  if (input.destacada !== undefined) { sets.push('destacada = ?'); args.push(input.destacada ? 1 : 0); }

  if (sets.length === 0) return;
  sets.push('updated_at = ?');
  args.push(now);
  args.push(slug);

  await db().execute({
    sql: `UPDATE colecciones SET ${sets.join(', ')} WHERE slug = ?`,
    args,
  });
}

export async function deleteColeccion(slug: string): Promise<void> {
  await db().execute({
    sql: `DELETE FROM colecciones WHERE slug = ?`,
    args: [slug],
  });
}

export async function coleccionSlugExists(slug: string): Promise<boolean> {
  const res = await db().execute({
    sql: `SELECT 1 FROM colecciones WHERE slug = ? LIMIT 1`,
    args: [slug],
  });
  return res.rows.length > 0;
}
