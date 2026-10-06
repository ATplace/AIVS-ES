"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60, done: ms === 0 };
}

export function Countdown({ endsAt, size = "md", className }: { endsAt: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const target = new Date(endsAt).getTime();
  const [t, setT] = useState<ReturnType<typeof diff> | null>(null);

  useEffect(() => {
    setT(diff(target));
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!t) return <span className={cn("inline-block h-6 w-28 rounded bg-ink-100", className)} />;
  if (t.done) return <span className={cn("text-sm text-ink-400", className)}>活動已結束</span>;

  const cell = (n: number, label: string) => (
    <span className="flex flex-col items-center">
      <span
        className={cn(
          "grid place-items-center rounded-md bg-ink-900 font-mono font-bold text-white tabular-nums",
          size === "sm" && "h-6 min-w-6 px-1 text-xs",
          size === "md" && "h-8 min-w-8 px-1.5 text-sm",
          size === "lg" && "h-12 min-w-12 px-2 text-xl",
        )}
      >
        {String(n).padStart(2, "0")}
      </span>
      {size === "lg" && <span className="mt-1 text-[11px] text-ink-500">{label}</span>}
    </span>
  );
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)} aria-live="off">
      <Clock className={cn("text-sale-500", size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />
      {t.d > 0 && (
        <>
          {cell(t.d, "天")}
          <span className="text-ink-400">:</span>
        </>
      )}
      {cell(t.h, "時")}
      <span className="text-ink-400">:</span>
      {cell(t.m, "分")}
      <span className="text-ink-400">:</span>
      {cell(t.s, "秒")}
    </div>
  );
}
