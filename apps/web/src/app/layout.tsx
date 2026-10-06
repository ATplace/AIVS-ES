import type { Metadata } from "next";
import { Inter, Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import { api } from "@/lib/api";
import type { CategoryDTO } from "@es/shared";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const noto = Noto_Sans_TC({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-noto", display: "swap" });

interface StoreInfo {
  name: string;
  tagline: string;
  logoUrl: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  announcement: string;
}

async function loadShell() {
  const [storeRes, catRes] = await Promise.allSettled([
    api<{ store: StoreInfo | null }>("/store", { revalidate: 60 }),
    api<{ categories: CategoryDTO[] }>("/catalog/categories", { revalidate: 60 }),
  ]);
  const store = storeRes.status === "fulfilled" ? storeRes.value.store : null;
  const categories = catRes.status === "fulfilled" ? catRes.value.categories : [];
  return { store, categories };
}

export async function generateMetadata(): Promise<Metadata> {
  const { store } = await loadShell();
  const name = store?.name ?? "ES Store";
  return {
    title: { default: `${name} — ${store?.tagline ?? "精選好物"}`, template: `%s | ${name}` },
    description: store?.tagline ?? "精選好物，每天都值得被好好對待",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { store, categories } = await loadShell();
  const name = store?.name ?? "ES Store";
  return (
    <html lang="zh-TW" className={`${inter.variable} ${noto.variable}`}>
      <body className="font-sans">
        <Providers>
          {store?.announcement && (
            <div className="bg-ink-900 px-4 py-2 text-center text-xs text-white sm:text-sm">
              <span className="line-clamp-1">{store.announcement}</span>
            </div>
          )}
          <Header storeName={name} categories={categories} />
          <main className="min-h-[60vh]">{children}</main>
          <Footer storeName={name} supportEmail={store?.supportEmail} supportPhone={store?.supportPhone} />
        </Providers>
      </body>
    </html>
  );
}
