"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, LogOut, Package, User } from "lucide-react";
import type { OrderDTO } from "@es/shared";
import { ORDER_STATUS_LABEL, formatMoney } from "@es/shared";
import { getMyOrders } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { useCart } from "@/store/cart";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { cn, formatDate } from "@/lib/utils";

const inputCls = "h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none transition focus:border-ink-900";

function AuthForms() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (tab === "login") await login(email, password);
      else await register({ email, password, name, phone: phone || undefined });
      toast.success(tab === "login" ? "登入成功" : "註冊成功，歡迎加入！");
      void useCart.getState().refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="grid grid-cols-2 rounded-xl bg-ink-100 p-1 text-sm">
        {(["login", "register"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setErr(null); }} className={cn("rounded-lg py-2 font-medium transition", tab === t ? "bg-white shadow-card" : "text-ink-500")}>
            {t === "login" ? "登入" : "註冊"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {tab === "register" && (
          <>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-600">姓名</span>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoComplete="name" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-600">手機 (選填)</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} autoComplete="tel" />
            </label>
          </>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} autoComplete="email" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-600">密碼</span>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} autoComplete={tab === "login" ? "current-password" : "new-password"} />
        </label>
        {err && <p className="rounded-xl bg-sale-50 p-3 text-xs text-sale-700">{err}</p>}
        <Button type="submit" full size="lg" loading={busy}>
          {tab === "login" ? "登入" : "建立帳號"}
        </Button>
        {tab === "login" && <p className="text-center text-xs text-ink-400">示範帳號：demo@es.local / demo1234</p>}
      </form>
    </div>
  );
}

function OrderList() {
  const [orders, setOrders] = useState<OrderDTO[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    getMyOrders()
      .then((r) => setOrders(r.orders))
      .catch((e) => setErr((e as Error).message));
  }, []);
  if (err) return <p className="text-sm text-sale-600">{err}</p>;
  if (!orders)
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  if (orders.length === 0)
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <Package className="mx-auto h-10 w-10 text-ink-200" />
        <p className="mt-3 text-sm text-ink-500">還沒有任何訂單</p>
        <Link href="/products" className="mt-4 inline-block">
          <Button variant="outline">去逛逛</Button>
        </Link>
      </div>
    );
  return (
    <ul className="divide-y rounded-2xl border">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/orders/${o.orderNo}`} className="flex items-center gap-4 p-4 hover:bg-ink-50">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-medium">{o.orderNo}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs", o.status === "pending" ? "bg-sale-50 text-sale-700" : o.status === "cancelled" || o.status === "refunded" ? "bg-ink-100 text-ink-600" : "bg-green-50 text-success-500")}>
                  {ORDER_STATUS_LABEL[o.status]}
                </span>
              </div>
              <div className="mt-1 line-clamp-1 text-xs text-ink-500">
                {o.items.map((i) => `${i.productName} ×${i.quantity}`).join("、")}
              </div>
              <div className="mt-0.5 text-xs text-ink-400">{formatDate(o.createdAt)}</div>
            </div>
            <span className="font-semibold tabular-nums">{formatMoney(o.total)}</span>
            <ChevronRight className="h-4 w-4 text-ink-400" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function AccountView() {
  const { user, hydrated, logout } = useAuth();

  if (!hydrated) {
    return (
      <div className="container-x max-w-md py-16">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-x py-10 sm:py-16">
        <h1 className="mb-8 text-center text-2xl font-bold tracking-tight">會員中心</h1>
        <AuthForms />
      </div>
    );
  }

  return (
    <div className="container-x py-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-700">
            <User className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold">{user.name}</h1>
            <p className="text-sm text-ink-500">{user.email}{user.phone ? ` · ${user.phone}` : ""}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { logout(); toast.info("已登出"); }}>
          <LogOut className="h-4 w-4" /> 登出
        </Button>
      </div>
      <h2 className="mt-10 mb-4 text-lg font-semibold">我的訂單</h2>
      <OrderList />
    </div>
  );
}
