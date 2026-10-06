"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import type { ProductDTO } from "@es/shared";
import { formatMoney } from "@es/shared";
import { ProductImage } from "@/components/ui/ProductImage";

export function Hero({ tagline, highlight, ordersLast24h }: { tagline: string; highlight: ProductDTO | null; ordersLast24h: number }) {
  return (
    <section className="container-x pt-6 sm:pt-10">
      <div className="grid overflow-hidden rounded-3xl bg-ink-900 text-white lg:grid-cols-2">
        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-200">
              <Sparkles className="h-3.5 w-3.5" /> 本週精選
            </span>
            <h1 className="mt-5 text-3xl leading-tight font-bold tracking-tight sm:text-4xl lg:text-5xl">{tagline}</h1>
            <p className="mt-4 max-w-md text-sm text-white/70 sm:text-base">嚴選 3C、服飾、美妝與居家好物。滿額免運、7 天鑑賞、超商取貨，讓每一次購物都安心。</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-6 text-sm font-semibold text-ink-900 transition hover:bg-brand-50">
                立即選購 <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/products?flash=true" className="inline-flex h-12 items-center rounded-2xl border border-white/25 px-6 text-sm font-medium text-white transition hover:bg-white/10">
                限時搶購
              </Link>
            </div>
            {ordersLast24h > 0 && (
              <p className="mt-6 flex items-center gap-2 text-xs text-white/60">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
                </span>
                過去 24 小時已有 <b className="text-white">{ordersLast24h}</b> 筆訂單成立
              </p>
            )}
          </motion.div>
        </div>
        <div className="relative min-h-72 lg:min-h-[480px]">
          {highlight ? (
            <>
              <ProductImage src={highlight.images[0]?.url} alt={highlight.name} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/80 to-transparent p-6">
                <Link href={`/products/${highlight.slug}`} className="inline-flex items-center gap-3 rounded-2xl bg-white/95 p-3 pr-5 text-ink-900 shadow-float backdrop-blur transition hover:bg-white">
                  <div className="h-12 w-12 overflow-hidden rounded-xl bg-ink-100">
                    <ProductImage src={highlight.images[1]?.url ?? highlight.images[0]?.url} alt="" width={48} height={48} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <div className="line-clamp-1 text-sm font-semibold">{highlight.name}</div>
                    <div className="text-xs text-ink-500">
                      {highlight.compareAtPrice && <span className="line-through-soft mr-1.5">{formatMoney(highlight.compareAtPrice)}</span>}
                      <span className="font-semibold text-sale-600">{formatMoney(highlight.minPrice)}</span>
                    </div>
                  </div>
                  <ArrowRight className="ml-2 h-4 w-4 text-ink-400" />
                </Link>
              </div>
            </>
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-brand-700 to-ink-900" />
          )}
        </div>
      </div>
    </section>
  );
}
