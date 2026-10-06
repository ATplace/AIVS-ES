// ---------- 訂單狀態機 ----------
export const ORDER_STATUS = [
  "pending", // 已建立，待付款
  "paid", // 已付款，待出貨
  "processing", // 揀貨中
  "shipped", // 已出貨
  "delivered", // 已送達
  "completed", // 已完成 (鑑賞期結束)
  "cancelled", // 已取消
  "refunded", // 已退款
] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "待付款",
  paid: "已付款",
  processing: "處理中",
  shipped: "已出貨",
  delivered: "已送達",
  completed: "已完成",
  cancelled: "已取消",
  refunded: "已退款",
};

/** 允許的狀態轉移 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["processing", "shipped", "refunded", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["completed", "refunded"],
  completed: ["refunded"],
  cancelled: [],
  refunded: [],
};

// ---------- 付款 ----------
export const PAYMENT_STATUS = ["pending", "succeeded", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const PAYMENT_PROVIDERS = ["mock", "ecpay", "newebpay", "stripe", "linepay", "cod"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_PROVIDER_META: Record<
  PaymentProvider,
  { label: string; description: string; fields: { key: string; label: string; secret?: boolean }[] }
> = {
  mock: {
    label: "測試金流",
    description: "開發用模擬付款，不會真的扣款。",
    fields: [],
  },
  ecpay: {
    label: "綠界 ECPay",
    description: "信用卡、ATM、超商代碼。台灣最常用的金流。",
    fields: [
      { key: "merchantId", label: "特店編號 MerchantID" },
      { key: "hashKey", label: "HashKey", secret: true },
      { key: "hashIV", label: "HashIV", secret: true },
      { key: "sandbox", label: "測試環境 (true/false)" },
    ],
  },
  newebpay: {
    label: "藍新 NewebPay",
    description: "信用卡、WebATM、超商。",
    fields: [
      { key: "merchantId", label: "商店代號 MerchantID" },
      { key: "hashKey", label: "HashKey", secret: true },
      { key: "hashIV", label: "HashIV", secret: true },
      { key: "sandbox", label: "測試環境 (true/false)" },
    ],
  },
  stripe: {
    label: "Stripe",
    description: "國際信用卡、Apple Pay、Google Pay。",
    fields: [
      { key: "secretKey", label: "Secret Key", secret: true },
      { key: "webhookSecret", label: "Webhook Secret", secret: true },
    ],
  },
  linepay: {
    label: "LINE Pay",
    description: "LINE Pay 線上支付。",
    fields: [
      { key: "channelId", label: "Channel ID" },
      { key: "channelSecret", label: "Channel Secret", secret: true },
      { key: "sandbox", label: "測試環境 (true/false)" },
    ],
  },
  cod: {
    label: "貨到付款",
    description: "收到貨時以現金付款。",
    fields: [],
  },
};

// ---------- 物流 ----------
export const SHIPMENT_STATUS = ["pending", "ready", "shipped", "in_transit", "delivered", "returned"] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUS)[number];

export const SHIPPING_METHODS = ["home", "cvs_711", "cvs_family", "store_pickup"] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export const SHIPPING_METHOD_META: Record<
  ShippingMethod,
  { label: string; description: string; carrier: string; needsAddress: boolean; needsStore: boolean; etaDays: [number, number] }
> = {
  home: { label: "宅配到府", description: "黑貓宅急便，1-2 個工作天送達。", carrier: "黑貓宅急便", needsAddress: true, needsStore: false, etaDays: [1, 2] },
  cvs_711: { label: "7-ELEVEN 取貨", description: "超商取貨，2-3 個工作天到店。", carrier: "7-ELEVEN 交貨便", needsAddress: false, needsStore: true, etaDays: [2, 3] },
  cvs_family: { label: "全家取貨", description: "超商取貨，2-3 個工作天到店。", carrier: "全家店到店", needsAddress: false, needsStore: true, etaDays: [2, 3] },
  store_pickup: { label: "門市自取", description: "到門市自取，免運費。", carrier: "自取", needsAddress: false, needsStore: false, etaDays: [0, 1] },
};

// ---------- 其他 ----------
export const CURRENCY = "TWD";
export const DEFAULT_FREE_SHIPPING_THRESHOLD = 1000;
export const COUPON_TYPES = ["percent", "fixed", "free_shipping"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const ADMIN_ROLES = ["owner", "manager", "staff"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];
