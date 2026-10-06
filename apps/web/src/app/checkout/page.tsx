import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = { title: "結帳" };

export default function CheckoutPage() {
  return <CheckoutForm />;
}
