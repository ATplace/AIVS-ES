import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("scrollbar-thin w-full overflow-auto", className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}
export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">{children}</thead>;
}
export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}
export function TR({ className, children, onClick }: { className?: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr className={cn("transition-colors hover:bg-slate-50/80", onClick && "cursor-pointer", className)} onClick={onClick}>
      {children}
    </tr>
  );
}
export function TH({ className, children, align }: { className?: string; children?: React.ReactNode; align?: "left" | "right" | "center" }) {
  return <th className={cn("border-b border-slate-200 px-4 py-2.5 font-medium", align === "right" && "text-right", align === "center" && "text-center", className)}>{children}</th>;
}
export function TD({ className, children, align, colSpan }: { className?: string; children?: React.ReactNode; align?: "left" | "right" | "center"; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn("px-4 py-3 align-middle text-slate-700", align === "right" && "text-right tabular-nums", align === "center" && "text-center", className)}>
      {children}
    </td>
  );
}

export function Pagination({ page, pages, total, onChange }: { page: number; pages: number; total: number; onChange: (p: number) => void }) {
  if (pages <= 1 && total <= 0) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[13px] text-slate-500">
      <span>共 {total.toLocaleString()} 筆</span>
      <div className="flex items-center gap-1">
        <button
          className="rounded-md border border-slate-200 px-2.5 py-1 hover:bg-slate-50 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          上一頁
        </button>
        <span className="px-2 tabular-nums">
          {page} / {Math.max(1, pages)}
        </span>
        <button
          className="rounded-md border border-slate-200 px-2.5 py-1 hover:bg-slate-50 disabled:opacity-40"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          下一頁
        </button>
      </div>
    </div>
  );
}
