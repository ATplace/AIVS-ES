import "./paths";
import bcrypt from "bcryptjs";
import { count, eq, sql } from "drizzle-orm";
import { createDb, closeDb } from "./client";
import * as s from "./schema";

const u = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

type SeedProduct = {
  name: string;
  slug: string;
  category: string;
  description: string;
  images: string[];
  tags: string[];
  featured?: boolean;
  flashSale?: boolean;
  rating: number;
  reviewCount: number;
  soldCount: number;
  variants: { name: string; options: Record<string, string>; price: number; compareAt?: number; stock: number }[];
};

const PRODUCTS: SeedProduct[] = [
  {
    name: "極簡石英腕錶",
    slug: "minimal-quartz-watch",
    category: "accessories",
    description: "40mm 不鏽鋼錶殼、藍寶石鏡面、義大利真皮錶帶。日常通勤與正式場合皆宜，3ATM 防水。",
    images: [u("photo-1524592094714-0f0654e20314"), u("photo-1522312346375-d1a52e2b99b3")],
    tags: ["熱銷", "送禮首選"],
    featured: true,
    rating: 4.8,
    reviewCount: 312,
    soldCount: 1840,
    variants: [
      { name: "黑面 / 棕帶", options: { 錶面: "黑", 錶帶: "棕" }, price: 2680, compareAt: 3980, stock: 23 },
      { name: "白面 / 黑帶", options: { 錶面: "白", 錶帶: "黑" }, price: 2680, compareAt: 3980, stock: 8 },
    ],
  },
  {
    name: "主動降噪無線耳機",
    slug: "anc-wireless-headphones",
    category: "electronics",
    description: "40dB 混合式主動降噪、40 小時續航、LDAC 高解析音訊，多點連線同時配對手機與筆電。",
    images: [u("photo-1505740420928-5e560c06d30e"), u("photo-1583394838336-acd977736f90")],
    tags: ["限時特價", "熱銷"],
    featured: true,
    flashSale: true,
    rating: 4.7,
    reviewCount: 1024,
    soldCount: 5230,
    variants: [
      { name: "曜石黑", options: { 顏色: "曜石黑" }, price: 4990, compareAt: 7990, stock: 41 },
      { name: "月光銀", options: { 顏色: "月光銀" }, price: 4990, compareAt: 7990, stock: 5 },
    ],
  },
  {
    name: "輕量跑鞋 AirFlow",
    slug: "airflow-running-shoes",
    category: "sports",
    description: "單隻僅 210g，回彈中底搭配透氣針織鞋面，適合 5-21K 路跑訓練。",
    images: [u("photo-1542291026-7eec264c27ff"), u("photo-1491553895911-0055eca6402d")],
    tags: ["新品"],
    featured: true,
    rating: 4.6,
    reviewCount: 418,
    soldCount: 2210,
    variants: [
      { name: "紅 / US 8", options: { 顏色: "紅", 尺寸: "US 8" }, price: 2890, compareAt: 3690, stock: 12 },
      { name: "紅 / US 9", options: { 顏色: "紅", 尺寸: "US 9" }, price: 2890, compareAt: 3690, stock: 3 },
      { name: "紅 / US 10", options: { 顏色: "紅", 尺寸: "US 10" }, price: 2890, compareAt: 3690, stock: 17 },
    ],
  },
  {
    name: "復古膠片風數位相機",
    slug: "retro-digital-camera",
    category: "electronics",
    description: "2600 萬畫素 APS-C、五軸防手震、內建 12 種底片模擬，機身僅 383g。",
    images: [u("photo-1526170375885-4d8ecf77b99f")],
    tags: ["旗艦"],
    rating: 4.9,
    reviewCount: 156,
    soldCount: 640,
    variants: [
      { name: "銀黑", options: { 顏色: "銀黑" }, price: 38900, stock: 6 },
      { name: "全黑", options: { 顏色: "全黑" }, price: 38900, stock: 4 },
    ],
  },
  {
    name: "偏光太陽眼鏡",
    slug: "polarized-sunglasses",
    category: "accessories",
    description: "TAC 偏光鏡片 UV400、TR90 輕量鏡框，附硬殼收納盒與拭鏡布。",
    images: [u("photo-1572635196237-14b3f281503f")],
    tags: ["夏日必備"],
    flashSale: true,
    rating: 4.5,
    reviewCount: 287,
    soldCount: 1920,
    variants: [
      { name: "琥珀", options: { 鏡框: "琥珀" }, price: 890, compareAt: 1680, stock: 55 },
      { name: "霧黑", options: { 鏡框: "霧黑" }, price: 890, compareAt: 1680, stock: 2 },
    ],
  },
  {
    name: "14 吋輕薄筆電",
    slug: "ultrabook-14",
    category: "electronics",
    description: "1.2kg、OLED 2.8K 螢幕、32GB RAM、1TB SSD，18 小時續航。",
    images: [u("photo-1593642632823-8f785ba67e45")],
    tags: ["旗艦"],
    featured: true,
    rating: 4.8,
    reviewCount: 203,
    soldCount: 410,
    variants: [{ name: "星空灰", options: { 顏色: "星空灰" }, price: 42900, compareAt: 46900, stock: 9 }],
  },
  {
    name: "玻尿酸保濕精華",
    slug: "hyaluronic-serum",
    category: "beauty",
    description: "三重分子玻尿酸 + B5，30ml。無香料、無酒精，敏感肌適用。",
    images: [u("photo-1620916566398-39f1143ab7be"), u("photo-1601049541289-9b1b7bbbfe19")],
    tags: ["回購率 No.1"],
    featured: true,
    rating: 4.7,
    reviewCount: 2210,
    soldCount: 9800,
    variants: [
      { name: "30ml", options: { 容量: "30ml" }, price: 680, compareAt: 980, stock: 120 },
      { name: "30ml x2 組合", options: { 容量: "30ml x2" }, price: 1180, compareAt: 1960, stock: 60 },
    ],
  },
  {
    name: "純棉圓領 T 恤",
    slug: "cotton-crew-tee",
    category: "fashion",
    description: "210g 重磅精梳棉，版型方正不易變形，六色可選。",
    images: [u("photo-1581655353564-df123a1eb820"), u("photo-1583743814966-8936f5b7be1a"), u("photo-1521572163474-6864f9cf17ab")],
    tags: ["基本款"],
    rating: 4.4,
    reviewCount: 876,
    soldCount: 7650,
    variants: [
      { name: "白 / M", options: { 顏色: "白", 尺寸: "M" }, price: 490, stock: 80 },
      { name: "白 / L", options: { 顏色: "白", 尺寸: "L" }, price: 490, stock: 64 },
      { name: "黑 / M", options: { 顏色: "黑", 尺寸: "M" }, price: 490, stock: 7 },
      { name: "黑 / L", options: { 顏色: "黑", 尺寸: "L" }, price: 490, stock: 0 },
    ],
  },
  {
    name: "修身直筒牛仔褲",
    slug: "slim-straight-jeans",
    category: "fashion",
    description: "12.5oz 日本丹寧，微彈性，石洗處理。",
    images: [u("photo-1541099649105-f69ad21f3246")],
    tags: [],
    rating: 4.5,
    reviewCount: 342,
    soldCount: 2100,
    variants: [
      { name: "靛藍 / 30", options: { 顏色: "靛藍", 腰圍: "30" }, price: 1680, compareAt: 2280, stock: 15 },
      { name: "靛藍 / 32", options: { 顏色: "靛藍", 腰圍: "32" }, price: 1680, compareAt: 2280, stock: 11 },
      { name: "靛藍 / 34", options: { 顏色: "靛藍", 腰圍: "34" }, price: 1680, compareAt: 2280, stock: 4 },
    ],
  },
  {
    name: "防風機能外套",
    slug: "windproof-shell-jacket",
    category: "fashion",
    description: "三層貼合防水布料 10000mm、YKK 止水拉鍊、可收納帽。",
    images: [u("photo-1551028719-00167b16eac5")],
    tags: ["戶外"],
    flashSale: true,
    rating: 4.6,
    reviewCount: 198,
    soldCount: 980,
    variants: [
      { name: "軍綠 / M", options: { 顏色: "軍綠", 尺寸: "M" }, price: 3280, compareAt: 4980, stock: 6 },
      { name: "軍綠 / L", options: { 顏色: "軍綠", 尺寸: "L" }, price: 3280, compareAt: 4980, stock: 9 },
    ],
  },
  {
    name: "北歐三人布沙發",
    slug: "nordic-fabric-sofa",
    category: "home",
    description: "實木框架、高密度泡棉、可拆洗布套，寬 200cm。",
    images: [u("photo-1555041469-a586c61ea9bc"), u("photo-1586023492125-27b2c045efd7")],
    tags: ["免運"],
    featured: true,
    rating: 4.7,
    reviewCount: 89,
    soldCount: 230,
    variants: [
      { name: "燕麥色", options: { 顏色: "燕麥色" }, price: 18900, compareAt: 24900, stock: 5 },
      { name: "霧灰", options: { 顏色: "霧灰" }, price: 18900, compareAt: 24900, stock: 3 },
    ],
  },
  {
    name: "人體工學辦公椅",
    slug: "ergonomic-office-chair",
    category: "home",
    description: "4D 扶手、腰靠可調、透氣網布，承重 150kg，5 年保固。",
    images: [u("photo-1580480055273-228ff5388ef8"), u("photo-1592078615290-033ee584e267")],
    tags: ["居家辦公"],
    rating: 4.6,
    reviewCount: 412,
    soldCount: 1560,
    variants: [{ name: "黑", options: { 顏色: "黑" }, price: 7990, compareAt: 9990, stock: 14 }],
  },
  {
    name: "持久霧面唇釉",
    slug: "matte-lip-tint",
    category: "beauty",
    description: "一抹上色、12 小時不沾杯，含維他命 E 滋潤配方。",
    images: [u("photo-1631214524020-7e18db9a8f92"), u("photo-1522335789203-aabd1fc54bc9")],
    tags: ["網紅推薦"],
    rating: 4.5,
    reviewCount: 1530,
    soldCount: 6400,
    variants: [
      { name: "#01 玫瑰豆沙", options: { 色號: "#01" }, price: 390, compareAt: 520, stock: 90 },
      { name: "#02 楓葉紅", options: { 色號: "#02" }, price: 390, compareAt: 520, stock: 34 },
      { name: "#03 奶茶裸", options: { 色號: "#03" }, price: 390, compareAt: 520, stock: 1 },
    ],
  },
  {
    name: "可調式啞鈴組 24kg",
    slug: "adjustable-dumbbell-24kg",
    category: "sports",
    description: "2.5-24kg 一秒切換 15 段重量，取代 15 組傳統啞鈴。",
    images: [u("photo-1571019613454-1cb2f99b2d8b"), u("photo-1517836357463-d25dfeac3438")],
    tags: ["居家健身"],
    rating: 4.8,
    reviewCount: 267,
    soldCount: 890,
    variants: [{ name: "單支", options: { 數量: "單支" }, price: 5490, compareAt: 6990, stock: 20 }],
  },
  {
    name: "真無線藍牙耳機 Lite",
    slug: "tws-earbuds-lite",
    category: "electronics",
    description: "入耳式、IPX5 防水、單次 7 小時 / 總續航 28 小時，支援無線充電。",
    images: [u("photo-1572569511254-d8f925fe2cbb"), u("photo-1606220588913-b3aacb4d2f46")],
    tags: ["CP 值首選"],
    flashSale: true,
    rating: 4.4,
    reviewCount: 3120,
    soldCount: 14200,
    variants: [
      { name: "白", options: { 顏色: "白" }, price: 1290, compareAt: 2490, stock: 150 },
      { name: "黑", options: { 顏色: "黑" }, price: 1290, compareAt: 2490, stock: 98 },
    ],
  },
  {
    name: "智慧運動手錶",
    slug: "smart-sport-watch",
    category: "electronics",
    description: "GPS、血氧、心率、14 天續航，120 種運動模式。",
    images: [u("photo-1579586337278-3befd40fd17a"), u("photo-1544117519-31a4b719223d")],
    tags: ["新品"],
    featured: true,
    rating: 4.6,
    reviewCount: 540,
    soldCount: 2300,
    variants: [
      { name: "46mm 黑", options: { 尺寸: "46mm", 顏色: "黑" }, price: 6990, compareAt: 8990, stock: 25 },
      { name: "42mm 玫瑰金", options: { 尺寸: "42mm", 顏色: "玫瑰金" }, price: 6990, compareAt: 8990, stock: 10 },
    ],
  },
  {
    name: "經典皮革小白鞋",
    slug: "leather-white-sneakers",
    category: "fashion",
    description: "頭層牛皮、橡膠大底、手工縫線，百搭日常。",
    images: [u("photo-1595341888016-a392ef81b7de"), u("photo-1600185365926-3a2ce3cdb9eb")],
    tags: ["百搭"],
    rating: 4.5,
    reviewCount: 980,
    soldCount: 4300,
    variants: [
      { name: "白 / 38", options: { 尺寸: "38" }, price: 1980, compareAt: 2680, stock: 20 },
      { name: "白 / 40", options: { 尺寸: "40" }, price: 1980, compareAt: 2680, stock: 18 },
      { name: "白 / 42", options: { 尺寸: "42" }, price: 1980, compareAt: 2680, stock: 2 },
    ],
  },
  {
    name: "香氛蠟燭 三入組",
    slug: "scented-candle-trio",
    category: "home",
    description: "大豆蠟、棉芯、每顆燃燒 40 小時。白茶 / 雪松 / 無花果。",
    images: [u("photo-1602523961358-f9f03dd557db"), u("photo-1603006905003-be475563bc59")],
    tags: ["送禮首選"],
    rating: 4.7,
    reviewCount: 620,
    soldCount: 3100,
    variants: [{ name: "三入組", options: { 組合: "三入" }, price: 1280, compareAt: 1680, stock: 40 }],
  },
];

const CATEGORIES = [
  { name: "3C 數位", slug: "electronics", image: u("photo-1498049794561-7780e7231661"), sortOrder: 1 },
  { name: "時尚服飾", slug: "fashion", image: u("photo-1445205170230-053b83016050"), sortOrder: 2 },
  { name: "美妝保養", slug: "beauty", image: u("photo-1596462502278-27bfdc403348"), sortOrder: 3 },
  { name: "居家生活", slug: "home", image: u("photo-1586023492125-27b2c045efd7"), sortOrder: 4 },
  { name: "運動戶外", slug: "sports", image: u("photo-1517836357463-d25dfeac3438"), sortOrder: 5 },
  { name: "配件", slug: "accessories", image: u("photo-1524592094714-0f0654e20314"), sortOrder: 6 },
];

const REVIEW_SAMPLES = [
  { rating: 5, title: "超乎預期", body: "質感比照片好很多，出貨也很快，第二天就收到了。" },
  { rating: 5, title: "回購第三次", body: "已經推薦給三個朋友，CP 值真的很高。" },
  { rating: 4, title: "不錯", body: "整體滿意，包裝可以再更仔細一點。" },
  { rating: 5, title: "值得", body: "用了兩週，完全符合描述。客服回覆也很即時。" },
  { rating: 4, title: "好用", body: "跟專櫃比毫不遜色，價格親民很多。" },
];
const REVIEWERS = ["王小姐", "林先生", "陳同學", "Amy", "Jason", "李太太", "Kevin", "小雯"];

async function main() {
  const db = await createDb();
  const [{ n }] = await db.select({ n: count() }).from(s.products);
  if (n > 0) {
    console.log(`[seed] 已有 ${n} 筆商品，略過種子資料。若要重建請執行 npm run db:reset`);
    await closeDb();
    return;
  }

  console.log("[seed] 建立店鋪與管理員…");
  await db.insert(s.stores).values({
    name: "ES Store",
    tagline: "精選好物，每天都值得被好好對待",
    supportEmail: "support@es.local",
    supportPhone: "02-1234-5678",
    announcement: "🎉 全站滿 NT$1,000 免運｜新會員首購 9 折，輸入 WELCOME10",
  });
  await db.insert(s.adminUsers).values({
    email: "admin@es.local",
    passwordHash: await bcrypt.hash("admin1234", 10),
    name: "商家管理員",
    role: "owner",
  });
  await db.insert(s.customers).values({
    email: "demo@es.local",
    passwordHash: await bcrypt.hash("demo1234", 10),
    name: "示範顧客",
    phone: "0912345678",
  });

  console.log("[seed] 建立分類…");
  const catRows = await db
    .insert(s.categories)
    .values(CATEGORIES.map((c) => ({ name: c.name, slug: c.slug, imageUrl: c.image, sortOrder: c.sortOrder })))
    .returning();
  const catId = Object.fromEntries(catRows.map((c) => [c.slug, c.id]));

  console.log("[seed] 建立商品與規格…");
  for (const p of PRODUCTS) {
    const [prod] = await db
      .insert(s.products)
      .values({
        name: p.name,
        slug: p.slug,
        description: p.description,
        categoryId: catId[p.category],
        status: "active",
        images: p.images.map((url, i) => ({ url, alt: `${p.name} ${i + 1}` })),
        tags: p.tags,
        isFeatured: !!p.featured,
        flashSaleEndsAt: p.flashSale ? new Date(Date.now() + (1 + Math.random() * 3) * 24 * 3600 * 1000) : null,
        rating: p.rating,
        reviewCount: p.reviewCount,
        soldCount: p.soldCount,
        viewCount: p.soldCount * 12,
      })
      .returning();
    await db.insert(s.productVariants).values(
      p.variants.map((v, i) => ({
        productId: prod.id,
        sku: `${p.slug.toUpperCase().replace(/-/g, "_").slice(0, 12)}-${i + 1}`,
        name: v.name,
        options: v.options,
        price: v.price,
        compareAtPrice: v.compareAt ?? null,
        stock: v.stock,
        weightGrams: 300,
        sortOrder: i,
      })),
    );
    const reviewRows = Array.from({ length: 3 + Math.floor(Math.random() * 3) }, (_, i) => {
      const r = REVIEW_SAMPLES[(i * 7 + p.name.length) % REVIEW_SAMPLES.length];
      return {
        productId: prod.id,
        authorName: REVIEWERS[(i * 3 + p.slug.length) % REVIEWERS.length],
        rating: r.rating,
        title: r.title,
        body: r.body,
        verified: true,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 3600 * 1000),
      };
    });
    await db.insert(s.reviews).values(reviewRows);
  }

  console.log("[seed] 建立金流 / 物流設定…");
  await db.insert(s.paymentConfigs).values([
    { provider: "mock", enabled: true, credentials: {}, feePercent: 0, sortOrder: 0 },
    {
      provider: "ecpay",
      enabled: true,
      credentials: {
        merchantId: process.env.ECPAY_MERCHANT_ID ?? "2000132",
        hashKey: process.env.ECPAY_HASH_KEY ?? "5294y06JbISpM5x9",
        hashIV: process.env.ECPAY_HASH_IV ?? "v77hoKGq4kWxNNIS",
        sandbox: "true",
      },
      feePercent: 2.75,
      sortOrder: 1,
    },
    { provider: "linepay", enabled: false, credentials: { channelId: "", channelSecret: "", sandbox: "true" }, feePercent: 3, sortOrder: 2 },
    { provider: "newebpay", enabled: false, credentials: { merchantId: "", hashKey: "", hashIV: "", sandbox: "true" }, feePercent: 2.8, sortOrder: 3 },
    { provider: "stripe", enabled: false, credentials: { secretKey: "", webhookSecret: "" }, feePercent: 3.4, sortOrder: 4 },
    { provider: "cod", enabled: true, credentials: {}, feePercent: 0, sortOrder: 5 },
  ]);
  await db.insert(s.shippingConfigs).values([
    { method: "home", enabled: true, fee: 120, freeThreshold: 1000, sortOrder: 0 },
    { method: "cvs_711", enabled: true, fee: 60, freeThreshold: 1000, sortOrder: 1 },
    { method: "cvs_family", enabled: true, fee: 60, freeThreshold: 1000, sortOrder: 2 },
    { method: "store_pickup", enabled: true, fee: 0, freeThreshold: null, sortOrder: 3 },
  ]);

  console.log("[seed] 建立優惠券…");
  await db.insert(s.coupons).values([
    { code: "WELCOME10", type: "percent", value: 10, minSubtotal: 0, enabled: true },
    { code: "SAVE200", type: "fixed", value: 200, minSubtotal: 1500, enabled: true },
    { code: "FREESHIP", type: "free_shipping", value: 0, minSubtotal: 0, enabled: true },
  ]);

  console.log("[seed] 建立示範訂單 (近 7 天)…");
  await seedDemoOrders(db);

  console.log("[seed] 完成 ✔  後台帳號 admin@es.local / admin1234；示範顧客 demo@es.local / demo1234");
  await closeDb();
}

/** 近 7 天的示範訂單：涵蓋各種狀態、金流與物流，供儀表板與訂單管理展示 */
async function seedDemoOrders(db: Awaited<ReturnType<typeof createDb>>) {
  const customer = await db.query.customers.findFirst();
  const variants = await db.query.productVariants.findMany({ with: { product: true } });
  const active = variants.filter((v) => v.product.status === "active" && v.stock > 0);
  const pick = <T,>(arr: T[], i: number) => arr[i % arr.length];

  const NAMES = ["王小明", "陳美玲", "林志豪", "張雅婷", "李俊宏", "黃淑芬", "吳建志", "劉佳慧", "蔡宗翰", "鄭欣怡"];
  const CITIES: [string, string, string][] = [
    ["台北市", "信義區", "松仁路 100 號 12 樓"],
    ["新北市", "板橋區", "文化路一段 188 號"],
    ["台中市", "西屯區", "台灣大道三段 99 號"],
    ["高雄市", "左營區", "博愛二路 777 號"],
    ["台南市", "東區", "中華東路三段 360 號"],
    ["新竹市", "東區", "光復路一段 89 號"],
  ];
  const STORES = [
    ["cvs_711", "170002", "松高門市"],
    ["cvs_family", "F00101", "台北市府店"],
    ["cvs_711", "170004", "逢甲門市"],
  ] as const;
  // [狀態, 金流, 物流, 幾天前, 小時]
  const PLAN: [string, string, string, number, number][] = [
    ["completed", "ecpay", "home", 6, 10],
    ["completed", "linepay", "cvs_711", 6, 15],
    ["delivered", "ecpay", "cvs_family", 5, 9],
    ["completed", "mock", "home", 5, 20],
    ["delivered", "ecpay", "home", 4, 11],
    ["shipped", "ecpay", "cvs_711", 4, 16],
    ["shipped", "cod", "home", 3, 13],
    ["cancelled", "ecpay", "home", 3, 18],
    ["shipped", "linepay", "store_pickup", 2, 10],
    ["processing", "cod", "cvs_family", 2, 14],
    ["paid", "ecpay", "home", 1, 9],
    ["paid", "mock", "cvs_711", 1, 12],
    ["refunded", "ecpay", "home", 1, 17],
    ["paid", "ecpay", "cvs_family", 0, 8],
    ["pending", "ecpay", "home", 0, 10],
    ["processing", "cod", "home", 0, 11],
  ];
  const fees: Record<string, number> = { home: 120, cvs_711: 60, cvs_family: 60, store_pickup: 0 };
  const carriers: Record<string, string> = { home: "黑貓宅急便", cvs_711: "7-ELEVEN 交貨便", cvs_family: "全家店到店", store_pickup: "自取" };

  for (const [i, [status, provider, method, daysAgo, hour]] of PLAN.entries()) {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(hour, (i * 7) % 60, 0, 0);
    const itemCount = 1 + (i % 3);
    const chosen = Array.from({ length: itemCount }, (_, k) => pick(active, i * 5 + k * 3));
    const items = chosen.map((v, k) => ({ v, qty: 1 + ((i + k) % 2) }));
    const subtotal = items.reduce((s, it) => s + it.v.price * it.qty, 0);
    const discount = i % 4 === 0 ? Math.round(subtotal * 0.1) : 0;
    const shippingFee = subtotal >= 1000 || method === "store_pickup" ? 0 : fees[method];
    const total = subtotal - discount + shippingFee;
    const name = pick(NAMES, i);
    const [city, district, line1] = pick(CITIES, i);
    const store = method.startsWith("cvs") ? pick([...STORES], i) : null;
    const isMember = i % 3 === 0 && customer;
    const email = isMember ? customer!.email : `${["amy", "jason", "kevin", "mei", "ting", "wei"][i % 6]}${i}@example.com`;
    const paid = !["pending", "cancelled"].includes(status);
    const orderNo = `ES${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, "0")}${String(createdAt.getDate()).padStart(2, "0")}${String(100000 + i * 7919).slice(-6)}`;

    const [order] = await db
      .insert(s.orders)
      .values({
        orderNo,
        customerId: isMember ? customer!.id : null,
        email,
        status,
        subtotal,
        shippingFee,
        discount,
        total,
        couponCode: discount ? "WELCOME10" : null,
        shippingMethod: method,
        shippingAddress: {
          name,
          phone: `09${String(10000000 + i * 123457).slice(-8)}`,
          zip: store ? "" : "110",
          city: store ? "" : city,
          district: store ? "" : district,
          line1: store ? "" : line1,
          storeId: store?.[1],
          storeName: store?.[2],
        },
        paymentProvider: provider,
        paymentStatus: status === "refunded" ? "refunded" : paid ? "succeeded" : "pending",
        note: i % 5 === 0 ? "請於下午送達，謝謝" : null,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    await db.insert(s.orderItems).values(
      items.map((it) => ({
        orderId: order.id,
        productId: it.v.productId,
        variantId: it.v.id,
        productName: it.v.product.name,
        variantName: it.v.name,
        sku: it.v.sku,
        image: it.v.product.images?.[0]?.url ?? null,
        unitPrice: it.v.price,
        quantity: it.qty,
        lineTotal: it.v.price * it.qty,
      })),
    );

    const t = (h: number) => new Date(createdAt.getTime() + h * 3600 * 1000);
    await db.insert(s.payments).values({
      orderId: order.id,
      provider,
      status: status === "refunded" ? "refunded" : paid && provider !== "cod" ? "succeeded" : provider === "cod" && ["delivered", "completed"].includes(status) ? "succeeded" : paid ? "pending" : status === "cancelled" ? "failed" : "pending",
      amount: total,
      txnId: paid && provider !== "cod" ? `${provider.toUpperCase()}${String(2400000000 + i * 99991)}` : null,
      paidAt: paid && provider !== "cod" ? t(0.2) : null,
      createdAt,
    });

    const events: { type: string; message: string; actor: string; createdAt: Date }[] = [
      { type: "created", message: `訂單建立，付款方式：${provider}`, actor: "customer", createdAt },
    ];
    if (paid && provider !== "cod") events.push({ type: "payment", message: "付款成功", actor: "gateway", createdAt: t(0.2) });
    if (["processing", "shipped", "delivered", "completed", "refunded"].includes(status) && provider !== "cod")
      events.push({ type: "status", message: "狀態 paid → processing", actor: "商家管理員", createdAt: t(3) });
    if (["shipped", "delivered", "completed"].includes(status)) {
      const digits = orderNo.replace(/\D/g, "").slice(-8);
      const trackingNo = method === "home" ? `9${digits}${100 + i}` : method === "cvs_711" ? `S${digits}` : method === "cvs_family" ? `F${digits}` : null;
      await db.insert(s.shipments).values({
        orderId: order.id,
        method,
        carrier: carriers[method],
        trackingNo,
        status: status === "shipped" ? "in_transit" : "delivered",
        packageCount: 1,
        shippedAt: t(20),
        deliveredAt: status === "shipped" ? null : t(44),
        createdAt: t(20),
      });
      events.push({ type: "shipment", message: `已出貨：${carriers[method]} ${trackingNo ?? ""}`, actor: "商家管理員", createdAt: t(20) });
      if (status !== "shipped") events.push({ type: "status", message: "狀態 shipped → delivered", actor: "system", createdAt: t(44) });
      if (status === "completed") events.push({ type: "status", message: "狀態 delivered → completed", actor: "system", createdAt: t(44 + 24 * 7) });
    }
    if (status === "cancelled") events.push({ type: "status", message: "狀態 pending → cancelled：顧客取消", actor: "customer", createdAt: t(1) });
    if (status === "refunded") events.push({ type: "status", message: "狀態 paid → refunded：商品瑕疵退款", actor: "商家管理員", createdAt: t(5) });
    await db.insert(s.orderEvents).values(events.map((e) => ({ ...e, orderId: order.id })));
    await db.insert(s.events).values({ type: "order", customerId: order.customerId, meta: { orderNo, total }, createdAt });
    // 漏斗事件：每筆訂單對應若干瀏覽與加入購物車
    await db.insert(s.events).values([
      ...Array.from({ length: 6 + (i % 5) }, (_, k) => ({ type: "view_product", productId: pick(items, k).v.productId, createdAt: t(-k * 0.5 - 1) })),
      ...Array.from({ length: 1 + (i % 3) }, (_, k) => ({ type: "add_to_cart", productId: pick(items, k).v.productId, createdAt: t(-0.3) })),
    ]);
    // 銷量
    for (const it of items) if (paid) await db.update(s.products).set({ soldCount: sql`${s.products.soldCount} + ${it.qty}` }).where(eq(s.products.id, it.v.productId));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
