/** 以新台幣格式化整數金額 */
export function formatMoney(amount: number, currency = "TWD"): string {
  if (currency === "TWD") return `NT$${amount.toLocaleString("zh-TW")}`;
  return new Intl.NumberFormat("zh-TW", { style: "currency", currency }).format(amount);
}

/** 折扣百分比 (取整數) */
export function discountPercent(price: number, compareAt?: number | null): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/** 產生訂單編號：ES + yyyyMMdd + 6 碼隨機 */
export function generateOrderNo(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `ES${y}${m}${d}${rand}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9一-鿿]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** 預計送達日期區間字串 */
export function etaRange(days: [number, number], from = new Date()): string {
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  const a = new Date(from);
  a.setDate(a.getDate() + days[0]);
  const b = new Date(from);
  b.setDate(b.getDate() + days[1]);
  return days[0] === days[1] ? fmt(a) : `${fmt(a)} - ${fmt(b)}`;
}
