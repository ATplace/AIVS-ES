import type { PaymentProviderImpl } from "../types";
import { env } from "../../../env";

/** 開發用模擬金流：導向 API 自己提供的付款頁，按下按鈕即完成 */
export const mockProvider: PaymentProviderImpl = {
  id: "mock",
  async createPayment(order) {
    return { kind: "redirect", url: `${env.API_PUBLIC_URL}/payments/mock/pay?orderNo=${encodeURIComponent(order.orderNo)}&amount=${order.total}` };
  },
  async handleCallback(payload) {
    return {
      ok: payload.result === "success",
      orderNo: payload.orderNo,
      txnId: `MOCK-${Date.now()}`,
      amount: Number(payload.amount ?? 0),
      raw: payload,
    };
  },
};
