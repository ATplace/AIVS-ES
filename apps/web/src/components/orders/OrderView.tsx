"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check, CheckCircle2, Clock, MapPin, Package, Truck, XCircle } from "lucide-react";
import type { OrderDTO, OrderStatus } from "@es/shared";
import { ORDER_STATUS_LABEL, PAYMENT_PROVIDER_META, SHIPPING_METHOD_META, formatMoney } from "@es/shared";
import { ApiRequestError, cancelOrder, getOrder, type OrderEventDTO } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { cn, formatDate } from "@/lib/utils";

const STEPS: OrderStatus[] = ["pending", "paid", "processing", "shipped", "delivered", "completed"];

export function OrderStepper({ status }: { status: OrderStatus }) {
  if (status === "cancelled" || status === "refunded") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-ink-100 p-3 text-sm text-ink-700">
        <XCircle className="h-5 w-5 text-ink-500" /> 此訂單{ORDER_STATUS_LABEL[status]}
      </div>
    );
  }
  const idx = STEPS.indexOf(status);
  return (
    <ol className="flex items-start">
      {STEPS.map((s, i) => {
        const done = i <= idx;
        const current = i === idx;
        return (
          <li key={s} className="relative flex flex-1 flex-col items-center">
            {i > 0 && <span className={cn("absolute top-3.5 right-1/2 left-[-50%] h-0.5", i <= idx ? "bg-ink-900" : "bg-ink-200")} />}
            <motion.span
              initial={false}
              animate={current ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.4 }}
              className={cn("relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 bg-white", done ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-300")}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-ink-300" />}
            </motion.span>
            <span className={cn("mt-2 text-center text-[11px] leading-tight sm:text-xs", done ? "font-medium text-ink-900" : "text-ink-400")}>{ORDER_STATUS_LABEL[s]}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderView({ orderNo, flags }: { orderNo: string; flags: { paid: boolean; failed: boolean; cancelled: boolean; placed: boolean } }) {
  const token = useAuth((s) => s.token);
  const hydrated = useAuth((s) => s.hydrated);
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [events, setEvents] = useState<OrderEventDTO[]>([]);
  const [needEmail, setNeedEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = async (mail?: string) => {
    setLoading(true);
    setErr(null);
    try {
      const r = await getOrder(orderNo, mail);
      setOrder(r.order);
      setEvents(r.events);
      setNeedEmail(false);
      if (mail) setEmail(mail);
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 403) setNeedEmail(true);
      else if (e instanceof ApiRequestError && e.status === 404) setErr("找不到此訂單");
      else setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    const saved = typeof window !== "undefined" ? sessionStorage.getItem(`order-email:${orderNo}`) : null;
    void load(saved ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, token, orderNo]);

  const lookup = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem(`order-email:${orderNo}`, email);
    void load(email);
  };

  const doCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      const r = await cancelOrder(orderNo, token ? undefined : email || undefined);
      setOrder(r.order);
      toast.success("訂單已取消");
      void load(token ? undefined : email || undefined);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCancelling(false);
    }
  };

  if (!hydrated || loading) {
    return (
      <div className="container-x py-10">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-6 h-24 w-full" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  if (needEmail) {
    return (
      <div className="container-x max-w-md py-16">
        <h1 className="text-xl font-semibold">查詢訂單 {orderNo}</h1>
        <p className="mt-1 text-sm text-ink-500">請輸入下單時使用的 Email 以查看訂單內容。</p>
        <form onSubmit={lookup} className="mt-5 flex gap-2">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-11 flex-1 rounded-xl border px-3 text-sm outline-none focus:border-ink-900" />
          <Button type="submit">查詢</Button>
        </form>
        <p className="mt-4 text-xs text-ink-400">
          或 <Link href="/account" className="text-brand-600 hover:underline">登入會員</Link> 查看所有訂單
        </p>
      </div>
    );
  }

  if (err || !order) {
    return (
      <div className="container-x py-20 text-center">
        <p className="text-ink-700">{err ?? "找不到訂單"}</p>
        <Link href="/products" className="mt-4 inline-block">
          <Button variant="outline">回到商店</Button>
        </Link>
      </div>
    );
  }

  const ship = SHIPPING_METHOD_META[order.shippingMethod];
  const pay = PAYMENT_PROVIDER_META[order.paymentProvider];
  const addr = order.shippingAddress;
  const awaitingPayment = order.status === "pending" && order.paymentProvider !== "cod";

  return (
    <div className="container-x py-6 sm:py-10">
      {(flags.paid || flags.placed) && order.status !== "pending" && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start gap-3 rounded-2xl border border-success-500/30 bg-green-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-success-500" />
          <div>
            <div className="font-semibold text-ink-900">{flags.paid ? "付款成功，感謝你的購買！" : "訂單已成立，感謝你的購買！"}</div>
            <div className="text-sm text-ink-600">訂單確認信已寄至 {order.email}，我們會盡快為你出貨。</div>
          </div>
        </motion.div>
      )}
      {(flags.failed || flags.cancelled) && order.status === "pending" && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-sale-500/30 bg-sale-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-sale-600" />
          <div>
            <div className="font-semibold text-ink-900">{flags.failed ? "付款未完成" : "你已取消付款"}</div>
            <div className="text-sm text-ink-600">訂單已為你保留，請於 24 小時內完成付款，否則將自動取消。</div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-ink-500">訂單編號</p>
          <h1 className="text-2xl font-bold tracking-tight">{order.orderNo}</h1>
          <p className="mt-1 text-xs text-ink-500">成立於 {formatDate(order.createdAt)}</p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-sm font-medium", order.status === "cancelled" || order.status === "refunded" ? "bg-ink-100 text-ink-600" : order.status === "pending" ? "bg-sale-50 text-sale-700" : "bg-green-50 text-success-500")}>
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>

      <div className="mt-6 rounded-2xl border p-5">
        <OrderStepper status={order.status} />
      </div>

      {awaitingPayment && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning-500/40 bg-amber-50 p-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning-500" />
            <span>
              此訂單尚未付款 ({pay.label})。若付款頁面已關閉，請重新下單或聯繫客服協助。
            </span>
          </div>
          <Button variant="outline" size="sm" loading={cancelling} onClick={doCancel}>
            取消訂單
          </Button>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border">
            <h2 className="border-b px-5 py-3 text-sm font-semibold">商品 ({order.items.reduce((s, i) => s + i.quantity, 0)} 件)</h2>
            <ul className="divide-y">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                    <ProductImage src={it.image} alt={it.productName} width={64} height={64} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-medium">{it.productName}</div>
                    <div className="text-xs text-ink-500">
                      {it.variantName} × {it.quantity}
                    </div>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{formatMoney(it.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t px-5 py-4 text-sm">
              <div className="flex justify-between"><dt className="text-ink-500">小計</dt><dd className="tabular-nums">{formatMoney(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between text-success-500"><dt>優惠 {order.couponCode}</dt><dd className="tabular-nums">-{formatMoney(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-ink-500">運費</dt><dd className="tabular-nums">{order.shippingFee === 0 ? "免運" : formatMoney(order.shippingFee)}</dd></div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold"><dt>總計</dt><dd className="tabular-nums">{formatMoney(order.total)}</dd></div>
            </dl>
          </section>

          <section className="rounded-2xl border">
            <h2 className="border-b px-5 py-3 text-sm font-semibold">訂單紀錄</h2>
            <ol className="space-y-4 px-5 py-4">
              {events.map((ev) => (
                <li key={ev.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink-300" />
                  <div>
                    <div className="text-ink-800">{ev.message}</div>
                    <div className="text-xs text-ink-400">{formatDate(ev.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border p-5 text-sm">
            <h2 className="flex items-center gap-2 font-semibold"><Truck className="h-4 w-4 text-brand-600" /> 配送</h2>
            <div className="mt-3 space-y-1 text-ink-700">
              <div>{ship.label} · {ship.carrier}</div>
              <div>{addr.name} · {addr.phone}</div>
              {addr.storeName ? (
                <div className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3.5 w-3.5 text-ink-400" />{addr.storeName} ({addr.storeId})</div>
              ) : addr.line1 ? (
                <div>{addr.zip} {addr.city}{addr.district}{addr.line1}</div>
              ) : null}
            </div>
            {order.shipment && (
              <div className="mt-3 rounded-xl bg-ink-50 p-3">
                <div className="flex items-center gap-2 text-xs text-ink-500"><Package className="h-3.5 w-3.5" /> 物流追蹤</div>
                <div className="mt-1 font-mono text-sm">{order.shipment.trackingNo ?? "—"}</div>
                <div className="text-xs text-ink-500">{order.shipment.carrier}{order.shipment.shippedAt ? ` · ${formatDate(order.shipment.shippedAt)} 出貨` : ""}</div>
              </div>
            )}
          </section>
          <section className="rounded-2xl border p-5 text-sm">
            <h2 className="font-semibold">付款</h2>
            <div className="mt-3 space-y-1 text-ink-700">
              <div>{pay.label}</div>
              <div className={cn(order.paymentStatus === "succeeded" ? "text-success-500" : order.paymentStatus === "failed" ? "text-sale-600" : "text-ink-500")}>
                {order.paymentStatus === "succeeded" ? "已付款" : order.paymentStatus === "failed" ? "付款失敗" : order.paymentStatus === "refunded" ? "已退款" : "待付款"}
                {order.payment?.paidAt && ` · ${formatDate(order.payment.paidAt)}`}
              </div>
              {order.payment?.txnId && <div className="font-mono text-xs text-ink-400">交易號 {order.payment.txnId}</div>}
            </div>
          </section>
          {order.note && (
            <section className="rounded-2xl border p-5 text-sm">
              <h2 className="font-semibold">備註</h2>
              <p className="mt-2 text-ink-700">{order.note}</p>
            </section>
          )}
          <Link href="/products" className="block">
            <Button variant="outline" full>繼續購物</Button>
          </Link>
        </aside>
      </div>
    </div>
  );
}
