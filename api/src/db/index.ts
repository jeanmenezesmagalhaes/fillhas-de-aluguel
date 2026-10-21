import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import pg from 'pg';
import * as schema from './schema.js';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface Banco {
  db: Db;
  fechar: () => Promise<void>;
}

const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

// `postgres://…` usa um Postgres de verdade. Qualquer outro valor é uma pasta do
// PGlite (Postgres embutido); `memory://` não grava nada, para os testes.
// Na Vercel as migrations rodam no build (`npm run db:migrar`): a pasta drizzle/ não
// vai junto com a função, então lá `migrar` é false.
export async function abrirBanco(url = process.env.DATABASE_URL ?? './.data/pglite', { migrar = true } = {}): Promise<Banco> {
  if (/^postgres(ql)?:\/\//.test(url)) {
    const pool = new pg.Pool({ connectionString: url });
    const db = drizzlePg(pool, { schema });
    if (migrar) await migratePg(db, { migrationsFolder });
    return { db: db as unknown as Db, fechar: () => pool.end() };
  }
  if (!url.startsWith('memory://')) mkdirSync(url, { recursive: true });
  const cliente = new PGlite(url);
  const db = drizzlePglite(cliente, { schema });
  if (migrar) await migratePglite(db, { migrationsFolder });
  return { db: db as unknown as Db, fechar: () => cliente.close() };
}

export { schema };
