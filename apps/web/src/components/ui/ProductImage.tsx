"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<ImageProps, "src" | "alt"> & {
  src: string | null | undefined;
  alt: string;
  className?: string;
};

/** next/image 包裝：載入失敗時改為灰色占位 */
export function ProductImage({ src, alt, className, ...rest }: Props) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-ink-100 text-ink-300", className)} aria-label={alt} role="img">
        <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="6" y="10" width="36" height="28" rx="4" />
          <circle cx="18" cy="20" r="3.5" />
          <path d="M8 34l10-10 7 7 5-4 10 8" />
        </svg>
      </div>
    );
  }
  return <Image src={src} alt={alt} className={className} onError={() => setFailed(true)} {...rest} />;
}
