"use client";

import type { CategoryDTO, DashboardDTO, OrderDTO, ProductDTO, ProductInput } from "@es/shared";
import { useAuth } from "@/store/auth";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

function qs(q?: Query) {
  if (!q) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export async function api<T>(path: string, init: RequestInit & { query?: Query; json?: unknown } = {}): Promise<T> {
  const { query, json, headers, ...rest } = init;
  const token = useAuth.getState().token;
  const res = await fetch(`${API_URL}${path}${qs(query)}`, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  let data: unknown = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (res.status === 401) {
    useAuth.getState().logout();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new ApiError(401, "請重新登入");
  }
  if (!res.ok) {
    const err = (data ?? {}) as { error?: string; details?: unknown };
    throw new ApiError(res.status, err.error ?? `請求失敗 (${res.status})`, err.details);
  }
  return data as T;
}

// ---------- typed helpers ----------
export type Paged<K extends string, T> = { [key in K]: T[] } & { total: number; page: number; pages: number };

export const adminApi = {
  dashboard: () => api<DashboardDTO>("/admin/dashboard"),

  products: (q: Query) => api<Paged<"products", ProductDTO>>("/admin/products", { query: q }),
  product: (id: string) => api<{ product: ProductDTO }>(`/admin/products/${id}`),
  createProduct: (body: ProductInput) => api<{ product: ProductDTO }>("/admin/products", { method: "POST", json: body }),
  updateProduct: (id: string, body: ProductInput) => api<{ product: ProductDTO }>(`/admin/products/${id}`, { method: "PUT", json: body }),
  archiveProduct: (id: string) => api<{ ok: true }>(`/admin/products/${id}`, { method: "DELETE" }),
  bulkProductStatus: (ids: string[], status: "draft" | "active" | "archived") =>
    api<{ ok: true; count: number }>("/admin/products/bulk-status", { method: "POST", json: { ids, status } }),

  categories: () => api<{ categories: CategoryDTO[] }>("/admin/categories"),
  createCategory: (body: CategoryInput) => api<{ category: CategoryDTO }>("/admin/categories", { method: "POST", json: body }),
  updateCategory: (id: string, body: CategoryInput) => api<{ category: CategoryDTO }>(`/admin/categories/${id}`, { method: "PUT", json: body }),
  deleteCategory: (id: string) => api<{ ok: true }>(`/admin/categories/${id}`, { method: "DELETE" }),

  orders: (q: Query) => api<Paged<"orders", OrderDTO>>("/admin/orders", { query: q }),
  order: (id: string) => api<{ order: OrderDTO; events: OrderEvent[] }>(`/admin/orders/${id}`),
  orderStatus: (id: string, status: string, note?: string) => api<{ order: OrderDTO }>(`/admin/orders/${id}/status`, { method: "POST", json: { status, note } }),
  markPaid: (id: string) => api<{ order: OrderDTO }>(`/admin/orders/${id}/mark-paid`, { method: "POST" }),
  addOrderNote: (id: string, message: string) => api<{ ok: true }>(`/admin/orders/${id}/note`, { method: "POST", json: { message } }),
  createShipment: (id: string, body: { trackingNo?: string; packageCount: number; note?: string }) =>
    api<{ order: OrderDTO }>(`/admin/orders/${id}/shipment`, { method: "POST", json: body }),
  updateShipment: (id: string, body: { trackingNo?: string; status?: string; note?: string }) =>
    api<{ order: OrderDTO }>(`/admin/orders/${id}/shipment`, { method: "PATCH", json: body }),
  bulkShip: (ids: string[]) => api<{ results: { id: string; ok: boolean; error?: string }[] }>("/admin/orders/bulk-ship", { method: "POST", json: { ids } }),
  manifests: (ids: string[]) => api<{ manifests: Manifest[] }>("/admin/manifests", { method: "POST", json: { ids } }),

  store: () => api<{ store: StoreSettings | null }>("/admin/settings/store"),
  saveStore: (body: StoreSettingsInput) => api<{ store: StoreSettings }>("/admin/settings/store", { method: "PUT", json: body }),
  paymentConfigs: () => api<{ configs: PaymentConfig[] }>("/admin/settings/payments"),
  savePaymentConfig: (provider: string, body: PaymentConfigInput) => api<{ config: PaymentConfig }>(`/admin/settings/payments/${provider}`, { method: "PUT", json: body }),
  shippingConfigs: () => api<{ configs: ShippingConfig[] }>("/admin/settings/shipping"),
  saveShippingConfig: (method: string, body: ShippingConfigInput) => api<{ config: ShippingConfig }>(`/admin/settings/shipping/${method}`, { method: "PUT", json: body }),

  coupons: () => api<{ coupons: Coupon[] }>("/admin/coupons"),
  createCoupon: (body: CouponInput) => api<{ coupon: Coupon }>("/admin/coupons", { method: "POST", json: body }),
  updateCoupon: (id: string, body: CouponInput) => api<{ coupon: Coupon }>(`/admin/coupons/${id}`, { method: "PUT", json: body }),
  deleteCoupon: (id: string) => api<{ ok: true }>(`/admin/coupons/${id}`, { method: "DELETE" }),

  reviews: () => api<{ reviews: Review[] }>("/admin/reviews"),
  deleteReview: (id: string) => api<{ ok: true }>(`/admin/reviews/${id}`, { method: "DELETE" }),

  customers: (q: Query) => api<{ customers: Customer[] }>("/admin/customers", { query: q }),

  users: () => api<{ users: AdminUserRow[] }>("/admin/users"),
  createUser: (body: { email: string; name: string; password: string; role: string }) => api<{ user: AdminUserRow }>("/admin/users", { method: "POST", json: body }),
  deleteUser: (id: string) => api<{ ok: true }>(`/admin/users/${id}`, { method: "DELETE" }),
};

// ---------- row types not covered by @es/shared ----------
export interface CategoryInput {
  name: string;
  slug: string;
  parentId?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  type: string;
  message: string;
  actor: string;
  createdAt: string;
}

export interface Manifest {
  orderNo: string;
  createdAt: string;
  status: string;
  store: { name: string; phone: string; email: string };
  recipient: { name: string; phone: string; zip: string; city: string; district: string; line1: string; storeId?: string; storeName?: string };
  shippingMethod: string;
  carrier: string | null;
  trackingNo: string | null;
  paymentProvider: string;
  paymentStatus: string;
  items: { sku: string; name: string; variant: string; qty: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  note: string | null;
}

export interface StoreSettings {
  id: string;
  name: string;
  tagline: string;
  logoUrl: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  announcement: string;
}
export interface StoreSettingsInput {
  name: string;
  tagline: string;
  logoUrl?: string | null;
  supportEmail?: string;
  supportPhone?: string;
  announcement: string;
}

export interface PaymentConfig {
  id: string;
  provider: string;
  enabled: boolean;
  credentials: Record<string, string>;
  feePercent: number;
  sortOrder: number;
  meta: { label: string; description: string; fields: { key: string; label: string; secret?: boolean }[] };
}
export interface PaymentConfigInput {
  enabled: boolean;
  credentials: Record<string, string>;
  feePercent: number;
  sortOrder: number;
}

export interface ShippingConfig {
  id: string;
  method: string;
  enabled: boolean;
  fee: number;
  freeThreshold: number | null;
  credentials: Record<string, string>;
  sortOrder: number;
  meta: { label: string; description: string; carrier: string; needsAddress: boolean; needsStore: boolean; etaDays: [number, number] };
}
export interface ShippingConfigInput {
  enabled: boolean;
  fee: number;
  freeThreshold?: number | null;
  credentials: Record<string, string>;
  sortOrder: number;
}

export interface Coupon {
  id: string;
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  minSubtotal: number;
  maxUses: number | null;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  enabled: boolean;
  createdAt: string;
}
export interface CouponInput {
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  minSubtotal: number;
  maxUses?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  enabled: boolean;
}

export interface Review {
  id: string;
  productId: string;
  customerId: string | null;
  authorName: string;
  rating: number;
  title: string | null;
  body: string | null;
  verified: boolean;
  createdAt: string;
  product: { id: string; name: string; slug: string } | null;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
}
