"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2, X, ImageOff } from "lucide-react";
import { productInputSchema, slugify, type ProductDTO, type ProductInput } from "@es/shared";
import { adminApi } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { fromLocalInput, toLocalInput } from "@/lib/utils";
import { Button, Card, CardBody, CardHeader, Field, Input, Select, Switch, Textarea, useConfirm, useToast } from "@/components/ui";

type VariantRow = {
  id?: string;
  sku: string;
  name: string;
  options: { key: string; value: string }[];
  price: string;
  compareAtPrice: string;
  stock: string;
  weightGrams: string;
};

type FormState = {
  name: string;
  slug: string;
  slugTouched: boolean;
  description: string;
  categoryId: string;
  status: "draft" | "active" | "archived";
  isFeatured: boolean;
  flashSaleEndsAt: string;
  tags: string[];
  images: { url: string; alt: string }[];
  variants: VariantRow[];
};

const emptyVariant = (): VariantRow => ({ sku: "", name: "預設", options: [], price: "", compareAtPrice: "", stock: "0", weightGrams: "0" });

function fromDTO(p?: ProductDTO): FormState {
  if (!p) return { name: "", slug: "", slugTouched: false, description: "", categoryId: "", status: "draft", isFeatured: false, flashSaleEndsAt: "", tags: [], images: [], variants: [emptyVariant()] };
  return {
    name: p.name,
    slug: p.slug,
    slugTouched: true,
    description: p.description,
    categoryId: p.categoryId ?? "",
    status: p.status,
    isFeatured: p.isFeatured,
    flashSaleEndsAt: toLocalInput(p.flashSaleEndsAt),
    tags: p.tags,
    images: p.images,
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      options: Object.entries(v.options).map(([key, value]) => ({ key, value })),
      price: String(v.price),
      compareAtPrice: v.compareAtPrice == null ? "" : String(v.compareAtPrice),
      stock: String(v.stock),
      weightGrams: String(v.weightGrams),
    })),
  };
}

function toInput(f: FormState): unknown {
  const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
  return {
    name: f.name.trim(),
    slug: f.slug.trim(),
    description: f.description,
    categoryId: f.categoryId || null,
    status: f.status,
    images: f.images,
    tags: f.tags,
    isFeatured: f.isFeatured,
    flashSaleEndsAt: fromLocalInput(f.flashSaleEndsAt),
    variants: f.variants.map((v) => ({
      id: v.id,
      sku: v.sku.trim(),
      name: v.name.trim(),
      options: Object.fromEntries(v.options.filter((o) => o.key.trim()).map((o) => [o.key.trim(), o.value.trim()])),
      price: num(v.price),
      compareAtPrice: v.compareAtPrice.trim() === "" ? null : num(v.compareAtPrice),
      stock: v.stock.trim() === "" ? 0 : num(v.stock),
      weightGrams: v.weightGrams.trim() === "" ? 0 : num(v.weightGrams),
    })),
  };
}

export function ProductForm({ product }: { product?: ProductDTO }) {
  const router = useRouter();
  const toast = useToast();
  const { confirm, element: confirmEl } = useConfirm();
  const [f, setF] = React.useState<FormState>(() => fromDTO(product));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [tagInput, setTagInput] = React.useState("");
  const [imgInput, setImgInput] = React.useState("");
  const cats = useQuery(() => adminApi.categories(), []);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const setVariant = (i: number, patch: Partial<VariantRow>) => setF((s) => ({ ...s, variants: s.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = productInputSchema.safeParse(toInput(f));
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[issue.path.join(".")] = issue.message;
      setErrors(errs);
      toast.error("請檢查表單欄位", Object.values(errs)[0]);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const body = parsed.data as ProductInput;
      if (product) {
        await adminApi.updateProduct(product.id, body);
        toast.success("商品已更新");
        router.refresh();
      } else {
        const r = await adminApi.createProduct(body);
        toast.success("商品已建立");
        router.replace(`/products/${r.product.id}`);
      }
    } catch (err) {
      toast.error("儲存失敗", (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const err = (k: string) => errors[k];

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card>
          <CardHeader title="基本資訊" />
          <CardBody className="space-y-4">
            <Field label="商品名稱" required error={err("name")}>
              <Input
                value={f.name}
                error={!!err("name")}
                onChange={(e) => setF((s) => ({ ...s, name: e.target.value, slug: s.slugTouched ? s.slug : slugify(e.target.value) }))}
                placeholder="例如：極簡石英腕錶"
              />
            </Field>
            <Field label="網址代稱 (slug)" required hint="僅小寫英數與連字號" error={err("slug")}>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">/products/</span>
                <Input value={f.slug} error={!!err("slug")} onChange={(e) => setF((s) => ({ ...s, slug: e.target.value.toLowerCase(), slugTouched: true }))} />
              </div>
            </Field>
            <Field label="商品描述" error={err("description")}>
              <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={6} placeholder="材質、尺寸、特色…" />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="商品圖片" description="第一張為主圖，支援外部圖片網址" />
          <CardBody className="space-y-3">
            {f.images.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {f.images.map((img, i) => (
                  <li key={`${img.url}-${i}`} className="group relative overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                    <ImagePreview url={img.url} />
                    {i === 0 && <span className="absolute top-1.5 left-1.5 rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] text-white">主圖</span>}
                    <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-slate-900/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <IconBtn disabled={i === 0} onClick={() => set("images", move(f.images, i, i - 1))} title="往前">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn disabled={i === f.images.length - 1} onClick={() => set("images", move(f.images, i, i + 1))} title="往後">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn onClick={() => set("images", f.images.filter((_, j) => j !== i))} title="移除">
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconBtn>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Input
                value={imgInput}
                onChange={(e) => setImgInput(e.target.value)}
                placeholder="https://…/image.jpg"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addImage();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addImage}>
                <Plus className="h-4 w-4" /> 加入
              </Button>
            </div>
            {err("images") && <p className="text-xs text-danger-600">{err("images")}</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="規格與庫存"
            description="至少一個規格；選項例如 顏色=黑、尺寸=M"
            action={
              <Button type="button" variant="outline" size="sm" onClick={() => set("variants", [...f.variants, emptyVariant()])}>
                <Plus className="h-4 w-4" /> 新增規格
              </Button>
            }
          />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">規格名稱</th>
                  <th className="px-3 py-2 text-left font-medium">選項</th>
                  <th className="px-3 py-2 text-left font-medium">SKU</th>
                  <th className="px-3 py-2 text-right font-medium">售價</th>
                  <th className="px-3 py-2 text-right font-medium">原價</th>
                  <th className="px-3 py-2 text-right font-medium">庫存</th>
                  <th className="px-3 py-2 text-right font-medium">重量 (g)</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {f.variants.map((v, i) => (
                  <tr key={v.id ?? i} className="align-top">
                    <td className="px-3 py-2">
                      <Input value={v.name} error={!!err(`variants.${i}.name`)} onChange={(e) => setVariant(i, { name: e.target.value })} className="w-32" />
                    </td>
                    <td className="px-3 py-2">
                      <div className="space-y-1.5">
                        {v.options.map((o, oi) => (
                          <div key={oi} className="flex items-center gap-1">
                            <Input value={o.key} placeholder="顏色" className="h-8 w-20 text-xs" onChange={(e) => setVariant(i, { options: v.options.map((x, k) => (k === oi ? { ...x, key: e.target.value } : x)) })} />
                            <span className="text-slate-400">=</span>
                            <Input value={o.value} placeholder="黑" className="h-8 w-20 text-xs" onChange={(e) => setVariant(i, { options: v.options.map((x, k) => (k === oi ? { ...x, value: e.target.value } : x)) })} />
                            <button type="button" className="text-slate-400 hover:text-danger-600" onClick={() => setVariant(i, { options: v.options.filter((_, k) => k !== oi) })} aria-label="移除選項">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        <button type="button" className="text-xs text-slate-500 hover:text-slate-900" onClick={() => setVariant(i, { options: [...v.options, { key: "", value: "" }] })}>
                          + 新增選項
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Input value={v.sku} error={!!err(`variants.${i}.sku`)} onChange={(e) => setVariant(i, { sku: e.target.value.toUpperCase() })} className="w-40 min-w-[10rem] font-mono text-xs" />
                      {err(`variants.${i}.sku`) && <p className="mt-1 text-[11px] text-danger-600">必填</p>}
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" min={0} value={v.price} error={!!err(`variants.${i}.price`)} onChange={(e) => setVariant(i, { price: e.target.value })} className="w-24 text-right" />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" min={0} value={v.compareAtPrice} onChange={(e) => setVariant(i, { compareAtPrice: e.target.value })} className="w-24 text-right" placeholder="—" />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" min={0} value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} className="w-20 text-right" />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" min={0} value={v.weightGrams} onChange={(e) => setVariant(i, { weightGrams: e.target.value })} className="w-20 text-right" />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        disabled={f.variants.length <= 1}
                        className="rounded p-1.5 text-slate-400 hover:bg-danger-50 hover:text-danger-600 disabled:opacity-30"
                        onClick={() => set("variants", f.variants.filter((_, j) => j !== i))}
                        aria-label="刪除規格"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {err("variants") && <p className="px-5 pb-3 text-xs text-danger-600">{err("variants")}</p>}
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="發佈" />
          <CardBody className="space-y-4">
            <Field label="狀態">
              <Select value={f.status} onChange={(e) => set("status", e.target.value as FormState["status"])}>
                <option value="draft">草稿 (不顯示於前台)</option>
                <option value="active">上架中</option>
                <option value="archived">已封存</option>
              </Select>
            </Field>
            <Switch checked={f.isFeatured} onChange={(v) => set("isFeatured", v)} label="精選商品 (顯示於首頁)" />
            <Field label="限時特價結束時間" hint="留空則不限時">
              <Input type="datetime-local" value={f.flashSaleEndsAt} onChange={(e) => set("flashSaleEndsAt", e.target.value)} />
            </Field>
            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" loading={saving} size="lg">
                {product ? "儲存變更" : "建立商品"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.push("/products")}>
                返回列表
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="分類與標籤" />
          <CardBody className="space-y-4">
            <Field label="分類">
              <Select value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">未分類</option>
                {cats.data?.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="標籤" hint="Enter 新增">
              <div className="flex flex-wrap gap-1.5 rounded-md border border-slate-300 bg-white p-1.5 focus-within:ring-2 focus-within:ring-slate-200">
                {f.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    {t}
                    <button type="button" onClick={() => set("tags", f.tags.filter((x) => x !== t))} aria-label={`移除 ${t}`} className="text-slate-400 hover:text-slate-700">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                      e.preventDefault();
                      if (!f.tags.includes(tagInput.trim())) set("tags", [...f.tags, tagInput.trim()]);
                      setTagInput("");
                    } else if (e.key === "Backspace" && !tagInput && f.tags.length) set("tags", f.tags.slice(0, -1));
                  }}
                  placeholder={f.tags.length ? "" : "例如：熱銷、新品"}
                  className="min-w-[80px] flex-1 bg-transparent px-1 text-sm outline-none"
                />
              </div>
            </Field>
          </CardBody>
        </Card>

        {product && (
          <Card>
            <CardHeader title="統計" />
            <CardBody>
              <dl className="grid grid-cols-2 gap-y-2 text-[13px]">
                <dt className="text-slate-500">評分</dt>
                <dd className="text-right text-slate-800">
                  {product.rating.toFixed(1)} ({product.reviewCount})
                </dd>
                <dt className="text-slate-500">已售出</dt>
                <dd className="text-right text-slate-800">{product.soldCount.toLocaleString()}</dd>
                <dt className="text-slate-500">瀏覽</dt>
                <dd className="text-right text-slate-800">{product.viewCount.toLocaleString()}</dd>
              </dl>
            </CardBody>
          </Card>
        )}

        {product && product.status !== "archived" && (
          <Card className="border-danger-600/20">
            <CardBody>
              <p className="text-[13px] font-medium text-slate-800">封存商品</p>
              <p className="mt-1 text-xs text-slate-500">封存後前台不再顯示，歷史訂單資料保留。</p>
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="mt-3"
                onClick={() =>
                  confirm({
                    title: "確定要封存此商品？",
                    description: `「${product.name}」將從前台下架，可於封存清單中重新上架。`,
                    danger: true,
                    confirmText: "封存",
                    action: async () => {
                      await adminApi.archiveProduct(product.id);
                      toast.success("商品已封存");
                      router.push("/products");
                    },
                  })
                }
              >
                封存商品
              </Button>
            </CardBody>
          </Card>
        )}
      </div>
      {confirmEl}
    </form>
  );

  function addImage() {
    const url = imgInput.trim();
    if (!url) return;
    try {
      new URL(url);
    } catch {
      toast.error("圖片網址格式不正確");
      return;
    }
    set("images", [...f.images, { url, alt: f.name }]);
    setImgInput("");
  }
}

function move<T>(arr: T[], from: number, to: number) {
  if (to < 0 || to >= arr.length) return arr;
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function IconBtn({ children, onClick, disabled, title }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; title: string }) {
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick} className="rounded bg-white/90 p-1 text-slate-700 hover:bg-white disabled:opacity-40">
      {children}
    </button>
  );
}

function ImagePreview({ url }: { url: string }) {
  const [broken, setBroken] = React.useState(false);
  return (
    <div className="flex aspect-square items-center justify-center">
      {broken ? <ImageOff className="h-6 w-6 text-slate-300" /> : <Image src={url} alt="" width={200} height={200} unoptimized className="h-full w-full object-cover" onError={() => setBroken(true)} />}
    </div>
  );
}
