"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import type { CategoryDTO } from "@es/shared";
import { useCart } from "@/store/cart";
import { useAuth } from "@/store/auth";
import { SearchBox } from "./SearchBox";
import { cn } from "@/lib/utils";

interface Props {
  storeName: string;
  categories: CategoryDTO[];
}

export function Header({ storeName, categories }: Props) {
  const pathname = usePathname();
  const itemCount = useCart((s) => s.cart?.itemCount ?? 0);
  const openCart = useCart((s) => s.open);
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (itemCount === 0) return;
    setBump(true);
    const t = setTimeout(() => setBump(false), 350);
    return () => clearTimeout(t);
  }, [itemCount]);

  useEffect(() => {
    setMenu(false);
    setSearch(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="container-x flex h-16 items-center gap-3">
        <button className="-ml-2 rounded-lg p-2 text-ink-700 hover:bg-ink-100 lg:hidden" onClick={() => setMenu(true)} aria-label="開啟選單">
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-900 text-sm text-white">ES</span>
          <span className="hidden sm:inline">{storeName}</span>
        </Link>
        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {categories.slice(0, 6).map((c) => (
            <Link key={c.id} href={`/products?category=${c.slug}`} className="rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-100 hover:text-ink-900">
              {c.name}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden w-72 md:block xl:w-96">
          <SearchBox />
        </div>
        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <button className="rounded-lg p-2 text-ink-700 hover:bg-ink-100 md:hidden" onClick={() => setSearch(true)} aria-label="搜尋">
            <Search className="h-5 w-5" />
          </button>
          <Link href="/account" className="flex items-center gap-1.5 rounded-lg p-2 text-ink-700 hover:bg-ink-100" aria-label="會員">
            <User className="h-5 w-5" />
            {hydrated && user && <span className="hidden text-sm sm:inline">{user.name}</span>}
          </Link>
          <button onClick={openCart} className="relative rounded-lg p-2 text-ink-700 hover:bg-ink-100" aria-label={`購物車，${itemCount} 件`}>
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <motion.span
                animate={bump ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                transition={{ duration: 0.35 }}
                className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-sale-500 px-1 text-[11px] font-bold text-white"
              >
                {itemCount > 99 ? "99+" : itemCount}
              </motion.span>
            )}
          </button>
        </div>
      </div>

      {/* 行動版搜尋 */}
      <AnimatePresence>
        {search && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="border-t border-ink-100 bg-white px-4 py-3 md:hidden">
            <div className="flex items-center gap-2">
              <SearchBox className="flex-1" autoFocus onNavigate={() => setSearch(false)} />
              <button className="p-2 text-ink-500" onClick={() => setSearch(false)} aria-label="關閉搜尋">
                <X className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 行動版選單 */}
      <AnimatePresence>
        {menu && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-ink-900/40 lg:hidden" onClick={() => setMenu(false)} />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white p-5 shadow-float lg:hidden"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-lg font-bold">{storeName}</span>
                <button onClick={() => setMenu(false)} className="p-1 text-ink-500" aria-label="關閉選單">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col">
                <Link href="/products" className={cn("rounded-lg px-3 py-3 text-base font-medium hover:bg-ink-50")}>
                  全部商品
                </Link>
                {categories.map((c) => (
                  <Link key={c.id} href={`/products?category=${c.slug}`} className="rounded-lg px-3 py-3 text-base text-ink-700 hover:bg-ink-50">
                    {c.name}
                    {c.productCount != null && <span className="ml-2 text-xs text-ink-400">{c.productCount}</span>}
                  </Link>
                ))}
                <div className="my-3 border-t" />
                <Link href="/account" className="rounded-lg px-3 py-3 text-base text-ink-700 hover:bg-ink-50">
                  {user ? `${user.name} 的帳戶` : "登入 / 註冊"}
                </Link>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
