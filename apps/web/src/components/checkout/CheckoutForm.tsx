"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, MapPin, Search, Tag, X } from "lucide-react";
import type { PaymentProvider, ShippingMethod } from "@es/shared";
import { etaRange, formatMoney } from "@es/shared";
import { ApiRequestError, getCheckoutOptions, quoteCheckout, searchStores, submitCheckout, type CheckoutOptions, type PaymentAction, type QuoteResult } from "@/lib/api";
import { useCart } from "@/store/cart";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/Button";
import { ProductImage } from "@/components/ui/ProductImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

type FieldErrors = Record<string, string>;

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-medium text-ink-600">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-sale-600">{error}</span>}
    </label>
  );
}
const inputCls = "h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none transition focus:border-ink-900";

function RadioCard({ active, onClick, title, desc, right, disabled }: { active: boolean; onClick: () => void; title: string; desc?: string; right?: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn("flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition", active ? "border-ink-900 bg-ink-50 ring-1 ring-ink-900" : "hover:border-ink-400", disabled && "opacity-50")}
      aria-pressed={active}
    >
      <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", active ? "border-ink-900 bg-ink-900" : "border-ink-300")}>{active && <Check className="h-3 w-3 text-white" />}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        {desc && <span className="block text-xs text-ink-500">{desc}</span>}
      </span>
      {right && <span className="shrink-0 text-sm font-medium">{right}</span>}
    </button>
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const { cart, cartId, reset } = useCart();
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);

  const [options, setOptions] = useState<CheckoutOptions | null>(null);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider | null>(null);
  const [addr, setAddr] = useState({ name: "", phone: "", zip: "", city: "", district: "", line1: "" });
  const [store, setStore] = useState<{ id: string; name: string; address: string } | null>(null);
  const [storeQ, setStoreQ] = useState("");
  const [stores, setStores] = useState<{ id: string; name: string; address: string }[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | undefined>(undefined);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formAction, setFormAction] = useState<Extract<PaymentAction, { kind: "form" }> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (hydrated && user && !email) setEmail(user.email);
    if (hydrated && user && !addr.name) setAddr((a) => ({ ...a, name: user.name, phone: user.phone ?? "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user]);

  const loadOptions = useCallback(
    async (code?: string) => {
      if (!cartId) return;
      try {
        const o = await getCheckoutOptions(cartId, code);
        setOptions(o);
        if (o.couponError) {
          setCouponMsg(o.couponError);
          setCoupon(undefined);
        } else if (o.coupon) setCouponMsg(null);
        setShippingMethod((m) => m ?? o.shipping[0]?.method ?? null);
        setPaymentProvider((p) => p ?? o.payments[0]?.provider ?? null);
      } catch (e) {
        setLoadErr((e as Error).message);
      }
    },
    [cartId],
  );

  useEffect(() => {
    void loadOptions(coupon);
  }, [loadOptions, coupon]);

  useEffect(() => {
    if (!cartId || !shippingMethod) return;
    quoteCheckout({ cartId, shippingMethod, couponCode: coupon })
      .then(setQuote)
      .catch((e) => {
        if (coupon) {
          setCouponMsg((e as Error).message);
          setCoupon(undefined);
        }
      });
  }, [cartId, shippingMethod, coupon, cart?.subtotal]);

  const selectedShipping = useMemo(() => options?.shipping.find((s) => s.method === shippingMethod) ?? null, [options, shippingMethod]);

  useEffect(() => {
    if (!selectedShipping?.needsStore || !shippingMethod) {
      setStores([]);
      return;
    }
    const t = setTimeout(() => searchStores(shippingMethod, storeQ).then((r) => setStores(r.stores)).catch(() => setStores([])), 150);
    return () => clearTimeout(t);
  }, [selectedShipping?.needsStore, shippingMethod, storeQ]);

  useEffect(() => {
    if (formAction && formRef.current) formRef.current.submit();
  }, [formAction]);

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponMsg(null);
    setCoupon(code);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cartId || !shippingMethod || !paymentProvider) return;
    const errs: FieldErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "請輸入正確的 Email";
    if (!addr.name) errs.name = "請輸入收件人姓名";
    if (!/^\d{8,}$/.test(addr.phone.replace(/\D/g, ""))) errs.phone = "請輸入正確的手機號碼";
    if (selectedShipping?.needsAddress) {
      if (!addr.city) errs.city = "必填";
      if (!addr.district) errs.district = "必填";
      if (!addr.line1) errs.line1 = "請輸入地址";
    }
    if (selectedShipping?.needsStore && !store) errs.store = "請選擇取貨門市";
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("請確認填寫內容");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitCheckout({
        cartId,
        email,
        shippingMethod,
        address: addr,
        storeId: store?.id,
        storeName: store?.name,
        paymentProvider,
        couponCode: coupon,
        note: note || undefined,
      });
      reset();
      const orderNo = res.order.orderNo;
      if (res.payment.kind === "redirect") window.location.href = res.payment.url;
      else if (res.payment.kind === "form") setFormAction(res.payment);
      else router.push(`/orders/${orderNo}?placed=1`);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "建立訂單失敗";
      toast.error(msg);
      setErrors({ form: msg });
      setSubmitting(false);
      if (err instanceof ApiRequestError && err.status === 400 && /購物車/.test(err.message)) await useCart.getState().refresh();
    }
  };

  // ---------- 狀態分支 ----------
  if (cartId === null && cart === null) {
    // 尚未初始化或沒有購物車
    return (
      <div className="container-x py-20 text-center">
        <p className="text-ink-600">購物車是空的</p>
        <Link href="/products" className="mt-4 inline-block">
          <Button>去逛逛</Button>
        </Link>
      </div>
    );
  }
  if (!cart) {
    return (
      <div className="container-x py-10">
        <Skeleton className="h-9 w-32" />
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_400px]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }
  if (cart.items.length === 0) {
    return (
      <div className="container-x py-20 text-center">
        <p className="text-ink-600">購物車是空的</p>
        <Link href="/products" className="mt-4 inline-block">
          <Button>去逛逛</Button>
        </Link>
      </div>
    );
  }
  if (loadErr) {
    return (
      <div className="container-x py-20 text-center">
        <p className="text-sale-600">{loadErr}</p>
      </div>
    );
  }

  const totals = quote ?? { subtotal: cart.subtotal, discount: 0, shippingFee: selectedShipping?.fee ?? 0, total: cart.subtotal + (selectedShipping?.fee ?? 0), coupon: null };

  return (
    <div className="container-x py-6 sm:py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">結帳</h1>
        <span className="flex items-center gap-1 text-xs text-ink-500">
          <Lock className="h-3.5 w-3.5" /> 安全加密連線
        </span>
      </div>

      <form onSubmit={submit} className="mt-6 grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
        <div className="space-y-8">
          {/* 聯絡資訊 */}
          <section className="rounded-2xl border p-5">
            <h2 className="text-base font-semibold">1. 聯絡資訊</h2>
            {!user && hydrated && (
              <p className="mt-1 text-xs text-ink-500">
                已有帳號？<Link href="/account" className="text-brand-600 hover:underline">登入</Link> 可自動帶入資料。也可以直接以訪客結帳。
              </p>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Email (訂單通知)" error={errors.email} className="sm:col-span-2">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} autoComplete="email" placeholder="you@example.com" />
              </Field>
              <Field label="收件人姓名" error={errors.name}>
                <input value={addr.name} onChange={(e) => setAddr({ ...addr, name: e.target.value })} className={inputCls} autoComplete="name" />
              </Field>
              <Field label="手機號碼" error={errors.phone}>
                <input value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} className={inputCls} autoComplete="tel" inputMode="tel" placeholder="09xxxxxxxx" />
              </Field>
            </div>
          </section>

          {/* 配送方式 */}
          <section className="rounded-2xl border p-5">
            <h2 className="text-base font-semibold">2. 配送方式</h2>
            <div className="mt-4 space-y-2">
              {!options
                ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                : options.shipping.map((s) => (
                    <RadioCard
                      key={s.method}
                      active={shippingMethod === s.method}
                      onClick={() => setShippingMethod(s.method)}
                      title={s.label}
                      desc={`${s.carrier} · 預計 ${etaRange(s.etaDays)} ${s.needsStore ? "到店" : "送達"}`}
                      right={s.fee === 0 ? <span className="text-success-500">免運</span> : formatMoney(s.fee)}
                    />
                  ))}
            </div>

            {selectedShipping?.needsAddress && (
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <Field label="郵遞區號">
                  <input value={addr.zip} onChange={(e) => setAddr({ ...addr, zip: e.target.value })} className={inputCls} autoComplete="postal-code" inputMode="numeric" />
                </Field>
                <Field label="縣市" error={errors.city}>
                  <input value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} className={inputCls} placeholder="台北市" />
                </Field>
                <Field label="鄉鎮市區" error={errors.district}>
                  <input value={addr.district} onChange={(e) => setAddr({ ...addr, district: e.target.value })} className={inputCls} placeholder="信義區" />
                </Field>
                <Field label="地址" error={errors.line1} className="sm:col-span-3">
                  <input value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} className={inputCls} autoComplete="street-address" placeholder="路名、巷弄、門牌、樓層" />
                </Field>
              </div>
            )}

            {selectedShipping?.needsStore && (
              <div className="mt-5">
                <div className="mb-2 text-xs font-medium text-ink-600">選擇取貨門市</div>
                {store ? (
                  <div className="flex items-start gap-3 rounded-xl border border-ink-900 bg-ink-50 p-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    <div className="flex-1 text-sm">
                      <div className="font-medium">{store.name}</div>
                      <div className="text-xs text-ink-500">{store.address}</div>
                    </div>
                    <button type="button" onClick={() => setStore(null)} className="text-ink-400 hover:text-ink-900" aria-label="重新選擇">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <input value={storeQ} onChange={(e) => setStoreQ(e.target.value)} placeholder="輸入門市名稱或地址關鍵字" className={cn(inputCls, "pl-9")} />
                    </div>
                    <ul className="mt-2 max-h-56 divide-y overflow-y-auto rounded-xl border">
                      {stores.length === 0 && <li className="p-3 text-sm text-ink-400">沒有符合的門市</li>}
                      {stores.map((s) => (
                        <li key={s.id}>
                          <button type="button" onClick={() => setStore(s)} className="flex w-full items-start gap-3 p-3 text-left hover:bg-ink-50">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                            <span>
                              <span className="block text-sm font-medium">{s.name}</span>
                              <span className="block text-xs text-ink-500">{s.address}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    {errors.store && <p className="mt-1 text-xs text-sale-600">{errors.store}</p>}
                  </>
                )}
              </div>
            )}
          </section>

          {/* 付款方式 */}
          <section className="rounded-2xl border p-5">
            <h2 className="text-base font-semibold">3. 付款方式</h2>
            <div className="mt-4 space-y-2">
              {!options
                ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                : options.payments.map((p) => <RadioCard key={p.provider} active={paymentProvider === p.provider} onClick={() => setPaymentProvider(p.provider)} title={p.label} desc={p.description} />)}
            </div>
          </section>

          <section className="rounded-2xl border p-5">
            <h2 className="text-base font-semibold">4. 備註 (選填)</h2>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} placeholder="給店家的話，例如：請勿放管理室" className="mt-3 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-ink-900" />
          </section>
        </div>

        {/* 摘要 */}
        <aside className="rounded-2xl border p-5 lg:sticky lg:top-24">
          <h2 className="text-base font-semibold">訂單摘要</h2>
          <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto">
            {cart.items.map((it) => (
              <li key={it.id} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                  <ProductImage src={it.product.image} alt={it.product.name} width={56} height={56} className="h-full w-full object-cover" />
                  <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-ink-900 px-1 text-[10px] text-white">{it.quantity}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm">{it.product.name}</div>
                  <div className="text-xs text-ink-500">{it.variant.name}</div>
                </div>
                <span className="text-sm tabular-nums">{formatMoney(it.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t pt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyCoupon())}
                  placeholder="優惠碼"
                  className={cn(inputCls, "pl-9 uppercase")}
                />
              </div>
              <Button type="button" variant="outline" onClick={applyCoupon}>
                套用
              </Button>
            </div>
            {couponMsg && <p className="mt-1.5 text-xs text-sale-600">{couponMsg}</p>}
            {totals.coupon && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-success-500">
                <Check className="h-3.5 w-3.5" /> 已套用 {totals.coupon.code}
                {totals.coupon.freeShipping ? "：免運" : `：折抵 ${formatMoney(totals.coupon.discount)}`}
                <button type="button" onClick={() => { setCoupon(undefined); setCouponInput(""); }} className="ml-1 text-ink-400 hover:text-ink-900" aria-label="移除優惠碼">
                  <X className="h-3.5 w-3.5" />
                </button>
              </p>
            )}
          </div>

          <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">商品小計</dt>
              <dd className="tabular-nums">{formatMoney(totals.subtotal)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-success-500">
                <dt>優惠折抵</dt>
                <dd className="tabular-nums">-{formatMoney(totals.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-500">運費</dt>
              <dd className="tabular-nums">{totals.shippingFee === 0 ? <span className="text-success-500">免運</span> : formatMoney(totals.shippingFee)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <span className="font-medium">總計</span>
            <span className="text-2xl font-bold tabular-nums">{formatMoney(totals.total)}</span>
          </div>
          {errors.form && <p className="mt-3 rounded-xl bg-sale-50 p-3 text-xs text-sale-700">{errors.form}</p>}
          <Button type="submit" full size="lg" className="mt-5" loading={submitting} disabled={!options || !shippingMethod || !paymentProvider}>
            {paymentProvider === "cod" ? "確認下單" : `前往付款 ${formatMoney(totals.total)}`}
          </Button>
          <p className="mt-3 text-center text-[11px] text-ink-400">點擊即表示同意服務條款與退換貨政策</p>
        </aside>
      </form>

      {formAction && (
        <form ref={formRef} method={formAction.method} action={formAction.action} className="hidden">
          {Object.entries(formAction.fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      )}
    </div>
  );
}
