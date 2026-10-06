import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@es/db";
import { reviewInputSchema } from "@es/shared";
import { getDb } from "../lib/db";
import { notFound } from "../lib/errors";
import { toProductDTO } from "../lib/dto";
import { requireCustomer, type AuthVars } from "../lib/auth";

export const catalogRoutes = new Hono<{ Variables: AuthVars }>();

const listQuery = z.object({
  q: z.string().optional(),
  category: z.string().optional(), // slug
  tag: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(["popular", "newest", "price_asc", "price_desc", "rating"]).default("popular"),
  featured: z.coerce.boolean().optional(),
  flash: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

catalogRoutes.get("/categories", async (c) => {
  const db = getDb();
  const rows = await db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
      slug: schema.categories.slug,
      parentId: schema.categories.parentId,
      imageUrl: schema.categories.imageUrl,
      sortOrder: schema.categories.sortOrder,
      productCount: sql<number>`(select count(*)::int from ${schema.products} p where p.category_id = categories.id and p.status = 'active')`,
    })
    .from(schema.categories)
    .orderBy(asc(schema.categories.sortOrder));
  return c.json({ categories: rows });
});

catalogRoutes.get("/products", zValidator("query", listQuery), async (c) => {
  const q = c.req.valid("query");
  const db = getDb();
  const conds: SQL[] = [eq(schema.products.status, "active")];
  if (q.category) {
    const cat = await db.query.categories.findFirst({ where: eq(schema.categories.slug, q.category) });
    if (!cat) return c.json({ products: [], total: 0, page: q.page, pages: 0 });
    conds.push(eq(schema.products.categoryId, cat.id));
  }
  if (q.q) conds.push(or(ilike(schema.products.name, `%${q.q}%`), ilike(schema.products.description, `%${q.q}%`))!);
  if (q.tag) conds.push(sql`${schema.products.tags} @> ${JSON.stringify([q.tag])}::jsonb`);
  if (q.featured) conds.push(eq(schema.products.isFeatured, true));
  if (q.flash) conds.push(sql`${schema.products.flashSaleEndsAt} > now()`);
  const minPriceSql = sql<number>`(select min(v.price) from ${schema.productVariants} v where v.product_id = products.id)`;
  if (q.minPrice != null) conds.push(gte(minPriceSql, q.minPrice));
  if (q.maxPrice != null) conds.push(lte(minPriceSql, q.maxPrice));

  const where = and(...conds);
  const orderBy =
    q.sort === "newest"
      ? desc(schema.products.createdAt)
      : q.sort === "price_asc"
        ? asc(minPriceSql)
        : q.sort === "price_desc"
          ? desc(minPriceSql)
          : q.sort === "rating"
            ? desc(schema.products.rating)
            : desc(schema.products.soldCount);

  const [{ total }] = await db.select({ total: count() }).from(schema.products).where(where);
  const ids = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(where)
    .orderBy(orderBy, desc(schema.products.id))
    .limit(q.limit)
    .offset((q.page - 1) * q.limit);
  const idList = ids.map((r) => r.id);
  const rows = idList.length
    ? await db.query.products.findMany({ where: inArray(schema.products.id, idList), with: { variants: true, category: true } })
    : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const products = idList.map((id) => toProductDTO(byId.get(id)!));
  return c.json({ products, total, page: q.page, pages: Math.ceil(total / q.limit) });
});

/** 首頁一次取回所有區塊 */
catalogRoutes.get("/home", async (c) => {
  const db = getDb();
  const store = await db.query.stores.findFirst();
  const categories = await db.query.categories.findMany({ orderBy: asc(schema.categories.sortOrder) });
  const base = { with: { variants: true, category: true } } as const;
  const [featured, flash, trending, newest] = await Promise.all([
    db.query.products.findMany({ ...base, where: and(eq(schema.products.status, "active"), eq(schema.products.isFeatured, true)), limit: 8, orderBy: desc(schema.products.soldCount) }),
    db.query.products.findMany({ ...base, where: and(eq(schema.products.status, "active"), sql`${schema.products.flashSaleEndsAt} > now()`), limit: 8, orderBy: asc(schema.products.flashSaleEndsAt) }),
    db.query.products.findMany({ ...base, where: eq(schema.products.status, "active"), limit: 8, orderBy: desc(schema.products.soldCount) }),
    db.query.products.findMany({ ...base, where: eq(schema.products.status, "active"), limit: 8, orderBy: desc(schema.products.createdAt) }),
  ]);
  const [{ n: recentOrders }] = await db.select({ n: count() }).from(schema.orders).where(gte(schema.orders.createdAt, new Date(Date.now() - 24 * 3600 * 1000)));
  return c.json({
    store: store ? { name: store.name, tagline: store.tagline, logoUrl: store.logoUrl, announcement: store.announcement } : null,
    categories,
    featured: featured.map(toProductDTO),
    flashSale: flash.map(toProductDTO),
    trending: trending.map(toProductDTO),
    newest: newest.map(toProductDTO),
    social: { ordersLast24h: Number(recentOrders) },
  });
});

catalogRoutes.get("/suggest", zValidator("query", z.object({ q: z.string().min(1) })), async (c) => {
  const { q } = c.req.valid("query");
  const db = getDb();
  const rows = await db
    .select({ name: schema.products.name, slug: schema.products.slug, image: sql<string | null>`${schema.products.images}->0->>'url'` })
    .from(schema.products)
    .where(and(eq(schema.products.status, "active"), ilike(schema.products.name, `%${q}%`)))
    .orderBy(desc(schema.products.soldCount))
    .limit(6);
  return c.json({ suggestions: rows });
});

catalogRoutes.get("/products/:slug", async (c) => {
  const db = getDb();
  const p = await db.query.products.findFirst({
    where: and(eq(schema.products.slug, c.req.param("slug")), ne(schema.products.status, "archived")),
    with: { variants: true, category: true },
  });
  if (!p) throw notFound("商品");
  // 瀏覽計數 + 行為事件 (非同步，不阻塞回應)
  // Drizzle 查詢為惰性，需 then/catch 才會執行
  db.update(schema.products).set({ viewCount: sql`${schema.products.viewCount} + 1` }).where(eq(schema.products.id, p.id)).catch(() => {});
  db.insert(schema.events).values({ type: "view_product", productId: p.id }).catch(() => {});

  // 「正在瀏覽人數」：最近 15 分鐘的瀏覽事件 (真實資料)
  const [{ n: viewing }] = await db
    .select({ n: count() })
    .from(schema.events)
    .where(and(eq(schema.events.type, "view_product"), eq(schema.events.productId, p.id), gte(schema.events.createdAt, new Date(Date.now() - 15 * 60 * 1000))));
  const [{ n: soldLast24h }] = await db
    .select({ n: sql<number>`coalesce(sum(${schema.orderItems.quantity}),0)::int` })
    .from(schema.orderItems)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
    .where(and(eq(schema.orderItems.productId, p.id), gte(schema.orders.createdAt, new Date(Date.now() - 24 * 3600 * 1000)), ne(schema.orders.status, "cancelled")));

  return c.json({ product: toProductDTO(p), social: { viewingNow: Number(viewing) + 1, soldLast24h: Number(soldLast24h) } });
});

catalogRoutes.get("/products/:slug/reviews", async (c) => {
  const db = getDb();
  const p = await db.query.products.findFirst({ where: eq(schema.products.slug, c.req.param("slug")) });
  if (!p) throw notFound("商品");
  const rows = await db.query.reviews.findMany({ where: eq(schema.reviews.productId, p.id), orderBy: desc(schema.reviews.createdAt), limit: 50 });
  const dist = [5, 4, 3, 2, 1].map((star) => ({ star, count: rows.filter((r) => r.rating === star).length }));
  return c.json({ reviews: rows, distribution: dist, average: p.rating, total: p.reviewCount });
});

catalogRoutes.post("/products/:slug/reviews", requireCustomer, zValidator("json", reviewInputSchema), async (c) => {
  const db = getDb();
  const user = c.get("user")!;
  const p = await db.query.products.findFirst({ where: eq(schema.products.slug, c.req.param("slug")) });
  if (!p) throw notFound("商品");
  const body = c.req.valid("json");
  // 是否為已購買顧客
  const bought = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .innerJoin(schema.orderItems, eq(schema.orderItems.orderId, schema.orders.id))
    .where(and(eq(schema.orders.customerId, user.sub), eq(schema.orderItems.productId, p.id)))
    .limit(1);
  const [review] = await db
    .insert(schema.reviews)
    .values({ productId: p.id, customerId: user.sub, authorName: user.name, rating: body.rating, title: body.title ?? null, body: body.body ?? null, verified: bought.length > 0 })
    .returning();
  // 重新計算平均
  const [agg] = await db.select({ avg: sql<number>`avg(${schema.reviews.rating})`, n: count() }).from(schema.reviews).where(eq(schema.reviews.productId, p.id));
  await db.update(schema.products).set({ rating: Number(Number(agg.avg).toFixed(2)), reviewCount: Number(agg.n) }).where(eq(schema.products.id, p.id));
  return c.json({ review }, 201);
});

/** 相關商品：同分類熱銷 + 「買過的人也買了」 */
catalogRoutes.get("/products/:slug/related", async (c) => {
  const db = getDb();
  const p = await db.query.products.findFirst({ where: eq(schema.products.slug, c.req.param("slug")) });
  if (!p) throw notFound("商品");

  const coBought = await db
    .select({ productId: schema.orderItems.productId, n: count() })
    .from(schema.orderItems)
    .where(
      and(
        ne(schema.orderItems.productId, p.id),
        inArray(
          schema.orderItems.orderId,
          db.select({ id: schema.orderItems.orderId }).from(schema.orderItems).where(eq(schema.orderItems.productId, p.id)),
        ),
      ),
    )
    .groupBy(schema.orderItems.productId)
    .orderBy(desc(count()))
    .limit(4);

  const coIds = coBought.map((r) => r.productId);
  const sameCat = await db.query.products.findMany({
    where: and(eq(schema.products.status, "active"), ne(schema.products.id, p.id), p.categoryId ? eq(schema.products.categoryId, p.categoryId) : undefined),
    with: { variants: true, category: true },
    orderBy: desc(schema.products.soldCount),
    limit: 8,
  });
  const co = coIds.length
    ? await db.query.products.findMany({ where: and(inArray(schema.products.id, coIds), eq(schema.products.status, "active")), with: { variants: true, category: true } })
    : [];
  const seen = new Set<string>();
  const merged = [...co, ...sameCat].filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true))).slice(0, 8);
  return c.json({ related: merged.map(toProductDTO), alsoBought: co.map(toProductDTO) });
});
