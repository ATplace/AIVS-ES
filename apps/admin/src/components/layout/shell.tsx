"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut, PanelLeftClose, PanelLeftOpen, ExternalLink } from "lucide-react";
import { useAuth } from "@/store/auth";
import { Sidebar } from "./sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const roleLabel: Record<string, string> = { owner: "擁有者", manager: "經理", staff: "員工" };

export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, user, hydrated, logout } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("es-admin-sidebar") === "collapsed");
    } catch {}
  }, []);
  React.useEffect(() => {
    if (hydrated && !token) router.replace("/login");
  }, [hydrated, token, router]);

  if (!hydrated || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        載入中…
      </div>
    );
  }

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("es-admin-sidebar", !c ? "collapsed" : "expanded");
      } catch {}
      return !c;
    });
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
          <button className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="開啟選單">
            <Menu className="h-5 w-5" />
          </button>
          <button className="hidden rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:inline-flex" onClick={toggleCollapsed} aria-label="收合側欄">
            {collapsed ? <PanelLeftOpen className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
          </button>
          <div className="flex-1" />
          <a href="http://localhost:3000" target="_blank" rel="noreferrer" className="hidden items-center gap-1 text-[13px] text-slate-500 hover:text-slate-800 sm:inline-flex">
            前台商店 <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-slate-800">{user?.name}</p>
              <p className="text-[11px] text-slate-400">{roleLabel[user?.role ?? ""] ?? user?.role}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">{user?.name?.slice(0, 1)}</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
            >
              <LogOut className="h-4 w-4" /> 登出
            </Button>
          </div>
        </header>
        <main className={cn("mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6")}>{children}</main>
      </div>
    </div>
  );
}
