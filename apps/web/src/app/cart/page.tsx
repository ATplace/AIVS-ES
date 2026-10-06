import type { Metadata } from "next";
import { getProducts } from "@/lib/api";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = { title: "購物車" };

export default async function CartPage() {
  const rec = await getProducts({ sort: "popular", limit: 4 }).catch(() => ({ products: [], total: 0, page: 1, pages: 0 }));
  return <CartView recommendations={rec.products} />;
}
