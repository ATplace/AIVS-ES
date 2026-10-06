import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@es/db";
import { checkoutSchema, PAYMENT_PROVIDER_META, SHIPPING_METHODS } from "@es/shared";
import { getDb } from "../lib/db";
import { badRequest, notFound } from "../lib/errors";
import { optionalAuth, type AuthVars } from "../lib/auth";
import { listEnabledPaymentProviders } from "../modules/payment";
import { listShippingQuotes, quoteShipping, searchStores } from "../modules/shipping";
import { validateCoupon } from "../services/pricing";
import { createOrderFromCart } from "../services/orders";

export const checkoutRoutes = new Hono<{ Variables: AuthVars }>();
checkoutRoutes.use("*", optionalAuth);

async function cartSubtotal(cartId: string) {
  const db = getDb();
  const cart = await db.query.carts.findFirst({ where: eq(schema.carts.id, cartId), with: { items: { with: { variant: true } } } });
  if (!cart) throw notFound("購物車");
  return { cart, subtotal: cart.items.reduce((s, it) => s + it.variant.price * it.quantity, 0) };
}

/** 結帳頁初始化：可用金流、物流與費用 */
checkoutRoutes.get("/options", zValidator("query", z.object({ cartId: z.string(), couponCode: z.string().optional() })), async (c) => {
  const { cartId, couponCode } = c.req.valid("query");
  const { subtotal } = await cartSubtotal(cartId);
  let coupon = null;
  let couponError: string | null = null;
  try {
    coupon = await validateCoupon(couponCode, subtotal);
  } catch (e) {
    couponError = (e as Error).message;
  }
  const payments = (await listEnabledPaymentProviders()).map((p) => ({ ...p, label: PAYMENT_PROVIDER_META[p.provider].label, description: PAYMENT_PROVIDER_META[p.provider].description }));
  const shipping = await listShippingQuotes(subtotal, coupon?.freeShipping ?? false);
  void db_track(cartId);
  return c.json({ subtotal, payments, shipping, coupon, couponError });
});

async function db_track(cartId: string) {
  await getDb().insert(schema.events).values({ type: "checkout_start", cartId });
}

/** 試算金額 */
checkoutRoutes.post(
  "/quote",
  zValidator("json", z.object({ cartId: z.string(), shippingMethod: z.enum(SHIPPING_METHODS), couponCode: z.string().optional() })),
  async (c) => {
    const { cartId, shippingMethod, couponCode } = c.req.valid("json");
    const { subtotal } = await cartSubtotal(cartId);
    const coupon = await validateCoupon(couponCode, subtotal);
    const ship = await quoteShipping(shippingMethod, subtotal, coupon?.freeShipping ?? false);
    const discount = coupon?.discount ?? 0;
    return c.json({ subtotal, discount, shippingFee: ship.fee, total: Math.max(0, subtotal - discount + ship.fee), coupon, shipping: ship });
  },
);

checkoutRoutes.get("/stores", zValidator("query", z.object({ method: z.enum(SHIPPING_METHODS), q: z.string().optional() })), async (c) => {
  const { method, q } = c.req.valid("query");
  return c.json({ stores: searchStores(method, q) });
});

/** 建立訂單 */
checkoutRoutes.post("/", zValidator("json", checkoutSchema), async (c) => {
  const input = c.req.valid("json");
  const user = c.get("user");
  if (!input.cartId) throw badRequest("缺少購物車");
  const result = await createOrderFromCart(input, user?.kind === "customer" ? user.sub : null);
  return c.json(result, 201);
});
