import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ApiRequestError, getProduct, getRelated, getReviews } from "@/lib/api";
import { ProductDetail } from "@/components/product/ProductDetail";
import { Reviews } from "@/components/product/Reviews";
import { ProductRail } from "@/components/product/ProductRail";

async function load(slug: string) {
  try {
    return await getProduct(slug);
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: "找不到商品" };
  return {
    title: data.product.name,
    description: data.product.description.slice(0, 120),
    openGraph: { images: data.product.images[0]?.url ? [data.product.images[0].url] : [] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const [reviews, related] = await Promise.all([
    getReviews(slug).catch(() => ({ reviews: [], distribution: [5, 4, 3, 2, 1].map((star) => ({ star, count: 0 })), average: data.product.rating, total: data.product.reviewCount })),
    getRelated(slug).catch(() => ({ related: [], alsoBought: [] })),
  ]);
  const p = data.product;

  return (
    <div className="pb-10">
      <div className="container-x py-5 sm:py-8">
        <nav className="mb-5 flex items-center gap-1 text-xs text-ink-500" aria-label="麵包屑">
          <Link href="/" className="hover:text-ink-900">首頁</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/products" className="hover:text-ink-900">商品</Link>
          {p.category && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link href={`/products?category=${p.category.slug}`} className="hover:text-ink-900">{p.category.name}</Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="line-clamp-1 text-ink-800">{p.name}</span>
        </nav>

        <ProductDetail product={p} social={data.social} />

        <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-14">
          <section>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">商品介紹</h2>
            <div className="prose prose-sm mt-4 max-w-none leading-relaxed whitespace-pre-line text-ink-700">{p.description || "此商品尚無介紹。"}</div>
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl bg-ink-50 p-5 text-sm">
              {p.variants.map((v) => (
                <div key={v.id} className="contents">
                  <dt className="text-ink-500">{v.name}</dt>
                  <dd className="text-right tabular-nums">
                    {v.stock > 0 ? `庫存 ${v.stock}` : "缺貨"} · SKU {v.sku}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <Reviews slug={slug} initial={reviews} />
        </div>
      </div>

      <div className="space-y-14">
        {related.alsoBought.length > 0 && <ProductRail title="買過的人也買了" products={related.alsoBought} />}
        <ProductRail title="你可能也喜歡" subtitle={p.category ? `更多${p.category.name}` : undefined} products={related.related} href={p.category ? `/products?category=${p.category.slug}` : "/products"} />
      </div>
    </div>
  );
}
