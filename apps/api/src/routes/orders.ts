import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@es/db";
import { getDb } from "../lib/db";
import { forbidden, notFound } from "../lib/errors";
import { toOrderDTO } from "../lib/dto";
import { optionalAuth, requireCustomer, type AuthVars } from "../lib/auth";
import { loadOrderDTO, transitionOrder } from "../services/orders";

export const orderRoutes = new Hono<{ Variables: AuthVars }>();

/** 顧客訂單列表 */
orderRoutes.get("/", requireCustomer, async (c) => {
  const db = getDb();
  const rows = await db.query.orders.findMany({
    where: eq(schema.orders.customerId, c.get("user")!.sub),
    with: { items: true, shipments: true, payments: true },
    orderBy: desc(schema.orders.createdAt),
  });
  return c.json({ orders: rows.map(toOrderDTO) });
});

/** 訂單查詢：登入顧客可看自己的；訪客需提供 email */
orderRoutes.get("/:orderNo", optionalAuth, zValidator("query", z.object({ email: z.string().optional() })), async (c) => {
  const user = c.get("user");
  const { email } = c.req.valid("query");
  const order = await loadOrderDTO({ orderNo: c.req.param("orderNo") });
  const owns = (user?.kind === "customer" && user.sub === order.customerId) || (email && email.toLowerCase() === order.email.toLowerCase());
  if (!owns) throw forbidden("請提供下單時的 Email 以查詢訂單");
  const db = getDb();
  const events = await db.query.orderEvents.findMany({ where: eq(schema.orderEvents.orderId, order.id), orderBy: desc(schema.orderEvents.createdAt) });
  return c.json({ order, events });
});

/** 顧客取消未付款訂單 */
orderRoutes.post("/:orderNo/cancel", optionalAuth, zValidator("json", z.object({ email: z.string().optional() })), async (c) => {
  const user = c.get("user");
  const { email } = c.req.valid("json");
  const order = await loadOrderDTO({ orderNo: c.req.param("orderNo") });
  const owns = (user?.kind === "customer" && user.sub === order.customerId) || (email && email.toLowerCase() === order.email.toLowerCase());
  if (!owns) throw forbidden();
  if (order.status !== "pending") throw notFound("可取消的訂單");
  const updated = await transitionOrder(order.id, "cancelled", "customer", "顧客取消");
  return c.json({ order: updated });
});
