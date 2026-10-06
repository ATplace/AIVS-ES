import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import bcrypt from "bcryptjs";
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@es/db";
import {
  adminUserInputSchema,
  categoryInputSchema,
  couponInputSchema,
  createShipmentSchema,
  orderStatusUpdateSchema,
  paymentConfigSchema,
  productInputSchema,
  shippingConfigSchema,
  storeSettingsSchema,
  PAYMENT_PROVIDER_META,
  SHIPPING_METHOD_META,
  type DashboardDTO,
} from "@es/shared";
import { getDb } from "../lib/db";
import { badRequest, conflict, notFound } from "../lib/errors";
import { toOrderDTO, toProductDTO } from "../lib/dto";
import { requireAdmin, type AuthVars } from "../lib/auth";
import { buildManifest, createShipmentForOrder, loadOrderDTO, transitionOrder } from "../services/orders";

export const adminRoutes = new Hono<{ Variables: AuthVars }>();
adminRoutes.use("*", requireAdmin());

// ======================= Dashboard =======================
adminRoutes.get("/dashboard", async (c) => {
  const db = getDb();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const validStatus = sql`${schema.orders.status} not in ('cancelled','refunded','pending')`;

  const [today] = await db
    .select({ revenue: sql<number>`coalesce(sum(${schema.orders.total}),0)::int`, orders: count() })
    .from(schema.orders)
    .where(and(gte(schema.orders.createdAt, startOfToday), validStatus));

  const since = new Date(startOfToday.getTime() - 6 * 24 * 3600 * 1000);
  const daily = await db
    .select({
      date: sql<string>`to_char(${schema.orders.createdAt}, 'YYYY-MM-DD')`,
      revenue: sql<number>`coalesce(sum(${schema.orders.total}),0)::int`,
      orders: count(),
    })
    .from(schema.orders)
    .where(and(gte(schema.orders.createdAt, since), validStatus))
    .groupBy(sql`to_char(${schema.orders.createdAt}, 'YYYY-MM-DD')`);
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(since.getTime() + i * 24 * 3600 * 1000);
    const key = d.toISOString().slice(0, 10);
    const hit = daily.find((r) => r.date === key);
    return { date: key, revenue: hit?.revenue ?? 0, orders: Number(hit?.orders ?? 0) };
  });

  const topProducts = await db
    .select({
      productId: schema.orderItems.productId,
      name: schema.orderItems.productName,
      sold: sql<number>`sum(${schema.orderItems.quantity})::int`,
      revenue: sql<number>`sum(${schema.orderItems.lineTotal})::int`,
    })
    .from(schema.orderItems)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
    .where(validStatus)
    .groupBy(schema.orderItems.productId, schema.orderItems.productName)
    .orderBy(desc(sql`sum(${schema.orderItems.quantity})`))
    .limit(5);

  const statusRows = await db.select({ status: schema.orders.status, n: count() }).from(schema.orders).groupBy(schema.orders.status);
  const statusBreakdown = Object.fromEntries(statusRows.map((r) => [r.status, Number(r.n)]));

  const lowStock = await db
    .select({ variantId: schema.productVariants.id, productName: schema.products.name, variantName: schema.productVariants.name, stock: schema.productVariants.stock })
    .from(schema.productVariants)
    .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
    .where(and(lte(schema.productVariants.stock, 5), eq(schema.products.status, "active")))
    .orderBy(asc(schema.productVariants.stock))
    .limit(10);

  const funnelSince = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const funnel = await db
    .select({ type: schema.events.type, n: count() })
    .from(schema.events)
    .where(gte(schema.events.createdAt, funnelSince))
    .groupBy(schema.events.type);
  const f = Object.fromEntries(funnel.map((r) => [r.type, Number(r.n)]));

  const dto: DashboardDTO = {
    today: { revenue: today.revenue, orders: Number(today.orders), aov: Number(today.orders) ? Math.round(today.revenue / Number(today.orders)) : 0 },
    last7Days,
    topProducts,
    statusBreakdown,
    lowStock,
    conversion: { views: f.view_product ?? 0, carts: f.add_to_cart ?? 0, orders: f.order ?? 0 },
  };
  return c.json(dto);
});

// ======================= Products =======================
const productListQuery = z.object({
  q: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  categoryId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

adminRoutes.get("/products", zValidator("query", productListQuery), async (c) => {
  const q = c.req.valid("query");
  const db = getDb();
  const conds: SQL[] = [];
  if (q.q) conds.push(or(ilike(schema.products.name, `%${q.q}%`), ilike(schema.products.slug, `%${q.q}%`))!);
  if (q.status) conds.push(eq(schema.products.status, q.status));
  if (q.categoryId) conds.push(eq(schema.products.categoryId, q.categoryId));
  const where = conds.length ? and(...conds) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(schema.products).where(where);
  const rows = await db.query.products.findMany({
    where,
    with: { variants: true, category: true },
    orderBy: desc(schema.products.updatedAt),
    limit: q.limit,
    offset: (q.page - 1) * q.limit,
  });
  return c.json({ products: rows.map(toProductDTO), total: Number(total), page: q.page, pages: Math.ceil(Number(total) / q.limit) });
});

adminRoutes.get("/products/:id", async (c) => {
  const db = getDb();
  const p = await db.query.products.findFirst({ where: eq(schema.products.id, c.req.param("id")), with: { variants: true, category: true } });
  if (!p) throw notFound("商品");
  return c.json({ product: toProductDTO(p) });
});

adminRoutes.post("/products", zValidator("json", productInputSchema), async (c) => {
  const body = c.req.valid("json");
  const db = getDb();
  const dup = await db.query.products.findFirst({ where: eq(schema.products.slug, body.slug) });
  if (dup) throw conflict("網址代稱 (slug) 已存在");
  const id = await db.transaction(async (tx) => {
    const [p] = await tx
      .insert(schema.products)
      .values({
        name: body.name,
        slug: body.slug,
        description: body.description,
        categoryId: body.categoryId ?? null,
        status: body.status,
        images: body.images,
        tags: body.tags,
        isFeatured: body.isFeatured,
        flashSaleEndsAt: body.flashSaleEndsAt ? new Date(body.flashSaleEndsAt) : null,
      })
      .returning();
    await tx.insert(schema.productVariants).values(
      body.variants.map((v, i) => ({
        productId: p.id,
        sku: v.sku,
        name: v.name,
        options: v.options,
        price: v.price,
        compareAtPrice: v.compareAtPrice ?? null,
        stock: v.stock,
        weightGrams: v.weightGrams,
        sortOrder: i,
      })),
    );
    return p.id;
  });
  const p = await db.query.products.findFirst({ where: eq(schema.products.id, id), with: { variants: true, category: true } });
  return c.json({ product: toProductDTO(p!) }, 201);
});

adminRoutes.put("/products/:id", zValidator("json", productInputSchema), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const db = getDb();
  const existing = await db.query.products.findFirst({ where: eq(schema.products.id, id), with: { variants: true } });
  if (!existing) throw notFound("商品");
  const dup = await db.query.products.findFirst({ where: and(eq(schema.products.slug, body.slug), sql`${schema.products.id} <> ${id}`) });
  if (dup) throw conflict("網址代稱 (slug) 已存在");

  await db.transaction(async (tx) => {
    await tx
      .update(schema.products)
      .set({
        name: body.name,
        slug: body.slug,
        description: body.description,
        categoryId: body.categoryId ?? null,
        status: body.status,
        images: body.images,
        tags: body.tags,
        isFeatured: body.isFeatured,
        flashSaleEndsAt: body.flashSaleEndsAt ? new Date(body.flashSaleEndsAt) : null,
      })
      .where(eq(schema.products.id, id));

    // 規格：有 id 的更新、沒 id 的新增、不在清單中的刪除
    const keepIds = body.variants.filter((v) => v.id).map((v) => v.id!);
    const toDelete = existing.variants.filter((v) => !keepIds.includes(v.id)).map((v) => v.id);
    if (toDelete.length) await tx.delete(schema.productVariants).where(inArray(schema.productVariants.id, toDelete));
    for (const [i, v] of body.variants.entries()) {
      const data = { sku: v.sku, name: v.name, options: v.options, price: v.price, compareAtPrice: v.compareAtPrice ?? null, stock: v.stock, weightGrams: v.weightGrams, sortOrder: i };
      if (v.id && existing.variants.some((e) => e.id === v.id)) await tx.update(schema.productVariants).set(data).where(eq(schema.productVariants.id, v.id));
      else await tx.insert(schema.productVariants).values({ productId: id, ...data });
    }
  });
  const p = await db.query.products.findFirst({ where: eq(schema.products.id, id), with: { variants: true, category: true } });
  return c.json({ product: toProductDTO(p!) });
});

adminRoutes.delete("/products/:id", async (c) => {
  const db = getDb();
  // 軟刪除：改為 archived，保留歷史訂單資料
  const res = await db.update(schema.products).set({ status: "archived" }).where(eq(schema.products.id, c.req.param("id"))).returning({ id: schema.products.id });
  if (!res.length) throw notFound("商品");
  return c.json({ ok: true });
});

adminRoutes.post("/products/bulk-status", zValidator("json", z.object({ ids: z.array(z.string()).min(1), status: z.enum(["draft", "active", "archived"]) })), async (c) => {
  const { ids, status } = c.req.valid("json");
  const db = getDb();
  await db.update(schema.products).set({ status }).where(inArray(schema.products.id, ids));
  return c.json({ ok: true, count: ids.length });
});

// ======================= Categories =======================
adminRoutes.get("/categories", async (c) => {
  const db = getDb();
  const rows = await db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
      slug: schema.categories.slug,
      parentId: schema.categories.parentId,
      imageUrl: schema.categories.imageUrl,
      sortOrder: schema.categories.sortOrder,
      productCount: sql<number>`(select count(*)::int from ${schema.products} p where p.category_id = categories.id)`,
    })
    .from(schema.categories)
    .orderBy(asc(schema.categories.sortOrder));
  return c.json({ categories: rows });
});

adminRoutes.post("/categories", zValidator("json", categoryInputSchema), async (c) => {
  const body = c.req.valid("json");
  const db = getDb();
  const dup = await db.query.categories.findFirst({ where: eq(schema.categories.slug, body.slug) });
  if (dup) throw conflict("slug 已存在");
  const [row] = await db.insert(schema.categories).values({ ...body, parentId: body.parentId ?? null, imageUrl: body.imageUrl ?? null }).returning();
  return c.json({ category: row }, 201);
});

adminRoutes.put("/categories/:id", zValidator("json", categoryInputSchema), async (c) => {
  const body = c.req.valid("json");
  const db = getDb();
  const [row] = await db
    .update(schema.categories)
    .set({ ...body, parentId: body.parentId ?? null, imageUrl: body.imageUrl ?? null })
    .where(eq(schema.categories.id, c.req.param("id")))
    .returning();
  if (!row) throw notFound("分類");
  return c.json({ category: row });
});

adminRoutes.delete("/categories/:id", async (c) => {
  const db = getDb();
  await db.delete(schema.categories).where(eq(schema.categories.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ======================= Orders =======================
const orderListQuery = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

adminRoutes.get("/orders", zValidator("query", orderListQuery), async (c) => {
  const q = c.req.valid("query");
  const db = getDb();
  const conds: SQL[] = [];
  if (q.q) conds.push(or(ilike(schema.orders.orderNo, `%${q.q}%`), ilike(schema.orders.email, `%${q.q}%`), sql`${schema.orders.shippingAddress}->>'name' ilike ${`%${q.q}%`}`)!);
  if (q.status) conds.push(eq(schema.orders.status, q.status));
  if (q.paymentStatus) conds.push(eq(schema.orders.paymentStatus, q.paymentStatus));
  if (q.from) conds.push(gte(schema.orders.createdAt, new Date(q.from)));
  if (q.to) conds.push(lte(schema.orders.createdAt, new Date(q.to)));
  const where = conds.length ? and(...conds) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(schema.orders).where(where);
  const rows = await db.query.orders.findMany({
    where,
    with: { items: true, shipments: true, payments: true },
    orderBy: desc(schema.orders.createdAt),
    limit: q.limit,
    offset: (q.page - 1) * q.limit,
  });
  return c.json({ orders: rows.map(toOrderDTO), total: Number(total), page: q.page, pages: Math.ceil(Number(total) / q.limit) });
});

adminRoutes.get("/orders/:id", async (c) => {
  const db = getDb();
  const order = await loadOrderDTO({ id: c.req.param("id") });
  const events = await db.query.orderEvents.findMany({ where: eq(schema.orderEvents.orderId, order.id), orderBy: desc(schema.orderEvents.createdAt) });
  return c.json({ order, events });
});

adminRoutes.post("/orders/:id/status", zValidator("json", orderStatusUpdateSchema), async (c) => {
  const { status, note } = c.req.valid("json");
  const order = await transitionOrder(c.req.param("id"), status, c.get("user")!.name, note);
  return c.json({ order });
});

adminRoutes.post("/orders/:id/mark-paid", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, id) });
  if (!o) throw notFound("訂單");
  if (o.paymentStatus === "succeeded") throw badRequest("已是付款狀態");
  await db.transaction(async (tx) => {
    await tx.update(schema.orders).set({ paymentStatus: "succeeded", status: o.status === "pending" ? "paid" : o.status }).where(eq(schema.orders.id, id));
    await tx.update(schema.payments).set({ status: "succeeded", paidAt: new Date(), txnId: "MANUAL" }).where(eq(schema.payments.orderId, id));
    await tx.insert(schema.orderEvents).values({ orderId: id, type: "payment", message: "後台手動標記已收款", actor: c.get("user")!.name });
  });
  return c.json({ order: await loadOrderDTO({ id }) });
});

adminRoutes.post("/orders/:id/note", zValidator("json", z.object({ message: z.string().min(1) })), async (c) => {
  const db = getDb();
  await db.insert(schema.orderEvents).values({ orderId: c.req.param("id"), type: "note", message: c.req.valid("json").message, actor: c.get("user")!.name });
  return c.json({ ok: true });
});

adminRoutes.post("/orders/:id/shipment", zValidator("json", createShipmentSchema), async (c) => {
  const order = await createShipmentForOrder(c.req.param("id"), c.req.valid("json"), c.get("user")!.name);
  return c.json({ order });
});

adminRoutes.patch("/orders/:id/shipment", zValidator("json", z.object({ trackingNo: z.string().optional(), status: z.string().optional(), note: z.string().optional() })), async (c) => {
  const db = getDb();
  const body = c.req.valid("json");
  const [row] = await db
    .update(schema.shipments)
    .set({ ...body, deliveredAt: body.status === "delivered" ? new Date() : undefined })
    .where(eq(schema.shipments.orderId, c.req.param("id")))
    .returning();
  if (!row) throw notFound("出貨單");
  return c.json({ order: await loadOrderDTO({ id: c.req.param("id") }) });
});

/** 出貨明細 (單筆或批次，供列印) */
adminRoutes.get("/orders/:id/manifest", async (c) => c.json({ manifests: await buildManifest([c.req.param("id")]) }));
adminRoutes.post("/manifests", zValidator("json", z.object({ ids: z.array(z.string()).min(1).max(100) })), async (c) =>
  c.json({ manifests: await buildManifest(c.req.valid("json").ids) }),
);

/** 批次出貨 */
adminRoutes.post("/orders/bulk-ship", zValidator("json", z.object({ ids: z.array(z.string()).min(1) })), async (c) => {
  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const id of c.req.valid("json").ids) {
    try {
      await createShipmentForOrder(id, { packageCount: 1 }, c.get("user")!.name);
      results.push({ id, ok: true });
    } catch (e) {
      results.push({ id, ok: false, error: (e as Error).message });
    }
  }
  return c.json({ results });
});

// ======================= Settings =======================
adminRoutes.get("/settings/store", async (c) => {
  const db = getDb();
  return c.json({ store: await db.query.stores.findFirst() });
});
adminRoutes.put("/settings/store", zValidator("json", storeSettingsSchema), async (c) => {
  const db = getDb();
  const body = c.req.valid("json");
  const existing = await db.query.stores.findFirst();
  const data = { ...body, logoUrl: body.logoUrl ?? null, supportEmail: body.supportEmail ?? null, supportPhone: body.supportPhone ?? null };
  const [row] = existing
    ? await db.update(schema.stores).set(data).where(eq(schema.stores.id, existing.id)).returning()
    : await db.insert(schema.stores).values(data).returning();
  return c.json({ store: row });
});

adminRoutes.get("/settings/payments", async (c) => {
  const db = getDb();
  const rows = await db.query.paymentConfigs.findMany({ orderBy: asc(schema.paymentConfigs.sortOrder) });
  const configs = rows.map((r) => ({
    ...r,
    meta: PAYMENT_PROVIDER_META[r.provider as keyof typeof PAYMENT_PROVIDER_META],
    // 密鑰遮罩
    credentials: Object.fromEntries(
      Object.entries(r.credentials).map(([k, v]) => {
        const f = PAYMENT_PROVIDER_META[r.provider as keyof typeof PAYMENT_PROVIDER_META]?.fields.find((x) => x.key === k);
        return [k, f?.secret && v ? `${v.slice(0, 3)}••••${v.slice(-2)}` : v];
      }),
    ),
  }));
  return c.json({ configs });
});
adminRoutes.put("/settings/payments/:provider", zValidator("json", paymentConfigSchema.omit({ provider: true })), async (c) => {
  const db = getDb();
  const provider = c.req.param("provider");
  if (!(provider in PAYMENT_PROVIDER_META)) throw badRequest("未知的金流");
  const body = c.req.valid("json");
  const existing = await db.query.paymentConfigs.findFirst({ where: eq(schema.paymentConfigs.provider, provider) });
  // 遮罩值 (含 ••••) 不覆寫原值
  const merged = { ...(existing?.credentials ?? {}) };
  for (const [k, v] of Object.entries(body.credentials)) if (!v.includes("••••")) merged[k] = v;
  const data = { enabled: body.enabled, credentials: merged, feePercent: body.feePercent, sortOrder: body.sortOrder };
  const [row] = existing
    ? await db.update(schema.paymentConfigs).set(data).where(eq(schema.paymentConfigs.provider, provider)).returning()
    : await db.insert(schema.paymentConfigs).values({ provider, ...data }).returning();
  return c.json({ config: row });
});

adminRoutes.get("/settings/shipping", async (c) => {
  const db = getDb();
  const rows = await db.query.shippingConfigs.findMany({ orderBy: asc(schema.shippingConfigs.sortOrder) });
  return c.json({ configs: rows.map((r) => ({ ...r, meta: SHIPPING_METHOD_META[r.method as keyof typeof SHIPPING_METHOD_META] })) });
});
adminRoutes.put("/settings/shipping/:method", zValidator("json", shippingConfigSchema.omit({ method: true })), async (c) => {
  const db = getDb();
  const method = c.req.param("method");
  if (!(method in SHIPPING_METHOD_META)) throw badRequest("未知的物流方式");
  const body = c.req.valid("json");
  const existing = await db.query.shippingConfigs.findFirst({ where: eq(schema.shippingConfigs.method, method) });
  const data = { enabled: body.enabled, fee: body.fee, freeThreshold: body.freeThreshold ?? null, credentials: body.credentials, sortOrder: body.sortOrder };
  const [row] = existing
    ? await db.update(schema.shippingConfigs).set(data).where(eq(schema.shippingConfigs.method, method)).returning()
    : await db.insert(schema.shippingConfigs).values({ method, ...data }).returning();
  return c.json({ config: row });
});

// ======================= Coupons =======================
adminRoutes.get("/coupons", async (c) => {
  const db = getDb();
  return c.json({ coupons: await db.query.coupons.findMany({ orderBy: desc(schema.coupons.createdAt) }) });
});
adminRoutes.post("/coupons", zValidator("json", couponInputSchema), async (c) => {
  const db = getDb();
  const body = c.req.valid("json");
  const dup = await db.query.coupons.findFirst({ where: eq(schema.coupons.code, body.code) });
  if (dup) throw conflict("優惠碼已存在");
  const [row] = await db
    .insert(schema.coupons)
    .values({ ...body, maxUses: body.maxUses ?? null, startsAt: body.startsAt ? new Date(body.startsAt) : null, endsAt: body.endsAt ? new Date(body.endsAt) : null })
    .returning();
  return c.json({ coupon: row }, 201);
});
adminRoutes.put("/coupons/:id", zValidator("json", couponInputSchema), async (c) => {
  const db = getDb();
  const body = c.req.valid("json");
  const [row] = await db
    .update(schema.coupons)
    .set({ ...body, maxUses: body.maxUses ?? null, startsAt: body.startsAt ? new Date(body.startsAt) : null, endsAt: body.endsAt ? new Date(body.endsAt) : null })
    .where(eq(schema.coupons.id, c.req.param("id")))
    .returning();
  if (!row) throw notFound("優惠券");
  return c.json({ coupon: row });
});
adminRoutes.delete("/coupons/:id", async (c) => {
  const db = getDb();
  await db.delete(schema.coupons).where(eq(schema.coupons.id, c.req.param("id")));
  return c.json({ ok: true });
});

// ======================= Reviews / Customers / Admin users =======================
adminRoutes.get("/reviews", async (c) => {
  const db = getDb();
  const rows = await db.query.reviews.findMany({ with: { product: { columns: { id: true, name: true, slug: true } } }, orderBy: desc(schema.reviews.createdAt), limit: 100 });
  return c.json({ reviews: rows });
});
adminRoutes.delete("/reviews/:id", async (c) => {
  const db = getDb();
  const [deleted] = await db.delete(schema.reviews).where(eq(schema.reviews.id, c.req.param("id"))).returning({ productId: schema.reviews.productId });
  if (deleted) {
    // 重新計算商品平均評分與評價數
    const [agg] = await db.select({ avg: sql<number | null>`avg(${schema.reviews.rating})`, n: count() }).from(schema.reviews).where(eq(schema.reviews.productId, deleted.productId));
    await db
      .update(schema.products)
      .set({ rating: agg.avg ? Number(Number(agg.avg).toFixed(2)) : 0, reviewCount: Number(agg.n) })
      .where(eq(schema.products.id, deleted.productId));
  }
  return c.json({ ok: true });
});

adminRoutes.get("/customers", zValidator("query", z.object({ q: z.string().optional(), page: z.coerce.number().default(1), limit: z.coerce.number().default(20) })), async (c) => {
  const q = c.req.valid("query");
  const db = getDb();
  const where = q.q ? or(ilike(schema.customers.email, `%${q.q}%`), ilike(schema.customers.name, `%${q.q}%`)) : undefined;
  const rows = await db
    .select({
      id: schema.customers.id,
      email: schema.customers.email,
      name: schema.customers.name,
      phone: schema.customers.phone,
      createdAt: schema.customers.createdAt,
      orderCount: sql<number>`(select count(*)::int from ${schema.orders} o where o.customer_id = customers.id)`,
      totalSpent: sql<number>`(select coalesce(sum(o.total),0)::int from ${schema.orders} o where o.customer_id = customers.id and o.payment_status = 'succeeded')`,
    })
    .from(schema.customers)
    .where(where)
    .orderBy(desc(schema.customers.createdAt))
    .limit(q.limit)
    .offset((q.page - 1) * q.limit);
  return c.json({ customers: rows });
});

adminRoutes.get("/users", requireAdmin(["owner", "manager"]), async (c) => {
  const db = getDb();
  const rows = await db.query.adminUsers.findMany({ columns: { passwordHash: false }, orderBy: asc(schema.adminUsers.createdAt) });
  return c.json({ users: rows });
});
adminRoutes.post("/users", requireAdmin(["owner"]), zValidator("json", adminUserInputSchema), async (c) => {
  const db = getDb();
  const body = c.req.valid("json");
  const dup = await db.query.adminUsers.findFirst({ where: eq(schema.adminUsers.email, body.email.toLowerCase()) });
  if (dup) throw conflict("Email 已存在");
  const [row] = await db
    .insert(schema.adminUsers)
    .values({ email: body.email.toLowerCase(), name: body.name, role: body.role, passwordHash: await bcrypt.hash(body.password, 10) })
    .returning({ id: schema.adminUsers.id, email: schema.adminUsers.email, name: schema.adminUsers.name, role: schema.adminUsers.role });
  return c.json({ user: row }, 201);
});
adminRoutes.delete("/users/:id", requireAdmin(["owner"]), async (c) => {
  const db = getDb();
  if (c.req.param("id") === c.get("user")!.sub) throw badRequest("不能刪除自己");
  await db.delete(schema.adminUsers).where(eq(schema.adminUsers.id, c.req.param("id")));
  return c.json({ ok: true });
});
