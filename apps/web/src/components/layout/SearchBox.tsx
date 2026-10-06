"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { getSuggestions } from "@/lib/api";
import { ProductImage } from "@/components/ui/ProductImage";
import { cn } from "@/lib/utils";

export function SearchBox({ className, autoFocus = false, onNavigate }: { className?: string; autoFocus?: boolean; onNavigate?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<{ name: string; slug: string; image: string | null }[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 1) {
      setItems([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await getSuggestions(term);
        setItems(r.suggestions);
        setOpen(true);
      } catch {
        setItems([]);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    onNavigate?.();
    router.push(path);
  };

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) go(`/products?q=${encodeURIComponent(q.trim())}`);
        }}
        role="search"
      >
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => items.length && setOpen(true)}
          placeholder="搜尋商品、品牌、分類…"
          className="h-10 w-full rounded-full border border-ink-200 bg-ink-50 pr-9 pl-10 text-sm outline-none transition focus:border-ink-900 focus:bg-white"
          aria-label="搜尋"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} className="absolute top-1/2 right-3 -translate-y-1/2 text-ink-400 hover:text-ink-700" aria-label="清除">
            <X className="h-4 w-4" />
          </button>
        )}
      </form>
      {open && items.length > 0 && (
        <div className="absolute top-12 right-0 left-0 z-50 overflow-hidden rounded-2xl border bg-white shadow-float">
          <ul>
            {items.map((s) => (
              <li key={s.slug}>
                <Link href={`/products/${s.slug}`} onClick={() => go(`/products/${s.slug}`)} className="flex items-center gap-3 px-3 py-2 hover:bg-ink-50">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                    <ProductImage src={s.image} alt={s.name} width={40} height={40} className="h-full w-full object-cover" />
                  </div>
                  <span className="text-sm text-ink-800">{s.name}</span>
                </Link>
              </li>
            ))}
            <li>
              <button onClick={() => go(`/products?q=${encodeURIComponent(q.trim())}`)} className="w-full px-3 py-2.5 text-left text-sm text-brand-600 hover:bg-ink-50">
                搜尋「{q}」的所有結果
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
