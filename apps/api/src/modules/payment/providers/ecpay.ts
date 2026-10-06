import crypto from "node:crypto";
import type { PaymentProviderImpl } from "../types";

/**
 * 綠界 ECPay 全方位金流 (AioCheckOut V5)
 * 文件：https://developers.ecpay.com.tw/?p=2856
 */
const STAGE_URL = "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";
const PROD_URL = "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5";

/** 綠界專用 URL encode (對應 .NET HttpUtility.UrlEncode 的小寫與特殊字元規則) */
function ecpayEncode(s: string) {
  return encodeURIComponent(s)
    .toLowerCase()
    .replace(/%20/g, "+")
    .replace(/%2d/g, "-")
    .replace(/%5f/g, "_")
    .replace(/%2e/g, ".")
    .replace(/%21/g, "!")
    .replace(/%2a/g, "*")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")");
}

export function ecpayCheckMacValue(params: Record<string, string>, hashKey: string, hashIV: string) {
  const sorted = Object.keys(params)
    .filter((k) => k !== "CheckMacValue")
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const raw = `HashKey=${hashKey}&${sorted}&HashIV=${hashIV}`;
  return crypto.createHash("sha256").update(ecpayEncode(raw)).digest("hex").toUpperCase();
}

function tradeDate(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const ecpayProvider: PaymentProviderImpl = {
  id: "ecpay",
  async createPayment(order, cred, urls) {
    const sandbox = (cred.sandbox ?? "true") !== "false";
    // 綠界 MerchantTradeNo 限 20 碼英數
    const tradeNo = order.orderNo.replace(/[^A-Za-z0-9]/g, "").slice(0, 20);
    const fields: Record<string, string> = {
      MerchantID: cred.merchantId,
      MerchantTradeNo: tradeNo,
      MerchantTradeDate: tradeDate(),
      PaymentType: "aio",
      TotalAmount: String(order.total),
      TradeDesc: "ES Store",
      ItemName: order.itemSummary.slice(0, 390),
      ReturnURL: urls.notifyUrl,
      OrderResultURL: urls.returnUrl,
      ClientBackURL: urls.cancelUrl,
      ChoosePayment: "ALL",
      EncryptType: "1",
      CustomField1: order.orderNo,
      NeedExtraPaidInfo: "N",
    };
    fields.CheckMacValue = ecpayCheckMacValue(fields, cred.hashKey, cred.hashIV);
    return { kind: "form", action: sandbox ? STAGE_URL : PROD_URL, method: "POST", fields };
  },

  async handleCallback(payload, cred) {
    const expected = ecpayCheckMacValue(payload, cred.hashKey, cred.hashIV);
    const valid = expected === (payload.CheckMacValue ?? "").toUpperCase();
    const ok = valid && payload.RtnCode === "1";
    return {
      ok,
      orderNo: payload.CustomField1 || payload.MerchantTradeNo,
      txnId: payload.TradeNo,
      amount: Number(payload.TradeAmt ?? 0),
      raw: { ...payload, _checkMacValid: valid },
      responseBody: valid ? "1|OK" : "0|CheckMacValue Error",
    };
  },
};
