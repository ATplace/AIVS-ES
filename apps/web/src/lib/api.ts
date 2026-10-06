import type { CartDTO, CategoryDTO, CheckoutInput, OrderDTO, PaymentProvider, ProductDTO, ShippingMethod } from "@es/shared";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiRequestError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function clientToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("es-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string | null } };
    return parsed.state?.token ?? null;
  } catch {
    return null;
  }
}

type Opts = RequestInit & { revalidate?: number; token?: string | null };

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const { revalidate, token, headers, ...init } = opts;
  const h: Record<string, string> = { Accept: "application/json", ...(headers as Record<string, string>) };
  if (init.body && typeof init.body === "string") h["Content-Type"] = "application/json";
  const t = token ?? clientToken();
  if (t) h.Authorization = `Bearer ${t}`;

  const fetchInit: RequestInit = { ...init, headers: h };
  if (typeof window === "undefined") {
    if (revalidate != null) fetchInit.next = { revalidate };
    else fetchInit.cache = "no-store";
  }

  const res = await fetch(`${API_URL}${path}`, fetchInit);
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const err = (json as { error?: string; details?: unknown }) ?? {};
    throw new ApiRequestError(res.status, err.error ?? `請求失敗 (${res.status})`, err.details);
  }
  return json as T;
}

// ---------- 型別 ----------
export interface HomeData {
  store: { name: string; tagline: string; logoUrl: string | null; announcement: string } | null;
  categories: CategoryDTO[];
  featured: ProductDTO[];
  flashSale: ProductDTO[];
  trending: ProductDTO[];
  newest: ProductDTO[];
  social: { ordersLast24h: number };
}

export interface ProductListResult {
  products: ProductDTO[];
  total: number;
  page: number;
  pages: number;
}

export interface ProductDetailResult {
  product: ProductDTO;
  social: { viewingNow: number; soldLast24h: number };
}

export interface ReviewDTO {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string | null;
  verified: boolean;
  createdAt: string;
}

export interface ReviewsResult {
  reviews: ReviewDTO[];
  distribution: { star: number; count: number }[];
  average: number;
  total: number;
}

export interface ShippingQuote {
  method: ShippingMethod;
  label: string;
  description: string;
  carrier: string;
  fee: number;
  freeThreshold: number | null;
  isFree: boolean;
  etaDays: [number, number];
  needsAddress: boolean;
  needsStore: boolean;
}

export interface CouponInfo {
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  discount: number;
  freeShipping: boolean;
}

export interface CheckoutOptions {
  subtotal: number;
  payments: { provider: PaymentProvider; feePercent: number; label: string; description: string }[];
  shipping: ShippingQuote[];
  coupon: CouponInfo | null;
  couponError: string | null;
}

export interface QuoteResult {
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  coupon: CouponInfo | null;
  shipping: ShippingQuote;
}

export type PaymentAction =
  | { kind: "redirect"; url: string }
  | { kind: "form"; action: string; method: "POST"; fields: Record<string, string> }
  | { kind: "none" };

export interface OrderEventDTO {
  id: string;
  type: string;
  message: string;
  actor: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
}

// ---------- Catalog ----------
export const getHome = () => api<HomeData>("/catalog/home");
export const getCategories = () => api<{ categories: CategoryDTO[] }>("/catalog/categories", { revalidate: 60 });
export const getProducts = (params: Record<string, string | number | undefined>) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  return api<ProductListResult>(`/catalog/products?${qs.toString()}`);
};
export const getProduct = (slug: string) => api<ProductDetailResult>(`/catalog/products/${encodeURIComponent(slug)}`);
export const getReviews = (slug: string) => api<ReviewsResult>(`/catalog/products/${encodeURIComponent(slug)}/reviews`);
export const postReview = (slug: string, body: { rating: number; title?: string; body?: string }) =>
  api<{ review: ReviewDTO }>(`/catalog/products/${encodeURIComponent(slug)}/reviews`, { method: "POST", body: JSON.stringify(body) });
export const getRelated = (slug: string) => api<{ related: ProductDTO[]; alsoBought: ProductDTO[] }>(`/catalog/products/${encodeURIComponent(slug)}/related`);
export const getSuggestions = (q: string) => api<{ suggestions: { name: string; slug: string; image: string | null }[] }>(`/catalog/suggest?q=${encodeURIComponent(q)}`);

// ---------- Cart ----------
export const createCart = () => api<{ cart: CartDTO }>("/cart", { method: "POST" });
export const getCart = (id: string) => api<{ cart: CartDTO }>(`/cart/${id}`);
export const addCartItem = (id: string, variantId: string, quantity: number) =>
  api<{ cart: CartDTO }>(`/cart/${id}/items`, { method: "POST", body: JSON.stringify({ variantId, quantity }) });
export const updateCartItem = (id: string, itemId: string, quantity: number) =>
  api<{ cart: CartDTO }>(`/cart/${id}/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ quantity }) });
export const removeCartItem = (id: string, itemId: string) => api<{ cart: CartDTO }>(`/cart/${id}/items/${itemId}`, { method: "DELETE" });

// ---------- Checkout ----------
export const getCheckoutOptions = (cartId: string, couponCode?: string) =>
  api<CheckoutOptions>(`/checkout/options?cartId=${encodeURIComponent(cartId)}${couponCode ? `&couponCode=${encodeURIComponent(couponCode)}` : ""}`);
export const quoteCheckout = (body: { cartId: string; shippingMethod: ShippingMethod; couponCode?: string }) =>
  api<QuoteResult>("/checkout/quote", { method: "POST", body: JSON.stringify(body) });
export const searchStores = (method: ShippingMethod, q = "") =>
  api<{ stores: { id: string; name: string; address: string }[] }>(`/checkout/stores?method=${method}&q=${encodeURIComponent(q)}`);
export const submitCheckout = (body: CheckoutInput) => api<{ order: OrderDTO; payment: PaymentAction }>("/checkout", { method: "POST", body: JSON.stringify(body) });

// ---------- Orders ----------
export const getOrder = (orderNo: string, email?: string) =>
  api<{ order: OrderDTO; events: OrderEventDTO[] }>(`/orders/${encodeURIComponent(orderNo)}${email ? `?email=${encodeURIComponent(email)}` : ""}`);
export const getMyOrders = () => api<{ orders: OrderDTO[] }>("/orders");
export const cancelOrder = (orderNo: string, email?: string) =>
  api<{ order: OrderDTO }>(`/orders/${encodeURIComponent(orderNo)}/cancel`, { method: "POST", body: JSON.stringify({ email }) });

// ---------- Auth ----------
export const login = (email: string, password: string) => api<{ token: string; user: AuthUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
export const register = (body: { email: string; password: string; name: string; phone?: string }) =>
  api<{ token: string; user: AuthUser }>("/auth/register", { method: "POST", body: JSON.stringify(body) });
