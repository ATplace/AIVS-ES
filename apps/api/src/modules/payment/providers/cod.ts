import type { PaymentProviderImpl } from "../types";

/** 貨到付款：不需線上付款動作 */
export const codProvider: PaymentProviderImpl = {
  id: "cod",
  async createPayment() {
    return { kind: "none" };
  },
  async handleCallback(payload) {
    return { ok: true, orderNo: payload.orderNo, raw: payload };
  },
};
