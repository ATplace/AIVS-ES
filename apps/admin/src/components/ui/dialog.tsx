"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className={cn("relative flex max-h-[92vh] w-full flex-col rounded-t-xl bg-white shadow-xl sm:m-4 sm:rounded-xl", widths[size])}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="關閉">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="scrollbar-thin overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "確認",
  danger,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      {description && <div className="text-sm text-slate-600">{description}</div>}
    </Dialog>
  );
}

/** 方便在元件中管理 confirm 狀態 */
export function useConfirm() {
  const [state, setState] = React.useState<{ open: boolean; title: string; description?: React.ReactNode; danger?: boolean; confirmText?: string; action?: () => Promise<void> | void }>({
    open: false,
    title: "",
  });
  const [loading, setLoading] = React.useState(false);
  const confirm = (opts: { title: string; description?: React.ReactNode; danger?: boolean; confirmText?: string; action: () => Promise<void> | void }) =>
    setState({ open: true, ...opts });
  const close = () => setState((s) => ({ ...s, open: false }));
  const element = (
    <ConfirmDialog
      open={state.open}
      onClose={close}
      title={state.title}
      description={state.description}
      danger={state.danger}
      confirmText={state.confirmText}
      loading={loading}
      onConfirm={async () => {
        setLoading(true);
        try {
          await state.action?.();
          close();
        } finally {
          setLoading(false);
        }
      }}
    />
  );
  return { confirm, element };
}
