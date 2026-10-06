"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-xs transition-colors focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(function Input(
  { className, error, ...props },
  ref,
) {
  return <input ref={ref} className={cn(base, "h-9", error && "border-danger-600 focus:border-danger-600 focus:ring-danger-50", className)} {...props} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }>(function Textarea(
  { className, error, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(base, "min-h-[96px] py-2 leading-relaxed", error && "border-danger-600", className)} {...props} />;
});

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }>(function Select(
  { className, error, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(base, "h-9 pr-8 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:12px] bg-[position:right_10px_center] bg-no-repeat", error && "border-danger-600", className)} {...props}>
      {children}
    </select>
  );
});

export function Label({ className, children, hint, required, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { hint?: string; required?: boolean }) {
  return (
    <label className={cn("mb-1.5 block text-[13px] font-medium text-slate-700", className)} {...props}>
      {children}
      {required && <span className="ml-0.5 text-danger-600">*</span>}
      {hint && <span className="ml-2 font-normal text-slate-400">{hint}</span>}
    </label>
  );
}

export function Field({ label, hint, required, error, children, className }: { label?: string; hint?: string; required?: boolean; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label && (
        <Label hint={hint} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
    </div>
  );
}

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <label className={cn("inline-flex items-center gap-2 select-none", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
          checked ? "bg-slate-900" : "bg-slate-300",
        )}
      >
        <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-4.5" : "translate-x-0.5")} />
      </button>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </label>
  );
}

export function Checkbox({ checked, onChange, indeterminate, ...props }: { checked: boolean; onChange: (v: boolean) => void; indeterminate?: boolean } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "checked">) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-slate-900"
      {...props}
    />
  );
}
