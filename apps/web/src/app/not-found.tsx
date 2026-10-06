import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
      <span className="text-7xl font-bold text-ink-200">404</span>
      <h1 className="mt-4 text-xl font-semibold">找不到這個頁面</h1>
      <p className="mt-2 text-sm text-ink-500">商品可能已下架或網址有誤。</p>
      <Link href="/products" className="mt-6">
        <Button>回到商品列表</Button>
      </Link>
    </div>
  );
}
