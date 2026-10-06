import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "gray" | "amber" | "blue" | "indigo" | "violet" | "teal" | "green" | "red" | "slate";

const tones: Record<BadgeTone, string> = {
  gray: "bg-slate-100 text-slate-600 ring-slate-200",
  slate: "bg-slate-800 text-white ring-slate-800",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  teal: "bg-teal-50 text-teal-700 ring-teal-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-red-200",
};

export function Badge({ tone = "gray", className, children, dot }: { tone?: BadgeTone; className?: string; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap", tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
