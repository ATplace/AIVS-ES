"use client";

import { useEffect } from "react";
import { useCart } from "@/store/cart";
import { ToastContainer } from "@/components/ui/Toast";
import { MiniCart } from "@/components/cart/MiniCart";

export function Providers({ children }: { children: React.ReactNode }) {
  const init = useCart((s) => s.init);
  useEffect(() => {
    void init();
  }, [init]);
  return (
    <>
      {children}
      <MiniCart />
      <ToastContainer />
    </>
  );
}
