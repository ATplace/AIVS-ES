import { and, eq, inArray, sql } from "drizzle-orm";
import { schema } from "@es/db";
import { ORDER_TRANSITIONS, generateOrderNo, type CheckoutInput, type OrderStatus } from "@es/shared";
import { getDb } from "../lib/db";
import { badRequest, notFound } from "../lib/errors";
import { toOrderDTO } from "../lib/dto";
import { validateCoupon } from "./pricing";
import { quoteShipping, createCarrierShipment } from "../modules/shipping";
import { getPaymentProvider, getPaymentConfig, paymentUrls, type PaymentAction } from "../modules/payment";

export async function loadOrderDTO(where: { id?: string; orderNo?: string }) {
  const db = getDb();
  const o = await db.query.orders.findFirst({
    where: where.id ? eq(schema.orders.id, where.id) : eq(schema.orders.orderNo, where.orderNo!),
    with: { items: true, shipments: true, payments: { orderBy: (p, { desc }) => desc(p.createdAt) } },
  });
  if (!o) throw notFound("訂單");
  return toOrderDTO(o);
}

/** 由購物車建立訂單：鎖定庫存、計算金額、建立付款動作 */
export async function createOrderFromCart(input: CheckoutInput, customerId: string | null) {
  const db = getDb();
  const cart = await db.query.carts.findFirst({
    where: eq(schema.carts.id, input.cartId),
    with: { items: { with: { variant: { with: { product: true } } } } },
  });
  if (!cart || cart.items.length === 0) throw badRequest("購物車是空的");

  // 1. 庫存檢查
  for (const it of cart.items) {
    if (it.variant.product.status !== "active") throw badRequest(`「${it.variant.product.name}」已下架`);
    if (it.variant.stock < it.quantity) throw badRequest(`「${it.variant.product.name} ${it.variant.name}」庫存不足，僅剩 ${it.variant.stock} 件`);
  }

  // 2. 金額
  const subtotal = cart.items.reduce((s, it) => s + it.variant.price * it.quantity, 0);
  const coupon = await validateCoupon(input.couponCode, subtotal);
  const shipping = await quoteShipping(input.shippingMethod, subtotal, coupon?.freeShipping ?? false);
  if (shipping.needsStore && !input.storeId) throw badRequest("請選擇取貨門市");
  if (shipping.needsAddress && !input.address.line1) throw badRequest("請填寫收件地址");
  const discount = coupon?.discount ?? 0;
  const total = Math.max(0, subtotal - discount + shipping.fee);

  // 3. 金流可用性
  const paymentCfg = await getPaymentConfig(input.paymentProvider);
  const provider = getPaymentProvider(input.paymentProvider);

  const orderNo = generateOrderNo();
  const isCod = input.paymentProvider === "cod";

  // 4. 交易：扣庫存、寫訂單
  const created = await db.transaction(async (tx) => {
    for (const it of cart.items) {
      const res = await tx
        .update(schema.productVariants)
        .set({ stock: sql`${schema.productVariants.stock} - ${it.quantity}` })
        .where(and(eq(schema.productVariants.id, it.variantId), sql`${schema.productVariants.stock} >= ${it.quantity}`))
        .returning({ id: schema.productVariants.id });
      if (res.length === 0) throw badRequest(`「${it.variant.product.name}」庫存不足`);
    }

    const [order] = await tx
      .insert(schema.orders)
      .values({
        orderNo,
        customerId,
        email: input.email,
        status: isCod ? "processing" : "pending",
        subtotal,
        shippingFee: shipping.fee,
        discount,
        total,
        couponCode: coupon?.code ?? null,
        shippingMethod: input.shippingMethod,
        shippingAddress: { ...input.address, storeId: input.storeId, storeName: input.storeName },
        paymentProvider: input.paymentProvider,
        paymentStatus: "pending",
        note: input.note ?? null,
      })
      .returning();

    await tx.insert(schema.orderItems).values(
      cart.items.map((it) => ({
        orderId: order.id,
        productId: it.variant.productId,
        variantId: it.variantId,
        productName: it.variant.product.name,
        variantName: it.variant.name,
        sku: it.variant.sku,
        image: it.variant.product.images?.[0]?.url ?? null,
        unitPrice: it.variant.price,
        quantity: it.quantity,
        lineTotal: it.variant.price * it.quantity,
      })),
    );

    await tx.insert(schema.payments).values({ orderId: order.id, provider: input.paymentProvider, status: "pending", amount: total });
    await tx.insert(schema.orderEvents).values({ orderId: order.id, type: "created", message: `訂單建立，付款方式：${input.paymentProvider}`, actor: "customer" });
    if (coupon) await tx.update(schema.coupons).set({ usedCount: sql`${schema.coupons.usedCount} + 1` }).where(eq(schema.coupons.code, coupon.code));
    await tx.insert(schema.events).values({ type: "order", cartId: cart.id, customerId, meta: { orderNo, total } });

    // 清空購物車
    await tx.delete(schema.cartItems).where(eq(schema.cartItems.cartId, cart.id));
    return order;
  });

  // 5. 建立付款動作 (在交易外呼叫外部 API)
  const itemSummary = cart.items.map((it) => `${it.variant.product.name} x${it.quantity}`).join("#");
  let action: PaymentAction;
  try {
    action = await provider.createPayment(
      { orderNo, total, currency: "TWD", email: input.email, itemSummary },
      paymentCfg.credentials,
      paymentUrls(input.paymentProvider, orderNo),
    );
  } catch (e) {
    await db.insert(schema.orderEvents).values({ orderId: created.id, type: "payment", message: `建立付款失敗：${(e as Error).message}`, actor: "system" });
    throw badRequest(`建立付款失敗：${(e as Error).message}`);
  }

  const order = await loadOrderDTO({ id: created.id });
  return { order, payment: action };
}

/** 金流回呼：標記已付款 (冪等) */
export async function markOrderPaid(orderNo: string, info: { txnId?: string; amount?: number; raw: Record<string, unknown> }, actor = "gateway") {
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.orderNo, orderNo) });
  if (!order) throw notFound("訂單");
  if (order.paymentStatus === "succeeded") return order; // 冪等
  if (info.amount != null && info.amount !== order.total) {
    await db.insert(schema.orderEvents).values({ orderId: order.id, type: "payment", message: `付款金額不符：收到 ${info.amount}，應為 ${order.total}`, actor });
    throw badRequest("付款金額不符");
  }
  await db.transaction(async (tx) => {
    await tx.update(schema.orders).set({ status: "paid", paymentStatus: "succeeded" }).where(eq(schema.orders.id, order.id));
    await tx
      .update(schema.payments)
      .set({ status: "succeeded", txnId: info.txnId ?? null, rawPayload: info.raw, paidAt: new Date() })
      .where(eq(schema.payments.orderId, order.id));
    await tx.insert(schema.orderEvents).values({ orderId: order.id, type: "payment", message: `付款成功 ${info.txnId ? `(交易號 ${info.txnId})` : ""}`, actor });
    // 銷量統計
    const items = await tx.query.orderItems.findMany({ where: eq(schema.orderItems.orderId, order.id) });
    for (const it of items) {
      await tx.update(schema.products).set({ soldCount: sql`${schema.products.soldCount} + ${it.quantity}` }).where(eq(schema.products.id, it.productId));
    }
  });
  return order;
}

export async function markOrderPaymentFailed(orderNo: string, raw: Record<string, unknown>) {
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.orderNo, orderNo) });
  if (!order || order.paymentStatus === "succeeded") return;
  await db.update(schema.payments).set({ status: "failed", rawPayload: raw }).where(eq(schema.payments.orderId, order.id));
  await db.insert(schema.orderEvents).values({ orderId: order.id, type: "payment", message: "付款失敗或取消", actor: "gateway" });
}

/** 狀態轉移 (含還原庫存) */
export async function transitionOrder(orderId: string, next: OrderStatus, actor: string, note?: string) {
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId), with: { items: true } });
  if (!order) throw notFound("訂單");
  const cur = order.status as OrderStatus;
  if (cur === next) return order;
  if (!ORDER_TRANSITIONS[cur].includes(next)) throw badRequest(`不允許從「${cur}」轉為「${next}」`);

  await db.transaction(async (tx) => {
    const patch: Partial<typeof schema.orders.$inferInsert> = { status: next };
    if (next === "refunded") patch.paymentStatus = "refunded";
    await tx.update(schema.orders).set(patch).where(eq(schema.orders.id, orderId));

    if (next === "cancelled" || next === "refunded") {
      for (const it of order.items) {
        await tx.update(schema.productVariants).set({ stock: sql`${schema.productVariants.stock} + ${it.quantity}` }).where(eq(schema.productVariants.id, it.variantId));
      }
      if (next === "refunded") await tx.update(schema.payments).set({ status: "refunded" }).where(eq(schema.payments.orderId, orderId));
    }
    if (next === "delivered") {
      await tx.update(schema.shipments).set({ status: "delivered", deliveredAt: new Date() }).where(eq(schema.shipments.orderId, orderId));
    }
    await tx.insert(schema.orderEvents).values({ orderId, type: "status", message: `狀態 ${cur} → ${next}${note ? `：${note}` : ""}`, actor });
  });
  return loadOrderDTO({ id: orderId });
}

/** 建立出貨單並將訂單轉為已出貨 */
export async function createShipmentForOrder(orderId: string, input: { trackingNo?: string; packageCount: number; note?: string }, actor: string) {
  const db = getDb();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId), with: { shipments: true } });
  if (!order) throw notFound("訂單");
  if (!["paid", "processing"].includes(order.status)) throw badRequest("只有已付款或處理中的訂單可以出貨");
  if (order.shipments.length > 0) throw badRequest("此訂單已建立出貨單");

  const carrier = createCarrierShipment(order.shippingMethod as never, order.orderNo);
  await db.transaction(async (tx) => {
    await tx.insert(schema.shipments).values({
      orderId,
      method: order.shippingMethod,
      carrier: carrier.carrier,
      trackingNo: input.trackingNo || carrier.trackingNo,
      status: "shipped",
      packageCount: input.packageCount,
      shippedAt: new Date(),
      note: input.note ?? null,
    });
    await tx.update(schema.orders).set({ status: "shipped" }).where(eq(schema.orders.id, orderId));
    await tx.insert(schema.orderEvents).values({ orderId, type: "shipment", message: `已出貨：${carrier.carrier} ${input.trackingNo || carrier.trackingNo || ""}`, actor });
  });
  return loadOrderDTO({ id: orderId });
}

/** 出貨明細 (揀貨單 / 出貨單列印資料) */
export async function buildManifest(orderIds: string[]) {
  const db = getDb();
  const store = await db.query.stores.findFirst();
  const rows = await db.query.orders.findMany({
    where: inArray(schema.orders.id, orderIds),
    with: { items: true, shipments: true },
  });
  return rows.map((o) => ({
    orderNo: o.orderNo,
    createdAt: o.createdAt,
    status: o.status,
    store: { name: store?.name ?? "", phone: store?.supportPhone ?? "", email: store?.supportEmail ?? "" },
    recipient: o.shippingAddress,
    shippingMethod: o.shippingMethod,
    carrier: o.shipments[0]?.carrier ?? null,
    trackingNo: o.shipments[0]?.trackingNo ?? null,
    paymentProvider: o.paymentProvider,
    paymentStatus: o.paymentStatus,
    items: o.items.map((i) => ({ sku: i.sku, name: i.productName, variant: i.variantName, qty: i.quantity, unitPrice: i.unitPrice, lineTotal: i.lineTotal })),
    subtotal: o.subtotal,
    shippingFee: o.shippingFee,
    discount: o.discount,
    total: o.total,
    note: o.note,
  }));
}
