"use client";

import * as React from "react";
import Link from "next/link";
import { Printer, Search, Truck } from "lucide-react";
import { formatMoney, ORDER_STATUS, ORDER_STATUS_LABEL, type OrderDTO } from "@es/shared";
import { adminApi } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { formatDate } from "@/lib/utils";
import { Button, Card, Checkbox, EmptyState, Input, PageHeader, Pagination, Table, TableSkeleton, Tabs, TBody, TD, TH, THead, TR, useConfirm, useToast } from "@/components/ui";
import { OrderStatusBadge, PaymentStatusBadge, paymentProviderLabel, shippingMethodLabel } from "@/components/status-badge";

type Tab = "all" | (typeof ORDER_STATUS)[number];

export default function OrdersPage() {
  const toast = useToast();
  const { confirm, element } = useConfirm();
  const [tab, setTab] = React.useState<Tab>("all");
  const [q, setQ] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const counts = useQuery(() => adminApi.dashboard(), []);
  const { data, loading, reload } = useQuery(
    () =>
      adminApi.orders({
        q: search,
        status: tab === "all" ? undefined : tab,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
        page,
        limit: 20,
      }),
    [search, tab, from, to, page],
  );
  React.useEffect(() => setSelected(new Set()), [data]);

  const orders = data?.orders ?? [];
  const breakdown = counts.data?.statusBreakdown ?? {};
  const totalAll = Object.values(breakdown).reduce((s, n) => s + n, 0);
  const allChecked = orders.length > 0 && orders.every((o) => selected.has(o.id));
  const someChecked = orders.some((o) => selected.has(o.id));
  const shippable = [...selected].filter((id) => ["paid", "processing"].includes(orders.find((o) => o.id === id)?.status ?? ""));

  return (
    <>
      <PageHeader title="訂單管理" description="處理付款、出貨與訂單狀態" />
      <Card>
        <div className="border-b border-slate-100 px-4 pt-2">
          <Tabs<Tab>
            className="border-b-0"
            value={tab}
            onChange={(k) => {
              setTab(k);
              setPage(1);
            }}
            items={[{ key: "all", label: "全部", count: totalAll }, ...ORDER_STATUS.map((s) => ({ key: s, label: ORDER_STATUS_LABEL[s], count: breakdown[s] ?? 0 }))]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <form
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(q.trim());
              setPage(1);
            }}
          >
            <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="訂單編號 / Email / 收件人" className="w-64 pl-8" />
          </form>
          <div className="flex items-center gap-1.5 text-[13px] text-slate-500">
            <Input type="date" value={from} onChange={(e) => (setFrom(e.target.value), setPage(1))} className="w-36" />
            <span>～</span>
            <Input type="date" value={to} onChange={(e) => (setTo(e.target.value), setPage(1))} className="w-36" />
          </div>
          <div className="flex-1" />
          {someChecked && (
            <div className="flex items-center gap-2 text-[13px] text-slate-600">
              已選 {selected.size} 筆
              <Button
                size="sm"
                variant="outline"
                disabled={shippable.length === 0}
                onClick={() =>
                  confirm({
                    title: `批次出貨 ${shippable.length} 筆訂單？`,
                    description: "將為每筆已付款 / 處理中的訂單建立出貨單並標記為已出貨。",
                    confirmText: "建立出貨單",
                    action: async () => {
                      const r = await adminApi.bulkShip(shippable);
                      const ok = r.results.filter((x) => x.ok).length;
                      const fail = r.results.filter((x) => !x.ok);
                      toast.success(`已出貨 ${ok} 筆`, fail.length ? `${fail.length} 筆失敗：${fail[0].error}` : undefined);
                      reload();
                      counts.reload();
                    },
                  })
                }
              >
                <Truck className="h-4 w-4" /> 批次出貨
              </Button>
              <Link href={`/orders/manifest?ids=${[...selected].join(",")}`} target="_blank">
                <Button size="sm" variant="outline">
                  <Printer className="h-4 w-4" /> 列印出貨明細
                </Button>
              </Link>
            </div>
          )}
        </div>

        {loading ? (
          <TableSkeleton cols={7} />
        ) : orders.length === 0 ? (
          <EmptyState title="沒有符合條件的訂單" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH className="w-10">
                  <Checkbox checked={allChecked} indeterminate={someChecked && !allChecked} onChange={(v) => setSelected(v ? new Set(orders.map((o) => o.id)) : new Set())} aria-label="全選" />
                </TH>
                <TH>訂單</TH>
                <TH>顧客</TH>
                <TH align="right">商品</TH>
                <TH align="right">金額</TH>
                <TH>付款</TH>
                <TH>狀態</TH>
                <TH>物流</TH>
              </tr>
            </THead>
            <TBody>
              {orders.map((o) => (
                <OrderRow key={o.id} o={o} checked={selected.has(o.id)} onCheck={(v) => setSelected((s) => { const n = new Set(s); v ? n.add(o.id) : n.delete(o.id); return n; })} />
              ))}
            </TBody>
          </Table>
        )}
        <Pagination page={data?.page ?? 1} pages={data?.pages ?? 0} total={data?.total ?? 0} onChange={setPage} />
      </Card>
      {element}
    </>
  );
}

function OrderRow({ o, checked, onCheck }: { o: OrderDTO; checked: boolean; onCheck: (v: boolean) => void }) {
  const qty = o.items.reduce((s, i) => s + i.quantity, 0);
  return (
    <TR className={checked ? "bg-slate-50" : undefined}>
      <TD>
        <Checkbox checked={checked} onChange={onCheck} aria-label={`選取 ${o.orderNo}`} />
      </TD>
      <TD>
        <Link href={`/orders/${o.id}`} className="font-mono text-[13px] font-medium text-slate-900 hover:underline">
          {o.orderNo}
        </Link>
        <p className="text-xs text-slate-400">{formatDate(o.createdAt)}</p>
      </TD>
      <TD>
        <p className="text-slate-800">{o.shippingAddress.name}</p>
        <p className="text-xs text-slate-400">{o.email}</p>
      </TD>
      <TD align="right">{qty} 件</TD>
      <TD align="right" className="font-medium text-slate-900">
        {formatMoney(o.total)}
      </TD>
      <TD>
        <div className="flex flex-col items-start gap-1">
          <PaymentStatusBadge status={o.paymentStatus} />
          <span className="text-xs text-slate-400">{paymentProviderLabel(o.paymentProvider)}</span>
        </div>
      </TD>
      <TD>
        <OrderStatusBadge status={o.status} />
      </TD>
      <TD className="text-[13px] text-slate-600">
        {shippingMethodLabel(o.shippingMethod)}
        {o.shipment?.trackingNo && <p className="font-mono text-xs text-slate-400">{o.shipment.trackingNo}</p>}
      </TD>
    </TR>
  );
}
