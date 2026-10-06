"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Tags, ShoppingBag, TicketPercent, Star, Users, Settings, ShieldCheck, Store, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "儀表板", icon: LayoutDashboard },
  { href: "/orders", label: "訂單管理", icon: ShoppingBag },
  { href: "/products", label: "商品管理", icon: Package },
  { href: "/categories", label: "商品分類", icon: Tags },
  { href: "/coupons", label: "優惠券", icon: TicketPercent },
  { href: "/reviews", label: "商品評價", icon: Star },
  { href: "/customers", label: "顧客", icon: Users },
  { href: "/settings", label: "店鋪設定", icon: Settings },
  { href: "/users", label: "管理員帳號", icon: ShieldCheck },
];

export function Sidebar({ open, onClose, collapsed }: { open: boolean; onClose: () => void; collapsed: boolean }) {
  const pathname = usePathname();
  const nav = (
    <nav className="flex-1 space-y-0.5 px-2 py-3">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
              active ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/60 hover:text-white",
              collapsed && "justify-center px-0",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
  const brand = (
    <div className={cn("flex h-14 items-center gap-2.5 border-b border-slate-800 px-4", collapsed && "justify-center px-0")}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-900">
        <Store className="h-4 w-4" />
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">ES 商家後台</p>
          <p className="text-[11px] text-slate-400">Merchant Console</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* desktop */}
      <aside className={cn("no-print hidden shrink-0 flex-col bg-slate-900 lg:flex transition-[width] duration-200", collapsed ? "w-16" : "w-60")}>
        {brand}
        {nav}
        {!collapsed && (
          <div className="border-t border-slate-800 px-4 py-3 text-[11px] text-slate-500">
            <a href="http://localhost:3000" target="_blank" rel="noreferrer" className="hover:text-slate-300">
              前往前台商店 ↗
            </a>
          </div>
        )}
      </aside>
      {/* mobile drawer */}
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-900 shadow-xl">
            <div className="flex items-center justify-between pr-2">
              <div className="flex-1">{brand}</div>
              <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:text-white" aria-label="關閉選單">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
