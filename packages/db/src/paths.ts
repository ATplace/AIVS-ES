import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
/** Monorepo 根目錄 (packages/db/src → ../../..) */
export const REPO_ROOT = path.resolve(here, "../../..");

// 不論從哪個 workspace 執行，一律載入根目錄的 .env
dotenv.config({ path: path.join(REPO_ROOT, ".env") });

/** PGlite 內嵌資料庫資料夾 */
export const PGLITE_DATA_DIR = process.env.PGLITE_DATA_DIR?.trim() || path.join(REPO_ROOT, ".data", "pglite");

// PGlite 不會遞迴建立資料夾，先確保上層目錄存在
if (!process.env.DATABASE_URL?.trim()) {
  fs.mkdirSync(path.dirname(PGLITE_DATA_DIR), { recursive: true });
}
