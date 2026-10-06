"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, Star, ImageOff } from "lucide-react";
import { formatMoney, type ProductDTO } from "@es/shared";
import { adminApi } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { formatDate } from "@/lib/utils";
import { Button, Card, Checkbox, EmptyState, Input, PageHeader, Pagination, Select, Table, TableSkeleton, Tabs, TBody, TD, TH, THead, TR, useToast } from "@/components/ui";
import { ProductStatusBadge } from "@/components/status-badge";

type StatusTab = "all" | "active" | "draft" | "archived";

export default function ProductsPage() {
  const toast = useToast();
  const [q, setQ] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusTab>("all");
  const [categoryId, setCategoryId] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);

  const cats = useQuery(() => adminApi.categories(), []);
  const { data, loading, reload } = useQuery(
    () => adminApi.products({ q: search, status: status === "all" ? undefined : status, categoryId, page, limit: 20 }),
    [search, status, categoryId, page],
  );

  React.useEffect(() => setSelected(new Set()), [data]);

  const products = data?.products ?? [];
  const allChecked = products.length > 0 && products.every((p) => selected.has(p.id));
  const someChecked = products.some((p) => selected.has(p.id));

  async function bulk(next: "active" | "draft" | "archived") {
    setBusy(true);
    try {
      const r = await adminApi.bulkProductStatus([...selected], next);
      toast.success(`已更新 ${r.count} 件商品`);
      reload();
    } catch (e) {
      toast.error("更新失敗", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="商品管理"
        description="上架、編輯商品與規格庫存"
        actions={
          <Link href="/products/new">
            <Button>
              <Plus className="h-4 w-4" /> 新增商品
            </Button>
          </Link>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs<StatusTab>
            className="border-b-0"
            items={[
              { key: "all", label: "全部" },
              { key: "active", label: "上架中" },
              { key: "draft", label: "草稿" },
              { key: "archived", label: "已封存" },
            ]}
            value={status}
            onChange={(k) => {
              setStatus(k);
              setPage(1);
            }}
          />
          <div className="flex gap-2 pb-3 sm:pb-0">
            <Select value={categoryId} onChange={(e) => (setCategoryId(e.target.value), setPage(1))} className="w-36">
              <option value="">所有分類</option>
              {cats.data?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(q.trim());
                setPage(1);
              }}
            >
              <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋商品名稱 / slug" className="w-56 pl-8" />
            </form>
          </div>
        </div>

        {someChecked && (
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[13px] text-slate-600">
            已選 {selected.size} 件
            <span className="mx-1 text-slate-300">|</span>
            <Button size="sm" variant="outline" loading={busy} onClick={() => bulk("active")}>
              上架
            </Button>
            <Button size="sm" variant="outline" loading={busy} onClick={() => bulk("draft")}>
              下架 (草稿)
            </Button>
            <Button size="sm" variant="outline" loading={busy} onClick={() => bulk("archived")}>
              封存
            </Button>
          </div>
        )}

        {loading ? (
          <TableSkeleton />
        ) : products.length === 0 ? (
          <EmptyState title="沒有符合的商品" description="試試其他關鍵字或新增一件商品" action={<Link href="/products/new"><Button variant="outline">新增商品</Button></Link>} />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH className="w-10">
                  <Checkbox checked={allChecked} indeterminate={someChecked && !allChecked} onChange={(v) => setSelected(v ? new Set(products.map((p) => p.id)) : new Set())} aria-label="全選" />
                </TH>
                <TH>商品</TH>
                <TH>分類</TH>
                <TH align="right">價格</TH>
                <TH align="right">庫存</TH>
                <TH>狀態</TH>
                <TH>建立時間</TH>
              </tr>
            </THead>
            <TBody>
              {products.map((p) => (
                <ProductRow key={p.id} p={p} checked={selected.has(p.id)} onCheck={(v) => setSelected((s) => { const n = new Set(s); v ? n.add(p.id) : n.delete(p.id); return n; })} />
              ))}
            </TBody>
          </Table>
        )}
        <Pagination page={data?.page ?? 1} pages={data?.pages ?? 0} total={data?.total ?? 0} onChange={setPage} />
      </Card>
    </>
  );
}

function ProductRow({ p, checked, onCheck }: { p: ProductDTO; checked: boolean; onCheck: (v: boolean) => void }) {
  const img = p.images[0]?.url;
  const [broken, setBroken] = React.useState(false);
  return (
    <TR className={checked ? "bg-slate-50" : undefined}>
      <TD>
        <Checkbox checked={checked} onChange={onCheck} aria-label={`選取 ${p.name}`} />
      </TD>
      <TD>
        <Link href={`/products/${p.id}`} className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
            {img && !broken ? <Image src={img} alt="" width={44} height={44} className="h-full w-full object-cover" onError={() => setBroken(true)} unoptimized /> : <ImageOff className="h-4 w-4 text-slate-300" />}
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-medium text-slate-800 hover:underline">
              <span className="truncate">{p.name}</span>
              {p.isFeatured && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
            </p>
            <p className="truncate text-xs text-slate-400">
              /{p.slug} · {p.variants.length} 個規格
            </p>
          </div>
        </Link>
      </TD>
      <TD className="text-slate-500">{p.category?.name ?? "—"}</TD>
      <TD align="right">{p.minPrice === p.maxPrice ? formatMoney(p.minPrice) : `${formatMoney(p.minPrice)} – ${formatMoney(p.maxPrice)}`}</TD>
      <TD align="right">
        <span className={p.totalStock <= 5 ? "font-semibold text-danger-600" : ""}>{p.totalStock}</span>
      </TD>
      <TD>
        <ProductStatusBadge status={p.status} />
      </TD>
      <TD className="text-slate-500 whitespace-nowrap">{formatDate(p.createdAt)}</TD>
    </TR>
  );
}
