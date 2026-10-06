"use client";

import * as React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatMoney } from "@es/shared";
import { adminApi, type Coupon, type CouponInput } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { formatDate, fromLocalInput, toLocalInput } from "@/lib/utils";
import { Badge, Button, Card, Dialog, EmptyState, Field, Input, PageHeader, Select, Switch, Table, TableSkeleton, TBody, TD, TH, THead, TR, useConfirm, useToast } from "@/components/ui";

const typeLabel = { percent: "百分比折扣", fixed: "固定金額", free_shipping: "免運費" } as const;

type Form = { code: string; type: Coupon["type"]; value: string; minSubtotal: string; maxUses: string; startsAt: string; endsAt: string; enabled: boolean };
const empty: Form = { code: "", type: "percent", value: "10", minSubtotal: "0", maxUses: "", startsAt: "", endsAt: "", enabled: true };

function describe(c: Coupon) {
  if (c.type === "percent") return `${c.value}% off`;
  if (c.type === "fixed") return `折 ${formatMoney(c.value)}`;
  return "免運費";
}
function statusOf(c: Coupon) {
  const now = Date.now();
  if (!c.enabled) return { label: "停用", tone: "gray" as const };
  if (c.startsAt && now < new Date(c.startsAt).getTime()) return { label: "未開始", tone: "amber" as const };
  if (c.endsAt && now > new Date(c.endsAt).getTime()) return { label: "已過期", tone: "red" as const };
  if (c.maxUses != null && c.usedCount >= c.maxUses) return { label: "已用完", tone: "red" as const };
  return { label: "可使用", tone: "green" as const };
}

export default function CouponsPage() {
  const toast = useToast();
  const { confirm, element } = useConfirm();
  const { data, loading, reload } = useQuery(() => adminApi.coupons(), []);
  const [editing, setEditing] = React.useState<{ id?: string; form: Form } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const coupons = data?.coupons ?? [];

  const open = (c?: Coupon) =>
    setEditing(
      c
        ? {
            id: c.id,
            form: { code: c.code, type: c.type, value: String(c.value), minSubtotal: String(c.minSubtotal), maxUses: c.maxUses == null ? "" : String(c.maxUses), startsAt: toLocalInput(c.startsAt), endsAt: toLocalInput(c.endsAt), enabled: c.enabled },
          }
        : { form: { ...empty } },
    );

  async function save() {
    if (!editing) return;
    const f = editing.form;
    const body: CouponInput = {
      code: f.code.trim().toUpperCase(),
      type: f.type,
      value: f.type === "free_shipping" ? 0 : Number(f.value) || 0,
      minSubtotal: Number(f.minSubtotal) || 0,
      maxUses: f.maxUses.trim() === "" ? null : Number(f.maxUses),
      startsAt: fromLocalInput(f.startsAt),
      endsAt: fromLocalInput(f.endsAt),
      enabled: f.enabled,
    };
    if (body.code.length < 2) return toast.error("優惠碼至少 2 碼");
    if (body.type === "percent" && (body.value <= 0 || body.value > 100)) return toast.error("百分比需介於 1–100");
    setSaving(true);
    try {
      if (editing.id) await adminApi.updateCoupon(editing.id, body);
      else await adminApi.createCoupon(body);
      toast.success("優惠券已儲存");
      setEditing(null);
      reload();
    } catch (e) {
      toast.error("儲存失敗", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="優惠券"
        description="顧客於結帳輸入優惠碼折抵"
        actions={
          <Button onClick={() => open()}>
            <Plus className="h-4 w-4" /> 新增優惠券
          </Button>
        }
      />
      <Card>
        {loading ? (
          <TableSkeleton cols={6} />
        ) : coupons.length === 0 ? (
          <EmptyState title="尚無優惠券" action={<Button variant="outline" onClick={() => open()}>新增優惠券</Button>} />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>優惠碼</TH>
                <TH>折扣</TH>
                <TH align="right">低消</TH>
                <TH align="right">已用 / 上限</TH>
                <TH>有效期間</TH>
                <TH>狀態</TH>
                <TH className="w-24" />
              </tr>
            </THead>
            <TBody>
              {coupons.map((c) => {
                const s = statusOf(c);
                return (
                  <TR key={c.id}>
                    <TD>
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[13px] font-semibold text-slate-800">{c.code}</span>
                    </TD>
                    <TD>
                      <p>{describe(c)}</p>
                      <p className="text-xs text-slate-400">{typeLabel[c.type]}</p>
                    </TD>
                    <TD align="right">{c.minSubtotal ? formatMoney(c.minSubtotal) : "—"}</TD>
                    <TD align="right">
                      {c.usedCount} / {c.maxUses ?? "∞"}
                    </TD>
                    <TD className="text-xs text-slate-500">
                      {c.startsAt || c.endsAt ? `${c.startsAt ? formatDate(c.startsAt, false) : "即日"} ～ ${c.endsAt ? formatDate(c.endsAt, false) : "不限"}` : "不限"}
                    </TD>
                    <TD>
                      <Badge tone={s.tone} dot>
                        {s.label}
                      </Badge>
                    </TD>
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
                              title: `刪除優惠碼 ${c.code}？`,
                              description: "已使用此優惠碼的訂單不受影響。",
                              danger: true,
                              confirmText: "刪除",
                              action: async () => {
                                await adminApi.deleteCoupon(c.id);
                                toast.success("已刪除");
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
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <Dialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "編輯優惠券" : "新增優惠券"}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="優惠碼" required className="sm:col-span-2">
              <Input value={editing.form.code} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, code: e.target.value.toUpperCase() } })} className="font-mono" placeholder="WELCOME10" />
            </Field>
            <Field label="類型">
              <Select value={editing.form.type} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, type: e.target.value as Coupon["type"] } })}>
                {Object.entries(typeLabel).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={editing.form.type === "percent" ? "折扣 %" : editing.form.type === "fixed" ? "折抵金額" : "折扣值"}>
              <Input type="number" min={0} disabled={editing.form.type === "free_shipping"} value={editing.form.value} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, value: e.target.value } })} />
            </Field>
            <Field label="最低消費">
              <Input type="number" min={0} value={editing.form.minSubtotal} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, minSubtotal: e.target.value } })} />
            </Field>
            <Field label="使用次數上限" hint="留空不限">
              <Input type="number" min={1} value={editing.form.maxUses} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, maxUses: e.target.value } })} />
            </Field>
            <Field label="開始時間">
              <Input type="datetime-local" value={editing.form.startsAt} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, startsAt: e.target.value } })} />
            </Field>
            <Field label="結束時間">
              <Input type="datetime-local" value={editing.form.endsAt} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, endsAt: e.target.value } })} />
            </Field>
            <div className="sm:col-span-2">
              <Switch checked={editing.form.enabled} onChange={(v) => setEditing({ ...editing, form: { ...editing.form, enabled: v } })} label="啟用" />
            </div>
          </div>
        )}
      </Dialog>
      {element}
    </>
  );
}
