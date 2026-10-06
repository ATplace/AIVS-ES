import type { Metadata } from "next";
import { AccountView } from "@/components/account/AccountView";

export const metadata: Metadata = { title: "會員中心" };

export default function AccountPage() {
  return <AccountView />;
}
