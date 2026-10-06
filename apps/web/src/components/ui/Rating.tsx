import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
  showValue?: boolean;
}

export function Rating({ value, count, size = "sm", className, showValue = true }: Props) {
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5";
  return (
    <div className={cn("flex items-center gap-1", className)} aria-label={`評分 ${value.toFixed(1)}`}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.max(0, Math.min(1, value - (i - 1)));
          return (
            <span key={i} className={cn("relative inline-block", dim)}>
              <Star className={cn("absolute inset-0 text-ink-200", dim)} fill="currentColor" strokeWidth={0} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={cn("text-warning-500", dim)} fill="currentColor" strokeWidth={0} />
              </span>
            </span>
          );
        })}
      </div>
      {showValue && <span className={cn("font-medium text-ink-700", size === "sm" ? "text-xs" : "text-sm")}>{value.toFixed(1)}</span>}
      {count != null && <span className={cn("text-ink-400", size === "sm" ? "text-xs" : "text-sm")}>({count.toLocaleString()})</span>}
    </div>
  );
}
