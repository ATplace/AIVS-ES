import type { CartDTO, CartItemDTO, OrderDTO, ProductDTO, ShipmentDTO, VariantDTO } from "@es/shared";
import type { schema } from "@es/db";

type Product = typeof schema.products.$inferSelect;
type Variant = typeof schema.productVariants.$inferSelect;
type Category = typeof schema.categories.$inferSelect;
type Order = typeof schema.orders.$inferSelect;
type OrderItem = typeof schema.orderItems.$inferSelect;
type Shipment = typeof schema.shipments.$inferSelect;
type Payment = typeof schema.payments.$inferSelect;

export const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

export function toVariantDTO(v: Variant): VariantDTO {
  return {
    id: v.id,
    productId: v.productId,
    sku: v.sku,
    name: v.name,
    options: v.options ?? {},
    price: v.price,
    compareAtPrice: v.compareAtPrice ?? null,
    stock: v.stock,
    weightGrams: v.weightGrams,
  };
}

export function toProductDTO(p: Product & { variants: Variant[]; category?: Category | null }): ProductDTO {
  const variants = [...p.variants].sort((a, b) => a.sortOrder - b.sortOrder).map(toVariantDTO);
  const prices = variants.map((v) => v.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const cheapest = variants.find((v) => v.price === minPrice);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    status: p.status as ProductDTO["status"],
    categoryId: p.categoryId,
    category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
    images: p.images ?? [],
    tags: p.tags ?? [],
    isFeatured: p.isFeatured,
    flashSaleEndsAt: iso(p.flashSaleEndsAt),
    rating: p.rating,
    reviewCount: p.reviewCount,
    soldCount: p.soldCount,
    viewCount: p.viewCount,
    minPrice,
    maxPrice,
    compareAtPrice: cheapest?.compareAtPrice ?? null,
    totalStock: variants.reduce((s, v) => s + v.stock, 0),
    variants,
    createdAt: iso(p.createdAt)!,
  };
}

export function toCartDTO(
  cart: { id: string },
  rows: { item: typeof schema.cartItems.$inferSelect; variant: Variant; product: Product }[],
  freeShippingThreshold: number,
): CartDTO {
  const items: CartItemDTO[] = rows.map(({ item, variant, product }) => ({
    id: item.id,
    variantId: variant.id,
    quantity: item.quantity,
    product: { id: product.id, name: product.name, slug: product.slug, image: product.images?.[0]?.url ?? null },
    variant: {
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice ?? null,
      stock: variant.stock,
    },
    lineTotal: variant.price * item.quantity,
  }));
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  return {
    id: cart.id,
    items,
    subtotal,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    freeShippingThreshold,
    amountToFreeShipping: Math.max(0, freeShippingThreshold - subtotal),
  };
}

export function toShipmentDTO(s: Shipment): ShipmentDTO {
  return {
    id: s.id,
    orderId: s.orderId,
    method: s.method as ShipmentDTO["method"],
    carrier: s.carrier,
    trackingNo: s.trackingNo,
    status: s.status as ShipmentDTO["status"],
    packageCount: s.packageCount,
    shippedAt: iso(s.shippedAt),
    deliveredAt: iso(s.deliveredAt),
    note: s.note,
  };
}

export function toOrderDTO(o: Order & { items: OrderItem[]; shipments?: Shipment[]; payments?: Payment[] }): OrderDTO {
  const shipment = o.shipments?.[0] ?? null;
  const payment = o.payments?.[0] ?? null;
  return {
    id: o.id,
    orderNo: o.orderNo,
    status: o.status as OrderDTO["status"],
    email: o.email,
    customerId: o.customerId,
    subtotal: o.subtotal,
    shippingFee: o.shippingFee,
    discount: o.discount,
    total: o.total,
    currency: o.currency,
    couponCode: o.couponCode,
    shippingMethod: o.shippingMethod as OrderDTO["shippingMethod"],
    shippingAddress: o.shippingAddress,
    paymentProvider: o.paymentProvider as OrderDTO["paymentProvider"],
    paymentStatus: o.paymentStatus as OrderDTO["paymentStatus"],
    note: o.note,
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      variantId: i.variantId,
      productName: i.productName,
      variantName: i.variantName,
      sku: i.sku,
      image: i.image,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    })),
    shipment: shipment ? toShipmentDTO(shipment) : null,
    payment: payment
      ? {
          provider: payment.provider as OrderDTO["paymentProvider"],
          status: payment.status as OrderDTO["paymentStatus"],
          txnId: payment.txnId,
          paidAt: iso(payment.paidAt),
        }
      : null,
    createdAt: iso(o.createdAt)!,
    updatedAt: iso(o.updatedAt)!,
  };
}
