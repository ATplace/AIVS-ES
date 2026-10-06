"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductImage } from "@/components/ui/ProductImage";
import { cn } from "@/lib/utils";

export function Gallery({ images, name, badge }: { images: { url: string; alt: string }[]; name: string; badge?: React.ReactNode }) {
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const imgs = images.length ? images : [{ url: "", alt: name }];
  const cur = imgs[Math.min(idx, imgs.length - 1)];
  const prev = () => setIdx((i) => (i - 1 + imgs.length) % imgs.length);
  const next = () => setIdx((i) => (i + 1) % imgs.length);

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      <div className="relative aspect-square flex-1 overflow-hidden rounded-3xl bg-ink-100">
        <AnimatePresence mode="wait">
          <motion.div key={cur.url || idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0">
            <ProductImage src={cur.url} alt={cur.alt || name} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="cursor-zoom-in object-cover" onClick={() => cur.url && setZoom(true)} />
          </motion.div>
        </AnimatePresence>
        {badge && <div className="absolute top-4 left-4">{badge}</div>}
        {cur.url && (
          <button onClick={() => setZoom(true)} className="absolute right-4 bottom-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink-800 shadow-card" aria-label="放大圖片">
            <ZoomIn className="h-4.5 w-4.5" />
          </button>
        )}
        {imgs.length > 1 && (
          <>
            <button onClick={prev} className="absolute top-1/2 left-3 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-card lg:hidden" aria-label="上一張">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={next} className="absolute top-1/2 right-3 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-card lg:hidden" aria-label="下一張">
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      {imgs.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto lg:w-20 lg:flex-col">
          {imgs.map((im, i) => (
            <button
              key={im.url + i}
              onClick={() => setIdx(i)}
              className={cn("relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-ink-100", i === idx ? "border-ink-900" : "border-transparent hover:border-ink-300")}
              aria-label={`圖片 ${i + 1}`}
            >
              <ProductImage src={im.url} alt={im.alt || name} fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {zoom && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] grid place-items-center bg-ink-900/90 p-4" onClick={() => setZoom(false)}>
            <button className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white" aria-label="關閉">
              <X className="h-5 w-5" />
            </button>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }} className="relative h-[80vh] w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
              <ProductImage src={cur.url} alt={cur.alt || name} fill sizes="100vw" className="object-contain" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
