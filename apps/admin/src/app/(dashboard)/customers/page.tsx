"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { formatMoney } from "@es/shared";
import { adminApi } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { formatDate } from "@/lib/utils";
import { Card, EmptyState, Input, PageHeader, Table, TableSkeleton, TBody, TD, TH, THead, TR } from "@/components/ui";

export default function CustomersPage() {
  const [q, setQ] = React.useState("");
  const [search, setSearch] = React.useState("");
  const { data, loading } = useQuery(() => adminApi.customers({ q: search, limit: 50 }), [search]);
  const rows = data?.customers ?? [];

  return (
    <>
      <PageHeader title="顧客" description="已註冊的會員與消費紀錄" />
      <Card>
        <form
          className="relative border-b border-slate-100 px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q.trim());
          }}
        >
          <Search className="pointer-events-none absolute top-5.5 left-6.5 h-4 w-4 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋 Email 或姓名" className="w-72 pl-8" />
        </form>
        {loading ? (
          <TableSkeleton cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState title="沒有符合的顧客" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>顧客</TH>
                <TH>電話</TH>
                <TH align="right">訂單數</TH>
                <TH align="right">累計消費</TH>
                <TH>註冊時間</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <p className="font-medium text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.email}</p>
                  </TD>
                  <TD className="text-slate-600">{c.phone ?? "—"}</TD>
                  <TD align="right">{c.orderCount}</TD>
                  <TD align="right" className="font-medium">
                    {formatMoney(c.totalSpent)}
                  </TD>
                  <TD className="text-xs whitespace-nowrap text-slate-500">{formatDate(c.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
