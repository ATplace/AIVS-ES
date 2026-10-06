import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { schema } from "@es/db";
import { cartAddSchema, cartUpdateSchema } from "@es/shared";
import { getDb } from "../lib/db";
import { badRequest, notFound } from "../lib/errors";
import { toCartDTO } from "../lib/dto";
import { optionalAuth, type AuthVars } from "../lib/auth";
import { globalFreeShippingThreshold } from "../modules/shipping";

export const cartRoutes = new Hono<{ Variables: AuthVars }>();
cartRoutes.use("*", optionalAuth);

async function loadCart(cartId: string) {
  const db = getDb();
  const cart = await db.query.carts.findFirst({ where: eq(schema.carts.id, cartId) });
  if (!cart) throw notFound("購物車");
  const rows = await db
    .select({ item: schema.cartItems, variant: schema.productVariants, product: schema.products })
    .from(schema.cartItems)
    .innerJoin(schema.productVariants, eq(schema.productVariants.id, schema.cartItems.variantId))
    .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
    .where(eq(schema.cartItems.cartId, cartId))
    .orderBy(schema.cartItems.addedAt);
  return toCartDTO(cart, rows, await globalFreeShippingThreshold());
}

cartRoutes.post("/", async (c) => {
  const db = getDb();
  const user = c.get("user");
  const [cart] = await db.insert(schema.carts).values({ customerId: user?.kind === "customer" ? user.sub : null }).returning();
  return c.json({ cart: await loadCart(cart.id) }, 201);
});

cartRoutes.get("/:id", async (c) => c.json({ cart: await loadCart(c.req.param("id")) }));

cartRoutes.post("/:id/items", zValidator("json", cartAddSchema), async (c) => {
  const db = getDb();
  const cartId = c.req.param("id");
  const { variantId, quantity } = c.req.valid("json");
  const cart = await db.query.carts.findFirst({ where: eq(schema.carts.id, cartId) });
  if (!cart) throw notFound("購物車");
  const variant = await db.query.productVariants.findFirst({ where: eq(schema.productVariants.id, variantId), with: { product: true } });
  if (!variant || variant.product.status !== "active") throw notFound("商品");
  const existing = await db.query.cartItems.findFirst({ where: and(eq(schema.cartItems.cartId, cartId), eq(schema.cartItems.variantId, variantId)) });
  const newQty = (existing?.quantity ?? 0) + quantity;
  if (newQty > variant.stock) throw badRequest(`庫存不足，僅剩 ${variant.stock} 件`);
  if (existing) await db.update(schema.cartItems).set({ quantity: newQty }).where(eq(schema.cartItems.id, existing.id));
  else await db.insert(schema.cartItems).values({ cartId, variantId, quantity });
  await db.update(schema.carts).set({ updatedAt: new Date() }).where(eq(schema.carts.id, cartId));
  db.insert(schema.events).values({ type: "add_to_cart", productId: variant.productId, cartId, customerId: cart.customerId }).catch(() => {});
  return c.json({ cart: await loadCart(cartId) });
});

cartRoutes.patch("/:id/items/:itemId", zValidator("json", cartUpdateSchema), async (c) => {
  const db = getDb();
  const { id: cartId, itemId } = c.req.param();
  const { quantity } = c.req.valid("json");
  const item = await db.query.cartItems.findFirst({ where: and(eq(schema.cartItems.id, itemId), eq(schema.cartItems.cartId, cartId)), with: { variant: true } });
  if (!item) throw notFound("購物車項目");
  if (quantity === 0) await db.delete(schema.cartItems).where(eq(schema.cartItems.id, itemId));
  else {
    if (quantity > item.variant.stock) throw badRequest(`庫存不足，僅剩 ${item.variant.stock} 件`);
    await db.update(schema.cartItems).set({ quantity }).where(eq(schema.cartItems.id, itemId));
  }
  return c.json({ cart: await loadCart(cartId) });
});

cartRoutes.delete("/:id/items/:itemId", async (c) => {
  const db = getDb();
  const { id: cartId, itemId } = c.req.param();
  await db.delete(schema.cartItems).where(and(eq(schema.cartItems.id, itemId), eq(schema.cartItems.cartId, cartId)));
  return c.json({ cart: await loadCart(cartId) });
});

cartRoutes.delete("/:id", async (c) => {
  const db = getDb();
  await db.delete(schema.cartItems).where(eq(schema.cartItems.cartId, c.req.param("id")));
  return c.json({ cart: await loadCart(c.req.param("id")) });
});
