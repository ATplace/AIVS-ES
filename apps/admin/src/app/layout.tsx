import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const noto = Noto_Sans_TC({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-noto-sans-tc", display: "swap" });

export const metadata: Metadata = {
  title: { default: "ES 商家後台", template: "%s · ES 商家後台" },
  description: "ES 電商平台商家管理後台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" className={noto.variable}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
