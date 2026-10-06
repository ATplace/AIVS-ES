import { and, eq } from "drizzle-orm";
import { schema } from "@es/db";
import type { CouponType } from "@es/shared";
import { getDb } from "../lib/db";
import { badRequest } from "../lib/errors";

export interface CouponResult {
  code: string;
  type: CouponType;
  value: number;
  discount: number; // 折抵金額 (不含免運)
  freeShipping: boolean;
}

export async function validateCoupon(code: string | undefined, subtotal: number): Promise<CouponResult | null> {
  if (!code) return null;
  const db = getDb();
  const c = await db.query.coupons.findFirst({ where: and(eq(schema.coupons.code, code.toUpperCase()), eq(schema.coupons.enabled, true)) });
  if (!c) throw badRequest("優惠碼無效");
  const now = Date.now();
  if (c.startsAt && now < new Date(c.startsAt).getTime()) throw badRequest("優惠碼尚未開始");
  if (c.endsAt && now > new Date(c.endsAt).getTime()) throw badRequest("優惠碼已過期");
  if (c.maxUses != null && c.usedCount >= c.maxUses) throw badRequest("優惠碼已達使用上限");
  if (subtotal < c.minSubtotal) throw badRequest(`需消費滿 NT$${c.minSubtotal.toLocaleString()} 才可使用此優惠碼`);

  const type = c.type as CouponType;
  let discount = 0;
  if (type === "percent") discount = Math.round((subtotal * c.value) / 100);
  if (type === "fixed") discount = Math.min(subtotal, Math.round(c.value));
  return { code: c.code, type, value: c.value, discount, freeShipping: type === "free_shipping" };
}
