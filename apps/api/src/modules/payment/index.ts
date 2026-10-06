import { eq } from "drizzle-orm";
import { schema } from "@es/db";
import type { PaymentProvider } from "@es/shared";
import { getDb } from "../../lib/db";
import { badRequest } from "../../lib/errors";
import { env } from "../../env";
import type { PaymentProviderImpl, PaymentUrls } from "./types";
import { mockProvider } from "./providers/mock";
import { codProvider } from "./providers/cod";
import { ecpayProvider } from "./providers/ecpay";
import { newebpayProvider } from "./providers/newebpay";
import { stripeProvider } from "./providers/stripe";
import { linepayProvider } from "./providers/linepay";

const registry: Record<PaymentProvider, PaymentProviderImpl> = {
  mock: mockProvider,
  cod: codProvider,
  ecpay: ecpayProvider,
  newebpay: newebpayProvider,
  stripe: stripeProvider,
  linepay: linepayProvider,
};

export function getPaymentProvider(id: PaymentProvider): PaymentProviderImpl {
  const p = registry[id];
  if (!p) throw badRequest(`不支援的金流：${id}`);
  return p;
}

/** 讀取後台設定的金流憑證 (後台設定優先於環境變數) */
export async function getPaymentConfig(id: PaymentProvider) {
  const db = getDb();
  const row = await db.query.paymentConfigs.findFirst({ where: eq(schema.paymentConfigs.provider, id) });
  if (!row || !row.enabled) throw badRequest(`金流「${id}」未啟用`);
  return row;
}

export async function listEnabledPaymentProviders() {
  const db = getDb();
  const rows = await db.query.paymentConfigs.findMany({ where: eq(schema.paymentConfigs.enabled, true), orderBy: (t, { asc }) => asc(t.sortOrder) });
  return rows.map((r) => ({ provider: r.provider as PaymentProvider, feePercent: r.feePercent }));
}

export function paymentUrls(provider: PaymentProvider, orderNo: string): PaymentUrls {
  return {
    notifyUrl: `${env.API_PUBLIC_URL}/payments/${provider}/notify`,
    returnUrl: `${env.API_PUBLIC_URL}/payments/${provider}/return`,
    cancelUrl: `${env.WEB_PUBLIC_URL}/orders/${orderNo}?cancelled=1`,
  };
}

export type { PaymentAction, PaymentProviderImpl } from "./types";
