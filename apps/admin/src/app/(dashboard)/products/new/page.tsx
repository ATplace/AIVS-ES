"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { ProductForm } from "@/components/product-form";

export default function NewProductPage() {
  return (
    <>
      <PageHeader
        title="新增商品"
        breadcrumb={
          <Link href="/products" className="hover:underline">
            商品管理
          </Link>
        }
      />
      <ProductForm />
    </>
  );
}
