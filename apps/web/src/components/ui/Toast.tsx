"use client";

import { create } from "zustand";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}
interface ToastState {
  items: ToastItem[];
  push: (message: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
}

let seq = 1;
export const useToast = create<ToastState>()((set) => ({
  items: [],
  push(message, kind = "info") {
    const id = seq++;
    set((s) => ({ items: [...s.items, { id, kind, message }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), 3200);
  },
  dismiss(id) {
    set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
  },
}));

export const toast = {
  success: (m: string) => useToast.getState().push(m, "success"),
  error: (m: string) => useToast.getState().push(m, "error"),
  info: (m: string) => useToast.getState().push(m, "info"),
};

const icons = { success: CheckCircle2, error: AlertCircle, info: Info };

export function ToastContainer() {
  const { items, dismiss } = useToast();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {items.map((t) => {
          const Icon = icons[t.kind];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-white px-4 py-3 text-sm shadow-float",
                t.kind === "success" && "border-success-500/30",
                t.kind === "error" && "border-sale-500/30",
                t.kind === "info" && "border-ink-200",
              )}
              role="status"
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.kind === "success" && "text-success-500", t.kind === "error" && "text-sale-500", t.kind === "info" && "text-brand-500")} />
              <span className="flex-1 text-ink-800">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="text-ink-400 hover:text-ink-700" aria-label="關閉">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
