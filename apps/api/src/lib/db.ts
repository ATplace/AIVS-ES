import { createDb, type Db } from "@es/db";

let db: Db;
export async function initDb() {
  db = await createDb();
  return db;
}
export function getDb(): Db {
  if (!db) throw new Error("DB not initialised");
  return db;
}
