import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "sale" | "outline";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  full?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-900 disabled:bg-ink-300",
  secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-50",
  ghost: "bg-transparent text-ink-700 hover:bg-ink-100 disabled:opacity-50",
  sale: "bg-sale-500 text-white hover:bg-sale-600 active:bg-sale-700 disabled:bg-sale-200",
  outline: "border border-ink-300 bg-white text-ink-800 hover:border-ink-900 disabled:opacity-50",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-5 text-sm rounded-xl",
  lg: "h-13 px-6 text-base rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button({ className, variant = "primary", size = "md", loading, full, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        full && "w-full",
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});
