import type { Metadata } from "next";
import { OrderView } from "@/components/orders/OrderView";

export const metadata: Metadata = { title: "訂單明細" };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ orderNo: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orderNo } = await params;
  const sp = await searchParams;
  const flag = (k: string) => sp[k] === "1";
  return <OrderView orderNo={orderNo} flags={{ paid: flag("paid"), failed: flag("failed"), cancelled: flag("cancelled"), placed: flag("placed") }} />;
}
