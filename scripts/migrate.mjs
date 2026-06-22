#!/usr/bin/env node
import { createClient } from '@libsql/client';
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'migrations');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('TURSO_DATABASE_URL is not set.');
  process.exit(1);
}

const db = createClient({ url, authToken });

const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

for (const f of files) {
  const sql = await readFile(join(migrationsDir, f), 'utf8');
  console.log(`Applying ${f}...`);
  const stmts = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of stmts) {
    try {
      await db.execute(stmt);
    } catch (err) {
      if (String(err?.message ?? err).includes('duplicate column name')) {
        console.log('  skipped duplicate column');
        continue;
      }
      throw err;
    }
  }
}

console.log('Migrations complete.');
