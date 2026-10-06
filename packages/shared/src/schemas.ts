import { z } from "zod";
import { COUPON_TYPES, ORDER_STATUS, PAYMENT_PROVIDERS, SHIPPING_METHODS, ADMIN_ROLES } from "./constants";

// ---------- Auth ----------
export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});
export const registerSchema = loginSchema.extend({
  name: z.string().min(1).max(50),
  phone: z.string().min(8).max(20).optional(),
});

// ---------- Catalog (admin) ----------
export const variantInputSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1),
  name: z.string().min(1), // e.g. "黑色 / M"
  options: z.record(z.string(), z.string()).default({}), // { 顏色: "黑色", 尺寸: "M" }
  price: z.number().int().nonnegative(),
  compareAtPrice: z.number().int().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative().default(0),
  weightGrams: z.number().int().nonnegative().default(0),
});

export const productInputSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().default(""),
  categoryId: z.string().nullable().optional(),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  images: z.array(z.object({ url: z.url(), alt: z.string().default("") })).default([]),
  tags: z.array(z.string()).default([]),
  isFeatured: z.boolean().default(false),
  flashSaleEndsAt: z.string().datetime().nullable().optional(),
  variants: z.array(variantInputSchema).min(1),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const categoryInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  parentId: z.string().nullable().optional(),
  imageUrl: z.url().nullable().optional(),
  sortOrder: z.number().int().default(0),
});

// ---------- Cart ----------
export const cartAddSchema = z.object({
  variantId: z.string(),
  quantity: z.number().int().min(1).max(99).default(1),
});
export const cartUpdateSchema = z.object({
  quantity: z.number().int().min(0).max(99),
});

// ---------- Checkout ----------
export const addressSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
  zip: z.string().optional().default(""),
  city: z.string().optional().default(""),
  district: z.string().optional().default(""),
  line1: z.string().optional().default(""),
});

export const checkoutSchema = z.object({
  cartId: z.string(),
  email: z.email(),
  shippingMethod: z.enum(SHIPPING_METHODS),
  address: addressSchema,
  storeId: z.string().optional(), // 超商門市代號
  storeName: z.string().optional(),
  paymentProvider: z.enum(PAYMENT_PROVIDERS),
  couponCode: z.string().optional(),
  note: z.string().max(500).optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ---------- Orders (admin) ----------
export const orderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUS),
  note: z.string().optional(),
});

export const createShipmentSchema = z.object({
  trackingNo: z.string().optional(),
  packageCount: z.number().int().min(1).default(1),
  note: z.string().optional(),
});

// ---------- Settings (admin) ----------
export const paymentConfigSchema = z.object({
  provider: z.enum(PAYMENT_PROVIDERS),
  enabled: z.boolean(),
  credentials: z.record(z.string(), z.string()).default({}),
  feePercent: z.number().min(0).max(100).default(0),
  sortOrder: z.number().int().default(0),
});

export const shippingConfigSchema = z.object({
  method: z.enum(SHIPPING_METHODS),
  enabled: z.boolean(),
  fee: z.number().int().nonnegative(),
  freeThreshold: z.number().int().nonnegative().nullable().optional(),
  credentials: z.record(z.string(), z.string()).default({}),
  sortOrder: z.number().int().default(0),
});

export const storeSettingsSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().default(""),
  logoUrl: z.url().nullable().optional(),
  supportEmail: z.email().optional(),
  supportPhone: z.string().optional(),
  announcement: z.string().default(""),
});

// ---------- Coupons ----------
export const couponInputSchema = z.object({
  code: z.string().min(2).max(30).transform((s) => s.toUpperCase()),
  type: z.enum(COUPON_TYPES),
  value: z.number().nonnegative(),
  minSubtotal: z.number().int().nonnegative().default(0),
  maxUses: z.number().int().positive().nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  enabled: z.boolean().default(true),
});

// ---------- Reviews ----------
export const reviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  body: z.string().max(2000).optional(),
});

// ---------- Admin users ----------
export const adminUserInputSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(ADMIN_ROLES).default("staff"),
});
