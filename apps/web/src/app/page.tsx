import { Flame } from "lucide-react";
import { getHome } from "@/lib/api";
import { Hero } from "@/components/home/Hero";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ProductRail } from "@/components/product/ProductRail";
import { TrustBadges } from "@/components/layout/Footer";
import { Countdown } from "@/components/product/Countdown";

export default async function HomePage() {
  const home = await getHome();
  const highlight = home.featured[0] ?? home.trending[0] ?? null;
  const flashEnds = home.flashSale[0]?.flashSaleEndsAt ?? null;

  return (
    <div className="space-y-14 pb-10 sm:space-y-20">
      <Hero tagline={home.store?.tagline || "精選好物，每天都值得被好好對待"} highlight={highlight} ordersLast24h={home.social.ordersLast24h} />
      <CategoryGrid categories={home.categories} />
      <ProductRail
        title="限時搶購"
        subtitle="倒數結束前享最低價，售完即止"
        products={home.flashSale}
        href="/products?flash=true"
        showCountdown
        accent={
          flashEnds ? (
            <div className="flex items-center gap-2 rounded-full bg-sale-50 px-3 py-1.5 text-sale-700">
              <Flame className="h-4 w-4" />
              <span className="text-xs font-semibold">最快結束</span>
              <Countdown endsAt={flashEnds} size="sm" />
            </div>
          ) : null
        }
      />
      <ProductRail title="精選推薦" subtitle="編輯嚴選，品質與設計兼具" products={home.featured} href="/products?featured=true" variant="grid" />
      <ProductRail title="熱銷排行" subtitle="大家都在買，口碑保證" products={home.trending} href="/products?sort=popular" />
      <section className="container-x">
        <TrustBadges />
      </section>
      <ProductRail title="新品上市" subtitle="最新到貨，搶先入手" products={home.newest} href="/products?sort=newest" />
    </div>
  );
}
