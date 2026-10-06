import crypto from "node:crypto";
import type { PaymentProviderImpl } from "../types";

/**
 * Stripe Checkout (REST，無需 SDK)
 * 文件：https://docs.stripe.com/api/checkout/sessions/create
 */
export const stripeProvider: PaymentProviderImpl = {
  id: "stripe",
  async createPayment(order, cred, urls) {
    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("success_url", `${urls.returnUrl}?orderNo=${encodeURIComponent(order.orderNo)}&session_id={CHECKOUT_SESSION_ID}`);
    body.set("cancel_url", urls.cancelUrl);
    body.set("customer_email", order.email);
    body.set("client_reference_id", order.orderNo);
    body.set("metadata[orderNo]", order.orderNo);
    body.set("line_items[0][quantity]", "1");
    body.set("line_items[0][price_data][currency]", order.currency.toLowerCase());
    body.set("line_items[0][price_data][unit_amount]", String(order.total)); // TWD 為零小數位貨幣
    body.set("line_items[0][price_data][product_data][name]", order.itemSummary.slice(0, 200));

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${cred.secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await res.json()) as { url?: string; error?: { message: string } };
    if (!res.ok || !json.url) throw new Error(`Stripe: ${json.error?.message ?? res.statusText}`);
    return { kind: "redirect", url: json.url };
  },

  async handleCallback(payload, cred, rawBody, headers) {
    // Webhook: 驗證 Stripe-Signature
    const sig = headers?.["stripe-signature"];
    if (sig && rawBody) {
      const parts = Object.fromEntries(sig.split(",").map((kv) => kv.split("=") as [string, string]));
      const expected = crypto.createHmac("sha256", cred.webhookSecret).update(`${parts.t}.${rawBody}`).digest("hex");
      const valid = expected === parts.v1;
      const event = JSON.parse(rawBody) as { type: string; data: { object: Record<string, unknown> } };
      const obj = event.data.object;
      const meta = (obj.metadata ?? {}) as Record<string, string>;
      return {
        ok: valid && event.type === "checkout.session.completed" && obj.payment_status === "paid",
        orderNo: meta.orderNo ?? (obj.client_reference_id as string) ?? "",
        txnId: (obj.payment_intent as string) ?? (obj.id as string),
        amount: Number(obj.amount_total ?? 0),
        raw: { type: event.type, _sigValid: valid },
      };
    }
    // 導回 (success_url)：主動查詢 session 狀態
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${payload.session_id}`, {
      headers: { Authorization: `Bearer ${cred.secretKey}` },
    });
    const s = (await res.json()) as Record<string, unknown>;
    return {
      ok: s.payment_status === "paid",
      orderNo: payload.orderNo,
      txnId: (s.payment_intent as string) ?? (s.id as string),
      amount: Number(s.amount_total ?? 0),
      raw: { id: s.id, payment_status: s.payment_status },
    };
  },
};
