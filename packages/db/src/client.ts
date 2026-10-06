import "./paths";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { PGLITE_DATA_DIR } from "./paths";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

let instance: Db | null = null;
let closeFn: (() => Promise<void>) | null = null;

/**
 * 建立資料庫連線。
 * - DATABASE_URL 未設定 → 內嵌 PGlite (開發用，零安裝)
 * - DATABASE_URL 已設定 → node-postgres 連線池 (正式環境 PostgreSQL)
 */
export async function createDb(): Promise<Db> {
  if (instance) return instance;
  const url = process.env.DATABASE_URL?.trim();

  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: url });
    instance = drizzle(pool, { schema }) as unknown as Db;
    closeFn = () => pool.end();
    console.log("[db] connected to PostgreSQL");
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const client = new PGlite(PGLITE_DATA_DIR);
    await client.waitReady;
    instance = drizzle(client, { schema }) as unknown as Db;
    closeFn = () => client.close();
    console.log(`[db] using embedded PGlite at ${PGLITE_DATA_DIR}`);
  }
  return instance;
}

export async function closeDb() {
  if (closeFn) await closeFn();
  instance = null;
  closeFn = null;
}

export { schema };
