# ES 電商平台

前台 (消費者)、後台 (商家)、API 三個應用與共用套件組成的 Monorepo。

| 應用 | 技術 | 埠 | 說明 |
|---|---|---|---|
| `apps/web` | Next.js 16 + React 19 + Tailwind 4 + Framer Motion | 3000 | 消費者前台，以購買心理學設計 |
| `apps/admin` | Next.js 16 + React 19 + Tailwind 4 + Recharts | 3001 | 商家後台：商品、訂單、出貨、金流/物流設定 |
| `apps/api` | Hono + Drizzle ORM | 4000 | REST API，金流與物流 Provider 抽象層 |
| `packages/db` | Drizzle schema、PGlite / PostgreSQL 客戶端、種子資料 | | |
| `packages/shared` | 常數、Zod 驗證、DTO 型別、工具 | | |

## 快速開始

```bash
npm install
npm run db:push     # 建立資料表 (開發用內嵌 PGlite，免安裝 PostgreSQL)
npm run db:seed     # 寫入示範店鋪、商品、金流/物流設定、優惠券
npm run dev         # 同時啟動 api / web / admin
```

- 前台：http://localhost:3000
- 後台：http://localhost:3001 （帳號 `admin@es.local` / `admin1234`）
- API：http://localhost:4000/health
- 示範顧客：`demo@es.local` / `demo1234`
- 優惠碼：`WELCOME10` (9 折)、`SAVE200` (滿 1500 折 200)、`FREESHIP` (免運)

重建資料庫：`npm run db:reset`

## 環境變數

複製 `.env.example` 為 `.env`。`DATABASE_URL` 留空即使用內嵌 PGlite (資料在 `.data/pglite`)；正式環境填入 PostgreSQL 連線字串，Drizzle schema 不需修改。

## 金流與物流

後台「設定 → 金流」可開關並填入各家憑證 (綠界 ECPay、藍新 NewebPay、Stripe、LINE Pay、貨到付款、測試金流)。後台設定優先於環境變數。綠界預設帶入官方測試環境 (sandbox) 憑證，可直接測試。

物流 (宅配、7-ELEVEN、全家、門市自取) 的運費與免運門檻在「設定 → 物流」調整。物流單號目前依各家格式產生，正式介接時只需替換 `apps/api/src/modules/shipping/index.ts` 的 `createCarrierShipment` 與 `searchStores`。

## 金流回呼網址

部署時請把下列網址設定到各金流後台：

- 背景通知：`{API_PUBLIC_URL}/payments/{provider}/notify`
- 付款完成導回：`{API_PUBLIC_URL}/payments/{provider}/return`

本機開發時外部金流無法回呼 localhost，可用 ngrok 之類的工具暴露 4000 埠並更新 `.env` 的 `API_PUBLIC_URL`。

## 工作紀錄

所有開發紀錄依時間倒序寫在 `WorkRecord.md`。
