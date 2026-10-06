import Link from "next/link";
import { ShieldCheck, RotateCcw, Truck, Store } from "lucide-react";

export function TrustBadges({ compact = false }: { compact?: boolean }) {
  const items = [
    { icon: ShieldCheck, title: "安全付款", desc: "SSL 加密、綠界 / LINE Pay" },
    { icon: RotateCcw, title: "7 天鑑賞期", desc: "不滿意免費退換" },
    { icon: Truck, title: "滿額免運", desc: "滿 NT$1,000 全站免運" },
    { icon: Store, title: "超商取貨", desc: "7-ELEVEN / 全家" },
  ];
  return (
    <div className={compact ? "grid grid-cols-2 gap-3 sm:grid-cols-4" : "grid grid-cols-2 gap-4 sm:grid-cols-4"}>
      {items.map((it) => (
        <div key={it.title} className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-4">
          <it.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
          <div>
            <div className="text-sm font-semibold text-ink-900">{it.title}</div>
            {!compact && <div className="mt-0.5 text-xs text-ink-500">{it.desc}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Footer({ storeName, supportEmail, supportPhone }: { storeName: string; supportEmail?: string | null; supportPhone?: string | null }) {
  return (
    <footer className="mt-20 border-t border-ink-100 bg-ink-50">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-900 text-sm text-white">ES</span>
            {storeName}
          </div>
          <p className="mt-3 max-w-xs text-sm text-ink-500">精選好物，每天都值得被好好對待。嚴選品質、快速到貨、安心售後。</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">購物</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <li><Link href="/products" className="hover:text-ink-900">全部商品</Link></li>
            <li><Link href="/products?flash=true" className="hover:text-ink-900">限時搶購</Link></li>
            <li><Link href="/products?sort=newest" className="hover:text-ink-900">新品上市</Link></li>
            <li><Link href="/products?sort=popular" className="hover:text-ink-900">熱銷排行</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">服務</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <li><Link href="/account" className="hover:text-ink-900">會員中心</Link></li>
            <li><Link href="/account" className="hover:text-ink-900">訂單查詢</Link></li>
            <li><span>退換貨政策</span></li>
            <li><span>隱私權政策</span></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">客服</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            {supportEmail && <li>{supportEmail}</li>}
            {supportPhone && <li>{supportPhone}</li>}
            <li>週一至週五 09:00 - 18:00</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-200/70">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs text-ink-400 sm:flex-row">
          <span>© {new Date().getFullYear()} {storeName}. All rights reserved.</span>
          <span>付款方式：信用卡 · ATM · 超商代碼 · LINE Pay · 貨到付款</span>
        </div>
      </div>
    </footer>
  );
}
