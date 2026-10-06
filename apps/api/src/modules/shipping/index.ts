import { eq } from "drizzle-orm";
import { schema } from "@es/db";
import { SHIPPING_METHOD_META, type ShippingMethod } from "@es/shared";
import { getDb } from "../../lib/db";
import { badRequest } from "../../lib/errors";

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

export async function listShippingQuotes(subtotal: number, freeShippingCoupon = false): Promise<ShippingQuote[]> {
  const db = getDb();
  const rows = await db.query.shippingConfigs.findMany({ where: eq(schema.shippingConfigs.enabled, true), orderBy: (t, { asc }) => asc(t.sortOrder) });
  return rows.map((r) => {
    const meta = SHIPPING_METHOD_META[r.method as ShippingMethod];
    const freeByThreshold = r.freeThreshold != null && subtotal >= r.freeThreshold;
    const isFree = r.fee === 0 || freeByThreshold || freeShippingCoupon;
    return {
      method: r.method as ShippingMethod,
      label: meta.label,
      description: meta.description,
      carrier: meta.carrier,
      fee: isFree ? 0 : r.fee,
      freeThreshold: r.freeThreshold,
      isFree,
      etaDays: meta.etaDays,
      needsAddress: meta.needsAddress,
      needsStore: meta.needsStore,
    };
  });
}

export async function quoteShipping(method: ShippingMethod, subtotal: number, freeShippingCoupon = false) {
  const quotes = await listShippingQuotes(subtotal, freeShippingCoupon);
  const q = quotes.find((x) => x.method === method);
  if (!q) throw badRequest(`物流方式「${method}」未啟用`);
  return q;
}

/** 全站最低免運門檻 (購物車進度條用) */
export async function globalFreeShippingThreshold(): Promise<number> {
  const db = getDb();
  const rows = await db.query.shippingConfigs.findMany({ where: eq(schema.shippingConfigs.enabled, true) });
  const ts = rows.map((r) => r.freeThreshold).filter((t): t is number => t != null);
  return ts.length ? Math.min(...ts) : 0;
}

/**
 * 建立物流單。正式環境在此介接綠界物流 / 黑貓 API；
 * 目前依各物流商的單號格式產生追蹤碼，流程與資料結構已完整，換成真 API 只需替換此函式。
 */
export function createCarrierShipment(method: ShippingMethod, orderNo: string): { carrier: string; trackingNo: string | null } {
  const meta = SHIPPING_METHOD_META[method];
  const digits = orderNo.replace(/\D/g, "").slice(-8).padStart(8, "0");
  switch (method) {
    case "home":
      return { carrier: meta.carrier, trackingNo: `9${digits}${Math.floor(Math.random() * 900 + 100)}` }; // 黑貓 12 碼
    case "cvs_711":
      return { carrier: meta.carrier, trackingNo: `S${digits}` };
    case "cvs_family":
      return { carrier: meta.carrier, trackingNo: `F${digits}` };
    case "store_pickup":
      return { carrier: meta.carrier, trackingNo: null };
  }
}

/** 超商門市查詢 (正式環境改接綠界電子地圖 / 超商門市 API) */
const SAMPLE_STORES: Record<"cvs_711" | "cvs_family", { id: string; name: string; address: string }[]> = {
  cvs_711: [
    { id: "170001", name: "鑫信義門市", address: "台北市信義區信義路五段7號" },
    { id: "170002", name: "松高門市", address: "台北市信義區松高路11號" },
    { id: "170003", name: "站前門市", address: "台北市中正區忠孝西路一段49號" },
    { id: "170004", name: "逢甲門市", address: "台中市西屯區文華路100號" },
    { id: "170005", name: "夢時代門市", address: "高雄市前鎮區中華五路789號" },
    { id: "170006", name: "新竹巨城門市", address: "新竹市東區中央路229號" },
  ],
  cvs_family: [
    { id: "F00101", name: "台北市府店", address: "台北市信義區市府路45號" },
    { id: "F00102", name: "南京復興店", address: "台北市中山區南京東路三段200號" },
    { id: "F00103", name: "板橋府中店", address: "新北市板橋區府中路30號" },
    { id: "F00104", name: "台中公益店", address: "台中市西區公益路155號" },
    { id: "F00105", name: "高雄美麗島店", address: "高雄市新興區中山一路115號" },
    { id: "F00106", name: "台南成大店", address: "台南市東區大學路1號" },
  ],
};

export function searchStores(method: ShippingMethod, q = "") {
  if (method !== "cvs_711" && method !== "cvs_family") return [];
  const list = SAMPLE_STORES[method];
  if (!q) return list;
  return list.filter((s) => s.name.includes(q) || s.address.includes(q));
}
