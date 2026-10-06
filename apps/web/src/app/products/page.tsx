import { Suspense } from "react";
import type { Metadata } from "next";
import { getCategories, getProducts } from "@/lib/api";
import { ProductCard } from "@/components/product/ProductCard";
import { ActiveChips, FilterSidebar, FilterToolbar, Pagination } from "@/components/products/Filters";

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const q = first(sp.q);
  return { title: q ? `搜尋「${q}」` : "全部商品" };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const params = {
    q: first(sp.q),
    category: first(sp.category),
    tag: first(sp.tag),
    sort: first(sp.sort) ?? "popular",
    minPrice: first(sp.minPrice),
    maxPrice: first(sp.maxPrice),
    featured: first(sp.featured),
    flash: first(sp.flash),
    page: first(sp.page) ?? "1",
    limit: 24,
  };
  const [list, cats] = await Promise.all([getProducts(params), getCategories()]);
  const catName = cats.categories.find((c) => c.slug === params.category)?.name;
  const title = params.q ? `搜尋「${params.q}」` : params.flash ? "限時搶購" : params.featured ? "精選推薦" : (catName ?? "全部商品");

  return (
    <div className="container-x py-6 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <div className="mt-6 flex gap-10">
        <Suspense>
          <FilterSidebar categories={cats.categories} />
        </Suspense>
        <div className="min-w-0 flex-1 space-y-5">
          <Suspense>
            <FilterToolbar categories={cats.categories} total={list.total} />
            <ActiveChips categories={cats.categories} />
          </Suspense>
          {list.products.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-20 text-center">
              <p className="text-ink-700">找不到符合條件的商品</p>
              <p className="mt-1 text-sm text-ink-400">試試其他關鍵字或清除篩選條件</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:gap-6 xl:grid-cols-4">
              {list.products.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 4} showCountdown={!!params.flash} />
              ))}
            </div>
          )}
          <Suspense>
            <Pagination page={list.page} pages={list.pages} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
