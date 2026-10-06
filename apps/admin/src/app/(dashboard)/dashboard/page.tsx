"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney, ORDER_STATUS, ORDER_STATUS_LABEL } from "@es/shared";
import { adminApi } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { Card, CardBody, CardHeader, PageHeader, Skeleton, Table, TBody, TD, TH, THead, TR, EmptyState } from "@/components/ui";
import { OrderStatusBadge } from "@/components/status-badge";

const VIZ1 = "#4f46e5";
const VIZ2 = "#0d9488";

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-[13px] text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
      </CardBody>
    </Card>
  );
}

function ChartTooltip({ active, payload, label, fmt }: { active?: boolean; payload?: { value: number }[]; label?: string; fmt: (n: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="text-slate-500">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-900 tabular-nums">{fmt(payload[0].value)}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data, loading, error } = useQuery(() => adminApi.dashboard(), []);

  if (error) return <div className="rounded-md bg-danger-50 p-4 text-sm text-danger-700">{error}</div>;

  const pendingShip = (data?.statusBreakdown.paid ?? 0) + (data?.statusBreakdown.processing ?? 0);
  const days = (data?.last7Days ?? []).map((d) => ({ ...d, day: d.date.slice(5).replace("-", "/") }));
  const conv = data?.conversion;
  const rate = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");
  const totalOrders = Object.values(data?.statusBreakdown ?? {}).reduce((s, n) => s + n, 0);

  return (
    <>
      <PageHeader title="儀表板" description={`今天 ${new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "short" })}`} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading || !data ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardBody>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-3 h-7 w-28" />
              </CardBody>
            </Card>
          ))
        ) : (
          <>
            <StatTile label="今日營收" value={formatMoney(data.today.revenue)} sub="不含待付款與取消訂單" />
            <StatTile label="今日訂單" value={data.today.orders.toLocaleString()} />
            <StatTile label="客單價" value={formatMoney(data.today.aov)} sub="今日平均" />
            <StatTile label="待出貨" value={pendingShip.toLocaleString()} sub="已付款 + 處理中" />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="近 7 日營收" description="已付款訂單總額 (NT$)" />
          <CardBody className="h-64">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeWidth={1} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis tickLine={false} axisLine={false} width={48} tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K` : String(v))} />
                  <Tooltip content={<ChartTooltip fmt={(n) => formatMoney(n)} />} cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="revenue" stroke={VIZ1} strokeWidth={2} fill={VIZ1} fillOpacity={0.1} dot={{ r: 4, fill: VIZ1, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="近 7 日訂單數" description="有效訂單筆數" />
          <CardBody className="h-64">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeWidth={1} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip content={<ChartTooltip fmt={(n) => `${n.toLocaleString()} 筆`} />} cursor={{ fill: "#f1f5f9" }} />
                  <Bar dataKey="orders" fill={VIZ2} radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="轉換漏斗" description="近 7 日行為事件" />
          <CardBody>
            {loading || !conv ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <ul className="space-y-3">
                {[
                  { label: "商品瀏覽", n: conv.views, pct: 100 },
                  { label: "加入購物車", n: conv.carts, pct: conv.views ? (conv.carts / conv.views) * 100 : 0, rate: rate(conv.carts, conv.views) },
                  { label: "完成下單", n: conv.orders, pct: conv.views ? (conv.orders / conv.views) * 100 : 0, rate: rate(conv.orders, conv.carts) },
                ].map((s) => (
                  <li key={s.label}>
                    <div className="mb-1 flex items-baseline justify-between text-[13px]">
                      <span className="text-slate-600">{s.label}</span>
                      <span className="tabular-nums text-slate-900">
                        <span className="font-semibold">{s.n.toLocaleString()}</span>
                        {s.rate && <span className="ml-2 text-xs text-slate-400">轉換 {s.rate}</span>}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-indigo-50">
                      <div className="h-2 rounded-full" style={{ width: `${Math.max(2, Math.min(100, s.pct))}%`, background: VIZ1 }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="訂單狀態分佈" description={`全部 ${totalOrders.toLocaleString()} 筆`} />
          <CardBody>
            {loading || !data ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <ul className="space-y-2">
                {ORDER_STATUS.filter((s) => data.statusBreakdown[s]).map((s) => {
                  const n = data.statusBreakdown[s] ?? 0;
                  return (
                    <li key={s} className="flex items-center gap-3">
                      <div className="w-20 shrink-0">
                        <OrderStatusBadge status={s} />
                      </div>
                      <div className="h-2 flex-1 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-slate-700" style={{ width: `${totalOrders ? (n / totalOrders) * 100 : 0}%` }} />
                      </div>
                      <span className="w-8 text-right text-[13px] tabular-nums text-slate-700">{n}</span>
                    </li>
                  );
                })}
                {totalOrders === 0 && <p className="text-[13px] text-slate-400">尚無訂單</p>}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={
              <span className="inline-flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-warning-600" /> 低庫存警示
              </span>
            }
            description="庫存 ≤ 5 的上架規格"
          />
          {loading || !data ? (
            <CardBody>
              <Skeleton className="h-32 w-full" />
            </CardBody>
          ) : data.lowStock.length === 0 ? (
            <EmptyState title="庫存充足" description="目前沒有低庫存的商品規格" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.lowStock.map((v) => (
                <li key={v.variantId} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px]">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{v.productName}</p>
                    <p className="truncate text-xs text-slate-500">{v.variantName}</p>
                  </div>
                  <span className={v.stock === 0 ? "rounded-full bg-danger-50 px-2 py-0.5 text-xs font-semibold text-danger-700" : "rounded-full bg-warning-50 px-2 py-0.5 text-xs font-semibold text-warning-700"}>
                    剩 {v.stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="熱銷商品"
          description="依銷售數量排序 (有效訂單)"
          action={
            <Link href="/products" className="inline-flex items-center gap-1 text-[13px] text-slate-500 hover:text-slate-900">
              全部商品 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {loading || !data ? (
          <CardBody>
            <Skeleton className="h-32 w-full" />
          </CardBody>
        ) : data.topProducts.length === 0 ? (
          <EmptyState title="尚無銷售資料" description="有已付款的訂單後，這裡會顯示熱銷商品排行" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>#</TH>
                <TH>商品</TH>
                <TH align="right">銷量</TH>
                <TH align="right">營收</TH>
              </tr>
            </THead>
            <TBody>
              {data.topProducts.map((p, i) => (
                <TR key={p.productId}>
                  <TD className="w-10 text-slate-400">{i + 1}</TD>
                  <TD>
                    <Link href={`/products/${p.productId}`} className="font-medium text-slate-800 hover:underline">
                      {p.name}
                    </Link>
                  </TD>
                  <TD align="right">{p.sold.toLocaleString()}</TD>
                  <TD align="right">{formatMoney(p.revenue)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
      <p className="mt-6 text-xs text-slate-400">{ORDER_STATUS_LABEL.pending} 訂單不計入營收。</p>
    </>
  );
}
