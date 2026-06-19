#!/usr/bin/env node
import { createClient } from '@libsql/client';
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentDir = join(__dirname, '..', 'src', 'content');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error('TURSO_DATABASE_URL is not set.');
  process.exit(1);
}
const db = createClient({ url, authToken });

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error('No frontmatter');
  const fmRaw = m[1];
  const body = m[2].trim();

  const data = {};
  const lines = fmRaw.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kv) { i++; continue; }
    const key = kv[1];
    let val = kv[2];

    if (val === '') {
      const arr = [];
      i++;
      while (i < lines.length && lines[i].startsWith('  - ')) {
        arr.push(lines[i].slice(4).trim());
        i++;
      }
      data[key] = arr;
      continue;
    }

    if (val === 'true') data[key] = true;
    else if (val === 'false') data[key] = false;
    else if (/^-?\d+(\.\d+)?$/.test(val)) data[key] = Number(val);
    else data[key] = val;
    i++;
  }
  return { data, body };
}

async function seedColecciones() {
  const dir = join(contentDir, 'colecciones');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
  const now = new Date().toISOString();
  let inserted = 0;
  for (const f of files) {
    const slug = basename(f, '.md');
    const raw = await readFile(join(dir, f), 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const existing = await db.execute({
      sql: `SELECT 1 FROM colecciones WHERE slug = ?`,
      args: [slug],
    });
    if (existing.rows.length > 0) {
      console.log(`  skip coleccion ${slug} (already exists)`);
      continue;
    }
    await db.execute({
      sql: `INSERT INTO colecciones
            (slug, nombre, descripcion, descripcion_md, hero, orden, destacada, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        slug,
        data.nombre,
        data.descripcion,
        body || null,
        data.hero ?? null,
        data.orden ?? 0,
        data.destacada ? 1 : 0,
        now,
        now,
      ],
    });
    inserted++;
    console.log(`  + coleccion ${slug}`);
  }
  console.log(`Colecciones: ${inserted} inserted.`);
}

async function seedProductos() {
  const dir = join(contentDir, 'productos');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
  const now = new Date().toISOString();
  let inserted = 0;
  for (const f of files) {
    const slug = basename(f, '.md');
    const raw = await readFile(join(dir, f), 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const existing = await db.execute({
      sql: `SELECT 1 FROM productos WHERE slug = ?`,
      args: [slug],
    });
    if (existing.rows.length > 0) {
      console.log(`  skip producto ${slug} (already exists)`);
      continue;
    }
    await db.execute({
      sql: `INSERT INTO productos
            (slug, nombre, precio, descripcion_corta, descripcion_md,
             disponible, orden, sku, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        slug,
        data.nombre,
        data.precio,
        data.descripcionCorta,
        body || null,
        data.disponible === false ? 0 : 1,
        data.orden ?? 0,
        data.sku ?? null,
        now,
        now,
      ],
    });
    for (let i = 0; i < (data.imagenes ?? []).length; i++) {
      await db.execute({
        sql: `INSERT INTO producto_imagenes (producto_slug, url, blob_key, orden) VALUES (?, ?, ?, ?)`,
        args: [slug, data.imagenes[i], null, i],
      });
    }
    for (const col of data.colecciones ?? []) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO producto_colecciones (producto_slug, coleccion_slug) VALUES (?, ?)`,
        args: [slug, col],
      });
    }
    inserted++;
    console.log(`  + producto ${slug}`);
  }
  console.log(`Productos: ${inserted} inserted.`);
}

console.log('Seeding from src/content/...');
await seedColecciones();
await seedProductos();
console.log('Done.');
