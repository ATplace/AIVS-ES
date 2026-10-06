"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import { formatMoney } from "@es/shared";
import { useCart } from "@/store/cart";
import { ProductImage } from "@/components/ui/ProductImage";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

export function FreeShippingBar({ amountToFree, threshold, subtotal }: { amountToFree: number; threshold: number; subtotal: number }) {
  if (!threshold) return null;
  const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
  return (
    <div className="rounded-xl bg-ink-50 p-3">
      <div className="flex items-center gap-2 text-sm">
        <Truck className="h-4 w-4 text-brand-600" />
        {amountToFree > 0 ? (
          <span>
            再買 <b className="text-sale-600">{formatMoney(amountToFree)}</b> 即可享免運
          </span>
        ) : (
          <span className="font-medium text-success-500">🎉 已達免運門檻</span>
        )}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-200">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} className={amountToFree > 0 ? "h-full bg-brand-500" : "h-full bg-success-500"} />
      </div>
    </div>
  );
}

export function MiniCart() {
  const { cart, isOpen, close, update, remove } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  const items = cart?.items ?? [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-ink-900/40" onClick={close} />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-float"
            role="dialog"
            aria-label="購物車"
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <ShoppingBag className="h-5 w-5" /> 購物車 {cart?.itemCount ? `(${cart.itemCount})` : ""}
              </h2>
              <button onClick={close} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100" aria-label="關閉">
                <X className="h-5 w-5" />
              </button>
            </div>

            {cart && cart.freeShippingThreshold > 0 && (
              <div className="px-5 pt-4">
                <FreeShippingBar amountToFree={cart.amountToFreeShipping} threshold={cart.freeShippingThreshold} subtotal={cart.subtotal} />
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingBag className="h-12 w-12 text-ink-200" />
                  <p className="mt-3 text-ink-500">購物車是空的</p>
                  <Button variant="outline" className="mt-5" onClick={close}>
                    <Link href="/products">去逛逛</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y">
                  {items.map((it) => (
                    <li key={it.id} className="flex gap-3 py-4">
                      <Link href={`/products/${it.product.slug}`} onClick={close} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                        <ProductImage src={it.product.image} alt={it.product.name} width={80} height={80} className="h-full w-full object-cover" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/products/${it.product.slug}`} onClick={close} className="line-clamp-2 text-sm font-medium hover:underline">
                          {it.product.name}
                        </Link>
                        <div className="mt-0.5 text-xs text-ink-500">{it.variant.name}</div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center rounded-lg border">
                            <button className="px-2 py-1 text-ink-600 hover:bg-ink-50 disabled:opacity-40" onClick={() => update(it.id, it.quantity - 1).catch((e) => toast.error(e.message))} aria-label="減少">
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm tabular-nums">{it.quantity}</span>
                            <button
                              className="px-2 py-1 text-ink-600 hover:bg-ink-50 disabled:opacity-40"
                              disabled={it.quantity >= it.variant.stock}
                              onClick={() => update(it.id, it.quantity + 1).catch((e) => toast.error(e.message))}
                              aria-label="增加"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="text-sm font-semibold tabular-nums">{formatMoney(it.lineTotal)}</span>
                        </div>
                      </div>
                      <button onClick={() => remove(it.id)} className="self-start p-1 text-ink-400 hover:text-sale-600" aria-label="移除">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && cart && (
              <div className="border-t px-5 py-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-ink-500">小計</span>
                  <span className="text-lg font-semibold tabular-nums">{formatMoney(cart.subtotal)}</span>
                </div>
                <p className="mb-3 text-xs text-ink-400">運費與優惠將於結帳時計算</p>
                <Link href="/checkout" onClick={close}>
                  <Button full size="lg">
                    前往結帳
                  </Button>
                </Link>
                <Link href="/cart" onClick={close} className="mt-2 block text-center text-sm text-ink-600 hover:underline">
                  查看購物車
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
