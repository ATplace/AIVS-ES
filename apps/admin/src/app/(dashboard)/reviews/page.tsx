"use client";

import Link from "next/link";
import { Star, Trash2, BadgeCheck } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { formatDate } from "@/lib/utils";
import { Button, Card, EmptyState, PageHeader, Table, TableSkeleton, TBody, TD, TH, THead, TR, useConfirm, useToast } from "@/components/ui";

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} 星`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < n ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const toast = useToast();
  const { confirm, element } = useConfirm();
  const { data, loading, reload } = useQuery(() => adminApi.reviews(), []);
  const reviews = data?.reviews ?? [];

  return (
    <>
      <PageHeader title="商品評價" description="最近 100 則顧客評價" />
      <Card>
        {loading ? (
          <TableSkeleton cols={5} />
        ) : reviews.length === 0 ? (
          <EmptyState title="尚無評價" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>商品</TH>
                <TH>評價</TH>
                <TH>顧客</TH>
                <TH>時間</TH>
                <TH className="w-14" />
              </tr>
            </THead>
            <TBody>
              {reviews.map((r) => (
                <TR key={r.id}>
                  <TD className="max-w-[200px]">
                    {r.product ? (
                      <Link href={`/products/${r.product.id}`} className="truncate font-medium text-slate-800 hover:underline">
                        {r.product.name}
                      </Link>
                    ) : (
                      <span className="text-slate-400">已刪除商品</span>
                    )}
                  </TD>
                  <TD className="max-w-md">
                    <Stars n={r.rating} />
                    {r.title && <p className="mt-1 text-[13px] font-medium text-slate-800">{r.title}</p>}
                    {r.body && <p className="line-clamp-2 text-[13px] text-slate-600">{r.body}</p>}
                  </TD>
                  <TD>
                    <span className="inline-flex items-center gap-1 text-slate-700">
                      {r.authorName}
                      {r.verified && <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" aria-label="已購買" />}
                    </span>
                  </TD>
                  <TD className="text-xs whitespace-nowrap text-slate-500">{formatDate(r.createdAt)}</TD>
                  <TD>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="刪除評價"
                      onClick={() =>
                        confirm({
                          title: "刪除這則評價？",
                          description: "刪除後無法復原，商品平均評分將於下次評價時重新計算。",
                          danger: true,
                          confirmText: "刪除",
                          action: async () => {
                            await adminApi.deleteReview(r.id);
                            toast.success("評價已刪除");
                            reload();
                          },
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-slate-400" />
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
      {element}
    </>
  );
}
