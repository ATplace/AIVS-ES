import { Hono } from "hono";
import { getDb } from "../lib/db";

export const storeRoutes = new Hono();

storeRoutes.get("/", async (c) => {
  const db = getDb();
  const s = await db.query.stores.findFirst();
  return c.json({
    store: s
      ? { name: s.name, tagline: s.tagline, logoUrl: s.logoUrl, supportEmail: s.supportEmail, supportPhone: s.supportPhone, announcement: s.announcement }
      : null,
  });
});
