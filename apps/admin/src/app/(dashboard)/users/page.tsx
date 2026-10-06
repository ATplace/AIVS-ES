"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { Badge, Button, Card, Dialog, EmptyState, Field, Input, PageHeader, Select, Table, TableSkeleton, TBody, TD, TH, THead, TR, useConfirm, useToast } from "@/components/ui";

const roleLabel: Record<string, string> = { owner: "擁有者", manager: "經理", staff: "員工" };

export default function UsersPage() {
  const toast = useToast();
  const me = useAuth((s) => s.user);
  const isOwner = me?.role === "owner";
  const { confirm, element } = useConfirm();
  const { data, loading, error, reload } = useQuery(() => adminApi.users(), []);
  const [open, setOpen] = React.useState(false);
  const [f, setF] = React.useState({ email: "", name: "", password: "", role: "staff" });
  const [saving, setSaving] = React.useState(false);

  async function create() {
    if (!f.email || !f.name || f.password.length < 8) return toast.error("請填寫完整資料，密碼至少 8 碼");
    setSaving(true);
    try {
      await adminApi.createUser(f);
      toast.success("管理員已建立");
      setOpen(false);
      setF({ email: "", name: "", password: "", role: "staff" });
      reload();
    } catch (e) {
      toast.error("建立失敗", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="管理員帳號"
        description="可登入後台的人員與權限"
        actions={
          isOwner && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> 新增管理員
            </Button>
          )
        }
      />
      {error ? (
        <div className="rounded-md bg-danger-50 p-4 text-sm text-danger-700">{error}</div>
      ) : (
        <Card>
          {loading ? (
            <TableSkeleton cols={4} />
          ) : !data?.users.length ? (
            <EmptyState title="尚無管理員" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>姓名</TH>
                  <TH>Email</TH>
                  <TH>角色</TH>
                  <TH>最近登入</TH>
                  <TH>建立時間</TH>
                  {isOwner && <TH className="w-14" />}
                </tr>
              </THead>
              <TBody>
                {data.users.map((u) => (
                  <TR key={u.id}>
                    <TD className="font-medium text-slate-800">
                      {u.name}
                      {u.id === me?.id && <span className="ml-2 text-xs text-slate-400">(你)</span>}
                    </TD>
                    <TD className="text-slate-600">{u.email}</TD>
                    <TD>
                      <Badge tone={u.role === "owner" ? "slate" : u.role === "manager" ? "indigo" : "gray"}>{roleLabel[u.role] ?? u.role}</Badge>
                    </TD>
                    <TD className="text-xs text-slate-500">{formatDate(u.lastLoginAt)}</TD>
                    <TD className="text-xs text-slate-500">{formatDate(u.createdAt)}</TD>
                    {isOwner && (
                      <TD>
                        {u.id !== me?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="刪除"
                            onClick={() =>
                              confirm({
                                title: `移除管理員 ${u.name}？`,
                                description: "該帳號將立即無法登入後台。",
                                danger: true,
                                confirmText: "移除",
                                action: async () => {
                                  await adminApi.deleteUser(u.id);
                                  toast.success("已移除");
                                  reload();
                                },
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-slate-400" />
                          </Button>
                        )}
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="新增管理員"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={create} loading={saving}>
              建立
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="姓名" required>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Email" required>
            <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </Field>
          <Field label="密碼" required hint="至少 8 碼">
            <Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" />
          </Field>
          <Field label="角色">
            <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              <option value="staff">員工 — 處理訂單與商品</option>
              <option value="manager">經理 — 另可檢視管理員清單</option>
              <option value="owner">擁有者 — 完整權限</option>
            </Select>
          </Field>
        </div>
      </Dialog>
      {element}
    </>
  );
}
