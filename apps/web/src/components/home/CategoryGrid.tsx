import Link from "next/link";
import type { CategoryDTO } from "@es/shared";
import { ProductImage } from "@/components/ui/ProductImage";

export function CategoryGrid({ categories }: { categories: CategoryDTO[] }) {
  if (categories.length === 0) return null;
  return (
    <section className="container-x">
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6">
        {categories.map((c) => (
          <Link key={c.id} href={`/products?category=${c.slug}`} className="group relative aspect-[4/3] w-36 shrink-0 overflow-hidden rounded-2xl bg-ink-100 sm:w-auto">
            <ProductImage src={c.imageUrl} alt={c.name} fill sizes="(max-width: 640px) 40vw, 16vw" className="object-cover transition duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-ink-900/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3">
              <div className="text-sm font-semibold text-white">{c.name}</div>
              {c.productCount != null && <div className="text-[11px] text-white/70">{c.productCount} 件商品</div>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
