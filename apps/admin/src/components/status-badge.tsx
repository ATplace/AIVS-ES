import { ORDER_STATUS_LABEL, PAYMENT_PROVIDER_META, SHIPPING_METHOD_META, type OrderStatus, type PaymentProvider, type PaymentStatus, type ShipmentStatus, type ShippingMethod } from "@es/shared";
import { Badge, type BadgeTone } from "./ui/badge";

const orderTone: Record<OrderStatus, BadgeTone> = {
  pending: "amber",
  paid: "blue",
  processing: "indigo",
  shipped: "violet",
  delivered: "teal",
  completed: "green",
  cancelled: "gray",
  refunded: "red",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const s = status as OrderStatus;
  return (
    <Badge tone={orderTone[s] ?? "gray"} dot>
      {ORDER_STATUS_LABEL[s] ?? status}
    </Badge>
  );
}

const paymentLabel: Record<PaymentStatus, string> = { pending: "待付款", succeeded: "已付款", failed: "付款失敗", refunded: "已退款" };
const paymentTone: Record<PaymentStatus, BadgeTone> = { pending: "amber", succeeded: "green", failed: "red", refunded: "red" };

export function PaymentStatusBadge({ status }: { status: string }) {
  const s = status as PaymentStatus;
  return <Badge tone={paymentTone[s] ?? "gray"}>{paymentLabel[s] ?? status}</Badge>;
}

export function paymentProviderLabel(p: string) {
  return PAYMENT_PROVIDER_META[p as PaymentProvider]?.label ?? p;
}
export function shippingMethodLabel(m: string) {
  return SHIPPING_METHOD_META[m as ShippingMethod]?.label ?? m;
}

const shipmentLabel: Record<ShipmentStatus, string> = { pending: "待出貨", ready: "已備貨", shipped: "已出貨", in_transit: "配送中", delivered: "已送達", returned: "已退回" };
const shipmentTone: Record<ShipmentStatus, BadgeTone> = { pending: "amber", ready: "blue", shipped: "violet", in_transit: "indigo", delivered: "teal", returned: "red" };
export function ShipmentStatusBadge({ status }: { status: string }) {
  const s = status as ShipmentStatus;
  return <Badge tone={shipmentTone[s] ?? "gray"}>{shipmentLabel[s] ?? status}</Badge>;
}
export const SHIPMENT_STATUS_OPTIONS = Object.entries(shipmentLabel) as [ShipmentStatus, string][];

const productLabel = { draft: "草稿", active: "上架中", archived: "已封存" } as const;
const productTone: Record<keyof typeof productLabel, BadgeTone> = { draft: "amber", active: "green", archived: "gray" };
export function ProductStatusBadge({ status }: { status: string }) {
  const s = status as keyof typeof productLabel;
  return <Badge tone={productTone[s] ?? "gray"}>{productLabel[s] ?? status}</Badge>;
}
