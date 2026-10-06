"use client";

import * as React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { slugify, type CategoryDTO } from "@es/shared";
import { adminApi, type CategoryInput } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { Button, Card, Dialog, EmptyState, Field, Input, PageHeader, Select, Table, TableSkeleton, TBody, TD, TH, THead, TR, useConfirm, useToast } from "@/components/ui";

const empty: CategoryInput = { name: "", slug: "", parentId: null, imageUrl: "", sortOrder: 0 };

export default function CategoriesPage() {
  const toast = useToast();
  const { confirm, element } = useConfirm();
  const { data, loading, reload } = useQuery(() => adminApi.categories(), []);
  const [editing, setEditing] = React.useState<{ id?: string; form: CategoryInput } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [slugTouched, setSlugTouched] = React.useState(false);
  const cats = data?.categories ?? [];

  async function save() {
    if (!editing) return;
    const body = { ...editing.form, imageUrl: editing.form.imageUrl || null, parentId: editing.form.parentId || null };
    if (!body.name.trim() || !/^[a-z0-9-]+$/.test(body.slug)) {
      toast.error("請填寫名稱與正確的 slug (小寫英數與連字號)");
      return;
    }
    setSaving(true);
    try {
      if (editing.id) await adminApi.updateCategory(editing.id, body);
      else await adminApi.createCategory(body);
      toast.success(editing.id ? "分類已更新" : "分類已建立");
      setEditing(null);
      reload();
    } catch (e) {
      toast.error("儲存失敗", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const open = (c?: CategoryDTO) => {
    setSlugTouched(!!c);
    setEditing(c ? { id: c.id, form: { name: c.name, slug: c.slug, parentId: c.parentId, imageUrl: c.imageUrl ?? "", sortOrder: c.sortOrder } } : { form: { ...empty } });
  };

  return (
    <>
      <PageHeader
        title="商品分類"
        description="前台導覽列與篩選使用的分類"
        actions={
          <Button onClick={() => open()}>
            <Plus className="h-4 w-4" /> 新增分類
          </Button>
        }
      />
      <Card>
        {loading ? (
          <TableSkeleton cols={4} />
        ) : cats.length === 0 ? (
          <EmptyState title="尚無分類" action={<Button variant="outline" onClick={() => open()}>新增分類</Button>} />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>名稱</TH>
                <TH>slug</TH>
                <TH>上層分類</TH>
                <TH align="right">排序</TH>
                <TH align="right">商品數</TH>
                <TH className="w-24" />
              </tr>
            </THead>
            <TBody>
              {cats.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      {c.imageUrl ? <img src={c.imageUrl} alt="" className="h-9 w-9 rounded-md border border-slate-200 object-cover" /> : <div className="h-9 w-9 rounded-md border border-slate-200 bg-slate-50" />}
                      <span className="font-medium text-slate-800">{c.name}</span>
                    </div>
                  </TD>
                  <TD className="font-mono text-xs text-slate-500">{c.slug}</TD>
                  <TD className="text-slate-500">{cats.find((x) => x.id === c.parentId)?.name ?? "—"}</TD>
                  <TD align="right">{c.sortOrder}</TD>
                  <TD align="right">{c.productCount ?? 0}</TD>
                  <TD>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => open(c)} aria-label="編輯">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="刪除"
                        onClick={() =>
                          confirm({
                            title: `刪除分類「${c.name}」？`,
                            description: "此分類下的商品將變為未分類。",
                            danger: true,
                            confirmText: "刪除",
                            action: async () => {
                              await adminApi.deleteCategory(c.id);
                              toast.success("分類已刪除");
                              reload();
                            },
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-slate-400" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "編輯分類" : "新增分類"}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              取消
            </Button>
            <Button onClick={save} loading={saving}>
              儲存
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Field label="名稱" required>
              <Input value={editing.form.name} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, name: e.target.value, slug: slugTouched ? editing.form.slug : slugify(e.target.value) } })} />
            </Field>
            <Field label="slug" required hint="小寫英數與連字號">
              <Input
                value={editing.form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setEditing({ ...editing, form: { ...editing.form, slug: e.target.value.toLowerCase() } });
                }}
              />
            </Field>
            <Field label="上層分類">
              <Select value={editing.form.parentId ?? ""} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, parentId: e.target.value || null } })}>
                <option value="">無 (頂層)</option>
                {cats
                  .filter((c) => c.id !== editing.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="圖片網址">
              <Input value={editing.form.imageUrl ?? ""} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, imageUrl: e.target.value } })} placeholder="https://…" />
            </Field>
            <Field label="排序" hint="數字越小越前面">
              <Input type="number" value={editing.form.sortOrder} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, sortOrder: Number(e.target.value) || 0 } })} className="w-32" />
            </Field>
          </div>
        )}
      </Dialog>
      {element}
    </>
  );
}
