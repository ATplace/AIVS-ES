"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

const ToastCtx = React.createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), t.kind === "error" ? 6000 : 3500);
  }, []);
  const icons = { success: <CheckCircle2 className="h-4 w-4 text-success-600" />, error: <AlertCircle className="h-4 w-4 text-danger-600" />, info: <Info className="h-4 w-4 text-primary-500" /> };
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={cn("pointer-events-auto flex items-start gap-3 rounded-lg border bg-white p-3 shadow-lg", t.kind === "error" ? "border-danger-600/30" : "border-slate-200")}>
            <span className="mt-0.5">{icons[t.kind]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[13px] text-slate-500 break-words">{t.description}</p>}
            </div>
            <button onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))} className="text-slate-400 hover:text-slate-600" aria-label="關閉">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return {
    success: (title: string, description?: string) => ctx.push({ kind: "success", title, description }),
    error: (title: string, description?: string) => ctx.push({ kind: "error", title, description }),
    info: (title: string, description?: string) => ctx.push({ kind: "info", title, description }),
  };
}
