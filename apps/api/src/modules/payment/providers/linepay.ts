import crypto from "node:crypto";
import type { PaymentProviderImpl } from "../types";

/**
 * LINE Pay Online API v3
 * 文件：https://pay.line.me/tw/developers/apis/onlineApis
 */
const STAGE = "https://sandbox-api-pay.line.me";
const PROD = "https://api-pay.line.me";

function signedHeaders(cred: Record<string, string>, uri: string, body: string) {
  const nonce = crypto.randomUUID();
  const signature = crypto.createHmac("sha256", cred.channelSecret).update(`${cred.channelSecret}${uri}${body}${nonce}`).digest("base64");
  return {
    "Content-Type": "application/json",
    "X-LINE-ChannelId": cred.channelId,
    "X-LINE-Authorization-Nonce": nonce,
    "X-LINE-Authorization": signature,
  };
}

export const linepayProvider: PaymentProviderImpl = {
  id: "linepay",
  async createPayment(order, cred, urls) {
    const base = (cred.sandbox ?? "true") !== "false" ? STAGE : PROD;
    const uri = "/v3/payments/request";
    const body = JSON.stringify({
      amount: order.total,
      currency: order.currency,
      orderId: order.orderNo,
      packages: [{ id: "pkg1", amount: order.total, name: "ES Store", products: [{ name: order.itemSummary.slice(0, 100), quantity: 1, price: order.total }] }],
      redirectUrls: { confirmUrl: `${urls.returnUrl}?orderNo=${encodeURIComponent(order.orderNo)}`, cancelUrl: urls.cancelUrl },
    });
    const res = await fetch(base + uri, { method: "POST", headers: signedHeaders(cred, uri, body), body });
    const json = (await res.json()) as { returnCode: string; returnMessage: string; info?: { paymentUrl: { web: string } } };
    if (json.returnCode !== "0000" || !json.info) throw new Error(`LINE Pay: ${json.returnMessage}`);
    return { kind: "redirect", url: json.info.paymentUrl.web };
  },

  /** 導回時 LINE Pay 帶 transactionId，需呼叫 confirm 完成扣款 */
  async handleCallback(payload, cred) {
    const base = (cred.sandbox ?? "true") !== "false" ? STAGE : PROD;
    const txn = payload.transactionId;
    const uri = `/v3/payments/${txn}/confirm`;
    const body = JSON.stringify({ amount: Number(payload.amount), currency: "TWD" });
    const res = await fetch(base + uri, { method: "POST", headers: signedHeaders(cred, uri, body), body });
    const json = (await res.json()) as { returnCode: string; returnMessage: string };
    return {
      ok: json.returnCode === "0000",
      orderNo: payload.orderNo,
      txnId: txn,
      amount: Number(payload.amount),
      raw: json as unknown as Record<string, unknown>,
    };
  },
};
