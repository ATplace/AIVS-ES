"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem<K extends string = string> {
  key: K;
  label: React.ReactNode;
  count?: number;
}

export function Tabs<K extends string>({ items, value, onChange, className }: { items: TabItem<K>[]; value: K; onChange: (k: K) => void; className?: string }) {
  return (
    <div className={cn("scrollbar-thin flex gap-1 overflow-x-auto border-b border-slate-200", className)} role="tablist">
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.key)}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors",
              active ? "border-slate-900 font-medium text-slate-900" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
            )}
          >
            {it.label}
            {it.count != null && <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] tabular-nums", active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500")}>{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
