import { discountPercent, formatMoney } from "@es/shared";
import { cn } from "@/lib/utils";

interface Props {
  price: number;
  compareAt?: number | null;
  maxPrice?: number;
  size?: "sm" | "md" | "lg";
  showSavings?: boolean;
  className?: string;
}

export function Price({ price, compareAt, maxPrice, size = "md", showSavings = false, className }: Props) {
  const pct = discountPercent(price, compareAt);
  const range = maxPrice != null && maxPrice > price;
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span
        className={cn(
          "font-semibold tabular-nums tracking-tight",
          pct ? "text-sale-600" : "text-ink-900",
          size === "sm" && "text-base",
          size === "md" && "text-lg",
          size === "lg" && "text-3xl",
        )}
      >
        {formatMoney(price)}
        {range && <span className="text-ink-500"> 起</span>}
      </span>
      {pct && compareAt && (
        <>
          <span className={cn("line-through-soft text-ink-400 tabular-nums", size === "lg" ? "text-base" : "text-sm")}>{formatMoney(compareAt)}</span>
          <span className={cn("rounded-md bg-sale-50 px-1.5 py-0.5 font-semibold text-sale-600", size === "lg" ? "text-sm" : "text-xs")}>-{pct}%</span>
        </>
      )}
      {showSavings && pct && compareAt && <span className="w-full text-sm text-sale-600">現省 {formatMoney(compareAt - price)}</span>}
    </div>
  );
}
