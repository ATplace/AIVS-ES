"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";
import { formatMoney } from "@es/shared";
import { adminApi, type Manifest } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { paymentProviderLabel, shippingMethodLabel } from "@/components/status-badge";

export default function ManifestPage() {
  return (
    <React.Suspense fallback={<p className="p-8 text-sm text-slate-400">載入中…</p>}>
      <ManifestInner />
    </React.Suspense>
  );
}

function ManifestInner() {
  const sp = useSearchParams();
  const ids = React.useMemo(() => (sp.get("ids") ?? "").split(",").filter(Boolean), [sp]);
  const { token, hydrated } = useAuth();
  const { data, loading, error } = useQuery(() => (ids.length && token ? adminApi.manifests(ids) : Promise.resolve({ manifests: [] as Manifest[] })), [ids.join(","), token]);

  React.useEffect(() => {
    if (hydrated && !token) window.location.href = "/login";
  }, [hydrated, token]);

  if (error) return <p className="p-8 text-sm text-red-600">{error}</p>;
  if (loading || !data) return <p className="p-8 text-sm text-slate-400">產生出貨明細中…</p>;
  const list = data.manifests;

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 text-sm">
        <a href="/orders" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> 返回訂單
        </a>
        <span className="text-slate-300">|</span>
        <span className="text-slate-600">共 {list.length} 張出貨明細</span>
        <div className="flex-1" />
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800">
          <Printer className="h-4 w-4" /> 列印
        </button>
      </div>

      {list.length === 0 ? (
        <p className="p-8 text-sm text-slate-500">沒有可列印的訂單。</p>
      ) : (
        <div className="mx-auto max-w-[210mm] space-y-6 py-6 print:space-y-0 print:py-0">
          {list.map((m) => (
            <ManifestSheet key={m.orderNo} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function ManifestSheet({ m }: { m: Manifest }) {
  const r = m.recipient;
  const qty = m.items.reduce((s, i) => s + i.qty, 0);
  return (
    <section className="print-page min-h-[277mm] bg-white p-[14mm] text-[12px] text-slate-900 shadow-sm print:shadow-none">
      <header className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-wide">出貨明細 / Packing Slip</h1>
          <p className="mt-1 text-slate-600">{m.store.name}</p>
          <p className="text-slate-500">
            {m.store.phone} · {m.store.email}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-500">訂單編號</p>
          <p className="font-mono text-lg font-semibold">{m.orderNo}</p>
          <p className="text-slate-500">下單時間 {formatDate(m.createdAt)}</p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-6">
        <div className="rounded border border-slate-300 p-3">
          <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">收件人</p>
          <p className="text-sm font-semibold">{r.name}</p>
          <p>{r.phone}</p>
          {r.storeName ? (
            <p className="mt-1">
              {shippingMethodLabel(m.shippingMethod)}：{r.storeName} {r.storeId && <span className="font-mono text-slate-500">({r.storeId})</span>}
            </p>
          ) : (
            <p className="mt-1">
              {r.zip} {r.city}
              {r.district}
              {r.line1}
            </p>
          )}
        </div>
        <div className="rounded border border-slate-300 p-3">
          <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">配送 / 付款</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            <dt className="text-slate-500">配送方式</dt>
            <dd>{shippingMethodLabel(m.shippingMethod)}</dd>
            <dt className="text-slate-500">物流商</dt>
            <dd>{m.carrier ?? "—"}</dd>
            <dt className="text-slate-500">追蹤號碼</dt>
            <dd className="font-mono">{m.trackingNo ?? "—"}</dd>
            <dt className="text-slate-500">付款方式</dt>
            <dd>
              {paymentProviderLabel(m.paymentProvider)}
              {m.paymentProvider === "cod" && <span className="ml-1 font-semibold text-red-700">代收 {formatMoney(m.total)}</span>}
            </dd>
          </dl>
        </div>
      </div>

      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-900 text-left text-[11px] text-slate-600">
            <th className="py-1.5 pr-2">#</th>
            <th className="py-1.5 pr-2">SKU</th>
            <th className="py-1.5 pr-2">品名</th>
            <th className="py-1.5 pr-2">規格</th>
            <th className="py-1.5 pr-2 text-right">數量</th>
            <th className="py-1.5 pr-2 text-right">單價</th>
            <th className="py-1.5 text-right">小計</th>
          </tr>
        </thead>
        <tbody>
          {m.items.map((it, i) => (
            <tr key={`${it.sku}-${i}`} className="border-b border-slate-200">
              <td className="py-1.5 pr-2 text-slate-500">{i + 1}</td>
              <td className="py-1.5 pr-2 font-mono text-[11px]">{it.sku}</td>
              <td className="py-1.5 pr-2">{it.name}</td>
              <td className="py-1.5 pr-2 text-slate-600">{it.variant}</td>
              <td className="py-1.5 pr-2 text-right font-semibold">{it.qty}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums">{formatMoney(it.unitPrice)}</td>
              <td className="py-1.5 text-right tabular-nums">{formatMoney(it.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex items-start justify-between">
        <p className="text-slate-500">共 {qty} 件</p>
        <dl className="grid w-56 grid-cols-2 gap-y-0.5 text-right">
          <dt className="text-left text-slate-500">商品小計</dt>
          <dd className="tabular-nums">{formatMoney(m.subtotal)}</dd>
          <dt className="text-left text-slate-500">折扣</dt>
          <dd className="tabular-nums">{m.discount ? `- ${formatMoney(m.discount)}` : "—"}</dd>
          <dt className="text-left text-slate-500">運費</dt>
          <dd className="tabular-nums">{m.shippingFee ? formatMoney(m.shippingFee) : "免運"}</dd>
          <dt className="mt-1 border-t border-slate-900 pt-1 text-left font-semibold">總計</dt>
          <dd className="mt-1 border-t border-slate-900 pt-1 text-sm font-bold tabular-nums">{formatMoney(m.total)}</dd>
        </dl>
      </div>

      {m.note && (
        <div className="mt-4 rounded border border-dashed border-slate-300 p-3">
          <p className="text-[11px] font-semibold text-slate-500">顧客備註</p>
          <p className="mt-1">{m.note}</p>
        </div>
      )}

      <footer className="mt-10 grid grid-cols-3 gap-8 text-[11px] text-slate-500">
        <div>
          <div className="h-8 border-b border-slate-400" />
          <p className="mt-1">揀貨人員</p>
        </div>
        <div>
          <div className="h-8 border-b border-slate-400" />
          <p className="mt-1">包裝 / 覆核</p>
        </div>
        <div>
          <div className="h-8 border-b border-slate-400" />
          <p className="mt-1">日期</p>
        </div>
      </footer>
      <p className="mt-6 text-center text-[10px] text-slate-400">感謝您的購買。如有任何問題，請聯繫 {m.store.email}</p>
    </section>
  );
}
