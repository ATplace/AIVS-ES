import { relations, sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date());

// ---------- 商家 / 店鋪 ----------
export const stores = pgTable("stores", {
  id: id(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  logoUrl: text("logo_url"),
  supportEmail: text("support_email"),
  supportPhone: text("support_phone"),
  announcement: text("announcement").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const adminUsers = pgTable("admin_users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("staff"), // owner | manager | staff
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
});

// ---------- 顧客 ----------
export const customers = pgTable("customers", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name").notNull(),
  phone: text("phone"),
  createdAt: createdAt(),
});

export const addresses = pgTable("addresses", {
  id: id(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  zip: text("zip").notNull().default(""),
  city: text("city").notNull().default(""),
  district: text("district").notNull().default(""),
  line1: text("line1").notNull().default(""),
  isDefault: boolean("is_default").notNull().default(false),
});

// ---------- 商品目錄 ----------
export const categories = pgTable("categories", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  parentId: text("parent_id"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const products = pgTable(
  "products",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    status: text("status").notNull().default("draft"), // draft | active | archived
    images: jsonb("images").$type<{ url: string; alt: string }[]>().notNull().default([]),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    isFeatured: boolean("is_featured").notNull().default(false),
    flashSaleEndsAt: timestamp("flash_sale_ends_at", { withTimezone: true }),
    rating: real("rating").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    soldCount: integer("sold_count").notNull().default(0),
    viewCount: integer("view_count").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("products_status_idx").on(t.status), index("products_category_idx").on(t.categoryId)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    name: text("name").notNull(),
    options: jsonb("options").$type<Record<string, string>>().notNull().default({}),
    price: integer("price").notNull(),
    compareAtPrice: integer("compare_at_price"),
    stock: integer("stock").notNull().default(0),
    weightGrams: integer("weight_grams").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("variants_product_idx").on(t.productId)],
);

export const reviews = pgTable("reviews", {
  id: id(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  rating: integer("rating").notNull(),
  title: text("title"),
  body: text("body"),
  verified: boolean("verified").notNull().default(false),
  createdAt: createdAt(),
});

// ---------- 購物車 ----------
export const carts = pgTable("carts", {
  id: id(),
  customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: id(),
    cartId: text("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    addedAt: createdAt(),
  },
  (t) => [uniqueIndex("cart_items_unique").on(t.cartId, t.variantId)],
);

// ---------- 訂單 ----------
export type ShippingAddress = {
  name: string;
  phone: string;
  zip: string;
  city: string;
  district: string;
  line1: string;
  storeId?: string;
  storeName?: string;
};

export const orders = pgTable(
  "orders",
  {
    id: id(),
    orderNo: text("order_no").notNull().unique(),
    customerId: text("customer_id").references(() => customers.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    status: text("status").notNull().default("pending"),
    subtotal: integer("subtotal").notNull(),
    shippingFee: integer("shipping_fee").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    total: integer("total").notNull(),
    currency: text("currency").notNull().default("TWD"),
    couponCode: text("coupon_code"),
    shippingMethod: text("shipping_method").notNull(),
    shippingAddress: jsonb("shipping_address").$type<ShippingAddress>().notNull(),
    paymentProvider: text("payment_provider").notNull(),
    paymentStatus: text("payment_status").notNull().default("pending"),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("orders_status_idx").on(t.status), index("orders_customer_idx").on(t.customerId), index("orders_created_idx").on(t.createdAt)],
);

export const orderItems = pgTable("order_items", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  variantId: text("variant_id").notNull(),
  productName: text("product_name").notNull(),
  variantName: text("variant_name").notNull(),
  sku: text("sku").notNull(),
  image: text("image"),
  unitPrice: integer("unit_price").notNull(),
  quantity: integer("quantity").notNull(),
  lineTotal: integer("line_total").notNull(),
});

export const orderEvents = pgTable("order_events", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // created | status | payment | shipment | note
  message: text("message").notNull(),
  actor: text("actor").notNull().default("system"),
  createdAt: createdAt(),
});

export const payments = pgTable("payments", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  status: text("status").notNull().default("pending"),
  amount: integer("amount").notNull(),
  txnId: text("txn_id"),
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const shipments = pgTable("shipments", {
  id: id(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  method: text("method").notNull(),
  carrier: text("carrier").notNull(),
  trackingNo: text("tracking_no"),
  status: text("status").notNull().default("pending"),
  packageCount: integer("package_count").notNull().default(1),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  note: text("note"),
  createdAt: createdAt(),
});

// ---------- 設定 ----------
export const paymentConfigs = pgTable("payment_configs", {
  id: id(),
  provider: text("provider").notNull().unique(),
  enabled: boolean("enabled").notNull().default(false),
  credentials: jsonb("credentials").$type<Record<string, string>>().notNull().default({}),
  feePercent: real("fee_percent").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const shippingConfigs = pgTable("shipping_configs", {
  id: id(),
  method: text("method").notNull().unique(),
  enabled: boolean("enabled").notNull().default(false),
  fee: integer("fee").notNull().default(0),
  freeThreshold: integer("free_threshold"),
  credentials: jsonb("credentials").$type<Record<string, string>>().notNull().default({}),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const coupons = pgTable("coupons", {
  id: id(),
  code: text("code").notNull().unique(),
  type: text("type").notNull(), // percent | fixed | free_shipping
  value: real("value").notNull().default(0),
  minSubtotal: integer("min_subtotal").notNull().default(0),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: createdAt(),
});

/** 瀏覽/行為事件，供儀表板轉換漏斗與推薦使用 */
export const events = pgTable(
  "events",
  {
    id: id(),
    type: text("type").notNull(), // view_product | add_to_cart | checkout_start | order
    productId: text("product_id"),
    cartId: text("cart_id"),
    customerId: text("customer_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("events_type_created_idx").on(t.type, t.createdAt)],
);

// ---------- Relations ----------
export const categoriesRelations = relations(categories, ({ many }) => ({ products: many(products) }));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  variants: many(productVariants),
  reviews: many(reviews),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
}));

export const cartsRelations = relations(carts, ({ many }) => ({ items: many(cartItems) }));
export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(productVariants, { fields: [cartItems.variantId], references: [productVariants.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  items: many(orderItems),
  events: many(orderEvents),
  payments: many(payments),
  shipments: many(shipments),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));
export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));
export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(orders, { fields: [shipments.orderId], references: [orders.id] }),
}));
export const customersRelations = relations(customers, ({ many }) => ({ orders: many(orders), addresses: many(addresses) }));
export const addressesRelations = relations(addresses, ({ one }) => ({
  customer: one(customers, { fields: [addresses.customerId], references: [customers.id] }),
}));
