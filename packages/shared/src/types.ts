import type { OrderStatus, PaymentProvider, PaymentStatus, ShipmentStatus, ShippingMethod } from "./constants";

/** API 回傳的公開商品 DTO (前台使用) */
export interface ProductDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "draft" | "active" | "archived";
  categoryId: string | null;
  category?: { id: string; name: string; slug: string } | null;
  images: { url: string; alt: string }[];
  tags: string[];
  isFeatured: boolean;
  flashSaleEndsAt: string | null;
  rating: number;
  reviewCount: number;
  soldCount: number;
  viewCount: number;
  minPrice: number;
  maxPrice: number;
  compareAtPrice: number | null;
  totalStock: number;
  variants: VariantDTO[];
  createdAt: string;
}

export interface VariantDTO {
  id: string;
  productId: string;
  sku: string;
  name: string;
  options: Record<string, string>;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  weightGrams: number;
}

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  sortOrder: number;
  productCount?: number;
}

export interface CartItemDTO {
  id: string;
  variantId: string;
  quantity: number;
  product: { id: string; name: string; slug: string; image: string | null };
  variant: { id: string; name: string; sku: string; price: number; compareAtPrice: number | null; stock: number };
  lineTotal: number;
}

export interface CartDTO {
  id: string;
  items: CartItemDTO[];
  subtotal: number;
  itemCount: number;
  freeShippingThreshold: number;
  amountToFreeShipping: number;
}

export interface OrderItemDTO {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderDTO {
  id: string;
  orderNo: string;
  status: OrderStatus;
  email: string;
  customerId: string | null;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  currency: string;
  couponCode: string | null;
  shippingMethod: ShippingMethod;
  shippingAddress: {
    name: string;
    phone: string;
    zip: string;
    city: string;
    district: string;
    line1: string;
    storeId?: string;
    storeName?: string;
  };
  paymentProvider: PaymentProvider;
  paymentStatus: PaymentStatus;
  note: string | null;
  items: OrderItemDTO[];
  shipment: ShipmentDTO | null;
  payment: { provider: PaymentProvider; status: PaymentStatus; txnId: string | null; paidAt: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentDTO {
  id: string;
  orderId: string;
  method: ShippingMethod;
  carrier: string;
  trackingNo: string | null;
  status: ShipmentStatus;
  packageCount: number;
  shippedAt: string | null;
  deliveredAt: string | null;
  note: string | null;
}

export interface DashboardDTO {
  today: { revenue: number; orders: number; aov: number };
  last7Days: { date: string; revenue: number; orders: number }[];
  topProducts: { productId: string; name: string; sold: number; revenue: number }[];
  statusBreakdown: Record<string, number>;
  lowStock: { variantId: string; productName: string; variantName: string; stock: number }[];
  conversion: { views: number; carts: number; orders: number };
}

export interface ApiError {
  error: string;
  details?: unknown;
}
