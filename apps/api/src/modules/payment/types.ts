import type { PaymentProvider } from "@es/shared";

export interface PaymentOrderInfo {
  orderNo: string;
  total: number;
  currency: string;
  email: string;
  itemSummary: string; // 商品名稱摘要
}

export interface PaymentUrls {
  /** 金流伺服器→API 的背景通知 */
  notifyUrl: string;
  /** 消費者付款完成後瀏覽器導回的 API 端點 (API 再轉回前台) */
  returnUrl: string;
  /** 消費者取消時導回前台 */
  cancelUrl: string;
}

export type PaymentAction =
  | { kind: "redirect"; url: string }
  | { kind: "form"; action: string; method: "POST"; fields: Record<string, string> }
  | { kind: "none" };

export interface CallbackResult {
  ok: boolean;
  orderNo: string;
  txnId?: string;
  amount?: number;
  raw: Record<string, unknown>;
  /** 回覆給金流伺服器的文字 (例如綠界需回 "1|OK") */
  responseBody?: string;
}

export interface PaymentProviderImpl {
  id: PaymentProvider;
  createPayment(order: PaymentOrderInfo, credentials: Record<string, string>, urls: PaymentUrls): Promise<PaymentAction>;
  /** 處理背景通知或導回參數，驗章後回傳結果 */
  handleCallback(payload: Record<string, string>, credentials: Record<string, string>, rawBody?: string, headers?: Record<string, string>): Promise<CallbackResult>;
}
