"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import type { CategoryDTO } from "@es/shared";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const SORTS = [
  { value: "popular", label: "人氣" },
  { value: "newest", label: "最新" },
  { value: "price_asc", label: "價格低到高" },
  { value: "price_desc", label: "價格高到低" },
  { value: "rating", label: "評價最高" },
];
const PRICE_RANGES = [
  { label: "全部", min: "", max: "" },
  { label: "NT$500 以下", min: "", max: "500" },
  { label: "NT$500 - 2,000", min: "500", max: "2000" },
  { label: "NT$2,000 - 10,000", min: "2000", max: "10000" },
  { label: "NT$10,000 以上", min: "10000", max: "" },
];

function useParamSetter() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`);
  };
}

function FilterBody({ categories, onDone }: { categories: CategoryDTO[]; onDone?: () => void }) {
  const sp = useSearchParams();
  const setParams = useParamSetter();
  const cur = sp.get("category") ?? "";
  const min = sp.get("minPrice") ?? "";
  const max = sp.get("maxPrice") ?? "";

  return (
    <div className="space-y-7">
      <div>
        <h3 className="mb-3 text-sm font-semibold">分類</h3>
        <ul className="space-y-1">
          <li>
            <button onClick={() => { setParams({ category: null }); onDone?.(); }} className={cn("flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-ink-50", !cur && "bg-ink-100 font-medium")}>
              全部商品
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <button onClick={() => { setParams({ category: c.slug }); onDone?.(); }} className={cn("flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-ink-50", cur === c.slug && "bg-ink-100 font-medium")}>
                <span>{c.name}</span>
                {c.productCount != null && <span className="text-xs text-ink-400">{c.productCount}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold">價格</h3>
        <ul className="space-y-1">
          {PRICE_RANGES.map((r) => {
            const active = r.min === min && r.max === max;
            return (
              <li key={r.label}>
                <button onClick={() => { setParams({ minPrice: r.min || null, maxPrice: r.max || null }); onDone?.(); }} className={cn("w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-ink-50", active && "bg-ink-100 font-medium")}>
                  {r.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function FilterSidebar({ categories }: { categories: CategoryDTO[] }) {
  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-24">
        <FilterBody categories={categories} />
      </div>
    </aside>
  );
}

export function FilterToolbar({ categories, total }: { categories: CategoryDTO[]; total: number }) {
  const sp = useSearchParams();
  const setParams = useParamSetter();
  const [open, setOpen] = useState(false);
  const sort = sp.get("sort") ?? "popular";
  const activeCount = ["category", "minPrice", "maxPrice", "tag"].filter((k) => sp.get(k)).length;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-500">
          共 <b className="text-ink-900">{total}</b> 件商品
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(true)} className="flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm lg:hidden">
            <SlidersHorizontal className="h-4 w-4" /> 篩選
            {activeCount > 0 && <span className="grid h-5 w-5 place-items-center rounded-full bg-ink-900 text-[11px] text-white">{activeCount}</span>}
          </button>
          <select value={sort} onChange={(e) => setParams({ sort: e.target.value })} className="h-9 rounded-lg border bg-white px-2.5 text-sm" aria-label="排序">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-ink-900/40 lg:hidden" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 lg:hidden"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">篩選</h2>
                <button onClick={() => setOpen(false)} className="p-1 text-ink-500" aria-label="關閉">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <FilterBody categories={categories} onDone={() => setOpen(false)} />
              <Button full className="mt-6" onClick={() => setOpen(false)}>
                查看結果
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export function ActiveChips({ categories }: { categories: CategoryDTO[] }) {
  const sp = useSearchParams();
  const setParams = useParamSetter();
  const chips: { key: string; label: string; clear: Record<string, null> }[] = [];
  const q = sp.get("q");
  const cat = sp.get("category");
  const tag = sp.get("tag");
  const min = sp.get("minPrice");
  const max = sp.get("maxPrice");
  if (q) chips.push({ key: "q", label: `搜尋「${q}」`, clear: { q: null } });
  if (cat) chips.push({ key: "category", label: categories.find((c) => c.slug === cat)?.name ?? cat, clear: { category: null } });
  if (tag) chips.push({ key: "tag", label: `#${tag}`, clear: { tag: null } });
  if (min || max) chips.push({ key: "price", label: `NT$${min || 0} - ${max ? `NT$${max}` : "不限"}`, clear: { minPrice: null, maxPrice: null } });
  if (sp.get("flash")) chips.push({ key: "flash", label: "限時搶購", clear: { flash: null } });
  if (sp.get("featured")) chips.push({ key: "featured", label: "精選", clear: { featured: null } });
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button key={c.key} onClick={() => setParams(c.clear)} className="flex items-center gap-1 rounded-full bg-ink-100 px-3 py-1 text-xs text-ink-700 hover:bg-ink-200">
          {c.label} <X className="h-3 w-3" />
        </button>
      ))}
    </div>
  );
}

export function Pagination({ page, pages }: { page: number; pages: number }) {
  const sp = useSearchParams();
  const pathname = usePathname();
  if (pages <= 1) return null;
  const href = (p: number) => {
    const next = new URLSearchParams(sp.toString());
    next.set("page", String(p));
    return `${pathname}?${next.toString()}`;
  };
  const items = Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);
  return (
    <nav className="flex items-center justify-center gap-1" aria-label="分頁">
      {page > 1 && (
        <a href={href(page - 1)} className="h-9 rounded-lg border px-3 text-sm leading-9 hover:bg-ink-50">
          上一頁
        </a>
      )}
      {items.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && items[i - 1] !== p - 1 && <span className="px-1 text-ink-400">…</span>}
          <a href={href(p)} className={cn("grid h-9 w-9 place-items-center rounded-lg border text-sm hover:bg-ink-50", p === page && "border-ink-900 bg-ink-900 text-white hover:bg-ink-900")}>
            {p}
          </a>
        </span>
      ))}
      {page < pages && (
        <a href={href(page + 1)} className="h-9 rounded-lg border px-3 text-sm leading-9 hover:bg-ink-50">
          下一頁
        </a>
      )}
    </nav>
  );
}
