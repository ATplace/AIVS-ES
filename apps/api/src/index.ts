import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { env } from "./env";
import { initDb } from "./lib/db";
import { authRoutes } from "./routes/auth";
import { catalogRoutes } from "./routes/catalog";
import { cartRoutes } from "./routes/cart";
import { checkoutRoutes } from "./routes/checkout";
import { orderRoutes } from "./routes/orders";
import { paymentRoutes } from "./routes/payments";
import { adminRoutes } from "./routes/admin";
import { storeRoutes } from "./routes/store";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: [env.WEB_PUBLIC_URL, env.ADMIN_PUBLIC_URL],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.get("/", (c) => c.json({ name: "ES Commerce API", version: "0.1.0", docs: "/health" }));
app.get("/health", (c) => c.json({ ok: true, time: new Date().toISOString() }));

app.route("/auth", authRoutes);
app.route("/store", storeRoutes);
app.route("/catalog", catalogRoutes);
app.route("/cart", cartRoutes);
app.route("/checkout", checkoutRoutes);
app.route("/orders", orderRoutes);
app.route("/payments", paymentRoutes);
app.route("/admin", adminRoutes);

app.notFound((c) => c.json({ error: "Not Found" }, 404));
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    const cause = (err as { cause?: unknown }).cause;
    return c.json({ error: err.message, details: cause }, err.status);
  }
  console.error(err);
  return c.json({ error: "Internal Server Error", details: process.env.NODE_ENV === "production" ? undefined : String(err) }, 500);
});

async function main() {
  await initDb();
  serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    console.log(`[api] listening on http://localhost:${info.port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export type AppType = typeof app;
