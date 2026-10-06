"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Flame, ShoppingBag, Check } from "lucide-react";
import type { ProductDTO } from "@es/shared";
import { discountPercent } from "@es/shared";
import { ProductImage } from "@/components/ui/ProductImage";
import { Price } from "@/components/ui/Price";
import { Rating } from "@/components/ui/Rating";
import { useCart } from "@/store/cart";
import { toast } from "@/components/ui/Toast";
import { cn, compactNumber } from "@/lib/utils";
import { Countdown } from "./Countdown";

interface Props {
  product: ProductDTO;
  priority?: boolean;
  showCountdown?: boolean;
  className?: string;
}

export function ProductCard({ product: p, priority, showCountdown, className }: Props) {
  const add = useCart((s) => s.add);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const pct = discountPercent(p.minPrice, p.compareAtPrice);
  const single = p.variants.length === 1 ? p.variants[0] : null;
  const soldOut = p.totalStock <= 0;
  const low = !soldOut && p.totalStock <= 5;
  const flash = p.flashSaleEndsAt && new Date(p.flashSaleEndsAt).getTime() > Date.now();

  const quickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!single || soldOut) return;
    setAdding(true);
    try {
      await add(single.id, 1, { name: p.name, image: p.images[0]?.url ?? null });
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <motion.article whileHover={{ y: -3 }} transition={{ duration: 0.2 }} className={cn("group relative flex flex-col", className)}>
      <Link href={`/products/${p.slug}`} className="relative block aspect-square overflow-hidden rounded-2xl bg-ink-100">
        <ProductImage
          src={p.images[0]?.url}
          alt={p.images[0]?.alt || p.name}
          fill
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className={cn("object-cover transition duration-500", p.images[1] && "group-hover:opacity-0")}
        />
        {p.images[1] && (
          <ProductImage src={p.images[1].url} alt={p.images[1].alt || p.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover opacity-0 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />
        )}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {pct && <span className="rounded-md bg-sale-500 px-2 py-0.5 text-xs font-bold text-white shadow">-{pct}%</span>}
          {flash && (
            <span className="flex items-center gap-1 rounded-md bg-ink-900/85 px-2 py-0.5 text-[11px] font-medium text-white">
              <Flame className="h-3 w-3 text-sale-300" /> 限時
            </span>
          )}
          {p.tags.includes("新品") && <span className="rounded-md bg-brand-600 px-2 py-0.5 text-[11px] font-medium text-white">新品</span>}
        </div>
        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-white/60">
            <span className="rounded-full bg-ink-900 px-3 py-1 text-xs font-medium text-white">售完</span>
          </div>
        )}
        {single && !soldOut && (
          <button
            onClick={quickAdd}
            disabled={adding}
            className={cn(
              "absolute right-2.5 bottom-2.5 grid h-10 w-10 place-items-center rounded-full bg-white text-ink-900 shadow-card transition hover:bg-ink-900 hover:text-white",
              "sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100",
              added && "bg-success-500 text-white hover:bg-success-500",
            )}
            aria-label="加入購物車"
          >
            {added ? <Check className="h-4.5 w-4.5" /> : <ShoppingBag className="h-4.5 w-4.5" />}
          </button>
        )}
      </Link>

      <div className="mt-3 flex flex-1 flex-col">
        {p.category && <span className="text-[11px] text-ink-400">{p.category.name}</span>}
        <Link href={`/products/${p.slug}`} className="line-clamp-2 text-sm font-medium text-ink-900 hover:underline">
          {p.name}
        </Link>
        <div className="mt-1.5 flex items-center gap-2">
          {p.reviewCount > 0 && <Rating value={p.rating} count={p.reviewCount} />}
        </div>
        <div className="mt-1.5">
          <Price price={p.minPrice} compareAt={p.compareAtPrice} maxPrice={p.maxPrice} size="sm" />
        </div>
        <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {low && <span className="font-medium text-sale-600">僅剩 {p.totalStock} 件</span>}
          {p.soldCount >= 100 && <span className="text-ink-500">已售出 {compactNumber(p.soldCount)}</span>}
        </div>
        {showCountdown && flash && p.flashSaleEndsAt && <Countdown endsAt={p.flashSaleEndsAt} size="sm" className="mt-2" />}
      </div>
    </motion.article>
  );
}
