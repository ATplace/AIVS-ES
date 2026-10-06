"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";
import { getReviews, postReview, type ReviewsResult } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { Rating } from "@/components/ui/Rating";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { formatDate, cn } from "@/lib/utils";

export function Reviews({ slug, initial }: { slug: string; initial: ReviewsResult }) {
  const [data, setData] = useState(initial);
  const user = useAuth((s) => s.user);
  const hydrated = useAuth((s) => s.hydrated);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => setData(initial), [initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await postReview(slug, { rating, title: title || undefined, body: body || undefined });
      const r = await getReviews(slug);
      setData(r);
      setTitle("");
      setBody("");
      setShowForm(false);
      toast.success("感謝你的評價！");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const max = Math.max(1, ...data.distribution.map((d) => d.count));

  return (
    <section id="reviews" className="scroll-mt-24">
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">顧客評價</h2>
      <div className="mt-5 grid gap-8 lg:grid-cols-[280px_1fr]">
        <div className="rounded-2xl border p-5">
          <div className="flex items-end gap-3">
            <span className="text-5xl font-bold tabular-nums">{data.average.toFixed(1)}</span>
            <div className="pb-1.5">
              <Rating value={data.average} showValue={false} size="md" />
              <div className="mt-1 text-xs text-ink-500">{data.total.toLocaleString()} 則評價</div>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5">
            {data.distribution.map((d) => (
              <li key={d.star} className="flex items-center gap-2 text-xs">
                <span className="w-6 text-ink-600">{d.star} 星</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-warning-500" style={{ width: `${(d.count / max) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-ink-400 tabular-nums">{d.count}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5">
            {hydrated && user ? (
              <Button variant="outline" full onClick={() => setShowForm((v) => !v)}>
                {showForm ? "收起" : "撰寫評價"}
              </Button>
            ) : (
              <Link href="/account" className="block text-center text-sm text-brand-600 hover:underline">
                登入後撰寫評價
              </Link>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {showForm && user && (
            <form onSubmit={submit} className="space-y-3 rounded-2xl border bg-ink-50 p-5">
              <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <button type="button" key={i} onMouseEnter={() => setHover(i)} onClick={() => setRating(i)} aria-label={`${i} 星`}>
                    <Star className={cn("h-7 w-7", (hover || rating) >= i ? "text-warning-500" : "text-ink-200")} fill="currentColor" strokeWidth={0} />
                  </button>
                ))}
              </div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="標題 (選填)" maxLength={100} className="h-10 w-full rounded-xl border bg-white px-3 text-sm" />
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="分享你的使用心得…" rows={4} maxLength={2000} className="w-full rounded-xl border bg-white px-3 py-2 text-sm" />
              <Button type="submit" loading={busy}>
                送出評價
              </Button>
            </form>
          )}
          {data.reviews.length === 0 ? (
            <p className="text-sm text-ink-500">還沒有評價，成為第一個分享的人吧！</p>
          ) : (
            <ul className="divide-y">
              {data.reviews.map((r) => (
                <li key={r.id} className="py-4 first:pt-0">
                  <div className="flex items-center gap-2">
                    <Rating value={r.rating} showValue={false} />
                    {r.title && <span className="text-sm font-semibold">{r.title}</span>}
                  </div>
                  {r.body && <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{r.body}</p>}
                  <div className="mt-2 flex items-center gap-2 text-xs text-ink-400">
                    <span>{r.authorName}</span>
                    {r.verified && (
                      <span className="flex items-center gap-0.5 text-success-500">
                        <BadgeCheck className="h-3.5 w-3.5" /> 已購買
                      </span>
                    )}
                    <span>·</span>
                    <span>{formatDate(r.createdAt, false)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
