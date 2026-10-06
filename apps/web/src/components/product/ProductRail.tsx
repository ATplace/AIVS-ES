import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ProductDTO } from "@es/shared";
import { ProductCard } from "./ProductCard";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  products: ProductDTO[];
  href?: string;
  variant?: "grid" | "rail";
  showCountdown?: boolean;
  accent?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, href, accent }: { title: string; subtitle?: string; href?: string; accent?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
        </div>
        {accent}
      </div>
      {href && (
        <Link href={href} className="flex shrink-0 items-center gap-1 text-sm font-medium text-ink-600 hover:text-ink-900">
          查看全部 <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export function ProductRail({ title, subtitle, products, href, variant = "rail", showCountdown, accent, className }: Props) {
  if (products.length === 0) return null;
  return (
    <section className={cn("container-x", className)}>
      <SectionHeader title={title} subtitle={subtitle} href={href} accent={accent} />
      {variant === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 4} showCountdown={showCountdown} />
          ))}
        </div>
      ) : (
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} showCountdown={showCountdown} className="w-[44vw] shrink-0 snap-start sm:w-56 lg:w-64" />
          ))}
        </div>
      )}
    </section>
  );
}
