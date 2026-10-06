import "./paths";
import fs from "node:fs";
import { PGLITE_DATA_DIR } from "./paths";

if (process.env.DATABASE_URL?.trim()) {
  console.error("DATABASE_URL 已設定，為避免誤刪正式資料庫，reset 僅支援內嵌 PGlite。");
  process.exit(1);
}
if (fs.existsSync(PGLITE_DATA_DIR)) {
  fs.rmSync(PGLITE_DATA_DIR, { recursive: true, force: true });
  console.log(`[db] removed ${PGLITE_DATA_DIR}`);
} else {
  console.log("[db] nothing to remove");
}
