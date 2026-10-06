"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Tag, Trash2, ArrowRight } from "lucide-react";
import type { ProductDTO } from "@es/shared";
import { formatMoney } from "@es/shared";
import { useCart } from "@/store/cart";
import { ProductImage } from "@/components/ui/ProductImage";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { ProductRail } from "@/components/product/ProductRail";
import { TrustBadges } from "@/components/layout/Footer";
import { FreeShippingBar } from "./MiniCart";
import { Skeleton } from "@/components/ui/Skeleton";

export function CartView({ recommendations }: { recommendations: ProductDTO[] }) {
  const { cart, cartId, update, remove } = useCart();
  const items = cart?.items ?? [];
  const loading = cartId !== null && cart === null;

  if (loading) {
    return (
      <div className="container-x py-10">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="pb-10">
        <div className="container-x flex flex-col items-center py-20 text-center">
          <ShoppingBag className="h-14 w-14 text-ink-200" />
          <h1 className="mt-4 text-xl font-semibold">購物車是空的</h1>
          <p className="mt-1 text-sm text-ink-500">快去看看大家都在買什麼吧</p>
          <Link href="/products" className="mt-6">
            <Button size="lg">
              開始購物 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <ProductRail title="熱門推薦" products={recommendations} variant="grid" />
      </div>
    );
  }

  return (
    <div className="container-x py-6 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">購物車</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-4">
          {cart && cart.freeShippingThreshold > 0 && <FreeShippingBar amountToFree={cart.amountToFreeShipping} threshold={cart.freeShippingThreshold} subtotal={cart.subtotal} />}
          <ul className="divide-y rounded-2xl border">
            {items.map((it) => (
              <li key={it.id} className="flex gap-4 p-4">
                <Link href={`/products/${it.product.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-100 sm:h-28 sm:w-28">
                  <ProductImage src={it.product.image} alt={it.product.name} width={112} height={112} className="h-full w-full object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/products/${it.product.slug}`} className="line-clamp-2 font-medium hover:underline">
                        {it.product.name}
                      </Link>
                      <div className="mt-0.5 text-xs text-ink-500">
                        {it.variant.name} · SKU {it.variant.sku}
                      </div>
                      {it.variant.stock <= 5 && <div className="mt-1 text-xs font-medium text-sale-600">僅剩 {it.variant.stock} 件，建議盡快結帳</div>}
                    </div>
                    <button onClick={() => remove(it.id).then(() => toast.info("已移除商品"))} className="p-1 text-ink-400 hover:text-sale-600" aria-label="移除">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center rounded-lg border">
                      <button className="h-9 w-9 text-ink-600 hover:bg-ink-50" onClick={() => update(it.id, it.quantity - 1).catch((e) => toast.error(e.message))} aria-label="減少">
                        <Minus className="mx-auto h-3.5 w-3.5" />
                      </button>
                      <span className="w-9 text-center text-sm tabular-nums">{it.quantity}</span>
                      <button
                        className="h-9 w-9 text-ink-600 hover:bg-ink-50 disabled:opacity-40"
                        disabled={it.quantity >= it.variant.stock}
                        onClick={() => update(it.id, it.quantity + 1).catch((e) => toast.error(e.message))}
                        aria-label="增加"
                      >
                        <Plus className="mx-auto h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular-nums">{formatMoney(it.lineTotal)}</div>
                      {it.variant.compareAtPrice && it.variant.compareAtPrice > it.variant.price && (
                        <div className="text-xs text-ink-400">
                          <span className="line-through-soft">{formatMoney(it.variant.compareAtPrice * it.quantity)}</span>
                          <span className="ml-1 text-sale-600">省 {formatMoney((it.variant.compareAtPrice - it.variant.price) * it.quantity)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/products" className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900">
            ← 繼續購物
          </Link>
        </div>

        <aside className="rounded-2xl border p-5 lg:sticky lg:top-24">
          <h2 className="text-base font-semibold">訂單摘要</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">商品小計 ({cart?.itemCount} 件)</dt>
              <dd className="tabular-nums">{formatMoney(cart?.subtotal ?? 0)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">運費</dt>
              <dd className="text-ink-500">{cart && cart.amountToFreeShipping === 0 ? <span className="text-success-500">免運</span> : "結帳時計算"}</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <span className="font-medium">預估總計</span>
            <span className="text-xl font-bold tabular-nums">{formatMoney(cart?.subtotal ?? 0)}</span>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">
            <Tag className="h-3.5 w-3.5" /> 有優惠碼？於結帳頁輸入即可折抵
          </div>
          <Link href="/checkout" className="mt-5 block">
            <Button full size="lg">
              前往結帳 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <div className="mt-5">
            <TrustBadges compact />
          </div>
        </aside>
      </div>
    </div>
  );
}
