import crypto from "node:crypto";
import type { PaymentProviderImpl } from "../types";

/**
 * 藍新 NewebPay MPG 幕前支付
 * 文件：https://www.newebpay.com/website/Page/content/download_api
 */
const STAGE_URL = "https://ccore.newebpay.com/MPG/mpg_gateway";
const PROD_URL = "https://core.newebpay.com/MPG/mpg_gateway";

function aesEncrypt(data: string, key: string, iv: string) {
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  return cipher.update(data, "utf8", "hex") + cipher.final("hex");
}
function aesDecrypt(hex: string, key: string, iv: string) {
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  decipher.setAutoPadding(false);
  const out = decipher.update(hex, "hex", "utf8") + decipher.final("utf8");
  // 移除 PKCS7 padding
  return out.replace(/[\x00-\x20]+$/g, "");
}
function sha256Upper(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex").toUpperCase();
}

export const newebpayProvider: PaymentProviderImpl = {
  id: "newebpay",
  async createPayment(order, cred, urls) {
    const sandbox = (cred.sandbox ?? "true") !== "false";
    const tradeInfo = new URLSearchParams({
      MerchantID: cred.merchantId,
      RespondType: "JSON",
      TimeStamp: String(Math.floor(Date.now() / 1000)),
      Version: "2.0",
      MerchantOrderNo: order.orderNo,
      Amt: String(order.total),
      ItemDesc: order.itemSummary.slice(0, 50),
      Email: order.email,
      LoginType: "0",
      ReturnURL: urls.returnUrl,
      NotifyURL: urls.notifyUrl,
      ClientBackURL: urls.cancelUrl,
    }).toString();
    const encrypted = aesEncrypt(tradeInfo, cred.hashKey, cred.hashIV);
    const tradeSha = sha256Upper(`HashKey=${cred.hashKey}&${encrypted}&HashIV=${cred.hashIV}`);
    return {
      kind: "form",
      action: sandbox ? STAGE_URL : PROD_URL,
      method: "POST",
      fields: { MerchantID: cred.merchantId, TradeInfo: encrypted, TradeSha: tradeSha, Version: "2.0" },
    };
  },

  async handleCallback(payload, cred) {
    const encrypted = payload.TradeInfo ?? "";
    const expectedSha = sha256Upper(`HashKey=${cred.hashKey}&${encrypted}&HashIV=${cred.hashIV}`);
    const valid = expectedSha === (payload.TradeSha ?? "").toUpperCase();
    let decoded: Record<string, unknown> = {};
    try {
      decoded = JSON.parse(aesDecrypt(encrypted, cred.hashKey, cred.hashIV));
    } catch {
      /* ignore */
    }
    const result = (decoded.Result ?? {}) as Record<string, string>;
    return {
      ok: valid && decoded.Status === "SUCCESS",
      orderNo: result.MerchantOrderNo ?? "",
      txnId: result.TradeNo,
      amount: Number(result.Amt ?? 0),
      raw: { ...decoded, _shaValid: valid },
    };
  },
};
