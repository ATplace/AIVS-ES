"use client";

import * as React from "react";
import Link from "next/link";
import { adminApi } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { PageHeader, Skeleton } from "@/components/ui";
import { ProductForm } from "@/components/product-form";
import { ProductStatusBadge } from "@/components/status-badge";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { data, loading, error } = useQuery(() => adminApi.product(id), [id]);

  if (error) return <div className="rounded-md bg-danger-50 p-4 text-sm text-danger-700">{error}</div>;
  if (loading || !data) return <Skeleton className="h-96 w-full" />;

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            {data.product.name} <ProductStatusBadge status={data.product.status} />
          </span>
        }
        breadcrumb={
          <Link href="/products" className="hover:underline">
            商品管理
          </Link>
        }
        actions={
          <a href={`http://localhost:3000/products/${data.product.slug}`} target="_blank" rel="noreferrer" className="text-[13px] text-slate-500 hover:text-slate-900">
            在前台檢視 ↗
          </a>
        }
      />
      <ProductForm key={data.product.id} product={data.product} />
    </>
  );
}
