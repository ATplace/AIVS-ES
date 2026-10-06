"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Eye, Flame, Minus, Plus, ShieldCheck, ShoppingBag, Truck, RotateCcw, Store, Zap } from "lucide-react";
import type { ProductDTO, VariantDTO } from "@es/shared";
import { SHIPPING_METHOD_META, etaRange, formatMoney, DEFAULT_FREE_SHIPPING_THRESHOLD } from "@es/shared";
import { useCart } from "@/store/cart";
import { toast } from "@/components/ui/Toast";
import { Price } from "@/components/ui/Price";
import { Rating } from "@/components/ui/Rating";
import { Button } from "@/components/ui/Button";
import { Countdown } from "./Countdown";
import { Gallery } from "./Gallery";
import { cn, compactNumber } from "@/lib/utils";

interface Props {
  product: ProductDTO;
  social: { viewingNow: number; soldLast24h: number };
}

export function ProductDetail({ product: p, social }: Props) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState<"add" | "buy" | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  // 由規格 options 推導選項群組
  const optionKeys = useMemo(() => {
    const keys: string[] = [];
    for (const v of p.variants) for (const k of Object.keys(v.options)) if (!keys.includes(k)) keys.push(k);
    return keys;
  }, [p.variants]);
  const optionValues = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const k of optionKeys) m[k] = [...new Set(p.variants.map((v) => v.options[k]).filter(Boolean))];
    return m;
  }, [optionKeys, p.variants]);

  const firstAvailable = p.variants.find((v) => v.stock > 0) ?? p.variants[0];
  const [selected, setSelected] = useState<Record<string, string>>(() => ({ ...(firstAvailable?.options ?? {}) }));

  const variant: VariantDTO | undefined = useMemo(() => {
    if (optionKeys.length === 0) return p.variants[0];
    return p.variants.find((v) => optionKeys.every((k) => v.options[k] === selected[k]));
  }, [p.variants, optionKeys, selected]);

  const isAvailable = (key: string, value: string) => p.variants.some((v) => v.options[key] === value && optionKeys.every((k) => k === key || !selected[k] || v.options[k] === selected[k]) && v.stock > 0);

  const stock = variant?.stock ?? 0;
  const soldOut = !variant || stock <= 0;
  const low = !soldOut && stock <= 5;
  const flash = p.flashSaleEndsAt && new Date(p.flashSaleEndsAt).getTime() > Date.now();
  const price = variant?.price ?? p.minPrice;
  const compareAt = variant?.compareAtPrice ?? p.compareAtPrice;
  const toFree = Math.max(0, DEFAULT_FREE_SHIPPING_THRESHOLD - price * qty);

  const doAdd = async (mode: "add" | "buy") => {
    if (!variant || soldOut) return;
    setBusy(mode);
    try {
      await add(variant.id, qty, { name: p.name, image: p.images[0]?.url ?? null });
      if (mode === "buy") {
        useCart.getState().close();
        router.push("/checkout");
      } else {
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1600);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <Gallery
          images={p.images}
          name={p.name}
          badge={
            flash ? (
              <span className="flex items-center gap-1 rounded-full bg-sale-500 px-3 py-1 text-xs font-bold text-white shadow">
                <Flame className="h-3.5 w-3.5" /> 限時搶購
              </span>
            ) : undefined
          }
        />

        <div className="flex flex-col">
          {p.category && (
            <Link href={`/products?category=${p.category.slug}`} className="text-xs text-ink-500 hover:text-ink-900">
              {p.category.name}
            </Link>
          )}
          <h1 className="mt-1 text-2xl leading-snug font-bold tracking-tight sm:text-3xl">{p.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            {p.reviewCount > 0 && (
              <a href="#reviews" className="hover:underline">
                <Rating value={p.rating} count={p.reviewCount} size="md" />
              </a>
            )}
            {p.soldCount > 0 && <span className="text-sm text-ink-500">已售出 {compactNumber(p.soldCount)} 件</span>}
          </div>

          <div className="mt-5">
            <Price price={price} compareAt={compareAt} size="lg" showSavings />
          </div>

          {flash && p.flashSaleEndsAt && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-sale-50 p-3">
              <span className="text-sm font-semibold text-sale-700">特價倒數</span>
              <Countdown endsAt={p.flashSaleEndsAt} size="md" />
            </div>
          )}

          {(social.viewingNow > 1 || social.soldLast24h > 0) && (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-600">
              {social.viewingNow > 1 && (
                <span className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-brand-600" /> {social.viewingNow} 人正在瀏覽
                </span>
              )}
              {social.soldLast24h > 0 && (
                <span className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-sale-500" /> 24 小時內售出 {social.soldLast24h} 件
                </span>
              )}
            </div>
          )}

          {optionKeys.map((key) => (
            <div key={key} className="mt-6">
              <div className="mb-2 flex items-center gap-2 text-sm">
                <span className="font-medium">{key}</span>
                <span className="text-ink-500">{selected[key]}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {optionValues[key].map((val) => {
                  const active = selected[key] === val;
                  const avail = isAvailable(key, val);
                  return (
                    <button
                      key={val}
                      onClick={() => setSelected((s) => ({ ...s, [key]: val }))}
                      className={cn(
                        "h-10 rounded-xl border px-4 text-sm transition",
                        active ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white hover:border-ink-900",
                        !avail && "border-dashed text-ink-400 line-through",
                      )}
                      aria-pressed={active}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-6 flex items-center gap-4">
            <span className="text-sm font-medium">數量</span>
            <div className="flex items-center rounded-xl border">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-10 w-10 text-ink-600 hover:bg-ink-50" aria-label="減少">
                <Minus className="mx-auto h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm tabular-nums">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(stock || 1, q + 1))} disabled={qty >= stock} className="h-10 w-10 text-ink-600 hover:bg-ink-50 disabled:opacity-40" aria-label="增加">
                <Plus className="mx-auto h-4 w-4" />
              </button>
            </div>
            <span className={cn("text-sm", soldOut ? "text-ink-400" : low ? "font-semibold text-sale-600" : "text-ink-500")}>
              {soldOut ? "目前缺貨" : low ? `🔥 僅剩 ${stock} 件` : `庫存 ${stock} 件`}
            </span>
          </div>

          <div className="mt-6 hidden gap-3 lg:flex">
            <Button size="lg" variant="outline" className="relative flex-1 overflow-hidden" disabled={soldOut} loading={busy === "add"} onClick={() => doAdd("add")}>
              <AnimatePresence mode="wait" initial={false}>
                {justAdded ? (
                  <motion.span key="ok" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="flex items-center gap-2 text-success-500">
                    <Check className="h-5 w-5" /> 已加入
                  </motion.span>
                ) : (
                  <motion.span key="add" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" /> 加入購物車
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
            <Button size="lg" variant={flash ? "sale" : "primary"} className="flex-1" disabled={soldOut} loading={busy === "buy"} onClick={() => doAdd("buy")}>
              立即購買
            </Button>
          </div>

          <ul className="mt-7 space-y-2.5 rounded-2xl border p-4 text-sm">
            <li className="flex items-start gap-2.5">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <span>
                {SHIPPING_METHOD_META.home.label}預計 <b>{etaRange(SHIPPING_METHOD_META.home.etaDays)}</b> 送達；超商取貨 {etaRange(SHIPPING_METHOD_META.cvs_711.etaDays)} 到店
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Store className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <span>{toFree > 0 ? <>再買 <b className="text-sale-600">{formatMoney(toFree)}</b> 即享全站免運</> : <b className="text-success-500">此筆訂單已享免運</b>}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <span>7 天鑑賞期，不滿意免費退換</span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <span>SSL 加密付款，支援信用卡、LINE Pay、貨到付款</span>
            </li>
          </ul>

          {p.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <Link key={t} href={`/products?tag=${encodeURIComponent(t)}`} className="rounded-full bg-ink-100 px-3 py-1 text-xs text-ink-600 hover:bg-ink-200">
                  #{t}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 行動版底部固定列 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-4 py-3 backdrop-blur lg:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-ink-500">{variant?.name ?? "請選擇規格"}</div>
            <div className="text-lg font-bold tabular-nums text-sale-600">{formatMoney(price * qty)}</div>
          </div>
          <Button variant="outline" className="ml-auto shrink-0" disabled={soldOut} loading={busy === "add"} onClick={() => doAdd("add")}>
            {justAdded ? <Check className="h-5 w-5 text-success-500" /> : <ShoppingBag className="h-5 w-5" />}
          </Button>
          <Button variant={flash ? "sale" : "primary"} className="shrink-0 px-6" disabled={soldOut} loading={busy === "buy"} onClick={() => doAdd("buy")}>
            立即購買
          </Button>
        </div>
      </div>
      <div className="h-20 lg:hidden" />
    </>
  );
}
