import { Hono } from "hono";
import { PAYMENT_PROVIDERS, type PaymentProvider } from "@es/shared";
import { env } from "../env";
import { badRequest } from "../lib/errors";
import { getPaymentProvider, getPaymentConfig } from "../modules/payment";
import { markOrderPaid, markOrderPaymentFailed } from "../services/orders";

export const paymentRoutes = new Hono();

const html = (body: string) => `<!doctype html><html lang="zh-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>模擬付款</title>
<style>body{font-family:system-ui,-apple-system,"Noto Sans TC",sans-serif;background:#f6f7f9;margin:0;display:grid;place-items:center;min-height:100vh}
.card{background:#fff;border-radius:16px;padding:32px;max-width:420px;width:92%;box-shadow:0 10px 40px rgba(0,0,0,.08)}h1{font-size:20px;margin:0 0 8px}p{color:#555;margin:0 0 20px}
.amt{font-size:32px;font-weight:700;margin:12px 0 24px}button{width:100%;padding:14px;border:0;border-radius:10px;font-size:16px;cursor:pointer;margin-bottom:10px}
.ok{background:#111;color:#fff}.fail{background:#eee;color:#333}.tag{display:inline-block;background:#fef3c7;color:#92400e;font-size:12px;padding:2px 8px;border-radius:999px;margin-bottom:12px}</style></head><body>${body}</body></html>`;

/** 開發用模擬付款頁 */
paymentRoutes.get("/mock/pay", (c) => {
  const orderNo = c.req.query("orderNo") ?? "";
  const amount = c.req.query("amount") ?? "0";
  return c.html(
    html(`<div class="card"><span class="tag">測試環境 · 不會真的扣款</span><h1>模擬金流付款</h1><p>訂單編號 ${orderNo}</p><div class="amt">NT$${Number(amount).toLocaleString()}</div>
<form method="post" action="/payments/mock/return"><input type="hidden" name="orderNo" value="${orderNo}"><input type="hidden" name="amount" value="${amount}">
<button class="ok" name="result" value="success">模擬付款成功</button><button class="fail" name="result" value="fail">模擬付款失敗</button></form></div>`),
  );
});

async function parsePayload(c: { req: { header: (n: string) => string | undefined; parseBody: () => Promise<Record<string, unknown>>; text: () => Promise<string>; query: () => Record<string, string> } }, method: string) {
  const ct = c.req.header("content-type") ?? "";
  let raw = "";
  let payload: Record<string, string> = {};
  if (method === "GET") payload = c.req.query();
  else if (ct.includes("application/json")) {
    raw = await c.req.text();
    payload = JSON.parse(raw || "{}");
  } else {
    raw = await c.req.text();
    payload = Object.fromEntries(new URLSearchParams(raw).entries());
  }
  return { raw, payload: { ...c.req.query(), ...payload } };
}

function providerParam(p: string): PaymentProvider {
  if (!PAYMENT_PROVIDERS.includes(p as PaymentProvider)) throw badRequest("未知的金流");
  return p as PaymentProvider;
}

/** 金流伺服器背景通知 (ECPay ReturnURL / NewebPay NotifyURL / Stripe webhook) */
paymentRoutes.post("/:provider/notify", async (c) => {
  const provider = providerParam(c.req.param("provider"));
  const impl = getPaymentProvider(provider);
  const cfg = await getPaymentConfig(provider);
  const { raw, payload } = await parsePayload(c, "POST");
  const headers = { "stripe-signature": c.req.header("stripe-signature") ?? "" };
  const result = await impl.handleCallback(payload, cfg.credentials, raw, headers);
  if (result.ok) await markOrderPaid(result.orderNo, { txnId: result.txnId, amount: result.amount, raw: result.raw });
  else if (result.orderNo) await markOrderPaymentFailed(result.orderNo, result.raw);
  return c.text(result.responseBody ?? (result.ok ? "OK" : "FAIL"));
});

/** 消費者瀏覽器導回：驗證後轉回前台訂單頁 */
paymentRoutes.on(["GET", "POST"], "/:provider/return", async (c) => {
  const provider = providerParam(c.req.param("provider"));
  const impl = getPaymentProvider(provider);
  const cfg = await getPaymentConfig(provider);
  const { raw, payload } = await parsePayload(c, c.req.method);
  let orderNo = payload.orderNo ?? payload.CustomField1 ?? "";
  let paid = false;
  try {
    const result = await impl.handleCallback(payload, cfg.credentials, raw);
    orderNo = result.orderNo || orderNo;
    if (result.ok) {
      await markOrderPaid(result.orderNo, { txnId: result.txnId, amount: result.amount, raw: result.raw });
      paid = true;
    } else if (result.orderNo) await markOrderPaymentFailed(result.orderNo, result.raw);
  } catch (e) {
    console.error("[payments/return]", e);
  }
  return c.redirect(`${env.WEB_PUBLIC_URL}/orders/${encodeURIComponent(orderNo)}?${paid ? "paid=1" : "failed=1"}`, 303);
});
